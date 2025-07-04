import fastify from 'fastify';
import 'dotenv/config';
import { logger, initializeLogger } from '../../logger.js';
import config from '../../config.js'; // Import config
import { executeTool } from '../../registry/tool-registry.js';
// import { registerSelectedTools } from '../../registry/selected-tools.js'; // Removed as it's not needed or exists

const app = fastify({ logger: true });

// Initialize logger with config
initializeLogger(config);

// Tools are now registered via tool-registry.js directly or another central mechanism
// registerSelectedTools(); // Removed call to non-existent function

app.get('/health', async () => ({ status: 'ok', service: 'tool-execution-service' }));

app.post('/execute', async (request, reply) => {
  const { toolId, payload } = request.body;
  if (!toolId || !payload) {
    return reply.code(400).send({ type: 'error', message: 'Missing toolId or payload' });
  }
  try {
    const result = await executeTool(toolId, payload);
    reply.send({ type: 'success', result });
  } catch (error) {
    logger.error(`Tool execution error for ${toolId}:`, error);
    reply.code(500).send({ type: 'error', message: error.message });
  }
});

const PORT = process.env.TOOL_EXECUTION_PORT || 3002;

const startToolExecutionService = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Tool Execution Service listening on port ${PORT}`);
  } catch (err) {
    logger.error('Tool Execution Service startup error:', err);
    process.exit(1);
  }
};

startToolExecutionService();
