const express = require('express');
const OrganizationController = require('../controllers/organizationController');
const { authenticate } = require('../middleware/auth');
const scopeMiddleware = require('../middleware/scopeMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get('/', requirePermission('organization', 'read'), OrganizationController.listOrganizations);
router.post('/', requirePermission('organization', 'create'), OrganizationController.createOrganization);

router.get('/:id', requirePermission('organization', 'read', { organizationIdParam: 'id' }), OrganizationController.getOrganizationById);
router.put('/:id', requirePermission('organization', 'update', { organizationIdParam: 'id' }), OrganizationController.updateOrganization);
router.delete('/:id', requirePermission('organization', 'delete', { organizationIdParam: 'id' }), OrganizationController.deleteOrganization);

router.get(
  '/:organizationId/members',
  requirePermission('organization', 'read', { organizationIdParam: 'organizationId' }),
  OrganizationController.listMembers
);
router.post(
  '/:organizationId/members',
  requirePermission('organization', 'manage', { organizationIdParam: 'organizationId' }),
  OrganizationController.addMember
);
router.delete(
  '/:organizationId/members/:userId',
  requirePermission('organization', 'manage', { organizationIdParam: 'organizationId' }),
  OrganizationController.removeMember
);

module.exports = router;

