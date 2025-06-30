import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { McpServer } from '@modelcontextprotocol/sdk';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import morgan from 'morgan';
import pinoHttp from 'pino-http';
import config from './config.js';
import { executeToolProxy } from './tool-proxy.js';
import { recordToolUsage } from './context-aware-selector.js';
import logger from './logger.js';
import auth from './middleware/auth.js';
import rateLimiters from './middleware/rate-limit.js';
import errorHandler from './middleware/error-handler.js';
import { correlationIdMiddleware } from './middleware/correlation-id.js';
import redisClient from './lib/redis-client.js';
import setupSwagger from './swagger.js';
import workflowRouter from './workflow-api.js';
import a2aRouter from './routes/a2a.js';
import { queryCompliance } from './lib/agents/index.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Enhanced security headers for financial/insurance industry
app.use(correlationIdMiddleware);
app.use(
  helmet({
    ...config.security.helmet,
    contentSecurityPolicy: {
      directives: {
        ...((config.security.helmet &&
          config.security.helmet.contentSecurityPolicy &&
          config.security.helmet.contentSecurityPolicy.directives) ||
          {}),
        'default-src': ["'self'"],
        'frame-ancestors': ["'none'"],
        'object-src': ["'none'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    crossOriginResourcePolicy: { policy: 'same-origin' },
  })
);
app.use(cors(config.security.cors));
app.use(express.json({ limit: config.security.maxRequestSize }));
app.use(
  express.urlencoded({ extended: true, limit: config.security.maxRequestSize })
);
app.use(express.static(path.join(__dirname, 'public')));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(pinoHttp({ logger }));
}

setupSwagger(app);

// --- A2A Protocol Endpoints ---

// Agent discovery endpoint
app.get('/.well-known/agent.json', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'agent.json'));
});

// --- MCP Server Initialization ---

const mcpServer = new McpServer({
  name: 'Smart MCP Server',
  description:
    'A context-aware agent for domain-specific workflow orchestration and tool execution.',
  version: '1.0.0',
});

// --- Tool Registry and Caching ---

// For domain-oriented use, tools are organized by domain/category
const toolsCache = {
  byId: new Map(),
  byCategory: new Map(),
  allTools: [],
  lastUpdated: 0,
};

// --- Health Check ---

app.get('/health', (req, res) => {
  // Add additional checks for critical dependencies (e.g., Redis, DB)
  const redisStatus = redisClient.isOpen ? 'connected' : 'disconnected';
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: mcpServer.version,
    redis: redisStatus,
  });
});

// --- Tool Endpoints ---

// List all tools, with optional domain/category filtering
app.get('/tools', (req, res) => {
  const { domain, category, query, maxTools = 40 } = req.query;
  let tools = toolsCache.allTools;

  // Domain/category filtering
  if (domain && toolsCache.byCategory.has(domain)) {
    tools = toolsCache.byCategory.get(domain);
  } else if (category && toolsCache.byCategory.has(category)) {
    tools = toolsCache.byCategory.get(category);
  }

  // Contextual query filtering
  if (query) {
    const q = query.toLowerCase();
    tools = tools.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.domain && t.domain.toLowerCase().includes(q))
    );
  }

  // Limit results
  tools = tools.slice(0, Number(maxTools));

  res.json({
    tools,
    count: tools.length,
    timestamp: new Date().toISOString(),
  });
});

// Get tool by ID
app.get('/tools/:id', (req, res) => {
  const toolId = req.params.id;
  const tool = toolsCache.byId.get(toolId);

  if (!tool) {
    return res.status(404).json({
      error: 'Tool not found',
      code: 'TOOL_NOT_FOUND',
      message: `No tool found with ID: ${toolId}`,
    });
  }

  res.json(tool);
});

// Execute a tool (domain-aware, with context tracking and risk controls)
app.post('/execute', rateLimiters.executionLimiter, async (req, res) => {
  const { toolId, parameters = {}, context = {} } = req.body;

  if (!toolId) {
    return res.status(400).json({
      error: 'Invalid request',
      code: 'MISSING_TOOL_ID',
      message: 'Tool ID is required',
    });
  }

  const tool = toolsCache.byId.get(toolId);
  if (!tool) {
    return res.status(404).json({
      error: 'Tool not found',
      code: 'TOOL_NOT_FOUND',
      message: `No tool found with ID: ${toolId}`,
    });
  }

  // Risk minimization: check for restricted/risky tools in financial/insurance context
  if (tool.risk && tool.risk === 'high') {
    logger.warn(`High-risk tool execution attempted: ${toolId}`, {
      user: req.user?.id,
      context,
    });
    return res.status(403).json({
      error: 'Execution forbidden',
      code: 'HIGH_RISK_TOOL',
      message:
        'This tool is classified as high risk and cannot be executed without additional authorization.',
    });
  }

  // Track execution for domain-specific analytics
  if (!rateLimiters.executions) rateLimiters.executions = new Set();
  rateLimiters.executions.add(toolId);
  const startTime = Date.now();

  try {
    // Record tool usage for context and domain improvement
    recordToolUsage(toolId, context, parameters);

    // Execute the tool, passing domain context if available
    const result = await executeToolProxy(toolId, parameters, context);

    res.json({
      result,
      executionTime: Date.now() - startTime,
    });
  } catch (error) {
    logger.error(`Tool execution error for ${toolId}:`, error);

    // Enhanced error reporting for regulated industries
    res.status(500).json({
      error: 'Execution error',
      code: 'EXECUTION_FAILED',
      message: error.message || 'Failed to execute tool',
      timestamp: new Date().toISOString(),
      toolId,
    });
  } finally {
    rateLimiters.executions.delete(toolId);
  }
});

// --- Admin Routes (Domain-Oriented) ---

const adminRouter = express.Router();
adminRouter.use(auth.authenticate);
adminRouter.use(auth.authorize(['admin']));
adminRouter.use(rateLimiters.adminLimiter);

// Server status, including domain/category stats
adminRouter.get('/status', (req, res) => {
  res.json({
    status: 'online',
    uptime: process.uptime(),
    totalTools: toolsCache.allTools.length,
    activeCategories: [...toolsCache.byCategory.keys()],
    lastToolsUpdate: new Date(toolsCache.lastUpdated).toISOString(),
    currentExecutions: rateLimiters.executions
      ? [...rateLimiters.executions]
      : [],
    redis: redisClient.isOpen ? 'connected' : 'disconnected',
  });
});

// Force refresh tools (domain-aware)
adminRouter.post('/refresh-tools', async (req, res) => {
  try {
    if (typeof global.initializeTools === 'function') {
      await global.initializeTools();
    }
    res.json({
      success: true,
      message: 'Tools refreshed successfully',
      toolCount: toolsCache.allTools.length,
    });
  } catch (error) {
    logger.error('Tool refresh error:', error);
    res.status(500).json({
      success: false,
      error: 'Refresh failed',
      message: error.message,
    });
  }
});

app.use('/admin', adminRouter);

// --- Workflow API (protected) ---

app.use('/api/workflows', auth.authenticate, workflowRouter);
app.use('/a2a', a2aRouter);

// --- Category/Domain Endpoints ---

app.get(
  '/categories/:category/tools',
  rateLimiters.standardLimiter,
  (req, res) => {
    const { category } = req.params;
    const categoryTools = toolsCache.byCategory.get(category) || [];

    res.json({
      category,
      tools: categoryTools,
      total: categoryTools.length,
    });
  }
);

app.get('/categories', rateLimiters.standardLimiter, (req, res) => {
  const categories = Array.from(toolsCache.byCategory.keys()).map(
    (category) => ({
      id: category,
      count: toolsCache.byCategory.get(category).length,
    })
  );

  res.json({ categories });
});

// --- Compliance Query Endpoint ---

app.post('/compliance/query', auth, async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }
    const result = await queryCompliance(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

// --- Error Handling ---

app.use(errorHandler.notFoundHandler);
app.use(errorHandler.errorHandler);

// --- Server Startup and Graceful Shutdown ---

const server = app.listen(config.server.port, async () => {
  try {
    await redisClient.connect();
    logger.info(`Server is running on port ${config.server.port}`);
    logger.info(
      `View API docs at http://localhost:${config.server.port}/api-docs`
    );
  } catch (err) {
    logger.error('Failed to connect to Redis', { error: err });
    process.exit(1);
  }
});

const gracefulShutdown = () => {
  logger.info('Shutting down gracefully...');
  server.close(async () => {
    logger.info('HTTP server closed.');
    try {
      await redisClient.quit();
      logger.info('Redis client disconnected.');
    } catch (err) {
      logger.error('Error during Redis disconnect', { error: err });
    }
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

export default app;
