const PermissionService = require('../services/PermissionService');

const scopeMiddleware = async (req, res, next) => {
  const user = req.user;

  if (!user) {
    return next();
  }

  const organizationId = req.headers['x-organization-id'];
  if (organizationId) {
    req.activeOrganization = parseInt(organizationId);
  }

  // Check for X-Property-ID header
  const propertyId = req.headers['x-property-id'];

  if (propertyId) {
    try {
      await PermissionService.ensurePropertyAccess(user, propertyId);
      
      req.activeProperty = parseInt(propertyId);
    } catch (error) {
      return res.status(403).json({ error: error.message });
    }
  } else if (user.role === 'tenant') {
      // For tenants, scope is always their property
      // But they might have moved, so it depends on if we treat scope as property or tenant unit.
      // Usually tenants are scoped to their unit/tenant record primarily.
      req.activeProperty = user.property_id;
  }

  next();
};

module.exports = scopeMiddleware;
