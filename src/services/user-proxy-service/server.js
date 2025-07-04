import fastify from 'fastify';
import 'dotenv/config';

const app = fastify();

app.get('/health', async (request, reply) => {
  return { status: 'ok', service: 'user-proxy-service' };
});

// SSE endpoint for real-time communication
app.get('/events', (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Keep the connection alive
  setInterval(() => {
    reply.raw.write('event: ping\\n');
  }, 30000); // Send a ping every 30 seconds to keep the connection open
