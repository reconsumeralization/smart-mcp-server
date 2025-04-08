import jwt from 'jsonwebtoken';
import logger from '../logger.js';

// Get JWT secret from environment variables or use a default for development
const JWT_SECRET = process.env.JWT_SECRET || 'mcp-server-development-secret';
const TOKEN_EXPIRY = process.env.TOKEN_EXPIRY || '1h';

/**
 * Generate a JWT token for a user
 * @param {Object} user - User object to include in token payload
 * @returns {string} JWT token
 */
export const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      username: user.username,
      roles: user.roles || ['user']
    }, 
    JWT_SECRET, 
    { expiresIn: TOKEN_EXPIRY }
  );
};

/**
 * Verify a JWT token
 * @param {string} token - JWT token to verify
 * @returns {Object|null} Decoded token payload or null if invalid
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    logger.error(`Token verification failed: ${error.message}`);
    return null;
  }
};

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
export const authenticate = (req, res, next) => {
  // Skip authentication in development mode if configured
  if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
    req.user = { id: 'dev-user', username: 'developer', roles: ['admin'] };
    return next();
  }

  // Get the token from the authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required',
      message: 'No valid authentication token provided'
    });
  }

  // Extract the token
  const token = authHeader.split(' ')[1];
  
  // Verify the token
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ 
      error: 'Authentication failed',
      message: 'Invalid or expired token'
    });
  }

  // Add the user to the request object
  req.user = decoded;
  
  // Log authentication
  logger.debug(`User authenticated: ${decoded.username}`);
  
  // Continue to the next middleware or route handler
  next();
};

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of roles allowed to access the route
 * @returns {Function} Middleware function
 */
export const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    // Skip authorization in development mode if configured
    if (process.env.NODE_ENV === 'development' && process.env.SKIP_AUTH === 'true') {
      return next();
    }

    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'You must be logged in to access this resource'
      });
    }

    // Check if the user has the required role
    if (roles.length > 0 && !req.user.roles.some(role => roles.includes(role))) {
      logger.warn(`Authorization failed for user ${req.user.username}: Required roles ${roles.join(', ')}`);
      return res.status(403).json({ 
        error: 'Authorization failed',
        message: 'You do not have permission to access this resource'
      });
    }

    // User has required role, proceed
    next();
  };
};

export default {
  authenticate,
  authorize,
  generateToken,
  verifyToken
}; 