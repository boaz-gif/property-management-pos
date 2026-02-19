const express = require('express');
const TenantController = require('../../controllers/tenantController');
const { authenticate } = require('../../middleware/auth');
const scopeMiddleware = require('../../middleware/scopeMiddleware');
const { auditMiddleware } = require('../../middleware/auditMiddleware');
const { requirePermission } = require('../../middleware/permissionMiddleware');

const router = express.Router();

// All routes require authentication and scoping
router.use(authenticate);
router.use(scopeMiddleware);

// ============================================================================
// TENANT-SPECIFIC ROUTES (Current logged-in tenant accessing their own data)
// ============================================================================
// NOTE: These routes must come BEFORE the :id routes to avoid ambiguity
// /me routes are filtered by req.user.email automatically

// GET /api/tenants/me - Get current tenant's own record
router.get('/me',
  requirePermission('tenant', 'read'),
  TenantController.getCurrentTenant
);

// GET /api/tenants/me/payments - Get current tenant's payment history
router.get('/me/payments',
  requirePermission('payment', 'read'),
  TenantController.getCurrentTenantPayments
);

// GET /api/tenants/me/maintenance - Get current tenant's maintenance requests
router.get('/me/maintenance',
  requirePermission('maintenance', 'read'),
  TenantController.getCurrentTenantMaintenance
);

// PUT /api/tenants/me - Update current tenant's own information (with audit logging)
router.put('/me',
  requirePermission('tenant', 'update'),
  auditMiddleware,
  TenantController.updateCurrentTenant
);

// ============================================================================
// ADMIN/SUPER-ADMIN ROUTES (Managing all tenants/properties)
// ============================================================================

// GET /api/tenants - Get all tenants (filtered by role in service)
router.get('/', requirePermission('tenant', 'read'), TenantController.getAllTenants);

// GET /api/tenants/stats - Get tenant statistics (filtered by role in service)
router.get('/stats', requirePermission('tenant', 'read'), TenantController.getTenantStats);

// GET /api/tenants/:id - Get tenant by ID (filtered by role in service)
router.get('/:id', requirePermission('tenant', 'read', { tenantIdParam: 'id' }), TenantController.getTenantById);

// GET /api/tenants/:id/payment-history - Get tenant payment history (filtered by role)
router.get('/:id/payment-history', requirePermission('payment', 'read', { tenantIdParam: 'id' }), TenantController.getPaymentHistory);

// GET /api/tenants/:id/maintenance-history - Get tenant maintenance history (filtered by role)
router.get('/:id/maintenance-history', requirePermission('maintenance', 'read', { tenantIdParam: 'id' }), TenantController.getMaintenanceHistory);

// GET /api/tenants/:id/rent-schedule - Get tenant rent schedule (filtered by role)
router.get('/:id/rent-schedule', requirePermission('tenant', 'read', { tenantIdParam: 'id' }), TenantController.getRentSchedule);

// POST /api/tenants - Create new tenant (with audit logging)
router.post('/', 
  requirePermission('tenant', 'create'),
  auditMiddleware,
  TenantController.createTenant
);

// PUT /api/tenants/:id - Update tenant (with audit logging)
router.put('/:id', 
  requirePermission('tenant', 'update', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.updateTenant
);

// DELETE /api/tenants/:id - Delete tenant (with audit logging)
router.delete('/:id', 
  requirePermission('tenant', 'delete', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.deleteTenant
);

// Soft Delete routes for tenants
router.put('/:id/archive', 
  requirePermission('tenant', 'manage', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.archiveTenant
);

router.put('/:id/restore', 
  requirePermission('tenant', 'manage', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.restoreTenant
);

router.delete('/:id/permanent', 
  requirePermission('tenant', 'manage', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.permanentDeleteTenant
);

// ============================================================================
// PAYMENT ROUTES
// ============================================================================

// POST /api/tenants/:id/payment - Process tenant payment (with audit logging)
router.post('/:id/payment',
  requirePermission('payment', 'create', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.processPayment
);

// POST /api/tenants/:id/balance/adjust - Adjust tenant balance (with audit logging)
router.post('/:id/balance/adjust',
  requirePermission('payment', 'manage', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.adjustTenantBalance
);

// POST /api/tenants/:id/balance/request - Request balance adjustment
router.post('/:id/balance/request',
  requirePermission('payment', 'create', { tenantIdParam: 'id' }),
  TenantController.requestTenantBalanceAdjustment
);

// ============================================================================
// DISPUTE & NOTIFICATION ROUTES
// ============================================================================

// POST /api/tenants/:id/dispute - Create tenant dispute (all authenticated users)
router.post('/:id/dispute', TenantController.createDispute);

// GET /api/tenants/:id/notifications - Get tenant notifications (filtered by role)
router.get('/:id/notifications', requirePermission('tenant', 'read', { tenantIdParam: 'id' }), TenantController.getNotifications);

// ============================================================================
// LEASE MANAGEMENT ROUTES
// ============================================================================

// GET /api/tenants/lease/stats - Get lease statistics (admin/super admin only)
router.get('/lease/stats',
  requirePermission('tenant', 'read'),
  TenantController.getLeaseStatistics
);

// GET /api/tenants/lease/expiring - Get expiring leases (admin/super admin only)
router.get('/lease/expiring',
  requirePermission('tenant', 'read'),
  TenantController.getExpiringLeases
);

// GET /api/tenants/lease/expired - Get expired leases (admin/super admin only)
router.get('/lease/expired',
  requirePermission('tenant', 'read'),
  TenantController.getExpiredLeases
);

// GET /api/tenants/:id/lease - Get tenant lease status
router.get('/:id/lease', requirePermission('tenant', 'read', { tenantIdParam: 'id' }), TenantController.getLeaseStatus);

// GET /api/tenants/:id/lease/history - Get tenant lease history
router.get('/:id/lease/history', requirePermission('tenant', 'read', { tenantIdParam: 'id' }), TenantController.getLeaseHistory);

// PUT /api/tenants/:id/lease - Update tenant lease (admin/super admin with audit logging)
router.put('/:id/lease',
  requirePermission('tenant', 'manage', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.updateLease
);

// POST /api/tenants/:id/lease/renew - Renew tenant lease (admin/super admin with audit logging)
router.post('/:id/lease/renew',
  requirePermission('tenant', 'manage', { tenantIdParam: 'id' }),
  auditMiddleware,
  TenantController.renewLease
);

// ============================================================================
// FINANCIAL SUMMARY ROUTE
// ============================================================================

// GET /api/tenants/financial-summary - Get financial summary (filtered by role)
router.get('/financial-summary', TenantController.getFinancialSummary);

module.exports = router;
