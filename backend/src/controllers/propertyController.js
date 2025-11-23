const PropertyService = require('../services/propertyService');
const { HTTP_STATUS } = require('../utils/constants');

class PropertyController {
  static async getAllProperties(req, res, next) {
    try {
      const user = req.user;
      const properties = await PropertyService.getAllProperties(user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: properties,
        count: properties.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPropertyById(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const property = await PropertyService.getPropertyById(id, user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: property
      });
    } catch (error) {
      next(error);
    }
  }

  static async createProperty(req, res, next) {
    try {
      const propertyData = req.body;
      const user = req.user;
      
      const property = await PropertyService.createProperty(propertyData, user);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Property created successfully',
        data: property
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateProperty(req, res, next) {
    try {
      const { id } = req.params;
      const propertyData = req.body;
      const user = req.user;
      
      const property = await PropertyService.updateProperty(id, propertyData, user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Property updated successfully',
        data: property
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteProperty(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const result = await PropertyService.deleteProperty(id, user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        ...result
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPropertyStats(req, res, next) {
    try {
      const user = req.user;
      const stats = await PropertyService.getPropertyStats(user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PropertyController;