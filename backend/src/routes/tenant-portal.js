
const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/tenantDashboardController');
const paymentController = require('../controllers/tenantPaymentController');
const { requireRole } = require('../middleware/roleValidation');
const { requirePermission } = require('../middleware/permissionMiddleware');

// All routes here are for tenants only
router.use(requireRole(['tenant']));

// Dashboard
router.get('/dashboard', requirePermission('dashboard', 'read'), dashboardController.getDashboard);
router.get('/widgets', requirePermission('dashboard', 'read'), dashboardController.getWidgets);
router.put('/widgets/order', requirePermission('dashboard', 'update'), dashboardController.updateWidgets);

// Announcements
router.get('/announcements', requirePermission('dashboard', 'read'), dashboardController.getAnnouncements);
router.post('/announcements/:id/read', requirePermission('tenant', 'update'), dashboardController.markAnnouncementViewed);
router.post('/announcements/:id/ack', requirePermission('tenant', 'update'), dashboardController.acknowledgeAnnouncement);

// Notifications (Tenant Specific)
router.get('/notifications', requirePermission('tenant', 'read'), dashboardController.getNotifications);
router.post('/notifications/:id/read', requirePermission('tenant', 'update'), dashboardController.markNotificationRead);

// Payments
router.get('/rent-status', requirePermission('payment', 'read'), paymentController.getRentStatus);
router.post('/payments/process', requirePermission('payment', 'create'), paymentController.processPayment);
router.get('/payments/history', requirePermission('payment', 'read'), paymentController.getPaymentHistory);
router.get('/payments/:id/status', requirePermission('payment', 'read'), paymentController.getPaymentStatus);
router.get('/payments/:id/receipt', requirePermission('payment', 'read'), paymentController.getReceipt);
router.get('/balance-ledger', requirePermission('payment', 'read'), paymentController.getBalanceLedger);

// Payment Methods
router.get('/payment-methods', requirePermission('payment', 'read'), paymentController.getPaymentMethods);
router.post('/payment-methods', requirePermission('payment', 'update'), paymentController.addPaymentMethod);
router.put('/payment-methods/:id/default', requirePermission('payment', 'update'), paymentController.setDefaultMethod);
router.delete('/payment-methods/:id', requirePermission('payment', 'delete'), paymentController.deletePaymentMethod);

// AutoPay
router.get('/autopay', requirePermission('payment', 'read'), paymentController.getAutoPay);
router.post('/autopay/setup', requirePermission('payment', 'update'), paymentController.setupAutoPay);
router.put('/autopay/disable', requirePermission('payment', 'update'), paymentController.disableAutoPay);

// Quick Actions Log
router.post('/quick-actions', requirePermission('dashboard', 'create'), dashboardController.logQuickAction);

// Preferences
router.get('/preferences', requirePermission('tenant', 'read'), dashboardController.getPreferences);
router.put('/preferences', requirePermission('tenant', 'update'), dashboardController.updatePreferences);

module.exports = router;
