const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissionMiddleware');
const PrivacyController = require('../controllers/privacyController');

const router = express.Router();

router.use(authenticate);

router.get('/me/export', requirePermission('privacy', 'export'), PrivacyController.exportMe);
router.delete('/me', requirePermission('privacy', 'delete'), PrivacyController.deleteMe);

router.get('/tenants/:id/export', requirePermission('privacy', 'export'), PrivacyController.exportTenant);
router.delete('/tenants/:id', requirePermission('privacy', 'delete'), PrivacyController.deleteTenant);

module.exports = router;
