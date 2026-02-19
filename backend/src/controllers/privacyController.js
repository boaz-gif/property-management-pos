const PrivacyService = require('../services/tenants/privacyService');
const { HTTP_STATUS } = require('../utils/constants');

class PrivacyController {
  static async exportMe(req, res, next) {
    try {
      const bundle = await PrivacyService.exportMyData(req.user, {
        audit: { ipAddress: req.ip, userAgent: req.headers['user-agent'] || 'Unknown' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: bundle });
    } catch (error) {
      next(error);
    }
  }

  static async exportTenant(req, res, next) {
    try {
      const { id } = req.params;
      const bundle = await PrivacyService.exportTenantData(req.user, id, {
        audit: { ipAddress: req.ip, userAgent: req.headers['user-agent'] || 'Unknown' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, data: bundle });
    } catch (error) {
      next(error);
    }
  }

  static async deleteMe(req, res, next) {
    try {
      await PrivacyService.deleteMyAccount(req.user, {
        audit: { ipAddress: req.ip, userAgent: req.headers['user-agent'] || 'Unknown' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Account deleted' });
    } catch (error) {
      next(error);
    }
  }

  static async deleteTenant(req, res, next) {
    try {
      const { id } = req.params;
      await PrivacyService.deleteTenant(req.user, id, {
        audit: { ipAddress: req.ip, userAgent: req.headers['user-agent'] || 'Unknown' }
      });
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Tenant deleted' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PrivacyController;
