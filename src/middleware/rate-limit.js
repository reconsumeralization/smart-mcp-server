import rateLimit from 'express-rate-limit';
import logger from '../logger.js';

// Create a custom handler for rate limit exceeded
const rateLimitExceededHandler = (req, res, options) => {
  logger.warn(`Rate limit exceeded for IP: ${req.ip}, Path: ${req.path}`);

  // Create a clean error response
  return res.status(options.statusCode).json({
    error: 'Too Many Requests',
    message: options.message,
    retryAfter: Math.ceil(options.windowMs / 1000),
  });
};

// Standard rate limiter for general API endpoints
export const standardLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Max 100 requests per minute
  standardHeaders: true, // Return rate limit info in the headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
  message: 'Too many requests, please try again after a minute.',
  handler: rateLimitExceededHandler,
});

// Stricter rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 login attempts per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message:
    'Too many authentication attempts, please try again after 15 minutes.',
  handler: rateLimitExceededHandler,
});

// Tool execution rate limiter
export const executionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Max 30 tool executions per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many tool executions, please try again after a minute.',
  handler: rateLimitExceededHandler,
});

// Admin endpoints rate limiter
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // Max 50 admin requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many administrative requests, please try again after a minute.',
  handler: rateLimitExceededHandler,
});

// Rate limiter factory function to create custom limiters
export const createRateLimiter = (
  requestsPerMinute,
  windowMinutes = 1,
  customMessage = null
) => {
  const windowMs = windowMinutes * 60 * 1000;
  const message =
    customMessage ||
    `Too many requests, please try again after ${windowMinutes} minute(s).`;

  return rateLimit({
    windowMs,
    max: requestsPerMinute,
    standardHeaders: true,
    legacyHeaders: false,
    message,
    handler: rateLimitExceededHandler,
  });
};

export default {
  standardLimiter,
  authLimiter,
  executionLimiter,
  adminLimiter,
  createRateLimiter,
};
