const adminDashboardService = require('../services/adminDashboardService');
const { HTTP_STATUS } = require('../utils/constants');
const { logAuditAsync } = require('../middleware/auditMiddleware');

class AdminDashboardController {
  // GET /admin/dashboard/overview
  async getDashboardOverview(req, res) {
    try {
      const adminId = req.user.id;
      
      const dashboardData = await adminDashboardService.getDashboardOverview(adminId);

      // Log dashboard access
      await logAuditAsync({
        userId: req.user.id,
        action: 'VIEW_DASHBOARD_OVERVIEW',
        resourceType: 'admin_dashboard',
        details: { timestamp: new Date().toISOString() }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: dashboardData,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getDashboardOverview:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch dashboard overview',
        message: error.message
      });
    }
  }

  // GET /admin/dashboard/properties-comparison
  async getPropertiesComparison(req, res) {
    try {
      const adminId = req.user.id;
      const { metric = 'occupancy_rate', period = 'current_month' } = req.query;
      
      const comparisonData = await adminDashboardService.getPropertiesComparison(adminId, {
        metric,
        period
      });

      await logAuditAsync({
        userId: req.user.id,
        action: 'VIEW_PROPERTIES_COMPARISON',
        resourceType: 'admin_dashboard',
        details: { metric, period }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: comparisonData
      });
    } catch (error) {
      console.error('Error in getPropertiesComparison:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch properties comparison',
        message: error.message
      });
    }
  }

  // GET /admin/dashboard/action-items
  async getActionItems(req, res) {
    try {
      const adminId = req.user.id;
      const { 
        status, 
        priority, 
        type, 
        propertyId, 
        page = 1, 
        limit = 20 
      } = req.query;
      
      const filters = {
        adminId,
        status,
        priority,
        type,
        propertyId,
        page: parseInt(page),
        limit: parseInt(limit)
      };
      
      const actionItems = await adminDashboardService.getActionItems(filters);

      await logAuditAsync({
        userId: req.user.id,
        action: 'VIEW_ACTION_ITEMS',
        resourceType: 'admin_dashboard',
        details: { filters }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: actionItems.items,
        pagination: actionItems.pagination
      });
    } catch (error) {
      console.error('Error in getActionItems:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch action items',
        message: error.message
      });
    }
  }

  // POST /admin/dashboard/action-items/:id/complete
  async completeActionItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { notes } = req.body;
      
      // Validate action item exists and belongs to admin
      const actionItem = await adminDashboardService.getActionItemById(id, adminId);
      if (!actionItem) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Action item not found'
        });
      }

      const completedItem = await adminDashboardService.completeActionItem(id, adminId, notes);

      await logAuditAsync({
        userId: req.user.id,
        action: 'COMPLETE_ACTION_ITEM',
        resourceType: 'admin_dashboard',
        resourceId: id,
        details: { notes }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: completedItem,
        message: 'Action item completed successfully'
      });
    } catch (error) {
      console.error('Error in completeActionItem:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to complete action item',
        message: error.message
      });
    }
  }

  // POST /admin/dashboard/action-items/:id/dismiss
  async dismissActionItem(req, res) {
    try {
      const { id } = req.params;
      const adminId = req.user.id;
      const { reason } = req.body;
      
      // Validate reason is provided for critical items
      if (!reason) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Reason is required to dismiss action item'
        });
      }

      // Validate action item exists and belongs to admin
      const actionItem = await adminDashboardService.getActionItemById(id, adminId);
      if (!actionItem) {
        return res.status(HTTP_STATUS.NOT_FOUND).json({
          success: false,
          error: 'Action item not found'
        });
      }

      const dismissedItem = await adminDashboardService.dismissActionItem(id, adminId, reason);

      await logAuditAsync({
        userId: req.user.id,
        action: 'DISMISS_ACTION_ITEM',
        resourceType: 'admin_dashboard',
        resourceId: id,
        details: { reason }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: dismissedItem,
        message: 'Action item dismissed successfully'
      });
    } catch (error) {
      console.error('Error in dismissActionItem:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to dismiss action item',
        message: error.message
      });
    }
  }

  // GET /admin/dashboard/recent-activity
  async getRecentActivity(req, res) {
    try {
      const adminId = req.user.id;
      const { 
        propertyId, 
        activityType, 
        limit = 50,
        startDate,
        endDate 
      } = req.query;
      
      const filters = {
        adminId,
        propertyId,
        activityType,
        limit: parseInt(limit),
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };
      
      const activities = await adminDashboardService.getRecentActivity(filters);

      await logAuditAsync({
        userId: req.user.id,
        action: 'VIEW_RECENT_ACTIVITY',
        resourceType: 'admin_dashboard',
        details: { filters }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: activities
      });
    } catch (error) {
      console.error('Error in getRecentActivity:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch recent activity',
        message: error.message
      });
    }
  }

  // GET /admin/dashboard/financial-summary
  async getFinancialSummary(req, res) {
    try {
      const adminId = req.user.id;
      const { period = 'current_month', propertyId } = req.query;
      
      const financialData = await adminDashboardService.getFinancialSummary(adminId, {
        period,
        propertyId
      });

      await logAuditAsync({
        userId: req.user.id,
        action: 'VIEW_FINANCIAL_SUMMARY',
        resourceType: 'admin_dashboard',
        details: { period, propertyId }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: financialData
      });
    } catch (error) {
      console.error('Error in getFinancialSummary:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch financial summary',
        message: error.message
      });
    }
  }

  // GET /admin/dashboard/quick-stats
  async getQuickStats(req, res) {
    try {
      const adminId = req.user.id;
      
      const quickStats = await adminDashboardService.getQuickStats(adminId);

      // This endpoint is called frequently, so we'll log less frequently
      // Only log every 10th access to reduce log volume
      if (Math.random() < 0.1) {
        await logAuditAsync({
          userId: req.user.id,
          action: 'VIEW_QUICK_STATS',
          resourceType: 'admin_dashboard',
          details: { timestamp: new Date().toISOString() }
        });
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: quickStats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in getQuickStats:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch quick stats',
        message: error.message
      });
    }
  }

  // POST /admin/dashboard/refresh-metrics
  async refreshMetrics(req, res) {
    try {
      const adminId = req.user.id;
      const { force = false } = req.body;
      
      const refreshedMetrics = await adminDashboardService.refreshMetrics(adminId, force);

      await logAuditAsync({
        userId: req.user.id,
        action: 'REFRESH_METRICS',
        resourceType: 'admin_dashboard',
        details: { force }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: refreshedMetrics,
        message: 'Metrics refreshed successfully'
      });
    } catch (error) {
      console.error('Error in refreshMetrics:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to refresh metrics',
        message: error.message
      });
    }
  }

  // GET /admin/dashboard/performance-insights
  async getPerformanceInsights(req, res) {
    try {
      const adminId = req.user.id;
      const { period = '30_days' } = req.query;
      
      const insights = await adminDashboardService.getPerformanceInsights(adminId, {
        period
      });

      await logAuditAsync({
        userId: req.user.id,
        action: 'VIEW_PERFORMANCE_INSIGHTS',
        resourceType: 'admin_dashboard',
        details: { period }
      });

      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: insights
      });
    } catch (error) {
      console.error('Error in getPerformanceInsights:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to fetch performance insights',
        message: error.message
      });
    }
  }

  // POST /admin/dashboard/track-quick-action
  async trackQuickAction(req, res) {
    try {
      const adminId = req.user.id;
      const { actionType, entityType, entityId, executionTime } = req.body;
      
      // Validate required fields
      if (!actionType || !entityType) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          error: 'Action type and entity type are required'
        });
      }

      const trackedAction = await adminDashboardService.trackQuickAction({
        adminId,
        actionType,
        entityType,
        entityId,
        executionTime
      });

      // Quick actions are logged lightly for performance
      if (Math.random() < 0.2) {
        await logAuditAsync({
          userId: req.user.id,
          action: 'TRACK_QUICK_ACTION',
          resourceType: 'admin_dashboard',
          details: { actionType, entityType }
        });
      }

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        data: trackedAction
      });
    } catch (error) {
      console.error('Error in trackQuickAction:', error);
      res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        error: 'Failed to track quick action',
        message: error.message
      });
    }
  }
}

module.exports = new AdminDashboardController();
