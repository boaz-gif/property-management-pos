const UnitService = require('../services/unitService');
const { HTTP_STATUS } = require('../utils/constants');

class UnitController {
  static async listUnits(req, res, next) {
    try {
      const { propertyId } = req.params;
      const units = await UnitService.listUnits(parseInt(propertyId, 10), req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, data: units, count: units.length });
    } catch (error) {
      next(error);
    }
  }

  static async createUnit(req, res, next) {
    try {
      const { propertyId } = req.params;
      const unit = await UnitService.createUnit(parseInt(propertyId, 10), req.body, req.user);
      res.status(HTTP_STATUS.CREATED).json({ success: true, message: 'Unit created successfully', data: unit });
    } catch (error) {
      next(error);
    }
  }

  static async updateUnit(req, res, next) {
    try {
      const { propertyId, unitId } = req.params;
      const unit = await UnitService.updateUnit(parseInt(propertyId, 10), parseInt(unitId, 10), req.body, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Unit updated successfully', data: unit });
    } catch (error) {
      next(error);
    }
  }

  static async archiveUnit(req, res, next) {
    try {
      const { propertyId, unitId } = req.params;
      const unit = await UnitService.archiveUnit(parseInt(propertyId, 10), parseInt(unitId, 10), req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Unit archived successfully', data: unit });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UnitController;

