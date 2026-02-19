const AuthService = require('../services/authService');
const TokenBlacklistService = require('../services/tokenBlacklistService');
const User = require('../models/User');
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
        email: email.toLowerCase(),
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
      const result = await AuthService.login(email.toLowerCase(), password);
      
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
      const token = req.token;
      const userId = req.user.id;
      
      if (!token) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Token is required'
        });
      }
      
      // Add token to blacklist
      await TokenBlacklistService.blacklistToken(token, userId);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logout successful',
        data: {
          userId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout from all devices by blacklisting all tokens
   */
  static async logoutAll(req, res, next) {
    try {
      const userId = req.user.id;
      
      // Blacklist current token
      const token = req.token;
      if (token) {
        await TokenBlacklistService.blacklistToken(token, userId);
      }
      
      // Increment token version to invalidate all tokens
      const result = await TokenBlacklistService.blacklistAllUserTokens(userId);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Logged out from all devices',
        data: {
          userId,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get blacklist statistics (admin only)
   */
  static async getBlacklistStats(req, res, next) {
    try {
      const stats = await TokenBlacklistService.getBlacklistStats();
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // User Management Methods
  static async getAllUsers(req, res, next) {
    try {
      const { role, includeArchived, onlyArchived } = req.query;
      const includeArchivedBool = includeArchived === 'true';
      const onlyArchivedBool = onlyArchived === 'true';
      
      let users;
      if (onlyArchivedBool) {
        // Show only archived users
        users = await User.findOnlyDeleted(req.user, { where: role ? `role = '${role}'` : '' });
        users = users.rows || users;
      } else {
        users = await User.getAll(role, req.user, includeArchivedBool);
      }
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: users,
        count: users.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUserById(req, res, next) {
    try {
      const { id } = req.params;
      const user = await User.findById(id);
      
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user }
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      const userData = req.body;
      
      const updatedUser = await User.update(id, userData);
      
      if (!updatedUser) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User updated successfully',
        data: { user: updatedUser }
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      
      // Check if user exists
      const user = await User.findById(id);
      if (!user) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'User not found'
        });
      }
      
      await User.delete(id);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'User deleted successfully'
      });
    } catch (error) {
      next(error);
    }
  }

  // Archive User (Soft Delete) - Admin/Super Admin only
  static async archiveUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Authorization check
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Only admins can archive users' 
        });
      }
      
      // Prevent self-archiving
      if (parseInt(id) === parseInt(user.id)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'You cannot archive yourself' 
        });
      }
      
      const result = await User.archive(id, user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'User not found or already archived'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'User archived successfully', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  // Restore User - Admin/Super Admin only
  static async restoreUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const result = await User.restore(id, user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'User not found or not archived'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'User restored successfully', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  // Permanent Delete User - SUPER ADMIN ONLY with safety check
  static async permanentDeleteUser(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Double protection
      if (user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Only super admins can permanently delete records' 
        });
      }
      
      // Prevent self-deletion
      if (parseInt(id) === parseInt(user.id)) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'You cannot permanently delete yourself' 
        });
      }
      
      // SAFETY: Ensure record is already archived before permanent delete
      const existing = await User.findByIdWithDeleted(id, user);
      if (!existing || existing.rows?.length === 0) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({ 
          error: 'User not found' 
        });
      }
      
      const existingUser = existing.rows ? existing.rows[0] : existing;
      if (!existingUser.deleted_at) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({ 
          error: 'User must be archived before permanent deletion. Please archive first, then delete permanently.' 
        });
      }
      
      const result = await User.permanentDelete(id, user);
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'User permanently deleted', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }
}

module.exports = AuthController;
