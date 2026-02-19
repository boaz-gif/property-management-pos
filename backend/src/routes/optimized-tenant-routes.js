const express = require('express');
const OptimizedTenantController = require('../controllers/optimized-tenant-controller');
const responseOptimizer = require('../middleware/response-optimizer');
const auth = require('../middleware/auth');

const router = express.Router();

// Apply full optimization stack to all routes
router.use(
  responseOptimizer.optimize({
    resourceType: 'tenant',
    cacheTTL: 300, // 5 minutes
    enableCompression: true,
    enableETag: true,
    enableFieldSelection: true
  })
);

// GET /api/tenants - Get all tenants with full optimization
// Query parameters:
// - fields: comma-separated list of fields to return
// - page: page number for pagination
// - limit: number of records per page
// - sort: field to sort by
// - order: sort order (ASC/DESC)
router.get('/', auth.authenticate, OptimizedTenantController.getAllTenants);

// GET /api/tenants/:id - Get specific tenant with optimization
// Query parameters:
// - fields: comma-separated list of fields to return
router.get('/:id', auth.authenticate, OptimizedTenantController.getTenantById);

// POST /api/tenants - Create tenant with cache invalidation
router.post('/', auth.authenticate, OptimizedTenantController.createTenant);

// PUT /api/tenants/:id - Update tenant with cache invalidation
router.put('/:id', auth.authenticate, OptimizedTenantController.updateTenant);

// DELETE /api/tenants/:id - Delete tenant with cache invalidation
router.delete('/:id', auth.authenticate, OptimizedTenantController.deleteTenant);

// GET /api/tenants/stats - Get tenant statistics with optimization
router.get('/stats', auth.authenticate, OptimizedTenantController.getTenantStats);

module.exports = router;
