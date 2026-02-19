const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissionMiddleware');
const DashboardWidgetController = require('../controllers/dashboardWidgetController');

const router = express.Router();

router.use(authenticate);

router.get('/', requirePermission('dashboard', 'read'), DashboardWidgetController.getWidgets);
router.put('/order', requirePermission('dashboard', 'update'), DashboardWidgetController.updateWidgets);

module.exports = router;
