import api from './api';

const notificationAPI = {
  /**
   * Get paginated notifications for the current user
   * @param {Object} params - Query parameters (page, limit, unread_only)
   */
  getNotifications: (params = {}) => api.get('/notifications', { params }),

  /**
   * Mark a single notification as read
   * @param {string|number} id - Notification ID
   */
  markAsRead: (id) => api.put(`/notifications/${id}/read`),

  /**
   * Mark all notifications for the current user as read
   */
  markAllAsRead: () => api.put('/notifications/read-all'),

  /**
   * Soft delete a notification
   * @param {string|number} id - Notification ID
   */
  deleteNotification: (id) => api.delete(`/notifications/${id}`),

  /**
   * Get unread count for the current user
   */
  getUnreadCount: () => api.get('/notifications/unread-count')
};

export default notificationAPI;
