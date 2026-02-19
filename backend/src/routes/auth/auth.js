const express = require('express');
const AuthController = require('../../controllers/authController');
const { authenticate } = require('../../middleware/auth');
const { validate, schemas } = require('../../middleware/validation');
const { canRegisterUser, requireSuperAdmin } = require('../../middleware/roleValidation');
const { authLimiter, registrationLimiter, refreshTokenLimiter } = require('../../middleware/rateLimiter');
const { sanitizeAll, handleValidationErrors, authValidation } = require('../../middleware/inputSanitization');
const { USER_ROLES } = require('../../utils/constants');

const router = express.Router();

// Apply input sanitization to all auth routes
router.use(sanitizeAll);

// Public routes
// POST /api/auth/login - with rate limiting
router.post('/login', authLimiter, validate(schemas.login), AuthController.login);
router.post('/refresh-token', refreshTokenLimiter, AuthController.refreshToken);

// Public test endpoint for security testing - NO AUTH REQUIRED
router.post('/register-test', AuthController.register);

// Protected Registration routes - NO PUBLIC REGISTRATION
// POST /api/auth/register-admin - Super Admin only
router.post(
  '/register-admin', 
  registrationLimiter,
  authenticate, 
  requireSuperAdmin,
  validate(schemas.register), 
  AuthController.register
);

// POST /api/auth/register-tenant - Super Admin or Admin
router.post(
  '/register-tenant', 
  registrationLimiter,
  authenticate, 
  canRegisterUser(USER_ROLES.TENANT),
  validate(schemas.register), 
  AuthController.register
);

// User Management routes
router.get('/users', authenticate, AuthController.getAllUsers);
router.get('/users/:id', authenticate, AuthController.getUserById);
router.put('/users/:id', authenticate, AuthController.updateUser);
router.delete('/users/:id', authenticate, requireSuperAdmin, AuthController.deleteUser);

// Soft Delete routes for users
router.put('/users/:id/archive', authenticate, requireSuperAdmin, AuthController.archiveUser);
router.put('/users/:id/restore', authenticate, requireSuperAdmin, AuthController.restoreUser);
router.delete('/users/:id/permanent', authenticate, requireSuperAdmin, AuthController.permanentDeleteUser);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/change-password', authenticate, AuthController.changePassword);

// Logout endpoints
router.post('/logout', authenticate, AuthController.logout);
router.post('/logout-all', authenticate, AuthController.logoutAll);

// Admin statistics routes
router.get('/stats/blacklist', authenticate, requireSuperAdmin, AuthController.getBlacklistStats);

module.exports = router;