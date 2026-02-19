const PropertyLeaseService = require('../services/propertyLeaseService');
const { HTTP_STATUS } = require('../utils/constants');

class PropertyLeaseController {
  static async getLeaseSettings(req, res, next) {
    try {
      const { propertyId } = req.params;
      const settings = await PropertyLeaseService.getSettings(parseInt(propertyId, 10), req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async updateLeaseSettings(req, res, next) {
    try {
      const { propertyId } = req.params;
      const settings = await PropertyLeaseService.updateSettings(parseInt(propertyId, 10), req.body, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Lease settings updated', data: settings });
    } catch (error) {
      next(error);
    }
  }

  static async bulkSetLeases(req, res, next) {
    try {
      const { propertyId } = req.params;
      const result = await PropertyLeaseService.bulkSetLeases(parseInt(propertyId, 10), req.body, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Leases updated', data: result });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PropertyLeaseController;

