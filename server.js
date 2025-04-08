import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { McpServer } from '@modelcontextprotocol/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Import our custom modules
import { registerTool, executeToolProxy } from './tool-proxy.js';
import { selectToolsForContext, recordToolUsage } from './context-aware-selector.js';
import { getMcpServerConfigs, fetchToolsFromServer } from './server-connector.js';

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
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
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

// Get all tools (with context filtering)
app.get('/tools', validateRequest, filterToolsByContext, (req, res) => {
  res.json({
    tools: req.filteredTools,
    total: req.filteredTools.length,
    timestamp: new Date().toISOString()
  });
});

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

// Get a specific tool
app.get('/tools/:toolId', validateRequest, (req, res) => {
  const { toolId } = req.params;
  const tool = toolsCache.byId.get(toolId);
  
  if (!tool) {
    return res.status(404).json({ error: 'Tool not found' });
  }
  
  res.json({ tool });
});

// Execute a tool
app.post('/execute/:toolId', validateRequest, async (req, res) => {
  const { toolId } = req.params;
  const params = req.body;
  
  const executionId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Track this execution
  rateLimiter.executions.add(executionId);
  
  try {
    // Check if tool exists
    if (!toolsCache.byId.has(toolId)) {
      return res.status(404).json({ error: 'Tool not found' });
    }
    
    console.log(`Executing tool ${toolId} with params:`, params);
    
    // Execute the tool via proxy
    const result = await executeToolProxy(toolId, params);
    
    // Record usage for context awareness
    recordToolUsage(toolId);
    
    // Return result
    res.json({
      toolId,
      executionId,
      result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error executing tool ${toolId}:`, error);
    
    res.status(500).json({
      error: 'Tool execution failed',
      message: error.message,
      toolId,
      executionId
    });
  } finally {
    // Clean up tracking
    rateLimiter.executions.delete(executionId);
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    toolCount: toolsCache.allTools.length,
    cacheAge: Date.now() - toolsCache.lastUpdated
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message
  });
});

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
      console.log(`Server running on port ${port}`);
    });
    
    // Handle graceful shutdown
    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      // Clean up resources
      process.exit(0);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer(); 