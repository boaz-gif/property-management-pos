const TenantService = require('../services/tenants/tenantService');
const MaintenanceService = require('../services/maintenance/maintenanceService');
const PaymentService = require('../services/payments/paymentService');
const LeaseService = require('../services/tenants/leaseService');
const { HTTP_STATUS } = require('../utils/constants');

class TenantController {
  // ============================================================================
  // TENANT-SPECIFIC METHODS (Current logged-in tenant accessing own data)
  // ============================================================================

  /**
   * GET /api/tenants/me
   * Get current tenant's own record
   * Security: Tenant can only access their own record
   * PHASE 3: Uses user_id FK instead of email matching
   */
  static async getCurrentTenant(req, res, next) {
    try {
      const user = req.user;

      // PHASE 3: Use user_id directly for cleaner lookup, with fallback to email
      let tenant = null;
      
      if (user.id) {
        tenant = await TenantService.getTenantByUserId(user.id);
      }
      
      // Fallback to email-based lookup if user_id lookup fails
      if (!tenant && user.email) {
        tenant = await TenantService.getTenantByEmail(user.email, user);
      }

      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant record not found'
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: tenant
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/me/payments
   * Get current tenant's payment history
   * Security: Tenant sees only their own payments
   * PHASE 3: Uses user_id FK for cleaner lookup
   */
  static async getCurrentTenantPayments(req, res, next) {
    try {
      const user = req.user;

      // PHASE 3: Use user_id directly with fallback to email
      let tenant = null;
      
      if (user.id) {
        tenant = await TenantService.getTenantByUserId(user.id);
      }
      
      // Fallback to email-based lookup if user_id lookup fails
      if (!tenant && user.email) {
        tenant = await TenantService.getTenantByEmail(user.email, user);
      }

      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant record not found'
        });
      }

      // Get payments for this tenant
      const payments = await PaymentService.getPaymentsByTenantId(tenant.id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: payments || [],
        count: (payments || []).length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/me/maintenance
   * Get current tenant's maintenance requests
   * Security: Tenant sees only their own maintenance requests
   * PHASE 3: Uses user_id FK for cleaner lookup
   */
  static async getCurrentTenantMaintenance(req, res, next) {
    try {
      const user = req.user;

      // PHASE 3: Use user_id directly with fallback to email
      let tenant = null;
      
      if (user.id) {
        tenant = await TenantService.getTenantByUserId(user.id);
      }
      
      // Fallback to email-based lookup if user_id lookup fails
      if (!tenant && user.email) {
        tenant = await TenantService.getTenantByEmail(user.email, user);
      }

      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant record not found'
        });
      }

      // Get maintenance requests for this tenant
      const maintenance = await MaintenanceService.getMaintenanceByTenantId(tenant.id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: maintenance || [],
        count: (maintenance || []).length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tenants/me
   * Update current tenant's own information
   * Security: Tenant can only update their own record
   * PHASE 3: Uses user_id FK for cleaner lookup
   */
  static async updateCurrentTenant(req, res, next) {
    try {
      const user = req.user;
      const tenantData = req.body;

      // PHASE 3: Use user_id directly with fallback to email
      let tenant = null;
      
      if (user.id) {
        tenant = await TenantService.getTenantByUserId(user.id);
      }
      
      // Fallback to email-based lookup if user_id lookup fails
      if (!tenant && user.email) {
        tenant = await TenantService.getTenantByEmail(user.email, user);
      }

      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant record not found'
        });
      }

      // Only allow tenants to update specific fields
      const allowedFields = ['phone', 'emergency_contact', 'emergency_phone'];
      const filteredData = {};
      
      allowedFields.forEach(field => {
        if (tenantData[field] !== undefined) {
          filteredData[field] = tenantData[field];
        }
      });

      // Update tenant
      const updatedTenant = await TenantService.updateTenant(tenant.id, filteredData, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Tenant information updated successfully',
        data: updatedTenant
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // ADMIN/SUPER-ADMIN METHODS (Managing all tenants)
  // ============================================================================

  static async getAllTenants(req, res, next) {
    try {
      const user = req.user;
      const { includeArchived, onlyArchived } = req.query;
      
      // TODO: Implement includeArchived and onlyArchived in TenantService
      const tenants = await TenantService.getAllTenants(user, { 
        includeArchived: includeArchived === 'true',
        onlyArchived: onlyArchived === 'true'
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: tenants,
        count: tenants.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTenantById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const tenant = await TenantService.getTenantById(id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: tenant
      });
    } catch (error) {
      next(error);
    }
  }

  static async createTenant(req, res, next) {
    try {
      const tenantData = req.body;
      const user = req.user;

      const tenant = await TenantService.createTenant(tenantData, user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Tenant created successfully',
        data: tenant
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateTenant(req, res, next) {
    try {
      const { id } = req.params;
      const tenantData = req.body;
      const user = req.user;

      const tenant = await TenantService.updateTenant(id, tenantData, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Tenant updated successfully',
        data: tenant
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTenant(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const result = await TenantService.deleteTenant(id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTenantStats(req, res, next) {
    try {
      const user = req.user;
      const stats = await TenantService.getTenantStats(user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /*
  static async updateTenantBalance(req, res, next) {
    try {
      const { id } = req.params;
      const { amount, type } = req.body;
      const user = req.user;

      // Validate required fields
      if (!amount || !type) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Amount and type are required'
        });
      }

      // Validate amount is a number
      if (isNaN(parseFloat(amount))) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Amount must be a valid number'
        });
      }

      const result = await TenantService.updateTenantBalance(id, parseFloat(amount), type, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }
  */

  static async processPayment(req, res, next) {
    try {
      const { id: tenantId } = req.params;
      const { amount, method, type } = req.body;
      const user = req.user;

      if (!amount || !method) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Amount and method are required'
        });
      }

      const result = await TenantService.processPayment(tenantId, parseFloat(amount), method, type || 'rent', user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Payment processed successfully',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async adjustTenantBalance(req, res, next) {
    try {
      const { id: tenantId } = req.params;
      const { amount, type } = req.body;
      const user = req.user;

      if (!amount || !type) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Amount and type are required'
        });
      }

      const result = await TenantService.adjustTenantBalance(tenantId, parseFloat(amount), type, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async requestTenantBalanceAdjustment(req, res, next) {
    try {
      const { id: tenantId } = req.params;
      const { amount, reason } = req.body;
      const user = req.user;

      if (!amount || !reason) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Amount and reason are required'
        });
      }

      const result = await TenantService.requestBalanceAdjustment(tenantId, parseFloat(amount), reason, user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Balance adjustment request submitted for review',
        data: result
      });
    } catch (error) {
      next(error);
    }
  }

  static async createDispute(req, res, next) {
    try {
      const { id: tenantId } = req.params;
      const { chargeId, reason } = req.body;
      const user = req.user;

      if (!reason) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Reason is required'
        });
      }

      const dispute = await TenantService.createDispute(tenantId, chargeId, reason, user);

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Dispute created successfully',
        data: dispute
      });
    } catch (error) {
      next(error);
    }
  }

  static async getNotifications(req, res, next) {
    try {
      const { id: tenantId } = req.params;
      const user = req.user;

      const notifications = await TenantService.getNotifications(tenantId, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: notifications
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLeaseDetails(req, res, next) {
    try {
      const { id: tenantId } = req.params;
      const user = req.user;

      const lease = await TenantService.getLeaseDetails(tenantId, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: lease
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFinancialSummary(req, res, next) {
    try {
      const user = req.user;

      const summary = await TenantService.getFinancialSummary(user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRentSchedule(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const schedule = await TenantService.getRentSchedule(id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: schedule
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentHistory(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const history = await TenantService.getTenantPaymentHistory(id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMaintenanceHistory(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      const history = await TenantService.getTenantMaintenanceHistory(id, user);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // LEASE MANAGEMENT METHODS
  // ============================================================================

  /**
   * GET /api/tenants/:id/lease
   * Get lease status and information for a specific tenant
   */
  static async getLeaseStatus(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      // Verify user has access to this tenant
      const tenant = await TenantService.getTenantById(id, user);
      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const leaseStatus = await LeaseService.getTenantLeaseStatus(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: leaseStatus
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/tenants/:id/lease
   * Update lease dates for a tenant (admin only)
   */
  static async updateLease(req, res, next) {
    try {
      const { id } = req.params;
      const { lease_start_date, lease_end_date } = req.body;
      const user = req.user;

      // Verify user has access to this tenant
      const tenant = await TenantService.getTenantById(id, user);
      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      // Validate lease dates
      const validation = LeaseService.validateLeaseDates(lease_start_date, lease_end_date);
      if (!validation.isValid) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          errors: validation.errors
        });
      }

      const updatedTenant = await TenantService.updateTenantLease(id, {
        lease_start_date,
        lease_end_date
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Lease information updated successfully',
        data: updatedTenant
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/tenants/:id/lease/renew
   * Renew lease for a tenant (admin only)
   */
  static async renewLease(req, res, next) {
    try {
      const { id } = req.params;
      const { new_lease_end_date } = req.body;
      const user = req.user;

      if (!new_lease_end_date) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'new_lease_end_date is required'
        });
      }

      // Verify user has access to this tenant
      const tenant = await TenantService.getTenantById(id, user);
      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const renewedTenant = await LeaseService.renewLease(id, new_lease_end_date);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Lease renewed successfully',
        data: renewedTenant
      });
    } catch (error) {
      if (error.details) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          errors: error.details
        });
      }
      next(error);
    }
  }

  /**
   * GET /api/tenants/:id/lease/history
   * Get lease history for a tenant
   */
  static async getLeaseHistory(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;

      // Verify user has access to this tenant
      const tenant = await TenantService.getTenantById(id, user);
      if (!tenant) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Tenant not found'
        });
      }

      const history = await LeaseService.getTenantLeaseHistory(id);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/lease/expiring
   * Get all leases expiring within specified days (admin/super admin only)
   */
  static async getExpiringLeases(req, res, next) {
    try {
      const { days = 30 } = req.query;

      const expiringLeases = await LeaseService.findExpiringLeases(parseInt(days));

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          days_threshold: parseInt(days),
          count: expiringLeases.length,
          leases: expiringLeases
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/lease/expired
   * Get all expired leases (admin/super admin only)
   */
  static async getExpiredLeases(req, res, next) {
    try {
      const expiredLeases = await LeaseService.findExpiredLeases();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          count: expiredLeases.length,
          leases: expiredLeases
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/tenants/lease/stats
   * Get lease statistics (admin/super admin only)
   */
  static async getLeaseStatistics(req, res, next) {
    try {
      const stats = await LeaseService.getLeaseStatistics();

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // SOFT DELETE METHODS
  // ============================================================================

  /**
   * PUT /api/tenants/:id/archive
   * Archive (soft delete) a tenant - Admin/Super Admin only
   */
  static async archiveTenant(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Authorization check
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Only admins can archive tenants' 
        });
      }
      
      const result = await TenantService.archiveTenant(id, user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Tenant not found or already archived'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'Tenant archived successfully', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * PUT /api/tenants/:id/restore
   * Restore an archived tenant - Admin/Super Admin only
   */
  static async restoreTenant(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const result = await TenantService.restoreTenant(id, user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Tenant not found or not archived'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'Tenant restored successfully', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * DELETE /api/tenants/:id/permanent
   * Permanently delete a tenant - SUPER ADMIN ONLY with safety check
   */
  static async permanentDeleteTenant(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Double protection
      if (user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Only super admins can permanently delete records' 
        });
      }
      
      const result = await TenantService.permanentDeleteTenant(id, user);
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'Tenant permanently deleted', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }
}

module.exports = TenantController;
