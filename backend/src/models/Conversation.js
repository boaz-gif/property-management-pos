const Database = require('../utils/database');

class Conversation {
  static async create(conversationData) {
    const { organizationId, propertyId, entityType, entityId, subject, createdBy } = conversationData;

    const result = await Database.query(
      `
        INSERT INTO conversations (organization_id, property_id, entity_type, entity_id, subject, created_by, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING *
      `,
      [organizationId || null, propertyId || null, entityType || null, entityId || null, subject || null, createdBy || null]
    );

    return result.rows[0];
  }

  static async findById(conversationId) {
    const result = await Database.query(
      `
        SELECT c.*
        FROM conversations c
        WHERE c.id = $1
      `,
      [conversationId]
    );

    return result.rows[0];
  }

  static async findForUser(userId, options = {}) {
    const { organizationId, propertyId, entityType, entityId, limit = 50, offset = 0 } = options;

    const params = [userId];
    let whereClause = `
      WHERE cp.user_id = $1
        AND cp.left_at IS NULL
        AND (c.archived_at IS NULL)
    `;

    if (organizationId) {
      params.push(organizationId);
      whereClause += ` AND c.organization_id = $${params.length}`;
    }

    if (propertyId) {
      params.push(propertyId);
      whereClause += ` AND c.property_id = $${params.length}`;
    }

    if (entityType) {
      params.push(entityType);
      whereClause += ` AND c.entity_type = $${params.length}`;
    }

    if (entityId) {
      params.push(entityId);
      whereClause += ` AND c.entity_id = $${params.length}`;
    }

    params.push(limit, offset);

    const result = await Database.query(
      `
        SELECT
          c.*,
          lm.id AS last_message_id,
          lm.content AS last_message_content,
          lm.created_at AS last_message_created_at,
          lm.sender_id AS last_message_sender_id,
          (
            SELECT COUNT(*)
            FROM messages m
            WHERE m.conversation_id = c.id
              AND m.deleted_at IS NULL
              AND (
                cp.last_read_message_id IS NULL
                OR m.created_at > (SELECT created_at FROM messages WHERE id = cp.last_read_message_id)
              )
          )::int AS unread_count
        FROM conversations c
        JOIN conversation_participants cp ON cp.conversation_id = c.id
        LEFT JOIN LATERAL (
          SELECT m.*
          FROM messages m
          WHERE m.conversation_id = c.id AND m.deleted_at IS NULL
          ORDER BY m.created_at DESC
          LIMIT 1
        ) lm ON TRUE
        ${whereClause}
        ORDER BY COALESCE(lm.created_at, c.created_at) DESC
        LIMIT $${params.length - 1} OFFSET $${params.length}
      `,
      params
    );

    return result.rows;
  }

  static async addParticipant(conversationId, userId, roleAtTime) {
    const result = await Database.query(
      `
        INSERT INTO conversation_participants (conversation_id, user_id, role_at_time, joined_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (conversation_id, user_id)
        DO UPDATE SET left_at = NULL
        RETURNING *
      `,
      [conversationId, userId, roleAtTime || null]
    );

    return result.rows[0];
  }

  static async removeParticipant(conversationId, userId) {
    const result = await Database.query(
      `
        UPDATE conversation_participants
        SET left_at = NOW()
        WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
        RETURNING *
      `,
      [conversationId, userId]
    );

    return result.rows[0];
  }

  static async listParticipants(conversationId) {
    const result = await Database.query(
      `
        SELECT cp.*, u.name, u.email, u.role
        FROM conversation_participants cp
        JOIN users u ON u.id = cp.user_id AND u.deleted_at IS NULL
        WHERE cp.conversation_id = $1
        ORDER BY cp.joined_at ASC
      `,
      [conversationId]
    );

    return result.rows;
  }

  static async isParticipant(conversationId, userId) {
    const result = await Database.query(
      `
        SELECT 1
        FROM conversation_participants
        WHERE conversation_id = $1
          AND user_id = $2
          AND left_at IS NULL
      `,
      [conversationId, userId]
    );

    return result.rows.length > 0;
  }

  static async updateLastReadMessageId(conversationId, userId, messageId) {
    const result = await Database.query(
      `
        UPDATE conversation_participants
        SET last_read_message_id = $3
        WHERE conversation_id = $1 AND user_id = $2 AND left_at IS NULL
        RETURNING *
      `,
      [conversationId, userId, messageId]
    );

    return result.rows[0];
  }
}

module.exports = Conversation;
