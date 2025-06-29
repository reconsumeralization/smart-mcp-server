import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { McpServer } from '@modelcontextprotocol/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import morgan from 'morgan';
import pinoHttp from 'pino-http';
import { WorkflowManager } from './workflow-manager.js'; // Import WorkflowManager
import natural from 'natural';

// Import config
import config from './config.js';

// Import our custom modules
import { registerTool, executeToolProxy } from './tool-proxy.js';
import { selectToolsForContext, recordToolUsage } from './context-aware-selector.js';
import { getMcpServerConfigs, fetchToolsFromServer } from './server-connector.js';
import logger from './logger.js';
import setupSwagger from './swagger.js';
import auth from './middleware/auth.js';
import rateLimiters from './middleware/rate-limit.js';
import errorHandler from './middleware/error-handler.js';

// Load environment variables
dotenv.config();

// Get directory name (ESM workaround)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize WorkflowManager
const workflowManager = new WorkflowManager();

// Initialize Express app
const app = express();

// Basic middleware
app.use(cors(config.security.cors));
app.use(helmet(config.security.helmet));
app.use(express.json({ limit: config.security.maxRequestSize }));
app.use(express.urlencoded({ extended: true, limit: config.security.maxRequestSize }));

// Serve static files for A2A protocol
app.use(express.static(path.join(__dirname, 'public')));

// Request logging - use Morgan for dev and Pino for production
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(pinoHttp({ logger }));
}

// Set up Swagger UI
setupSwagger(app);

// A2A Protocol Endpoints
/**
 * @swagger
 * /.well-known/agent.json:
 *   get:
 *     summary: A2A Agent Discovery
 *     description: Returns the agent's configuration card, allowing other agents to discover its capabilities.
 *     tags: [A2A Protocol]
 *     responses:
 *       200:
 *         description: The agent.json file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Agent'
 */
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agent.json'));
});

/**
 * @swagger
 * /a2a/tasks:
 *   post:
 *     summary: Submit a Task via A2A
 *     description: Submits a task to the agent. The agent will find a suitable workflow and return a pending task with a workflow execution request.
 *     tags: [A2A Protocol]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/A2ATaskRequest'
 *     responses:
 *       200:
 *         description: The workflow execution request.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/A2AWorkflowResponse'
 *       400:
 *         description: Invalid request, missing task_description.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No suitable workflow found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/a2a/tasks', rateLimiters.standardLimiter, async (req, res, next) => {
  try {
    const { task_description, task_id } = req.body;
    if (!task_description) {
      return res.status(400).json({ error: 'task_description is required' });
    }

    // Use Jaro-Winkler distance to find the best matching workflow.
    const allWorkflows = workflowManager.listWorkflows();
    let bestMatch = { workflow: null, score: config.a2a.matchThreshold }; // Minimum confidence threshold

    for (const workflow of allWorkflows) {
      const description = workflow.description || '';
      const score = natural.JaroWinklerDistance(task_description, description);
      if (score > bestMatch.score) {
        bestMatch = { workflow, score };
      }
    }

    const workflowToExecute = bestMatch.workflow;

    if (!workflowToExecute) {
      return res.status(404).json({ error: 'No suitable workflow found for the given task description.' });
    }

    // Return an A2A compliant response that requests workflow execution
    const response = {
      task_id: task_id || `task-${Date.now()}`,
      status: 'pending', // Status is pending as the workflow needs to be executed by the requesting agent
      artifacts: [
        {
          type: 'workflow_execution_request',
          content: {
            workflowId: workflowToExecute.id,
            // Pass relevant context from the task_description to the workflow
            context: {
              original_task_description: task_description
            }
          }
        }
      ]
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// Initialize MCP server
const server = new McpServer({
  name: "Smart MCP Gateway",
  description: "Context-aware MCP server that intelligently manages tool presentation",
  version: "1.0.0",
});

// Cache for tools (refreshed periodically)
const toolsCache = {
  byId: new Map(),        // Quick lookup by ID
  byCategory: new Map(),  // Organized by category
  allTools: [],           // Full list
  lastUpdated: 0
};

// Initialize tools from connected servers
async function initializeTools() {
  try {
    console.log('Initializing tools from connected servers...');
    
    // Get server configurations
    const serverConfigs = await getMcpServerConfigs();
    console.log(`Found ${serverConfigs.length} server configurations`);
    
    // Clear existing cache
    toolsCache.byId.clear();
    toolsCache.byCategory.clear();
    toolsCache.allTools = [];
    
    // Initialize category maps
    for (const server of serverConfigs) {
      if (!toolsCache.byCategory.has(server.category)) {
        toolsCache.byCategory.set(server.category, []);
      }
    }
    
    // Fetch tools from each server
    for (const server of serverConfigs) {
      try {
        console.log(`Fetching tools from ${server.id}...`);
        const serverTools = await fetchToolsFromServer(server);
        
        if (serverTools && serverTools.length) {
          console.log(`Found ${serverTools.length} tools from ${server.id}`);
          
          // Process each tool
          for (const tool of serverTools) {
            // Add server reference to tool
            const toolWithServer = { 
              ...tool, 
              serverId: server.id,
              serverName: server.name,
              url: server.url // Add the server URL to the tool configuration
            };
            
            // Register with tool proxy
            registerTool(tool.id, server);
            
            // Add to caches
            toolsCache.byId.set(tool.id, toolWithServer);
            
            const categoryTools = toolsCache.byCategory.get(server.category) || [];
            categoryTools.push(toolWithServer);
            toolsCache.byCategory.set(server.category, categoryTools);
            
            toolsCache.allTools.push(toolWithServer);
          }
        }
      } catch (error) {
        console.error(`Error fetching tools from ${server.id}:`, error);
      }
    }
    
    // Update cache timestamp
    toolsCache.lastUpdated = Date.now();
    
    console.log(`Initialization complete. Total tools: ${toolsCache.allTools.length}`);

    // GEMINI SERVER CONFIG
    // Add the Gemini server configuration to the MCP server
    console.log('Setting up Gemini API integration...');
    
    // Add Gemini server configuration
    const GEMINI_SERVER_CONFIG = {
      id: "gemini-server",
      name: "Gemini AI Service",
      url: `http://localhost:${config.gemini.serverPort}`,
      type: "http",
      category: "ai"
    };

    // Add Gemini server to serverConfigs if GEMINI_API_KEY is defined
    if (config.gemini.apiKey) {
      console.log('Registering Gemini server with valid API key');
      serverConfigs.push(GEMINI_SERVER_CONFIG);
      
      // Register Gemini tools with the tool proxy
      registerTool('gemini_generate_text', GEMINI_SERVER_CONFIG);
      registerTool('gemini_create_chat', GEMINI_SERVER_CONFIG);
      registerTool('gemini_chat_message', GEMINI_SERVER_CONFIG);
      registerTool('gemini_get_chat_history', GEMINI_SERVER_CONFIG);
      registerTool('gemini_generate_with_images', GEMINI_SERVER_CONFIG);
      registerTool('gemini_generate_embedding', GEMINI_SERVER_CONFIG);
      
      // Register new tool calling capability
      registerTool('gemini_generate_with_tools', GEMINI_SERVER_CONFIG);
      registerTool('gemini_register_tool', GEMINI_SERVER_CONFIG);
      
      // Import and initialize the Gemini server
      try {
        // Dynamically import the Gemini server
        const { default: geminiServer } = await import('./servers/gemini-server.js');
        console.log('Gemini server module loaded successfully');
        
        // Register other tools with Gemini so it can call them
        for (const tool of toolsCache.allTools) {
          try {
            // For each tool, create its schema and register with Gemini
            const toolSchema = {
              name: tool.id,
              description: tool.description || `${tool.name} tool`,
              functions: [{
                name: tool.id,
                description: tool.description || `${tool.name} functionality`,
                parameters: tool.mcpActions && tool.mcpActions.length > 0 ? tool.mcpActions[0].parameters : {
                  type: "object",
                  properties: {}
                }
              }]
            };
            
            // Register the tool with Gemini
            await fetch(`${GEMINI_SERVER_CONFIG.url}/api/register-tool`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                toolId: tool.id, 
                toolInfo: toolSchema 
              })
            });
            
            console.log(`Registered tool ${tool.id} with Gemini for tool calling`);
          } catch (error) {
            console.error(`Error registering tool ${tool.id} with Gemini:`, error);
          }
        }
      } catch (error) {
        console.error('Error initializing Gemini server:', error);
      }
    } else {
      console.log('Skipping Gemini server registration: No API key provided');
    }
  } catch (error) {
    console.error('Error initializing tools:', error);
  }
}

// Context-aware tool filtering middleware
function filterToolsByContext(req, res, next) {
  // Extract context from request
  const userQuery = req.query.query || req.body.query || '';
  const maxTools = parseInt(req.query.maxTools || req.body.maxTools || '40', 10);
  
  // Apply context-aware filtering
  if (userQuery) {
    req.filteredTools = selectToolsForContext(toolsCache.allTools, userQuery, maxTools);
  } else {
    // No query, just return all tools up to the limit
    req.filteredTools = toolsCache.allTools.slice(0, maxTools);
  }
  
  next();
}

// API Routes

// Health check endpoint
/**
 * @swagger
 * /health:
 *   get:
 *     summary: System health check
 *     description: Returns the status of the MCP server
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: The system is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 uptime:
 *                   type: number
 *                   example: 3600
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: server.version
  });
});

// Get all tools (with optional context filtering)
/**
 * @swagger
 * /tools:
 *   get:
 *     summary: List all tools
 *     description: Returns a list of all available tools, optionally filtered by context
 *     tags: [Tools]
 *     parameters:
 *       - in: query
 *         name: query
 *         schema:
 *           type: string
 *         description: Optional text query to filter tools by context
 *       - in: query
 *         name: maxTools
 *         schema:
 *           type: integer
 *           default: 40
 *         description: Maximum number of tools to return
 *     responses:
 *       200:
 *         description: List of tools
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 tools:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Tool'
 */
app.get('/tools', filterToolsByContext, (req, res) => {
  res.json({
    tools: req.filteredTools,
    count: req.filteredTools.length,
    timestamp: new Date().toISOString()
  });
});

// Get tool by ID
/**
 * @swagger
 * /tools/{id}:
 *   get:
 *     summary: Get tool by ID
 *     description: Returns a specific tool by its ID
 *     tags: [Tools]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tool ID
 *     responses:
 *       200:
 *         description: Tool details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tool'
 *       404:
 *         description: Tool not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.get('/tools/:id', (req, res) => {
  const toolId = req.params.id;
  const tool = toolsCache.byId.get(toolId);
  
  if (!tool) {
    return res.status(404).json({
      error: 'Tool not found',
      code: 'TOOL_NOT_FOUND',
      message: `No tool found with ID: ${toolId}`
    });
  }
  
  res.json(tool);
});

// Execute a tool
/**
 * @swagger
 * /execute:
 *   post:
 *     summary: Execute a tool
 *     description: Executes a specific tool with the provided parameters
 *     tags: [Execution]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - toolId
 *             properties:
 *               toolId:
 *                 type: string
 *                 description: ID of the tool to execute
 *               parameters:
 *                 type: object
 *                 description: Tool-specific parameters
 *               context:
 *                 type: object
 *                 description: Optional execution context
 *     responses:
 *       200:
 *         description: Tool execution result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 result:
 *                   type: object
 *                 executionTime:
 *                   type: number
 *       400:
 *         description: Invalid request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Tool not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Execution error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
app.post('/execute', rateLimiters.executionLimiter, async (req, res) => {
  const { toolId, parameters = {}, context = {} } = req.body;
  
  // Validate request
  if (!toolId) {
    return res.status(400).json({
      error: 'Invalid request',
      code: 'MISSING_TOOL_ID',
      message: 'Tool ID is required'
    });
  }
  
  // Check if tool exists
  const tool = toolsCache.byId.get(toolId);
  if (!tool) {
    return res.status(404).json({
      error: 'Tool not found',
      code: 'TOOL_NOT_FOUND',
      message: `No tool found with ID: ${toolId}`
    });
  }
  
  // Track execution
  rateLimiter.executions.add(toolId);
  const startTime = Date.now();
  
  try {
    // Record tool usage for context improvement
    recordToolUsage(toolId, context, parameters);
    
    // Execute the tool
    const result = await executeToolProxy(toolId, parameters);
    
    // Return result
    res.json({
      result,
      executionTime: Date.now() - startTime
    });
  } catch (error) {
    logger.error(`Tool execution error for ${toolId}:`, error);
    
    res.status(500).json({
      error: 'Execution error',
      code: 'EXECUTION_FAILED',
      message: error.message || 'Failed to execute tool'
    });
  } finally {
    // Remove from tracking
    rateLimiter.executions.delete(toolId);
  }
});

// Admin routes (protected by authentication)
const adminRouter = express.Router();
adminRouter.use(auth.authenticate);
adminRouter.use(auth.authorize(['admin']));
adminRouter.use(rateLimiters.adminLimiter);

// Get server status
adminRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    totalTools: toolsCache.allTools.length,
    activeCategories: [...toolsCache.byCategory.keys()],
    lastToolsUpdate: new Date(toolsCache.lastUpdated).toISOString(),
    currentExecutions: [...rateLimiter.executions],
  });
});

// Force refresh tools
adminRouter.post('/refresh-tools', async (req, res) => {
  try {
    await initializeTools();
    res.json({
      success: true,
      message: 'Tools refreshed successfully',
      toolCount: toolsCache.allTools.length
    });
  } catch (error) {
    logger.error('Tool refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Refresh failed',
      message: error.message
    });
  }
});

// Register admin routes
app.use('/admin', adminRouter);

// Import the workflow API router
import workflowRouter from './workflow-api.js';

// Use workflow router
app.use('/api/workflows', auth.authenticate, workflowRouter);

// Get tools by category
app.get('/categories/:category/tools', rateLimiters.standardLimiter, (req, res) => {
  const { category } = req.params;
  const categoryTools = toolsCache.byCategory.get(category) || [];
  
  res.json({
    category,
    tools: categoryTools,
    total: categoryTools.length
  });
});

// List categories
app.get('/categories', rateLimiters.standardLimiter, (req, res) => {
  const categories = Array.from(toolsCache.byCategory.keys()).map(category => ({
    id: category,
    count: toolsCache.byCategory.get(category).length
  }));
  
  res.json({ categories });
});

// Error handling middleware
app.use(errorHandler.notFoundHandler);
app.use(errorHandler.errorHandler);

// Start the server
async function startServer() {
  try {
    // Initialize tools and workflows
    await initializeTools();
    await workflowManager.init();
    
    // Start refreshing tools periodically (every 5 minutes)
    setInterval(initializeTools, 5 * 60 * 1000);
    
    // Start the server
    const port = config.server.port;
    app.listen(port, () => {
      logger.info(`Server running on port ${port}`);
      logger.info(`API documentation available at http://localhost:${port}/api-docs`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM received, shutting down gracefully');
      // Clean up resources
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 