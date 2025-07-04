import fastify from 'fastify';
import 'dotenv/config';
import logger from '../../logger.js';
import SystemMonitor from '../../monitoring/system-monitor.js';

const app = fastify({ logger: true });
const systemMonitor = new SystemMonitor({ interval: 5000 });

// Start monitoring when the service starts
systemMonitor.start();

app.get('/health', async () => ({ status: 'ok', service: 'monitoring-analytics-service' }));

app.get('/metrics', async () => {
  return systemMonitor.getMetrics();
});

app.get('/status', async () => {
  return systemMonitor.getHealthStatus();
});

const PORT = process.env.MONITORING_ANALYTICS_PORT || 3003;

const startMonitoringAnalyticsService = async () => {
  try {
    await app.listen({ port: PORT, host: '0.0.0.0' });
    logger.info(`Monitoring & Analytics Service listening on port ${PORT}`);
  } catch (err) {
    logger.error('Monitoring & Analytics Service startup error:', err);
    process.exit(1);
  }
};

startMonitoringAnalyticsService(); 