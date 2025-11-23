const express = require('express');
const PropertyController = require('../controllers/propertyController');
const { authenticate, authorize } = require('../middleware/auth');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// GET /api/properties - Get all properties (accessible to all authenticated users)
router.get('/', PropertyController.getAllProperties);

// GET /api/properties/stats - Get property statistics
router.get('/stats', PropertyController.getPropertyStats);

// GET /api/properties/:id - Get property by ID
router.get('/:id', PropertyController.getPropertyById);

// POST /api/properties - Create new property (admin and super_admin only)
router.post('/', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
  PropertyController.createProperty
);

// PUT /api/properties/:id - Update property (admin and super_admin only)
router.put('/:id', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
  PropertyController.updateProperty
);

// DELETE /api/properties/:id - Delete property (admin and super_admin only)
router.delete('/:id', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
  PropertyController.deleteProperty
);

module.exports = router;