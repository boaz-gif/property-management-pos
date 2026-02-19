const express = require('express');
const PropertyController = require('../../controllers/propertyController');
const { authenticate } = require('../../middleware/auth');
const scopeMiddleware = require('../../middleware/scopeMiddleware');
const cacheMiddleware = require('../../middleware/cache');
const { auditMiddleware } = require('../../middleware/auditMiddleware');
const imageRoutes = require('./images');
const { requirePermission } = require('../../middleware/permissionMiddleware');
const PropertyAnnouncementController = require('../../controllers/propertyAnnouncementController');
const UnitController = require('../../controllers/unitController');
const PropertyLeaseController = require('../../controllers/propertyLeaseController');

const router = express.Router();

// All routes require authentication and scoping
router.use(authenticate);
router.use(scopeMiddleware);

// GET /api/properties - Get all properties (accessible to all authenticated users)
router.get('/', cacheMiddleware, PropertyController.getAllProperties);

// GET /api/properties/stats - Get property statistics
router.get('/stats', cacheMiddleware, PropertyController.getPropertyStats);

// GET /api/properties/search - Search properties
router.get('/search', cacheMiddleware, PropertyController.searchProperties);

router.get(
  '/:propertyId/announcements',
  requirePermission('property', 'read', { propertyIdParam: 'propertyId' }),
  PropertyAnnouncementController.listForProperty
);
router.post(
  '/:propertyId/announcements',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  PropertyAnnouncementController.create
);
router.put(
  '/:propertyId/announcements/:id',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  PropertyAnnouncementController.update
);
router.post(
  '/:propertyId/announcements/:id/publish',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  PropertyAnnouncementController.publish
);
router.delete(
  '/:propertyId/announcements/:id',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  PropertyAnnouncementController.archive
);

router.get(
  '/:propertyId/units',
  requirePermission('property', 'read', { propertyIdParam: 'propertyId' }),
  UnitController.listUnits
);
router.post(
  '/:propertyId/units',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  UnitController.createUnit
);
router.put(
  '/:propertyId/units/:unitId',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  UnitController.updateUnit
);
router.delete(
  '/:propertyId/units/:unitId',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  UnitController.archiveUnit
);

router.get(
  '/:propertyId/lease-settings',
  requirePermission('property', 'read', { propertyIdParam: 'propertyId' }),
  PropertyLeaseController.getLeaseSettings
);
router.put(
  '/:propertyId/lease-settings',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  PropertyLeaseController.updateLeaseSettings
);
router.post(
  '/:propertyId/leases/bulk-set',
  requirePermission('property', 'update', { propertyIdParam: 'propertyId' }),
  auditMiddleware,
  PropertyLeaseController.bulkSetLeases
);

// GET /api/properties/export - Export properties to CSV
router.get('/export', PropertyController.exportPropertiesToCSV);

// GET /api/properties/:id - Get property by ID
router.get('/:id', cacheMiddleware, PropertyController.getPropertyById);

// POST /api/properties - Create property (with audit logging)
router.post('/', 
  requirePermission('property', 'create'),
  auditMiddleware,
  PropertyController.createProperty
);

// PUT /api/properties/:id - Update property (with audit logging)
router.put('/:id', 
  requirePermission('property', 'update', { propertyIdParam: 'id' }),
  auditMiddleware,
  PropertyController.updateProperty
);

// DELETE /api/properties/:id - Delete property (with audit logging)
router.delete('/:id', 
  requirePermission('property', 'delete', { propertyIdParam: 'id' }),
  auditMiddleware,
  PropertyController.deleteProperty
);

// Soft Delete routes for properties
router.put('/:id/archive', 
  requirePermission('property', 'manage', { propertyIdParam: 'id' }),
  auditMiddleware,
  PropertyController.archiveProperty
);

router.put('/:id/restore', 
  requirePermission('property', 'manage', { propertyIdParam: 'id' }),
  auditMiddleware,
  PropertyController.restoreProperty
);

router.delete('/:id/permanent', 
  requirePermission('property', 'manage', { propertyIdParam: 'id' }),
  auditMiddleware,
  PropertyController.permanentDeleteProperty
);

// Mount image routes at /api/properties/:propertyId/images
router.use('/:propertyId/images', imageRoutes);

module.exports = router;
