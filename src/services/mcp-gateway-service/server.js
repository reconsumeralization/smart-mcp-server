// Notes for agents:
// This server is part of the Model Context Protocol (MCP) gateway service.
// Its primary responsibility is to route requests to the appropriate handlers and manage tool execution.
//
// **Recent Issues and Debugging:**
// We've encountered persistent 404 (Not Found) errors when attempting to register A2A agents via the /a2a/v2/agents/register endpoint.
//
// **Problematic Area:** The a2aRouter, which defines the A2A-specific routes, was initially not being correctly registered with the Fastify application.
// **Fix Applied:** The a2aRouter is now explicitly imported and registered with a '/a2a/v2' prefix. This should ensure that requests to /a2a/v2/agents/register are correctly routed.
//
// **Further Debugging:**
// - A temporary `/test-route` (GET /test-route) has been added to verify basic server routing. If this route is also inaccessible, it indicates a fundamental issue with the Fastify server starting or listening on the expected port (3001).
// - Verifying server startup logs: Ensure the server logs indicate it's listening on port 3001.
// - Process inspection: Use `netstat -ano | findstr :3001` (Windows) or `lsof -i :3001` (Linux/macOS) to confirm that a process is listening on port 3001.
// - Ensure all node.js processes are killed before restarting the server to avoid port conflicts.
//
// **ASCII Image Generation Feature (Future Implementation):**
// Our next goal is to implement a feature for generating ASCII art images. This will likely involve:
// 1. Adding a new API endpoint (e.g., POST /image/ascii).
// 2. Implementing or integrating an ASCII conversion library.
// 3. Updating agent capabilities via the .well-known/agent.json endpoint.
// 4. Client-side integration examples.

import fastify from 'fastify';
import 'dotenv/config';
import { processArrow, getCoreCapabilities } from '../../archer/core-arrow-processor.js';
import { logger } from '../../logger.js'; // Changed to named import
import fetch from 'node-fetch';
import { listAllTools } from '../../registry/tool-registry.js'; // Import to list all registered tools
import a2aRouter from '../../routes/a2a.js'; // Import the A2A router

const app = fastify({ logger: true });

// Register A2A routes
app.register(a2aRouter, { prefix: '/a2a/v2' });

// Debug route - will remove later
app.get('/test-route', async (request, reply) => {
  reply.send({ message: 'Test route hit!' });
});

const TOOL_EXECUTION_SERVICE_URL = process.env.TOOL_EXECUTION_SERVICE_URL || 'http://localhost:3002';

app.get('/health', async () => ({ status: 'ok', service: 'mcp-gateway-service' }));

// Existing agent.json endpoint now also includes tool definitions for Cursor
app.get('/.well-known/agent.json', async () => {
  const coreCapabilities = getCoreCapabilities();
  const tools = listAllTools(); // Get all registered tools with their metadata
  console.log("Tools retrieved for agent.json:", tools); // <--- ADDED THIS LINE

  return {
    name: coreCapabilities.name, // e.g., 'core-arrow-processor'
    capabilities: {
      ...coreCapabilities.capabilities,
      toolCall: tools.map(tool => ({
        toolId: tool.toolId,
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        outputSchema: tool.outputSchema,
        category: tool.category,
        tags: tool.tags,
      })),
    },
  };
});

app.post('/arrow', async (request, reply) => {
  const { type, payload } = request.body;

  if (type === 'tool.call') {
    try {
      const response = await fetch(`${TOOL_EXECUTION_SERVICE_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        logger.error(`Error forwarding tool.call to Tool Execution Service: ${response.status} - ${errorData.message}`);
        return reply.code(response.status).send({ type: 'error', message: errorData.message });
      }

      const result = await response.json();
      return reply.send({ type: 'tool.result', result: result.result });
    } catch (error) {
      logger.error('Failed to communicate with Tool Execution Service:', error);
      return reply.code(500).send({ type: 'error', message: 'Failed to connect to Tool Execution Service' });
    }
  } else {
    const responseArrow = await processArrow(request.body);
    if (responseArrow?.type === 'error') {
      reply.code(400);
    }
    reply.send(responseArrow);
  }
});

const PORT = process.env.MCP_GATEWAY_PORT || 3001;

const startGatewayService = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`MCP Gateway Service listening on port ${PORT}`);
  } catch (err) {
    logger.error('MCP Gateway Service startup error:', err);
    process.exit(1);
  }
};

startGatewayService();