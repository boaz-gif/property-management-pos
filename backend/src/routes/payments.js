const express = require('express');
const PaymentController = require('../controllers/paymentController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/payments - Get all payments (admin sees all, tenant sees own)
router.get('/', PaymentController.getAllPayments);

// GET /api/payments/stats - Get payment statistics
router.get('/stats', PaymentController.getPaymentStats);

// GET /api/payments/:id - Get payment by ID
router.get('/:id', PaymentController.getPaymentById);

// POST /api/payments - Create new payment (process payment)
router.post('/', validate(schemas.createPayment), PaymentController.createPayment);

// PUT /api/payments/:id/status - Update payment status (admin only)
router.put('/:id/status', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  PaymentController.updatePaymentStatus
);

module.exports = router;
