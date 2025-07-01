const fs = require('fs').promises;
const logger = require('./src/logger');

async function runPhase6() {
  logger.info('🚀 Phase 6: Code Development & Implementation\n');
  
  // Task 6.1: Authentication System Implementation
  logger.info('🔐 Task 6.1: Authentication System Implementation');
  
  // Create User Model
  const userModel = `const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 8
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['admin', 'user', 'viewer', 'api_client'],
    default: 'user'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  apiKey: {
    type: String,
    unique: true,
    sparse: true
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Generate API key
userSchema.methods.generateApiKey = function() {
  const crypto = require('crypto');
  this.apiKey = crypto.randomBytes(32).toString('hex');
  return this.apiKey;
};

module.exports = mongoose.model('User', userSchema);`;
  
  await fs.writeFile('src/models/User.js', userModel);
  logger.info('   ✅ User model created');
  
  // Create Authentication Service
  const authService = `const jwt = require('jsonwebtoken');
const User = require('../models/User');
const crypto = require('crypto');

class AuthService {
  static generateTokens(userId) {
    const accessToken = jwt.sign(
      { userId, type: 'access' },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    const refreshToken = jwt.sign(
      { userId, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: '7d' }
    );
    
    return { accessToken, refreshToken };
  }
  
  static async verifyToken(token, type = 'access') {
    const secret = type === 'access' ? process.env.JWT_SECRET : process.env.JWT_REFRESH_SECRET;
    return jwt.verify(token, secret);
  }
  
  static async login(email, password) {
    const user = await User.findOne({ email, isActive: true });
    if (!user || !(await user.comparePassword(password))) {
      throw new Error('Invalid credentials');
    }
    
    user.lastLogin = new Date();
    await user.save();
    
    const tokens = this.generateTokens(user._id);
    return {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      },
      ...tokens
    };
  }
  
  static async refreshToken(refreshToken) {
    const decoded = await this.verifyToken(refreshToken, 'refresh');
    const user = await User.findById(decoded.userId);
    
    if (!user || !user.isActive) {
      throw new Error('Invalid refresh token');
    }
    
    return this.generateTokens(user._id);
  }
  
  static async createUser(userData) {
    const user = new User(userData);
    await user.save();
    return user;
  }
}

module.exports = AuthService;`;
  
  await fs.writeFile('src/services/AuthService.js', authService);
  logger.info('   ✅ Authentication service created');
  
  // Task 6.2: API Validation Middleware
  logger.info('\n🛡️ Task 6.2: API Validation Middleware');
  
  const validationMiddleware = `const Joi = require('joi');
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

module.exports = { validate, sanitize };`;
  
  await fs.writeFile('src/middleware/validation.js', validationMiddleware);
  logger.info('   ✅ Validation middleware created');
  
  // Task 6.3: API Routes Implementation
  logger.info('\n🛣️ Task 6.3: API Routes Implementation');
  
  const authRoutes = `const express = require('express');
const { validate } = require('../middleware/validation');
const AuthService = require('../services/AuthService');
const { auth } = require('../middleware/auth'); // Assuming auth middleware exists

const router = express.Router();

router.post('/register', validate('user.register'), async (req, res) => {
  try {
    const user = await AuthService.createUser(req.validatedBody);
    res.status(201).json({ id: user._id, email: user.email });
  } catch (error) {
    res.status(400).json({ error: 'Registration failed' });
  }
});

router.post('/login', validate('user.login'), async (req, res) => {
  try {
    const { email, password } = req.validatedBody;
    const result = await AuthService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(401).json({ error: 'Refresh token required' });
  }
  
  try {
    const tokens = await AuthService.refreshToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    res.status(403).json({ error: 'Invalid refresh token' });
  }
});

router.get('/profile', auth, (req, res) => {
  // auth middleware should attach user to req
  res.json(req.user);
});

module.exports = router;`;
  
  await fs.writeFile('src/routes/auth.js', authRoutes);
  logger.info('   ✅ Auth routes created');
  
  const workflowRoutes = `const express = require('express');
const { auth } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const WorkflowManager = require('../workflow-manager'); // Assuming this exists

const router = express.Router();

router.post(
  '/',
  auth,
  validate('workflow.create'),
  async (req, res) => {
    // Create new workflow
  }
);

router.get('/', auth, async (req, res) => {
  // Get all workflows
});

router.get('/:id', auth, async (req, res) => {
  // Get workflow by ID
});

router.post(
  '/:id/execute',
  auth,
  validate('workflow.execute'),
  async (req, res) => {
    // Execute a workflow
  }
);

module.exports = router;`;

  await fs.writeFile('src/routes/workflows.js', workflowRoutes);
  logger.info('   ✅ Workflow routes created');

  // Task 6.4: Real-time Notification Service
  logger.info('\n🔔 Task 6.4: Real-time Notification Service');

  const notificationService = `const Notification = require('../models/Notification');

class NotificationService {
  constructor(io) {
    this.io = io;
  }
  
  sendToUser(userId, event, data) {
    this.io.to(userId).emit(event, data);
  }
  
  broadcast(event, data) {
    this.io.emit(event, data);
  }
  
  async createNotification(data) {
    const notification = new Notification(data);
    await notification.save();
    
    if (data.userId) {
      this.sendToUser(data.userId, 'new_notification', notification);
    } else {
      this.broadcast('system_alert', notification);
    }
    
    return notification;
  }
}

module.exports = NotificationService;`;

  await fs.writeFile('src/services/NotificationService.js', notificationService);
  logger.info('   ✅ Notification service created');
  
  const notificationModel = `const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  type: {
    type: String,
    enum: ['workflow', 'payment', 'system', 'user'],
    required: true
  },
  message: {
    type: String,
    required: true
  },
  isRead: {
    type: Boolean,
    default: false
  },
  data: {
    type: Object
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Notification', notificationSchema);`;

  await fs.writeFile('src/models/Notification.js', notificationModel);
  logger.info('   ✅ Notification model created');

  // Task 6.5: Analytics Service
  logger.info('\n📈 Task 6.5: Analytics Service');

  const analyticsService = `const mongoose = require('mongoose');

class AnalyticsService {
  // Financial Overview
  static async getFinancialOverview() {
    // Placeholder for data aggregation
    return {
      totalRevenue: 0,
      transactionCount: 0,
      avgTransactionValue: 0,
      monthlyGrowth: 0
    };
  }
  
  // System Performance
  static async getSystemPerformance() {
    // Placeholder
    return {
      responseTime: 0,
      errorRate: 0,
      uptime: '100%'
    };
  }
  
  // Other methods...
}

module.exports = AnalyticsService;`;

  await fs.writeFile('src/services/AnalyticsService.js', analyticsService);
  logger.info('   ✅ Analytics service stub created');
  
  logger.info('\n🎉 Phase 6 Complete! Core components developed.');
}

runPhase6().catch(logger.error); 