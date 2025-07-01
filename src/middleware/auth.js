const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../logger');

// Enhanced authentication middleware
const auth = async (req, res, next) => {
  try {
    let token;
    
    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7);
    }
    // Check for API key in headers
    else if (req.headers['x-api-key']) {
      const apiKey = req.headers['x-api-key'];
      const user = await User.findOne({ apiKey, isActive: true });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid API key' });
      }
      
      req.user = user;
      req.authType = 'api_key';
      return next();
    }
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }
    
    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    
    req.user = user;
    req.authType = 'jwt';
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Role-based authorization middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role
      });
    }
    
    next();
  };
};

// Optional authentication (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      const token = req.headers.authorization.substring(7);
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user && user.isActive) {
        req.user = user;
        req.authType = 'jwt';
      }
    }
  } catch (error) {
    // Silently fail for optional auth
    logger.debug('Optional auth failed:', error.message);
  }
  
  next();
};

module.exports = { auth, authorize, optionalAuth };