const AuthService = require('../services/auth/authService');
const TokenBlacklistService = require('../services/auth/tokenBlacklistService');
const { USER_ROLES, HTTP_STATUS } = require('../utils/constants');
const redisClient = require('../config/redis');

const BLACKLIST_CACHE_TTL = 300; // 5 minutes

// Check if token is blacklisted with Redis caching
const checkBlacklist = async (token) => {
  const cacheKey = `pms:blacklist:${token}`;
  
  try {
    // Try to get from Redis cache first
    const cached = await redisClient.get(cacheKey);
    if (cached !== null) {
      return cached === 'true';
    }
    
    // Cache miss - check database
    const isBlacklisted = await TokenBlacklistService.isTokenBlacklisted(token);
    
    // Cache the result (only cache false to avoid caching blacklisted tokens indefinitely)
    if (!isBlacklisted) {
      await redisClient.set(cacheKey, 'false', BLACKLIST_CACHE_TTL);
    }
    
    return isBlacklisted;
  } catch (error) {
    // If Redis fails, fall back to database check
    console.warn('Blacklist cache check failed, falling back to DB:', error.message);
    return await TokenBlacklistService.isTokenBlacklisted(token);
  }
};

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
    
    // Check if token is blacklisted (with Redis caching)
    const isBlacklisted = await checkBlacklist(token);
    if (isBlacklisted) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        error: 'Token has been revoked. Please log in again.',
        code: 'TOKEN_REVOKED'
      });
    }
    
    // Verify token
    const decoded = AuthService.verifyToken(token);
    
    // Trust the decoded JWT data - no database query needed
    // JWT already contains: id, email, role, properties, property_id, unit
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      properties: decoded.properties,
      property_id: decoded.property_id,
      unit: decoded.unit
    };
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