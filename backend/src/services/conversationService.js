const Database = require('../utils/database');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const NotificationService = require('./notificationService');
const Tenant = require('../models/Tenant');
const PermissionService = require('./PermissionService');

class ConversationService {
  static isStrictParticipantConversation(conversation) {
    const kind = conversation?.kind;
    return kind === 'tenant_community' || kind === 'tenant_admin_dm';
  }

  static async ensureEntityAccess(user, entityType, entityId) {
    if (!entityType || !entityId) return true;
    if (user?.role === 'super_admin') return true;

    const normalizedType = String(entityType).toLowerCase();
    const id = parseInt(entityId, 10);
    if (!Number.isFinite(id)) return true;

    if (normalizedType === 'property') {
      await PermissionService.ensurePropertyAccess(user, id);
      return true;
    }

    if (normalizedType === 'tenant') {
      await PermissionService.ensureTenantAccess(user, id);
      return true;
    }

    if (normalizedType === 'maintenance') {
      const res = await Database.query(
        `
          SELECT t.property_id
          FROM maintenance m
          JOIN tenants t ON t.id = m.tenant_id AND t.deleted_at IS NULL
          WHERE m.id = $1 AND m.deleted_at IS NULL
        `,
        [id]
      );
      const propertyId = res.rows[0]?.property_id;
      if (propertyId) await PermissionService.ensurePropertyAccess(user, propertyId);
      return true;
    }

    if (normalizedType === 'payment') {
      const res = await Database.query(
        `
          SELECT t.property_id
          FROM payments pm
          JOIN tenants t ON t.id = pm.tenant_id AND t.deleted_at IS NULL
          WHERE pm.id = $1 AND pm.deleted_at IS NULL
        `,
        [id]
      );
      const propertyId = res.rows[0]?.property_id;
      if (propertyId) await PermissionService.ensurePropertyAccess(user, propertyId);
      return true;
    }

    if (normalizedType === 'lease') {
      const res = await Database.query(
        `
          SELECT property_id
          FROM leases
          WHERE id = $1 AND deleted_at IS NULL
        `,
        [id]
      );
      const propertyId = res.rows[0]?.property_id;
      if (propertyId) await PermissionService.ensurePropertyAccess(user, propertyId);
      return true;
    }

    return true;
  }

  static async ensureConversationAccess(user, conversationId) {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    const isParticipant = await Conversation.isParticipant(conversationId, user.id);
    if (!isParticipant && (user.role !== 'super_admin' || this.isStrictParticipantConversation(conversation))) {
      throw new Error('Access denied');
    }

    await this.ensureEntityAccess(user, conversation.entity_type, conversation.entity_id);
    return conversation;
  }

  static async listConversations(user, options = {}) {
    const organizationId = options.organizationId || user.organization_id || null;
    const propertyId = options.propertyId || user.property_id || null;
    return await Conversation.findForUser(user.id, {
      organizationId,
      propertyId,
      entityType: options.entityType,
      entityId: options.entityId,
      limit: options.limit,
      offset: options.offset
    });
  }

  static async getConversation(user, conversationId) {
    const conversation = await this.ensureConversationAccess(user, conversationId);

    const participants = await Conversation.listParticipants(conversationId);
    return { conversation, participants };
  }

  static async listMessages(user, conversationId, options = {}) {
    await this.ensureConversationAccess(user, conversationId);

    return await Message.listByConversationId(conversationId, options);
  }

  static async createConversation(user, payload) {
    const entityType = payload.entity_type || null;
    const entityId = payload.entity_id ? parseInt(payload.entity_id, 10) : null;
    const subject = payload.subject || null;
    const participantUserIds = Array.isArray(payload.participant_user_ids) ? payload.participant_user_ids : [];

    const scope = await this.resolveScopeFromEntity({
      entityType,
      entityId,
      propertyId: payload.property_id,
      organizationId: payload.organization_id
    });

    await this.ensureEntityAccess(user, entityType, entityId);

    return await Database.transaction(async (client) => {
      const conversationRes = await client.query(
        `
          INSERT INTO conversations (organization_id, property_id, entity_type, entity_id, subject, created_by, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
          RETURNING *
        `,
        [scope.organizationId, scope.propertyId, entityType, entityId, subject, user.id]
      );
      const conversation = conversationRes.rows[0];

      const participantSet = new Set([user.id, ...participantUserIds.map((id) => parseInt(id, 10)).filter((id) => Number.isFinite(id))]);
      for (const participantId of participantSet) {
        await client.query(
          `
            INSERT INTO conversation_participants (conversation_id, user_id, role_at_time, joined_at)
            VALUES ($1, $2, $3, NOW())
            ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL
          `,
          [conversation.id, participantId, participantId === user.id ? user.role : null]
        );
      }

      return conversation;
    });
  }

  static async addParticipant(user, conversationId, participantUserId) {
    const conversation = await this.ensureConversationAccess(user, conversationId);
    if (this.isStrictParticipantConversation(conversation)) {
      throw new Error('Access denied');
    }

    return await Conversation.addParticipant(conversationId, parseInt(participantUserId, 10), null);
  }

  static async removeParticipant(user, conversationId, participantUserId) {
    const conversation = await this.ensureConversationAccess(user, conversationId);
    if (this.isStrictParticipantConversation(conversation)) {
      throw new Error('Access denied');
    }

    return await Conversation.removeParticipant(conversationId, parseInt(participantUserId, 10));
  }

  static async markRead(user, conversationId, messageId) {
    await this.ensureConversationAccess(user, conversationId);

    const message = await Message.findById(messageId);
    if (!message || message.conversation_id !== conversationId) {
      throw new Error('Message not found');
    }

    return await Conversation.updateLastReadMessageId(conversationId, user.id, messageId);
  }

  static async createMessage(user, conversationId, payload) {
    await this.ensureConversationAccess(user, conversationId);

    const content = (payload.content || '').trim();
    if (!content) {
      throw new Error('Message content is required');
    }

    const attachments = payload.attachments || null;
    const message = await Message.create({
      conversationId,
      senderId: user.id,
      content,
      attachments
    });

    const participants = await Conversation.listParticipants(conversationId);
    const recipientIds = participants
      .filter((p) => p.user_id !== user.id && !p.left_at)
      .map((p) => p.user_id);

    await Promise.all(
      recipientIds.map(async (recipientId) => {
        const tenant = await Tenant.findByUserId(recipientId);
        await NotificationService.create({
          tenantId: tenant ? tenant.id : null,
          userId: recipientId,
          type: 'message_received',
          title: 'New message',
          message: content.length > 120 ? `${content.slice(0, 117)}...` : content,
          data: { conversation_id: conversationId, message_id: message.id, sender_user_id: user.id }
        });
      })
    );

    if (global.io) {
      global.io.to(`conversation-${conversationId}`).emit('hub:message_created', message);
      for (const recipientId of recipientIds) {
        global.io.to(`user-${recipientId}`).emit('hub:message_created', message);
      }
    }

    return message;
  }

  static async ensurePropertyCommunityConversation(user, propertyId) {
    if (user.role !== 'tenant') {
      throw new Error('Access denied');
    }

    const parsedPropertyId = parseInt(propertyId, 10);
    if (!Number.isFinite(parsedPropertyId)) {
      throw new Error('Property ID is required');
    }

    await PermissionService.ensurePropertyAccess(user, parsedPropertyId);

    return await Database.transaction(async (client) => {
      const existingRes = await client.query(
        `
          SELECT *
          FROM conversations
          WHERE property_id = $1
            AND kind = 'tenant_community'
            AND archived_at IS NULL
          LIMIT 1
        `,
        [parsedPropertyId]
      );

      let conversation = existingRes.rows[0] || null;
      if (!conversation) {
        const orgRes = await client.query(
          'SELECT organization_id FROM properties WHERE id = $1 AND deleted_at IS NULL',
          [parsedPropertyId]
        );
        const organizationId = orgRes.rows[0]?.organization_id || null;

        const convRes = await client.query(
          `
            INSERT INTO conversations (organization_id, property_id, kind, subject, created_by, created_at, updated_at)
            VALUES ($1, $2, 'tenant_community', 'Community Chat', $3, NOW(), NOW())
            RETURNING *
          `,
          [organizationId, parsedPropertyId, user.id]
        );
        conversation = convRes.rows[0];
      }

      await client.query(
        `
          INSERT INTO conversation_participants (conversation_id, user_id, role_at_time, joined_at)
          SELECT $1, u.id, u.role, NOW()
          FROM users u
          WHERE u.role = 'tenant'
            AND u.property_id = $2
            AND u.deleted_at IS NULL
          ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL
        `,
        [conversation.id, parsedPropertyId]
      );

      return conversation;
    });
  }

  static async ensureTenantAdminDmConversation(user) {
    if (user.role !== 'tenant') {
      throw new Error('Access denied');
    }

    const propertyId = user.property_id ? parseInt(user.property_id, 10) : null;
    if (!propertyId) {
      throw new Error('Property scope required');
    }

    await PermissionService.ensurePropertyAccess(user, propertyId);

    return await Database.transaction(async (client) => {
      const adminRes = await client.query(
        'SELECT admin_id, organization_id FROM properties WHERE id = $1 AND deleted_at IS NULL',
        [propertyId]
      );
      const adminId = adminRes.rows[0]?.admin_id;
      const organizationId = adminRes.rows[0]?.organization_id || null;
      if (!adminId) {
        throw new Error('Property admin not found');
      }

      const existingRes = await client.query(
        `
          SELECT *
          FROM conversations
          WHERE property_id = $1
            AND kind = 'tenant_admin_dm'
            AND tenant_user_id = $2
            AND archived_at IS NULL
          LIMIT 1
        `,
        [propertyId, user.id]
      );

      let conversation = existingRes.rows[0] || null;
      if (!conversation) {
        const convRes = await client.query(
          `
            INSERT INTO conversations (
              organization_id, property_id, kind, tenant_user_id, admin_user_id,
              subject, created_by, created_at, updated_at
            )
            VALUES ($1, $2, 'tenant_admin_dm', $3, $4, 'Chat with Admin', $3, NOW(), NOW())
            RETURNING *
          `,
          [organizationId, propertyId, user.id, adminId]
        );
        conversation = convRes.rows[0];
      }

      await client.query(
        `
          INSERT INTO conversation_participants (conversation_id, user_id, role_at_time, joined_at)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL
        `,
        [conversation.id, user.id, user.role]
      );

      await client.query(
        `
          INSERT INTO conversation_participants (conversation_id, user_id, role_at_time, joined_at)
          VALUES ($1, $2, NULL, NOW())
          ON CONFLICT (conversation_id, user_id) DO UPDATE SET left_at = NULL
        `,
        [conversation.id, adminId]
      );

      return conversation;
    });
  }

  static async resolveScopeFromEntity(input) {
    const entityType = input.entityType;
    const entityId = input.entityId;

    if (input.propertyId) {
      const propertyId = parseInt(input.propertyId, 10);
      const orgRes = await Database.query('SELECT organization_id FROM properties WHERE id = $1 AND deleted_at IS NULL', [propertyId]);
      return { propertyId, organizationId: orgRes.rows[0]?.organization_id || input.organizationId || null };
    }

    if (input.organizationId) {
      return { propertyId: null, organizationId: parseInt(input.organizationId, 10) };
    }

    if (!entityType || !entityId) {
      return { propertyId: null, organizationId: null };
    }

    if (entityType === 'maintenance') {
      const res = await Database.query(
        `
          SELECT t.property_id, p.organization_id
          FROM maintenance m
          JOIN tenants t ON t.id = m.tenant_id AND t.deleted_at IS NULL
          JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
          WHERE m.id = $1 AND m.deleted_at IS NULL
        `,
        [entityId]
      );
      return { propertyId: res.rows[0]?.property_id || null, organizationId: res.rows[0]?.organization_id || null };
    }

    if (entityType === 'payment') {
      const res = await Database.query(
        `
          SELECT t.property_id, p.organization_id
          FROM payments pm
          JOIN tenants t ON t.id = pm.tenant_id AND t.deleted_at IS NULL
          JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
          WHERE pm.id = $1 AND pm.deleted_at IS NULL
        `,
        [entityId]
      );
      return { propertyId: res.rows[0]?.property_id || null, organizationId: res.rows[0]?.organization_id || null };
    }

    if (entityType === 'tenant') {
      const res = await Database.query(
        `
          SELECT t.property_id, p.organization_id
          FROM tenants t
          JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
          WHERE t.id = $1 AND t.deleted_at IS NULL
        `,
        [entityId]
      );
      return { propertyId: res.rows[0]?.property_id || null, organizationId: res.rows[0]?.organization_id || null };
    }

    if (entityType === 'property') {
      const res = await Database.query(
        `
          SELECT p.id AS property_id, p.organization_id
          FROM properties p
          WHERE p.id = $1 AND p.deleted_at IS NULL
        `,
        [entityId]
      );
      return { propertyId: res.rows[0]?.property_id || null, organizationId: res.rows[0]?.organization_id || null };
    }

    if (entityType === 'lease') {
      const res = await Database.query(
        `
          SELECT l.property_id, p.organization_id
          FROM leases l
          JOIN properties p ON p.id = l.property_id AND p.deleted_at IS NULL
          WHERE l.id = $1 AND l.deleted_at IS NULL
        `,
        [entityId]
      );
      return { propertyId: res.rows[0]?.property_id || null, organizationId: res.rows[0]?.organization_id || null };
    }

    return { propertyId: null, organizationId: null };
  }
}

module.exports = ConversationService;
