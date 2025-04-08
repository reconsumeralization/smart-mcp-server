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

// Initialize Express app
const app = express();

// Basic middleware
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging - use Morgan for dev and Pino for production
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(pinoHttp({ logger }));
}

// Apply rate limiting to all routes
app.use(rateLimiters.standardLimiter);

// Set up Swagger UI
setupSwagger(app);

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

// Security settings
const SECURITY_SETTINGS = {
  maxRequestsPerMinute: 100,
  maxConcurrentExecutions: 10,
  requiredAuthLevel: process.env.NODE_ENV === 'production' ? 'token' : 'none',
  tokenValidityMinutes: 60,
  maxRequestSize: '10mb'
};

// Rate limiting state
const rateLimiter = {
  requests: new Map(), // IP -> [timestamps]
  executions: new Set(), // Currently running executions
};

// Security middleware
function validateRequest(req, res, next) {
  // Rate limiting
  const clientIp = req.ip;
  const now = Date.now();
  
  if (!rateLimiter.requests.has(clientIp)) {
    rateLimiter.requests.set(clientIp, []);
  }
  
  // Clean old requests
  const clientRequests = rateLimiter.requests.get(clientIp);
  const oneMinuteAgo = now - 60000;
  const recentRequests = clientRequests.filter(time => time > oneMinuteAgo);
  
  // Update recent requests
  rateLimiter.requests.set(clientIp, [...recentRequests, now]);
  
  // Check rate limit
  if (recentRequests.length >= SECURITY_SETTINGS.maxRequestsPerMinute) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: 60
    });
  }
  
  // Check concurrent executions limit (only for /execute endpoints)
  if (req.path.startsWith('/execute') && 
      rateLimiter.executions.size >= SECURITY_SETTINGS.maxConcurrentExecutions) {
    return res.status(429).json({
      error: 'Too many concurrent executions',
      retryAfter: 5
    });
  }
  
  // Authentication (simplified - would be more robust in production)
  if (SECURITY_SETTINGS.requiredAuthLevel === 'token') {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Token validation would go here
    // ...
  }
  
  next();
}

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
              serverName: server.name 
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
      url: `http://localhost:${process.env.GEMINI_SERVER_PORT || 3006}`,
      type: "http",
      category: "ai"
    };

    // Add Gemini server to serverConfigs if GEMINI_API_KEY is defined
    if (process.env.GEMINI_API_KEY) {
      console.log('Registering Gemini server with valid API key');
      serverConfigs.push(GEMINI_SERVER_CONFIG);
      
      // Register Gemini tools with the tool proxy
      registerTool('gemini_generate_text', GEMINI_SERVER_CONFIG);
      registerTool('gemini_create_chat', GEMINI_SERVER_CONFIG);
      registerTool('gemini_chat_message', GEMINI_SERVER_CONFIG);
      registerTool('gemini_get_chat_history', GEMINI_SERVER_CONFIG);
      registerTool('gemini_generate_with_images', GEMINI_SERVER_CONFIG);
      registerTool('gemini_generate_embedding', GEMINI_SERVER_CONFIG);
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
app.use('/api/workflows', validateRequest, workflowRouter);

// Get tools by category
app.get('/categories/:category/tools', validateRequest, (req, res) => {
  const { category } = req.params;
  const categoryTools = toolsCache.byCategory.get(category) || [];
  
  res.json({
    category,
    tools: categoryTools,
    total: categoryTools.length
  });
});

// List categories
app.get('/categories', validateRequest, (req, res) => {
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
    // Initialize tools
    await initializeTools();
    
    // Start refreshing tools periodically (every 5 minutes)
    setInterval(initializeTools, 5 * 60 * 1000);
    
    // Start the server
    const port = process.env.PORT || 3000;
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