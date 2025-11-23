const AuthService = require('../services/authService');
const { USER_ROLES, HTTP_STATUS } = require('../utils/constants');

class AuthController {
  static async register(req, res, next) {
    try {
      const { name, email, password, role = USER_ROLES.TENANT, properties, property_id, unit } = req.body;
      
      // Validate required fields
      if (!name || !email || !password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Name, email, and password are required'
        });
      }
      
      // Create user data object
      const userData = {
        name,
        email,
        password,
        role,
        properties: role === USER_ROLES.TENANT ? null : properties,
        property_id: role === USER_ROLES.TENANT ? property_id : null,
        unit: role === USER_ROLES.TENANT ? unit : null
      };
      
      // Register user
      const result = await AuthService.register(userData);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'User registered successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      // Validate required fields
      if (!email || !password) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Email and password are required'
        });
      }
      
      // Login user
      const result = await AuthService.login(email, password);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Login successful',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async refreshToken(req, res, next) {
    try {
      const { token } = req.body;
      
      if (!token) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Token is required'
        });
      }
      
      const result = await AuthService.refreshToken(token);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Token refreshed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getProfile(req, res, next) {
    try {
      // User is already attached to request by auth middleware
      const user = req.user;
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.id;
      
      // Validate required fields
      if (!currentPassword || !newPassword) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Current password and new password are required'
        });
      }
      
      const result = await AuthService.changePassword(userId, currentPassword, newPassword);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: result.message
      });
    } catch (error) {
      next(error);
    }
  }

  static async logout(req, res, next) {
    try {
      // In a stateless JWT system, logout is typically handled on the client side
      // by simply discarding the token
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logout successful'
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AuthController;