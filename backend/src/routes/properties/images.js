const express = require('express');
const ImageController = require('../../controllers/imageController');
const { authenticate, authorize } = require('../../middleware/auth');
const upload = require('../../middleware/upload');
const { USER_ROLES } = require('../../utils/constants');
const { auditMiddleware } = require('../../middleware/auditMiddleware');

const router = express.Router({ mergeParams: true });

// All routes require authentication
router.use(authenticate);

// GET - Get all images for a property
router.get('/', ImageController.getImages);

// POST - Upload images (multiple files support)
router.post('/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  upload.array('images', 10), // Max 10 images at once
  ImageController.uploadImages
);

// GET - Get thumbnail for specific image
router.get('/:imageId/thumbnail', ImageController.getThumbnail);

// DELETE - Delete single image
router.delete('/:imageId',
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ImageController.deleteImage
);

// DELETE - Delete all images
router.delete('/',
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN),
  ImageController.deleteAllImages
);

module.exports = router;
