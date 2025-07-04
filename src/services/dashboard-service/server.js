import fastify from 'fastify';
import 'dotenv/config';
import logger from '../../logger.js';
import { Server as SocketIOServer } from 'socket.io';
import { initializeWebSocketManager } from '../../web-socket-manager.js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = fastify({ logger: true });
let io;

app.get('/health', async () => ({ status: 'ok', service: 'dashboard-service' }));

// Serve dashboard HTML
app.get('/', async (request, reply) => {
  try {
    const dashboardPath = join(__dirname, '../../ui/dashboard.html'); // Adjust path as necessary
    if (fs.existsSync(dashboardPath)) {
      const html = fs.readFileSync(dashboardPath, 'utf8');
      reply.type('text/html').send(html);
    } else {
      reply.send({ message: 'Dashboard not found. Run the UI build process.' });
    }
  } catch (error) {
    logger.error('Dashboard error:', error);
    reply.code(500).send({ error: 'Dashboard unavailable' });
  }
});

const PORT = process.env.DASHBOARD_PORT || 3004;

const startDashboardService = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Dashboard Service listening on port ${PORT}`);

    io = new SocketIOServer(app.server, {
      cors: {
        origin: "*", // Configure this for production
        methods: ["GET", "POST"]
      }
    });
    initializeWebSocketManager(io);
    logger.info('🔌 WebSocket Manager initialized for Dashboard Service.');

  } catch (err) {
    logger.error('Dashboard Service startup error:', err);
    process.exit(1);
  }
};

startDashboardService(); 