const NotificationService = require('../services/notificationService');
const { HTTP_STATUS } = require('../utils/constants');

class NotificationController {
  static async getMyNotifications(req, res, next) {
    try {
      const notifications = await NotificationService.getUserNotifications(req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req, res, next) {
    try {
      const { id } = req.params;
      const result = await NotificationService.markAsRead(id, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Notification marked as read',
        data: result
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
