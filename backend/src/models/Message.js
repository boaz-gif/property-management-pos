const Database = require('../utils/database');

class Message {
  static async create(messageData) {
    const { conversationId, senderId, content, attachments } = messageData;

    const result = await Database.query(
      `
        INSERT INTO messages (conversation_id, sender_id, content, attachments, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `,
      [conversationId, senderId || null, content, attachments ? JSON.stringify(attachments) : null]
    );

    return result.rows[0];
  }

  static async listByConversationId(conversationId, options = {}) {
    const { limit = 50, before } = options;

    const params = [conversationId];
    let whereClause = 'WHERE m.conversation_id = $1 AND m.deleted_at IS NULL';

    if (before) {
      params.push(before);
      whereClause += ` AND m.created_at < $${params.length}`;
    }

    params.push(limit);

    const result = await Database.query(
      `
        SELECT m.*, u.name AS sender_name, u.role AS sender_role
        FROM messages m
        LEFT JOIN users u ON u.id = m.sender_id
        ${whereClause}
        ORDER BY m.created_at DESC
        LIMIT $${params.length}
      `,
      params
    );

    return result.rows.reverse();
  }

  static async findById(messageId) {
    const result = await Database.query(
      `
        SELECT m.*
        FROM messages m
        WHERE m.id = $1 AND m.deleted_at IS NULL
      `,
      [messageId]
    );

    return result.rows[0];
  }
}

module.exports = Message;
