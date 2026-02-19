const express = require('express');
const MaintenanceController = require('../controllers/maintenanceController');
const { authenticate } = require('../middleware/auth');
const scopeMiddleware = require('../middleware/scopeMiddleware');
const { validate, schemas } = require('../middleware/validation');
const { auditMiddleware } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

// All routes require authentication and scoping
router.use(authenticate);
router.use(scopeMiddleware);

router.get('/', requirePermission('maintenance', 'read'), MaintenanceController.getAllRequests);
router.get('/:id', requirePermission('maintenance', 'read', { maintenanceIdParam: 'id' }), MaintenanceController.getRequestById);

// POST - Create maintenance request (with audit logging)
router.post('/', 
  requirePermission('maintenance', 'create'),
  validate(schemas.createMaintenance),
  auditMiddleware,
  MaintenanceController.createRequest
);

// PUT - Update maintenance request (with audit logging)
router.put('/:id', 
  requirePermission('maintenance', 'update', { maintenanceIdParam: 'id' }),
  auditMiddleware,
  MaintenanceController.updateRequest
);

// Soft Delete routes for maintenance
router.put('/:id/archive', 
  requirePermission('maintenance', 'manage', { maintenanceIdParam: 'id' }),
  auditMiddleware,
  MaintenanceController.archiveRequest
);

router.put('/:id/restore', 
  requirePermission('maintenance', 'manage', { maintenanceIdParam: 'id' }),
  auditMiddleware,
  MaintenanceController.restoreRequest
);

router.delete('/:id/permanent', 
  requirePermission('maintenance', 'manage', { maintenanceIdParam: 'id' }),
  auditMiddleware,
  MaintenanceController.permanentDeleteRequest
);

module.exports = router;
