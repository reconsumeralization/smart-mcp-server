import { createClient } from 'redis';
import config from '../config.js';
import logger from '../logger.js';

const redisClient = createClient({
  password: config.redis.password,
  socket: {
    host: config.redis.host,
    port: config.redis.port,
    connectTimeout: 5000,
  },
});

redisClient.on('connect', () => {
  logger.info('Connecting to Redis...');
});

redisClient.on('ready', () => {
  logger.info('Redis client connected successfully.');
});

redisClient.on('error', (err) => {
  logger.error('Redis connection error.', { error: err });
});

redisClient.on('end', () => {
  logger.warn('Redis connection closed.');
});

// The client must be connected manually. We'll do this in server.js at startup.
export default redisClient;
