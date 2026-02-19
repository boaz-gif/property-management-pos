const express = require('express');
const ConversationController = require('../controllers/conversationController');
const { authenticate } = require('../middleware/auth');
const scopeMiddleware = require('../middleware/scopeMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const { auditMiddleware } = require('../middleware/auditMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/', requirePermission('conversation', 'read'), ConversationController.listConversations);
router.post('/', requirePermission('conversation', 'create'), auditMiddleware, ConversationController.createConversation);

router.get('/community', requirePermission('conversation', 'read'), ConversationController.ensureCommunityConversation);
router.get('/admin-dm', requirePermission('conversation', 'read'), ConversationController.ensureAdminDmConversation);

router.get('/:id', requirePermission('conversation', 'read'), ConversationController.getConversation);
router.get('/:id/messages', requirePermission('message', 'read'), ConversationController.listMessages);
router.post('/:id/messages', requirePermission('message', 'create'), auditMiddleware, ConversationController.createMessage);

router.post('/:id/read', requirePermission('conversation', 'read'), ConversationController.markRead);

router.post('/:id/participants', requirePermission('conversation', 'manage'), auditMiddleware, ConversationController.addParticipant);
router.delete('/:id/participants/:userId', requirePermission('conversation', 'manage'), auditMiddleware, ConversationController.removeParticipant);

module.exports = router;
