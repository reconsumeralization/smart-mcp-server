import fastify from 'fastify';
import 'dotenv/config';
import { handleArrow, getCapabilities } from '../../archer/arrow-handler.js';
import logger from '../../logger.js';

const app = fastify({ logger: true });

app.get('/health', async () => ({ status: 'ok', service: 'mcp-gateway-service' }));

app.get('/.well-known/agent.json', async () => getCapabilities());

app.post('/arrow', async (request, reply) => {
  const responseArrow = await handleArrow(request.body);
  if (responseArrow?.type === 'error') {
    reply.code(400);
  }
  reply.send(responseArrow);
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