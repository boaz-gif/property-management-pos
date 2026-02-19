const NotificationService = require('../services/notificationService');
const { HTTP_STATUS } = require('../utils/constants');

class NotificationController {
  static async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20, unread_only = false } = req.query;
      
      const result = await NotificationService.getUserNotifications(req.user, {
        page: parseInt(page),
        limit: parseInt(limit),
        unreadOnly: unread_only === 'true' || unread_only === true
      });
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result.notifications,
        unreadCount: result.unreadCount,
        total: result.total
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const result = await NotificationService.markAsRead(id, req.user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notification marked as read',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAllAsRead(req, res, next) {
    try {
      const updatedCount = await NotificationService.markAllAsRead(req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'All notifications marked as read',
        updated: updatedCount
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteNotification(req, res, next) {
    try {
      const { id } = req.params;
      const result = await NotificationService.deleteNotification(id, req.user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Notification not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notification deleted'
      });
    } catch (error) {
      next(error);
    }
  }
  
  static async getUnreadCount(req, res, next) {
    try {
      const count = await NotificationService.getUnreadCount(null, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: count
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = NotificationController;
