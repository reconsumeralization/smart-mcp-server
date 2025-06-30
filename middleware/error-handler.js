import logger from '../logger.js';

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  constructor(statusCode, message, errorCode = 'API_ERROR', details = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Not found middleware - for 404 routes
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(
    404,
    `Resource not found - ${req.originalUrl}`,
    'RESOURCE_NOT_FOUND'
  );
  next(error);
};

/**
 * Normalized error response structure
 */
const formatError = (err) => {
  return {
    status: 'error',
    code: err.errorCode || 'SERVER_ERROR',
    message: err.message || 'An unexpected error occurred',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    ...(err.details && { details: err.details }),
  };
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, _next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const statusCode = err.statusCode || 500;

  // Structured logging
  const logPayload = {
    statusCode,
    message: err.message,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    stack: err.stack,
    details: err.details,
    errorCode: err.errorCode,
  };

  // Log the error
  if (statusCode >= 500) {
    logger.error('Unhandled server error', logPayload);
  } else {
    // Log client errors at a lower level
    logger.warn('Client-side error', logPayload);
  }

  // Handle JWT errors specifically
  if (err.name === 'JsonWebTokenError') {
    const error = createError.unauthorized('Invalid authentication token');
    return res.status(error.statusCode).json(formatError(error));
  }

  // Handle validation errors (e.g., from Joi or express-validator)
  if (err.name === 'ValidationError') {
    const error = createError.badRequest(
      'Validation failed',
      'VALIDATION_ERROR',
      err.details || err.errors
    );
    return res.status(error.statusCode).json(formatError(error));
  }

  // Handle malformed JSON body errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const error = createError.badRequest(
      'Malformed JSON in request body',
      'INVALID_JSON'
    );
    return res.status(error.statusCode).json(formatError(error));
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(formatError(err));
  }

  // For all other errors, send a generic response in production
  if (isProduction) {
    const error = createError.internal(); // Generic internal error
    return res.status(error.statusCode).json(formatError(error));
  }

  // In development, send the full error
  res.status(statusCode).json(formatError(err));
};

/**
 * Helper function to create specific API errors
 */
export const createError = {
  badRequest: (message, errorCode = 'BAD_REQUEST', details = null) =>
    new ApiError(400, message, errorCode, details),

  unauthorized: (
    message = 'Authentication required',
    errorCode = 'UNAUTHORIZED',
    details = null
  ) => new ApiError(401, message, errorCode, details),

  forbidden: (
    message = 'Access denied',
    errorCode = 'FORBIDDEN',
    details = null
  ) => new ApiError(403, message, errorCode, details),

  notFound: (
    message = 'Resource not found',
    errorCode = 'NOT_FOUND',
    details = null
  ) => new ApiError(404, message, errorCode, details),

  conflict: (message, errorCode = 'CONFLICT', details = null) =>
    new ApiError(409, message, errorCode, details),

  tooManyRequests: (
    message = 'Too many requests',
    errorCode = 'TOO_MANY_REQUESTS',
    details = null
  ) => new ApiError(429, message, errorCode, details),

  internal: (
    message = 'Internal server error',
    errorCode = 'INTERNAL_ERROR',
    details = null
  ) => new ApiError(500, message, errorCode, details),
};

export default {
  ApiError,
  notFoundHandler,
  errorHandler,
  createError,
};
