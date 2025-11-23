const express = require('express');
const AuthController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// Public routes
// POST /api/auth/register
router.post('/register', validate(schemas.register), AuthController.register);

// POST /api/auth/login
router.post('/login', validate(schemas.login), AuthController.login);
router.post('/refresh-token', AuthController.refreshToken);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/change-password', authenticate, AuthController.changePassword);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;