const MaintenanceService = require('../services/maintenanceService');
const { HTTP_STATUS } = require('../utils/constants');

class MaintenanceController {
  static async getAllRequests(req, res, next) {
    try {
      const requests = await MaintenanceService.getAllRequests(req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRequestById(req, res, next) {
    try {
      const request = await MaintenanceService.getRequestById(req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRequest(req, res, next) {
    try {
      const request = await MaintenanceService.createRequest(req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Maintenance request created successfully',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRequest(req, res, next) {
    try {
      const request = await MaintenanceService.updateRequest(req.params.id, req.body, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Maintenance request updated',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = MaintenanceController;
