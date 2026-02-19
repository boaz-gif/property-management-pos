const Database = require('../utils/database');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');

class Notification extends BaseSoftDeleteModel {
  constructor() {
    super('notifications', Database);
  }

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

  static async findByUserId(userId, options = {}) {
    const { page = 1, limit = 20, unreadOnly = false } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE n.user_id = $1 AND n.deleted_at IS NULL';
    const params = [userId];

    if (unreadOnly) {
      whereClause += ' AND n.is_read = false';
    }

    const query = `
      SELECT n.*,
             CASE
               WHEN n.is_read = true THEN 'Read'
               ELSE 'Unread'
             END as status_display,
             COUNT(*) OVER() as total_count
      FROM notifications n
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);
    const result = await Database.query(query, params);
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
      WHERE n.tenant_id = $1 AND n.deleted_at IS NULL
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
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await Database.query(query, [id, userId]);
    return result.rows[0];
  }

  static async markAllAsRead(userId) {
    const query = `
      UPDATE notifications
      SET is_read = true
      WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL
    `;

    const result = await Database.query(query, [userId]);
    return result.rowCount;
  }

  static async getUnreadCount(userId) {
    const query = `
      SELECT COUNT(*) as unread_count
      FROM notifications
      WHERE user_id = $1 AND is_read = false AND deleted_at IS NULL
    `;

    const result = await Database.query(query, [userId]);
    return result.rows[0];
  }

  static async archive(id, userId) {
    const query = `
      UPDATE notifications 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
      WHERE id = $2 AND user_id = $1 AND deleted_at IS NULL 
      RETURNING *
    `;
    const result = await Database.query(query, [userId, id]);
    return result.rows[0];
  }

  static async restore(id, user) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Only admins can restore archived notifications');
    }
    
    const query = `
      UPDATE notifications 
      SET deleted_at = NULL, deleted_by = NULL 
      WHERE id = $1 AND deleted_at IS NOT NULL 
      RETURNING *
    `;
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Notification not found or not archived');
    }
    
    return result.rows[0];
  }

  static async permanentDelete(id, user) {
    if (user.role !== 'super_admin') {
      throw new Error('Only super admins can permanently delete records');
    }
    
    const query = 'DELETE FROM notifications WHERE id = $1 RETURNING *';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Notification not found');
    }
    
    return result.rows[0];
  }
}

module.exports = Notification;
