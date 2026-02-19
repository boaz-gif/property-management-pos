const express = require('express');
const TeamController = require('../controllers/teamController');
const { authenticate } = require('../middleware/auth');
const scopeMiddleware = require('../middleware/scopeMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router({ mergeParams: true });

router.use(authenticate);
router.use(scopeMiddleware);

router.get(
  '/organizations/:organizationId/teams',
  requirePermission('team', 'read', { organizationIdParam: 'organizationId' }),
  TeamController.listTeams
);
router.post(
  '/organizations/:organizationId/teams',
  requirePermission('team', 'create', { organizationIdParam: 'organizationId' }),
  TeamController.createTeam
);

router.get(
  '/organizations/:organizationId/teams/:teamId',
  requirePermission('team', 'read', { organizationIdParam: 'organizationId' }),
  TeamController.getTeam
);
router.put(
  '/organizations/:organizationId/teams/:teamId',
  requirePermission('team', 'update', { organizationIdParam: 'organizationId' }),
  TeamController.updateTeam
);
router.delete(
  '/organizations/:organizationId/teams/:teamId',
  requirePermission('team', 'delete', { organizationIdParam: 'organizationId' }),
  TeamController.deleteTeam
);

router.get(
  '/organizations/:organizationId/teams/:teamId/members',
  requirePermission('team', 'read', { organizationIdParam: 'organizationId' }),
  TeamController.listMembers
);
router.post(
  '/organizations/:organizationId/teams/:teamId/members',
  requirePermission('team', 'manage', { organizationIdParam: 'organizationId' }),
  TeamController.addMember
);
router.delete(
  '/organizations/:organizationId/teams/:teamId/members/:userId',
  requirePermission('team', 'manage', { organizationIdParam: 'organizationId' }),
  TeamController.removeMember
);

module.exports = router;

