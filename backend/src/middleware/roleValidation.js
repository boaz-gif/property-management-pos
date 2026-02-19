const { USER_ROLES, HTTP_STATUS } = require('../utils/constants');

/**
 * Role Validation Middleware
 * Ensures only authorized users can perform certain actions
 */

/**
 * Middleware to check if user has required role
 * @param {Array|string} allowedRoles - Roles that are allowed to access the route
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    try {
      // User should be authenticated first
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role;
      const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

      // Check if user has required role
      if (!roles.includes(userRole)) {
        return res.status(HTTP_STATUS.FORBIDDEN).json({
          success: false,
          error: 'Insufficient permissions to perform this action'
        });
      }

      next();
    } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Role validation error'
      });
    }
  };
}

/**
 * Middleware to check if user can register other users
 * Super Admin can register Admins and Tenants
 * Admin can register Tenants only
 */
function canRegisterUser(targetRole) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(HTTP_STATUS.UNAUTHORIZED).json({
          success: false,
          error: 'Authentication required'
        });
      }

      const userRole = req.user.role;

      // Super Admin can register anyone except another Super Admin
      if (userRole === USER_ROLES.SUPER_ADMIN) {
        if (targetRole === USER_ROLES.SUPER_ADMIN) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: 'Cannot create another Super Admin'
          });
        }
        return next();
      }

      // Admin can only register Tenants
      if (userRole === USER_ROLES.ADMIN) {
        if (targetRole !== USER_ROLES.TENANT) {
          return res.status(HTTP_STATUS.FORBIDDEN).json({
            success: false,
            error: 'Admin can only register Tenant users'
          });
        }
        return next();
      }

      // Tenants cannot register anyone
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions to register users'
      });

    } catch (error) {
      return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Registration permission check failed'
      });
    }
  };
}

/**
 * Middleware to check if user is Super Admin
 */
function requireSuperAdmin(req, res, next) {
  return requireRole(USER_ROLES.SUPER_ADMIN)(req, res, next);
}

/**
 * Middleware to check if user is Admin or Super Admin
 */
function requireAdminOrSuperAdmin(req, res, next) {
  return requireRole([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN])(req, res, next);
}

/**
 * Middleware to check if user is Tenant
 */
function requireTenant(req, res, next) {
  return requireRole(USER_ROLES.TENANT)(req, res, next);
}

module.exports = {
  requireRole,
  canRegisterUser,
  requireSuperAdmin,
  requireAdminOrSuperAdmin,
  requireTenant
};
