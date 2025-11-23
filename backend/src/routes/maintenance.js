const express = require('express');
const MaintenanceController = require('../controllers/maintenanceController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');
const { USER_ROLES } = require('../utils/constants');

const router = express.Router();

router.use(authenticate);

router.get('/', MaintenanceController.getAllRequests);
router.get('/:id', MaintenanceController.getRequestById);
router.post('/', validate(schemas.createMaintenance), MaintenanceController.createRequest);
router.put('/:id', 
  authorize(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN), 
  MaintenanceController.updateRequest
);

module.exports = router;
