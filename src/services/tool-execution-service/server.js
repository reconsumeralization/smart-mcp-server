import fastify from 'fastify';
import 'dotenv/config';
import logger from '../../logger.js';
import { executeTool } from '../../registry/tool-registry.js'; // Assuming a tool-registry for execution

const app = fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', service: 'tool-execution-service' }));

app.post('/execute', async (request, reply) => {
  const { toolId, payload } = request.body;
  if (!toolId || !payload) {
    return reply.code(400).send({ type: 'error', message: 'Missing toolId or payload' });
  }
  try {
    const result = await executeTool(toolId, payload); // Execute the tool
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
