const Joi = require('joi');
const logger = require('../logger');

// Common validation schemas
const schemas = {
  user: {
    register: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().min(8).required(),
      firstName: Joi.string().min(2).max(50).required(),
      lastName: Joi.string().min(2).max(50).required(),
      role: Joi.string().valid('admin', 'user', 'viewer', 'api_client').optional()
    }),
    login: Joi.object({
      email: Joi.string().email().required(),
      password: Joi.string().required()
    })
  },
  workflow: {
    create: Joi.object({
      name: Joi.string().min(3).max(100).required(),
      description: Joi.string().max(500).optional(),
      steps: Joi.array().items(Joi.object()).min(1).required(),
      variables: Joi.object().optional()
    }),
    execute: Joi.object({
      workflowId: Joi.string().required(),
      parameters: Joi.object().optional()
    })
  },
  financial: {
    payment: Joi.object({
      amount: Joi.number().positive().required(),
      currency: Joi.string().length(3).required(),
      customerId: Joi.string().required(),
      description: Joi.string().max(200).optional()
    })
  }
};

// Validation middleware factory
const validate = (schemaPath) => {
  return (req, res, next) => {
    const schema = getSchemaByPath(schemaPath);
    if (!schema) {
      return res.status(500).json({ error: 'Validation schema not found' });
    }
    
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      logger.warn('Validation failed', { errors, body: req.body });
      
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }
    
    req.validatedBody = value;
    next();
  };
};

// Helper function to get schema by path
function getSchemaByPath(path) {
  const parts = path.split('.');
  let schema = schemas;
  
  for (const part of parts) {
    schema = schema[part];
    if (!schema) return null;
  }
  
  return schema;
}

// Sanitization middleware
const sanitize = (req, res, next) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  next();
};

function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) return obj;
  
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      // Basic XSS prevention
      sanitized[key] = value
        .replace(/<script[^>]*>.*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, '')
        .trim();
    } else if (typeof value === 'object') {
      sanitized[key] = sanitizeObject(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

module.exports = { validate, sanitize, schemas };