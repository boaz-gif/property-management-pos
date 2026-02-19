const PropertyService = require('../services/properties/propertyService');
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
      
      // PHASE 1 FIX: After creating property, refresh user's JWT token
      // to include the new property in the properties array
      const User = require('../models/User');
      const AuthService = require('../services/auth/authService');
      
      const updatedUser = await User.findById(user.id);
      const newToken = AuthService.generateToken(updatedUser);
      
      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Property created successfully',
        data: property,
        token: newToken  // ← Return updated token with new property
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

  static async searchProperties(req, res, next) {
    try {
      const { q } = req.query;
      const user = req.user;
      const properties = await PropertyService.searchProperties(q, user);
      
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: properties,
        count: properties.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportPropertiesToCSV(req, res, next) {
    try {
      const user = req.user;
      const csvData = await PropertyService.exportPropertiesToCSV(user);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=properties.csv');
      res.status(HTTP_STATUS.OK).send(csvData);
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // SOFT DELETE METHODS
  // ============================================================================

  /**
   * PUT /api/properties/:id/archive
   * Archive (soft delete) a property - Admin/Super Admin only
   * CRITICAL: Cannot archive property with active tenants
   */
  static async archiveProperty(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Authorization check
      if (user.role !== 'admin' && user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Only admins can archive properties' 
        });
      }
      
      const result = await PropertyService.archiveProperty(id, user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Property not found or already archived'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'Property archived successfully', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * PUT /api/properties/:id/restore
   * Restore an archived property - Admin/Super Admin only
   */
  static async restoreProperty(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      const result = await PropertyService.restoreProperty(id, user);
      
      if (!result) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          error: 'Property not found or not archived'
        });
      }
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'Property restored successfully', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }

  /**
   * DELETE /api/properties/:id/permanent
   * Permanently delete a property - SUPER ADMIN ONLY with safety check
   */
  static async permanentDeleteProperty(req, res, next) {
    try {
      const { id } = req.params;
      const user = req.user;
      
      // Double protection
      if (user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ 
          error: 'Only super admins can permanently delete records' 
        });
      }
      
      const result = await PropertyService.permanentDeleteProperty(id, user);
      
      res.status(HTTP_STATUS.OK).json({ 
        success: true, 
        message: 'Property permanently deleted', 
        data: result 
      });
    } catch (error) { 
      next(error); 
    }
  }
}

module.exports = PropertyController;