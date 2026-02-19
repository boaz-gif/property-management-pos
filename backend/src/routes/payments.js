const express = require('express');
const PaymentController = require('../controllers/PaymentController');
const { authenticate } = require('../middleware/auth');
const scopeMiddleware = require('../middleware/scopeMiddleware');
const { validate, schemas } = require('../middleware/validation');
const { auditMiddleware, auditView } = require('../middleware/auditMiddleware');
const { requirePermission } = require('../middleware/permissionMiddleware');
const MpesaController = require('../controllers/mpesaController');

const router = express.Router();

router.post('/mpesa/callback', MpesaController.callback);

// All routes require authentication and scoping
router.use(authenticate);
router.use(scopeMiddleware);

// GET /api/payments - Get all payments (admin sees all, tenant sees own)
router.get('/', requirePermission('payment', 'read'), PaymentController.getAllPayments);

// GET /api/payments/stats - Get payment statistics
router.get('/stats', requirePermission('payment', 'read'), PaymentController.getPaymentStats);

// GET /api/payments/:id - Get payment by ID
router.get(
  '/:id',
  requirePermission('payment', 'read', { paymentIdParam: 'id' }),
  auditView('payment', (req) => parseInt(req.params.id, 10)),
  PaymentController.getPaymentById
);

// POST /api/payments - Create new payment (with audit logging)
router.post('/', 
  requirePermission('payment', 'create'),
  validate(schemas.createPayment), 
  auditMiddleware,
  PaymentController.createPayment
);

// POST /api/payments/:id/receipt - Generate receipt for a payment
router.post('/:id/receipt', requirePermission('payment', 'read', { paymentIdParam: 'id' }), PaymentController.getReceipt);

// PUT /api/payments/:id/status - Update payment status with audit logging
router.put('/:id/status', 
  requirePermission('payment', 'update', { paymentIdParam: 'id' }),
  auditMiddleware,
  PaymentController.updatePaymentStatus
);

// Soft Delete routes for payments
router.put('/:id/archive', 
  requirePermission('payment', 'manage', { paymentIdParam: 'id' }),
  auditMiddleware,
  PaymentController.archivePayment
);

router.put('/:id/restore', 
  requirePermission('payment', 'manage', { paymentIdParam: 'id' }),
  auditMiddleware,
  PaymentController.restorePayment
);

router.delete('/:id/permanent', 
  requirePermission('payment', 'manage', { paymentIdParam: 'id' }),
  auditMiddleware,
  PaymentController.permanentDeletePayment
);

module.exports = router;
