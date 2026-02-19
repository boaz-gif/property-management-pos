const ConversationService = require('../services/conversationService');
const { HTTP_STATUS } = require('../utils/constants');

class ConversationController {
  static async listConversations(req, res, next) {
    try {
      const user = req.user;
      const { entity_type, entity_id, limit, offset } = req.query;
      const options = {
        entityType: entity_type || undefined,
        entityId: entity_id ? parseInt(entity_id, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : undefined,
        offset: offset ? parseInt(offset, 10) : undefined
      };

      if (req.activeOrganization) {
        options.organizationId = req.activeOrganization;
      }
      if (req.activeProperty) {
        options.propertyId = req.activeProperty;
      }

      const conversations = await ConversationService.listConversations(user, options);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: conversations,
        count: conversations.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async createConversation(req, res, next) {
    try {
      const user = req.user;
      const conversation = await ConversationService.createConversation(user, req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Conversation created successfully',
        data: conversation
      });
    } catch (error) {
      next(error);
    }
  }

  static async getConversation(req, res, next) {
    try {
      const user = req.user;
      const { id } = req.params;
      const result = await ConversationService.getConversation(user, id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async listMessages(req, res, next) {
    try {
      const user = req.user;
      const { id } = req.params;
      const { limit, before } = req.query;

      const messages = await ConversationService.listMessages(user, id, {
        limit: limit ? parseInt(limit, 10) : undefined,
        before: before ? new Date(before) : undefined
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: messages,
        count: messages.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async createMessage(req, res, next) {
    try {
      const user = req.user;
      const { id } = req.params;
      const message = await ConversationService.createMessage(user, id, req.body);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Message sent successfully',
        data: message
      });
    } catch (error) {
      next(error);
    }
  }

  static async addParticipant(req, res, next) {
    try {
      const user = req.user;
      const { id } = req.params;
      const { user_id } = req.body;
      const participant = await ConversationService.addParticipant(user, id, user_id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Participant added successfully',
        data: participant
      });
    } catch (error) {
      next(error);
    }
  }

  static async removeParticipant(req, res, next) {
    try {
      const user = req.user;
      const { id, userId } = req.params;
      const participant = await ConversationService.removeParticipant(user, id, userId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Participant removed successfully',
        data: participant
      });
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req, res, next) {
    try {
      const user = req.user;
      const { id } = req.params;
      const { message_id } = req.body;
      const result = await ConversationService.markRead(user, id, message_id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async ensureCommunityConversation(req, res, next) {
    try {
      const user = req.user;
      const propertyId = req.activeProperty || user.property_id;
      const conversation = await ConversationService.ensurePropertyCommunityConversation(user, propertyId);
      res.status(HTTP_STATUS.OK).json({ success: true, data: conversation });
    } catch (error) {
      next(error);
    }
  }

  static async ensureAdminDmConversation(req, res, next) {
    try {
      const user = req.user;
      const conversation = await ConversationService.ensureTenantAdminDmConversation(user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: conversation });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ConversationController;
