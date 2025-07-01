import express from 'express';
import NotificationService from '../services/NotificationService.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Protect all routes in this module
router.use(auth.authenticate);

// Endpoint to get a user's notifications
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await NotificationService.getNotifications(userId);
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Endpoint to mark a notification as read
router.patch('/:notificationId/read', async (req, res, next) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user.id;
    const notification = await NotificationService.markAsRead(notificationId, userId);
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found or you do not have permission.' });
    }
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

// Endpoint to mark all notifications as read
router.post('/read-all', async (req, res, next) => {
    try {
      const userId = req.user.id;
      await NotificationService.markAllAsRead(userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
});

export default router; 