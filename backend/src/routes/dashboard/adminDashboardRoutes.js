const express = require('express');
const router = express.Router();
const adminDashboardController = require('../../controllers/adminDashboardController');
const { authenticate } = require('../../middleware/auth');
const { body } = require('express-validator');

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /admin/dashboard/overview - Get complete dashboard overview
router.get('/overview', adminDashboardController.getDashboardOverview);

// GET /admin/dashboard/properties-comparison - Get properties comparison data
router.get('/properties-comparison', adminDashboardController.getPropertiesComparison);

// GET /admin/dashboard/action-items - Get action items with filtering and pagination
router.get('/action-items', adminDashboardController.getActionItems);

// POST /admin/dashboard/action-items/:id/complete - Complete an action item
router.post('/action-items/:id/complete', [
  body('notes').optional().isString().trim().isLength({ max: 500 })
], adminDashboardController.completeActionItem);

// POST /admin/dashboard/action-items/:id/dismiss - Dismiss an action item
router.post('/action-items/:id/dismiss', [
  body('reason').notEmpty().withMessage('Reason is required to dismiss action item')
    .isString().trim().isLength({ min: 3, max: 500 })
], adminDashboardController.dismissActionItem);

// GET /admin/dashboard/recent-activity - Get recent activity feed
router.get('/recent-activity', adminDashboardController.getRecentActivity);

// GET /admin/dashboard/financial-summary - Get financial summary
router.get('/financial-summary', adminDashboardController.getFinancialSummary);

// GET /admin/dashboard/quick-stats - Get quick stats (lightweight endpoint)
router.get('/quick-stats', adminDashboardController.getQuickStats);

// POST /admin/dashboard/refresh-metrics - Force refresh dashboard metrics
router.post('/refresh-metrics', [
  body('force').optional().isBoolean()
], adminDashboardController.refreshMetrics);

// GET /admin/dashboard/performance-insights - Get performance insights
router.get('/performance-insights', adminDashboardController.getPerformanceInsights);

// POST /admin/dashboard/track-quick-action - Track quick action for analytics
router.post('/track-quick-action', [
  body('actionType').notEmpty().withMessage('Action type is required')
    .isString().trim().isLength({ min: 2, max: 100 }),
  body('entityType').notEmpty().withMessage('Entity type is required')
    .isString().trim().isLength({ min: 2, max: 50 }),
  body('entityId').optional().isInt(),
  body('executionTime').optional().isInt({ min: 0 })
], adminDashboardController.trackQuickAction);

module.exports = router;
