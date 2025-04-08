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
    ...(err.details && { details: err.details })
  };
};

/**
 * Global error handler
 */
export const errorHandler = (err, req, res, next) => {
  // Default status code and error
  const statusCode = err.statusCode || 500;
  
  // Log the error (only internal errors as warnings/errors, expected client errors as debug)
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
    logger.error(err.stack);
  } else if (statusCode >= 400) {
    logger.debug(`${statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  }
  
  // Handle JWT errors specifically
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json(formatError({
      errorCode: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
      details: { originalError: err.message }
    }));
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json(formatError({
      errorCode: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: err.details || err.errors || err.message
    }));
  }
  
  // Handle generic API errors
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json(formatError(err));
  }
  
  // Handle all other errors
  res.status(statusCode).json(formatError({
    errorCode: err.errorCode || 'SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' && statusCode === 500
      ? 'An unexpected error occurred'
      : err.message,
    details: err.details
  }));
};

/**
 * Helper function to create specific API errors
 */
export const createError = {
  badRequest: (message, errorCode = 'BAD_REQUEST', details = null) => 
    new ApiError(400, message, errorCode, details),
    
  unauthorized: (message = 'Authentication required', errorCode = 'UNAUTHORIZED', details = null) => 
    new ApiError(401, message, errorCode, details),
    
  forbidden: (message = 'Access denied', errorCode = 'FORBIDDEN', details = null) => 
    new ApiError(403, message, errorCode, details),
    
  notFound: (message = 'Resource not found', errorCode = 'NOT_FOUND', details = null) => 
    new ApiError(404, message, errorCode, details),
    
  conflict: (message, errorCode = 'CONFLICT', details = null) => 
    new ApiError(409, message, errorCode, details),
    
  tooManyRequests: (message = 'Too many requests', errorCode = 'TOO_MANY_REQUESTS', details = null) => 
    new ApiError(429, message, errorCode, details),
    
  internal: (message = 'Internal server error', errorCode = 'INTERNAL_ERROR', details = null) => 
    new ApiError(500, message, errorCode, details),
};

export default {
  ApiError,
  notFoundHandler,
  errorHandler,
  createError
}; 