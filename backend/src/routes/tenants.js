const express = require('express');
const TenantController = require('../controllers/tenantController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/tenants - Get all tenants (accessible to all authenticated users)
router.get('/', TenantController.getAllTenants);

// GET /api/tenants/stats - Get tenant statistics
router.get('/stats', TenantController.getTenantStats);

// GET /api/tenants/:id - Get tenant by ID
router.get('/:id', TenantController.getTenantById);

// GET /api/tenants/:id/payment-history - Get tenant payment history
router.get('/:id/payment-history', TenantController.getPaymentHistory);

// GET /api/tenants/:id/maintenance-history - Get tenant maintenance history
router.get('/:id/maintenance-history', TenantController.getMaintenanceHistory);

// GET /api/tenants/:id/rent-schedule - Get tenant rent schedule
router.get('/:id/rent-schedule', TenantController.getRentSchedule);

// POST /api/tenants - Create new tenant (admin and super_admin only)
router.post('/', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
  TenantController.createTenant
);

// PUT /api/tenants/:id - Update tenant (admin, super_admin, and tenant themselves)
router.put('/:id', TenantController.updateTenant);

// DELETE /api/tenants/:id - Delete tenant (admin and super_admin only)
router.delete('/:id', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
  TenantController.deleteTenant
);

// POST /api/tenants/:id/balance - Update tenant balance (admin and super_admin only)
// NOTE: This route is disabled for security reasons - use /balance/adjust instead
// router.post('/:id/balance',
//   authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
//   TenantController.updateTenantBalance
// );

// Enhanced payment processing
// POST /api/tenants/:id/payment - Process tenant payment (all authenticated users)
router.post('/:id/payment', TenantController.processPayment);

// POST /api/tenants/:id/balance/adjust - Adjust tenant balance (admin and super_admin only)
router.post('/:id/balance/adjust',
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  TenantController.adjustTenantBalance
);

// POST /api/tenants/:id/balance/request - Request balance adjustment (tenants only)
router.post('/:id/balance/request', TenantController.requestTenantBalanceAdjustment);

// POST /api/tenants/:id/dispute - Create tenant dispute (all authenticated users)
router.post('/:id/dispute', TenantController.createDispute);

// GET /api/tenants/:id/notifications - Get tenant notifications
router.get('/:id/notifications', TenantController.getNotifications);

// GET /api/tenants/:id/lease - Get tenant lease details
router.get('/:id/lease', TenantController.getLeaseDetails);

// GET /api/tenants/financial-summary - Get financial summary (all authenticated users)
router.get('/financial-summary', TenantController.getFinancialSummary);

module.exports = router;
