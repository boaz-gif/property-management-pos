const express = require('express');
const NotificationController = require('../../controllers/notificationController');
const { authenticate } = require('../../middleware/auth');
const { auditMiddleware } = require('../../middleware/auditMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/', NotificationController.getNotifications);
router.get('/unread-count', NotificationController.getUnreadCount);

// PUT - Mark all as read
router.put('/read-all', NotificationController.markAllAsRead);

// PUT - Mark notification as read (with audit logging)
router.put('/:id/read', 
  auditMiddleware,
  NotificationController.markAsRead
);

// DELETE - Soft delete notification
router.delete('/:id', NotificationController.deleteNotification);

module.exports = router;
