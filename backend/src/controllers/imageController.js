const Property = require('../models/Property');
const ImageService = require('../services/properties/imageService');
const { HTTP_STATUS } = require('../utils/constants');
const AuditService = require('../services/auth/auditService');

class ImageController {
  /**
   * Upload images for a property
   * POST /api/properties/:propertyId/images
   */
  static async uploadImages(req, res, next) {
    try {
      const { propertyId } = req.params;
      const { id: userId, role, email: userEmail } = req.user;
      const files = req.files || [];

      if (!files || files.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'No files provided'
        });
      }

      // Check property exists and user has access
      const property = await Property.findById(propertyId, req.user);
      if (!property) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Process images
      const { results, errors } = await ImageService.processMultipleImages(files);

      if (results.length === 0) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message: 'Image processing failed',
          errors
        });
      }

      // Add images to property
      const uploadedImages = [];
      for (const imageData of results) {
        const updatedProperty = await Property.addImage(propertyId, imageData);
        uploadedImages.push(imageData);
      }

      // Log audit
      try {
        await AuditService.logOperation({
          user_id: userId,
          user_email: userEmail,
          user_role: role,
          action: 'UPLOAD',
          resource_type: 'PROPERTY_IMAGE',
          resource_id: propertyId,
          old_values: null,
          new_values: {
            images_count: uploadedImages.length,
            filenames: uploadedImages.map(img => img.filename)
          }
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
        // Don't fail the request if audit fails
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${results.length} image(s) uploaded successfully`,
        data: {
          propertyId,
          images: uploadedImages,
          errors: errors.length > 0 ? errors : undefined
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all images for a property
   * GET /api/properties/:propertyId/images
   */
  static async getImages(req, res, next) {
    try {
      const { propertyId } = req.params;

      // Check property exists and user has access
      const property = await Property.findById(propertyId, req.user);
      if (!property) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Property not found'
        });
      }

      const images = await Property.getImages(propertyId);

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          propertyId,
          images,
          count: images.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a single image from property
   * DELETE /api/properties/:propertyId/images/:imageId
   */
  static async deleteImage(req, res, next) {
    try {
      const { propertyId, imageId } = req.params;
      const { id: userId, role, email: userEmail } = req.user;

      // Check property exists and user has access
      const property = await Property.findById(propertyId, req.user);
      if (!property) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Get current images before deletion
      const currentImages = await Property.getImages(propertyId);
      const imageToDelete = currentImages.find(img => img.id === imageId);

      if (!imageToDelete) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Remove image from property and archive it
      const updatedProperty = await Property.removeImage(propertyId, imageId, userId);

      // Delete file from disk
      await ImageService.deleteImage(imageToDelete.url);

      // Log audit
      try {
        await AuditService.logOperation({
          user_id: userId,
          user_email: userEmail,
          user_role: role,
          action: 'DELETE',
          resource_type: 'PROPERTY_IMAGE',
          resource_id: propertyId,
          old_values: {
            image_id: imageId,
            filename: imageToDelete.filename
          },
          new_values: {
            images_count: updatedProperty.images.length
          }
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Image deleted successfully',
        data: {
          propertyId,
          deletedImageId: imageId,
          remainingImages: updatedProperty.images.length
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get thumbnail for an image
   * GET /api/properties/:propertyId/images/:imageId/thumbnail
   */
  static async getThumbnail(req, res, next) {
    try {
      const { propertyId, imageId } = req.params;
      const { width = 200, height = 200 } = req.query;

      // Check property exists and user has access
      const property = await Property.findById(propertyId, req.user);
      if (!property) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Get images
      const images = await Property.getImages(propertyId);
      const image = images.find(img => img.id === imageId);

      if (!image) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Image not found'
        });
      }

      // Generate thumbnail
      const thumbnailUrl = await ImageService.generateThumbnail(
        image.url,
        parseInt(width),
        parseInt(height)
      );

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: {
          propertyId,
          imageId,
          thumbnailUrl,
          dimensions: {
            width: parseInt(width),
            height: parseInt(height)
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete all images from property
   * DELETE /api/properties/:propertyId/images
   */
  static async deleteAllImages(req, res, next) {
    try {
      const { propertyId } = req.params;
      const { id: userId, role, email: userEmail } = req.user;

      // Check property exists and user has access
      const property = await Property.findById(propertyId, req.user);
      if (!property) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          message: 'Property not found'
        });
      }

      // Get current images
      const currentImages = await Property.getImages(propertyId);

      if (currentImages.length === 0) {
        return res.status(HTTP_STATUS.OK).json({
          success: true,
          message: 'No images to delete',
          data: {
            propertyId,
            deletedCount: 0
          }
        });
      }

      // Delete all images from disk
      const deleteCount = await ImageService.deleteMultipleImages(
        currentImages.map(img => img.url)
      );

      // Clear images array in database
      const updatedProperty = await Property.update(
        propertyId,
        { images: [] },
        req.user
      );

      // Log audit
      try {
        await AuditService.logOperation({
          user_id: userId,
          user_email: userEmail,
          user_role: role,
          action: 'DELETE',
          resource_type: 'PROPERTY_IMAGES',
          resource_id: propertyId,
          old_values: {
            images_count: currentImages.length
          },
          new_values: {
            images_count: 0
          }
        });
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: `${deleteCount} image(s) deleted successfully`,
        data: {
          propertyId,
          deletedCount: deleteCount,
          remainingImages: 0
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ImageController;
