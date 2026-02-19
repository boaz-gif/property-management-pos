const PermissionService = require('../services/PermissionService');

function requirePermission(resource, action, options = {}) {
  return async (req, res, next) => {
    try {
      const tenantId =
        options.tenantIdParam && req.params ? req.params[options.tenantIdParam] : undefined;

      const paymentId =
        options.paymentIdParam && req.params ? req.params[options.paymentIdParam] : undefined;

      const maintenanceId =
        options.maintenanceIdParam && req.params ? req.params[options.maintenanceIdParam] : undefined;

      const documentId =
        options.documentIdParam && req.params ? req.params[options.documentIdParam] : undefined;

      const organizationId =
        options.organizationIdParam && req.params ? req.params[options.organizationIdParam] : undefined;

      const propertyId =
        (options.propertyIdParam && req.params ? req.params[options.propertyIdParam] : undefined) ??
        (req.activeProperty !== undefined && req.activeProperty !== null ? req.activeProperty : undefined) ??
        req.headers['x-property-id'] ??
        (req.user ? req.user.property_id : undefined);

      await PermissionService.ensurePermission(req.user, resource, action, {
        tenantId,
        paymentId,
        maintenanceId,
        documentId,
        organizationId: organizationId ?? req.activeOrganization ?? req.headers['x-organization-id'],
        propertyId,
        activeProperty: req.activeProperty,
        activeOrganization: req.activeOrganization,
        req,
      });
      next();
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: error.message || 'Forbidden',
      });
    }
  };
}

module.exports = {
  requirePermission,
};
