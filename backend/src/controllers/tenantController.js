const TenantService = require('../services/tenantService');
const { HTTP_STATUS } = require('../utils/constants');

class TenantController {
  static async getAllTenants(req, res, next) {
    try {
      const user = req.user;
      const tenants = await TenantService.getAllTenants(user);

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
}

module.exports = TenantController;
