const adminManagementService = require('../services/adminManagementService');
const { validationResult } = require('express-validator');
const { HTTP_STATUS } = require('../utils/constants');
const auditMiddleware = require('../middleware/auditMiddleware');
const logger = require('../utils/logger');

class AdminManagementController {
  // GET /super-admin/admins/overview
  async getAdminsOverview(req, res) {
    try {
      const { page = 1, limit = 50, sortBy = 'name', sortOrder = 'asc', search, status } = req.query;
      
      const result = await adminManagementService.getAdminsOverview({
        page: parseInt(page),
        limit: parseInt(limit),
        sortBy,
        sortOrder,
        search,
        status,
        requestingUser: req.user
      });

      // Log the overview access
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'VIEW_ADMIN_OVERVIEW',
        resourceType: 'admin_management',
        details: { filters: { page, limit, sortBy, sortOrder, search, status } }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: result,
        pagination: {
          currentPage: result.currentPage,
          totalPages: result.totalPages,
          totalRecords: result.totalRecords,
          hasNext: result.hasNext,
          hasPrev: result.hasPrev
        }
      });
    } catch (error) {
      logger.error('Error in getAdminsOverview:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch admin overview',
        message: error.message
      });
    }
  }

  // GET /super-admin/admins/:id/performance
  async getAdminPerformance(req, res) {
    try {
      const { id } = req.params;
      const { startDate, endDate, period = 'monthly' } = req.query;

      // Validate admin exists and user has permission
      const admin = await adminManagementService.getAdminById(id);
      if (!admin) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Admin not found'
        });
      }

      const performanceData = await adminManagementService.getAdminPerformance(id, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        period
      });

      // Log the performance access
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'VIEW_ADMIN_PERFORMANCE',
        resourceType: 'admin_management',
        resourceId: id,
        details: { startDate, endDate, period }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: performanceData
      });
    } catch (error) {
      logger.error('Error in getAdminPerformance:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch admin performance',
        message: error.message
      });
    }
  }

  // GET /super-admin/admins/:id/activity
  async getAdminActivity(req, res) {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, startDate, endDate, activityType } = req.query;

      const activityData = await adminManagementService.getAdminActivity(id, {
        page: parseInt(page),
        limit: parseInt(limit),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        activityType
      });

      // Log the activity access
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'VIEW_ADMIN_ACTIVITY',
        resourceType: 'admin_management',
        resourceId: id,
        details: { page, limit, startDate, endDate, activityType }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: activityData
      });
    } catch (error) {
      logger.error('Error in getAdminActivity:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch admin activity',
        message: error.message
      });
    }
  }

  // POST /super-admin/admins/:id/suspend
  async suspendAdmin(req, res) {
    try {
      const { id } = req.params;
      const { reason, notifyTenants = true, effectiveImmediately = true } = req.body;

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const result = await adminManagementService.suspendAdmin(id, {
        reason,
        notifyTenants,
        effectiveImmediately,
        suspendedBy: req.user.id
      });

      // Log the suspension
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'SUSPEND_ADMIN',
        resourceType: 'admin_management',
        resourceId: id,
        details: { reason, notifyTenants, effectiveImmediately }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Admin suspended successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in suspendAdmin:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to suspend admin',
        message: error.message
      });
    }
  }

  // POST /super-admin/admins/:id/properties/reassign
  async reassignProperties(req, res) {
    try {
      const { id } = req.params;
      const { propertyIds, newAdminId, reason, notifyTenants = true } = req.body;

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const result = await adminManagementService.reassignProperties(id, {
        propertyIds,
        newAdminId,
        reason,
        notifyTenants,
        reassignedBy: req.user.id
      });

      // Log the reassignment
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'REASSIGN_PROPERTIES',
        resourceType: 'admin_management',
        resourceId: id,
        details: { propertyIds, newAdminId, reason, notifyTenants }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Properties reassigned successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in reassignProperties:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to reassign properties',
        message: error.message
      });
    }
  }

  // PUT /super-admin/admins/:id/capacity
  async updateAdminCapacity(req, res) {
    try {
      const { id } = req.params;
      const { maxProperties, maxUnits, maxTenants, reason } = req.body;

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const result = await adminManagementService.updateAdminCapacity(id, {
        maxProperties,
        maxUnits,
        maxTenants,
        reason,
        updatedBy: req.user.id
      });

      // Log the capacity update
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'UPDATE_ADMIN_CAPACITY',
        resourceType: 'admin_management',
        resourceId: id,
        details: { maxProperties, maxUnits, maxTenants, reason }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Admin capacity updated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in updateAdminCapacity:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to update admin capacity',
        message: error.message
      });
    }
  }

  // GET /super-admin/admins/alerts
  async getAdminAlerts(req, res) {
    try {
      const { page = 1, limit = 50, severity, alertType, adminId, resolved = false } = req.query;

      const alerts = await adminManagementService.getAdminAlerts({
        page: parseInt(page),
        limit: parseInt(limit),
        severity,
        alertType,
        adminId: adminId ? parseInt(adminId) : null,
        resolved: resolved === 'true'
      });

      // Log the alerts access
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'VIEW_ADMIN_ALERTS',
        resourceType: 'admin_management',
        details: { page, limit, severity, alertType, adminId, resolved }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: alerts
      });
    } catch (error) {
      logger.error('Error in getAdminAlerts:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch admin alerts',
        message: error.message
      });
    }
  }

  // PUT /super-admin/admins/alerts/:alertId/resolve
  async resolveAlert(req, res) {
    try {
      const { alertId } = req.params;
      const { resolution, notes } = req.body;

      const result = await adminManagementService.resolveAlert(alertId, {
        resolution,
        notes,
        resolvedBy: req.user.id
      });

      // Log the alert resolution
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'RESOLVE_ADMIN_ALERT',
        resourceType: 'admin_management',
        resourceId: alertId,
        details: { resolution, notes }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Alert resolved successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in resolveAlert:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to resolve alert',
        message: error.message
      });
    }
  }

  // GET /super-admin/admins/metrics/summary
  async getMetricsSummary(req, res) {
    try {
      const { period = '30d', adminId } = req.query;

      const summary = await adminManagementService.getMetricsSummary({
        period,
        adminId: adminId ? parseInt(adminId) : null
      });

      // Log the metrics access
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'VIEW_METRICS_SUMMARY',
        resourceType: 'admin_management',
        details: { period, adminId }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error in getMetricsSummary:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch metrics summary',
        message: error.message
      });
    }
  }

  // POST /super-admin/admins/:id/reactivate
  async reactivateAdmin(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const result = await adminManagementService.reactivateAdmin(id, {
        reason,
        reactivatedBy: req.user.id
      });

      // Log the reactivation
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'REACTIVATE_ADMIN',
        resourceType: 'admin_management',
        resourceId: id,
        details: { reason }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Admin reactivated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in reactivateAdmin:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to reactivate admin',
        message: error.message
      });
    }
  }

  // GET /super-admin/admins/:id/capacity-status
  async getAdminCapacityStatus(req, res) {
    try {
      const { id } = req.params;

      const capacityStatus = await adminManagementService.getAdminCapacityStatus(id);

      // Log the capacity status access
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'VIEW_ADMIN_CAPACITY_STATUS',
        resourceType: 'admin_management',
        resourceId: id
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: capacityStatus
      });
    } catch (error) {
      logger.error('Error in getAdminCapacityStatus:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch admin capacity status',
        message: error.message
      });
    }
  }

  // POST /super-admin/admins/bulk-operations
  async bulkAdminOperation(req, res) {
    try {
      const { operation, adminIds, parameters } = req.body;

      // Validate input
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const result = await adminManagementService.performBulkAdminOperation({
        operation,
        adminIds,
        parameters,
        initiatedBy: req.user.id
      });

      // Log the bulk operation
      await auditMiddleware.logAuditEvent({
        userId: req.user.id,
        action: 'BULK_ADMIN_OPERATION',
        resourceType: 'admin_management',
        details: { operation, adminIds, parameters }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Bulk operation initiated successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error in bulkAdminOperation:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to perform bulk operation',
        message: error.message
      });
    }
  }
}

module.exports = new AdminManagementController();
