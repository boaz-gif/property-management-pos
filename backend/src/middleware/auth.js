const AuthService = require('../services/authService');
const { USER_ROLES, HTTP_STATUS } = require('../utils/constants');

// Authenticate user with JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Access token is required'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Get user from database
    const User = require('../models/User');
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'User not found'
      });
    }
    
    // Attach user to request
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      error: 'Invalid token'
    });
  }
};

// Authorize user by role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(HTTP_STATUS.FORBIDDEN).json({
        success: false,
        error: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

// Check if user can access specific property
const canAccessProperty = (req, res, next) => {
  const user = req.user;
  const propertyId = parseInt(req.params.propertyId || req.body.propertyId);
  
  // Super admin can access all properties
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }
  
  // Admin can access their assigned properties
  if (user.role === USER_ROLES.ADMIN && user.properties && user.properties.includes(propertyId)) {
    return next();
  }
  
  // Tenant can only access their own property
  if (user.role === USER_ROLES.TENANT && user.property_id === propertyId) {
    return next();
  }
  
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    error: 'You do not have permission to access this property'
  });
};

// Check if user can access specific tenant
const canAccessTenant = (req, res, next) => {
  const user = req.user;
  const tenantId = parseInt(req.params.tenantId || req.body.tenantId);
  
  // Super admin can access all tenants
  if (user.role === USER_ROLES.SUPER_ADMIN) {
    return next();
  }
  
  // Admin can access tenants in their properties
  if (user.role === USER_ROLES.ADMIN) {
    // This would require a database query to check if tenant belongs to admin's property
    // For now, we'll allow it and check in the service layer
    return next();
  }
  
  // Tenant can only access their own record
  if (user.role === USER_ROLES.TENANT && user.id === tenantId) {
    return next();
  }
  
  return res.status(HTTP_STATUS.FORBIDDEN).json({
    success: false,
    error: 'You do not have permission to access this tenant'
  });
};

module.exports = {
  authenticate,
  authorize,
  canAccessProperty,
  canAccessTenant
};