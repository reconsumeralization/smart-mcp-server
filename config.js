import dotenv from 'dotenv';
import logger from './logger.js';

dotenv.config();

logger.debug('POSTGRES_URL from .env: %s', process.env.POSTGRES_URL);

export default {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    model: process.env.GEMINI_MODEL || 'gemini-pro', // Default to gemini-pro
  },
  security: {
    helmet: {}, // Default helmet config
    cors: {
      origin: '*', // Be more restrictive in production
    },
    rateLimit: {
      standard: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
      },
      admin: {
        windowMs: 15 * 60 * 1000,
        max: 200,
      },
      execution: {
        windowMs: 15 * 60 * 1000,
        max: 50,
      },
    },
    maxRequestSize: '10mb',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  stripe: {
    apiKey: process.env.STRIPE_API_KEY,
    toolName: 'stripe-tool',
  },
  github: {
    token: process.env.GITHUB_TOKEN,
  },
  database: {
    url: process.env.POSTGRES_URL,
  },
  workflow: {
    concurrency: 5,
  },
  a2a: {
    matchThreshold: 0.7,
  },
};
