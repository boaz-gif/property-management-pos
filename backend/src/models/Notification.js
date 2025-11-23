const Database = require('../utils/database');

class Notification {
  static async create(notificationData) {
    const { tenantId, userId, type, title, message, data } = notificationData;

    const query = `
      INSERT INTO notifications (tenant_id, user_id, type, title, message, data, is_read, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, false, NOW())
      RETURNING *
    `;

    const values = [tenantId, userId, type, title, message, JSON.stringify(data || {})];
    const result = await Database.query(query, values);

    return result.rows[0];
  }

  static async findByUserId(userId, limit = 20) {
    const query = `
      SELECT n.*,
             CASE
               WHEN n.is_read = true THEN 'Read'
               ELSE 'Unread'
             END as status_display
      FROM notifications n
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2
    `;

    const result = await Database.query(query, [userId, limit]);
    return result.rows;
  }
  
  static async findByTenantId(tenantId, limit = 20) {
    const query = `
      SELECT n.*,
             CASE
               WHEN n.is_read = true THEN 'Read'
               ELSE 'Unread'
             END as status_display
      FROM notifications n
      WHERE n.tenant_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2
    `;

    const result = await Database.query(query, [tenantId, limit]);
    return result.rows;
  }

  static async markAsRead(id, userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE id = $1 AND (user_id = $2 OR tenant_id = (SELECT property_id FROM users WHERE id = $2 AND role = 'tenant'))
      RETURNING *
    `;

    const result = await Database.query(query, [id, userId]);
    return result.rows[0];
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false
    `;

    const result = await Database.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = Notification;
