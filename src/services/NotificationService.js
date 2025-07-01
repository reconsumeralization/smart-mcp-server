const mongoose = require('mongoose');
const EventEmitter = require('events');

// Notification Model
const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['workflow', 'payment', 'system', 'user'],
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, {
  timestamps: true
});

const Notification = mongoose.model('Notification', notificationSchema);

// Notification Service
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.setupEventHandlers();
  }
  
  setupEventHandlers() {
    this.on('workflow:started', this.handleWorkflowStarted.bind(this));
    this.on('workflow:completed', this.handleWorkflowCompleted.bind(this));
    this.on('workflow:failed', this.handleWorkflowFailed.bind(this));
    this.on('payment:processed', this.handlePaymentProcessed.bind(this));
    this.on('system:alert', this.handleSystemAlert.bind(this));
  }
  
  async createNotification(userId, type, title, message, data = {}, priority = 'medium') {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      priority
    });
    
    await notification.save();
    
    // Emit to real-time listeners
    this.emit('notification:created', {
      userId,
      notification: notification.toObject()
    });
    
    return notification;
  }
  
  async getNotifications(userId, options = {}) {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false,
      type = null
    } = options;
    
    const query = { userId };
    if (unreadOnly) query.isRead = false;
    if (type) query.type = type;
    
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit);
    
    const total = await Notification.countDocuments(query);
    
    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }
  
  async markAsRead(userId, notificationIds) {
    await Notification.updateMany(
      { userId, _id: { $in: notificationIds } },
      { isRead: true }
    );
  }
  
  async handleWorkflowStarted(data) {
    await this.createNotification(
      data.userId,
      'workflow',
      'Workflow Started',
      `Workflow "${data.workflowName}" has been started`,
      { workflowId: data.workflowId }
    );
  }
  
  async handleWorkflowCompleted(data) {
    await this.createNotification(
      data.userId,
      'workflow',
      'Workflow Completed',
      `Workflow "${data.workflowName}" completed successfully`,
      { workflowId: data.workflowId, duration: data.duration }
    );
  }
  
  async handleWorkflowFailed(data) {
    await this.createNotification(
      data.userId,
      'workflow',
      'Workflow Failed',
      `Workflow "${data.workflowName}" failed: ${data.error}`,
      { workflowId: data.workflowId, error: data.error },
      'high'
    );
  }
  
  async handlePaymentProcessed(data) {
    await this.createNotification(
      data.userId,
      'payment',
      'Payment Processed',
      `Payment of ${data.amount} ${data.currency} processed successfully`,
      { paymentId: data.paymentId, amount: data.amount }
    );
  }
  
  async handleSystemAlert(data) {
    // Send to all admin users
    const User = require('../models/User');
    const adminUsers = await User.find({ role: 'admin', isActive: true });
    
    for (const admin of adminUsers) {
      await this.createNotification(
        admin._id,
        'system',
        'System Alert',
        data.message,
        data.details || {},
        'urgent'
      );
    }
  }
}

module.exports = { NotificationService, Notification };