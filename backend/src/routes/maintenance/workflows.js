const express = require('express');
const WorkflowController = require('../../controllers/workflowController');
const { authenticate } = require('../../middleware/auth');
const scopeMiddleware = require('../../middleware/scopeMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);
router.use(scopeMiddleware);

router.get(
  '/organizations/:organizationId/workflows',
  requirePermission('workflow', 'read', { organizationIdParam: 'organizationId' }),
  WorkflowController.listWorkflows
);
router.post(
  '/organizations/:organizationId/workflows',
  requirePermission('workflow', 'create', { organizationIdParam: 'organizationId' }),
  WorkflowController.createWorkflow
);
router.get(
  '/organizations/:organizationId/workflows/:workflowId',
  requirePermission('workflow', 'read', { organizationIdParam: 'organizationId' }),
  WorkflowController.getWorkflow
);
router.delete(
  '/organizations/:organizationId/workflows/:workflowId',
  requirePermission('workflow', 'delete', { organizationIdParam: 'organizationId' }),
  WorkflowController.deleteWorkflow
);

router.get(
  '/organizations/:organizationId/work-items/:resourceType/:resourceId',
  requirePermission('work_item', 'read', { organizationIdParam: 'organizationId' }),
  WorkflowController.getWorkItemForResource
);

module.exports = router;

