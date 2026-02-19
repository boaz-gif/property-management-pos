const AuditService = require('../services/auditService');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * Audit Controller
 * Handles all audit log endpoints
 * 
 * All endpoints require super_admin role
 */

/**
 * GET /audit/logs
 * Get all audit logs with optional filters
 * 
 * Query parameters:
 *   - userId: Filter by user ID
 *   - action: Filter by action type
 *   - resourceType: Filter by resource type
 *   - startDate: Filter by start date (ISO 8601)
 *   - endDate: Filter by end date (ISO 8601)
 *   - page: Page number (default: 1)
 *   - limit: Results per page (default: 50, max: 500)
 */
async function getAuditLogs(req, res) {
  try {
    const {
      userId,
      action,
      resourceType,
      startDate,
      endDate,
      page = 1,
      limit = 50
    } = req.query;

    const filters = {
      userId: userId ? parseInt(userId) : null,
      action: action || null,
      resourceType: resourceType || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // Validate pagination
    if (filters.page < 1) filters.page = 1;
    if (filters.limit < 1) filters.limit = 1;
    if (filters.limit > 500) filters.limit = 500;

    const result = await AuditService.getAuditLogs(filters);

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching audit logs',
      error: error.message
    });
  }
}

/**
 * GET /audit/user/:userId
 * Get audit logs for a specific user
 * Shows all operations performed by this user
 */
async function getUserAuditLogs(req, res) {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    if (!userId || isNaN(userId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid user ID'
      });
    }

    const result = await AuditService.getUserAuditLogs(
      parseInt(userId),
      parseInt(limit),
      parseInt(page)
    );

    res.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    console.error('Error fetching user audit logs:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching user audit logs',
      error: error.message
    });
  }
}

/**
 * GET /audit/resource/:resourceType/:resourceId
 * Get audit trail for a specific resource
 * Shows all changes made to this resource
 */
async function getResourceAuditTrail(req, res) {
  try {
    const { resourceType, resourceId } = req.params;
    const { page = 1, limit = 100 } = req.query;

    if (!resourceType || !resourceId || isNaN(resourceId)) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: 'Invalid resource type or ID'
      });
    }

    const result = await AuditService.getResourceAuditTrail(
      resourceType,
      parseInt(resourceId),
      parseInt(limit),
      parseInt(page)
    );

    // Get resource details if possible
    let resourceDetails = null;
    try {
      const tableMap = {
        'tenant': 'tenants',
        'property': 'properties',
        'maintenance': 'maintenance_requests',
        'payment': 'payments',
        'notification': 'notifications',
        'document': 'documents',
        'user': 'users'
      };

      const tableName = tableMap[resourceType];
      if (tableName) {
        const db = require('../utils/database');
        const query = `SELECT * FROM ${tableName} WHERE id = $1`;
        const queryResult = await db.query(query, [parseInt(resourceId)]);
        if (queryResult.rows.length > 0) {
          resourceDetails = queryResult.rows[0];
        }
      }
    } catch (err) {
      // Ignore error - resource might be deleted
      console.log('Could not fetch resource details:', err.message);
    }

    res.json({
      success: true,
      resource: {
        type: resourceType,
        id: parseInt(resourceId),
        details: resourceDetails
      },
      auditTrail: result,
      count: result.length
    });
  } catch (error) {
    console.error('Error fetching resource audit trail:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching resource audit trail',
      error: error.message
    });
  }
}

/**
 * GET /audit/recent
 * Get recent audit logs (last 7 days by default)
 * 
 * Query parameters:
 *   - days: Number of days to look back (default: 7)
 *   - limit: Max results (default: 100)
 */
async function getRecentAuditLogs(req, res) {
  try {
    const { days = 7, limit = 100 } = req.query;

    const result = await AuditService.getRecentAuditLogs(
      parseInt(days),
      parseInt(limit)
    );

    res.json({
      success: true,
      data: result,
      count: result.length,
      period: {
        days: parseInt(days),
        from: new Date(Date.now() - days * 24 * 60 * 60 * 1000),
        to: new Date()
      }
    });
  } catch (error) {
    console.error('Error fetching recent audit logs:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching recent audit logs',
      error: error.message
    });
  }
}

/**
 * GET /audit/summary
 * Get audit statistics and summary
 */
async function getAuditSummary(req, res) {
  try {
    const summary = await AuditService.getAuditSummary();

    res.json({
      success: true,
      summary
    });
  } catch (error) {
    console.error('Error fetching audit summary:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching audit summary',
      error: error.message
    });
  }
}

/**
 * GET /audit/statistics
 * Get comprehensive audit statistics
 */
async function getAuditStatistics(req, res) {
  try {
    const [summary, actionFreq, resourceActivity, userActivity] = await Promise.all([
      AuditService.getAuditSummary(),
      AuditService.getActionFrequency(10),
      AuditService.getResourceActivity(10),
      AuditService.getUserActivity(10)
    ]);

    res.json({
      success: true,
      statistics: {
        summary,
        topActions: actionFreq,
        topResources: resourceActivity,
        topUsers: userActivity
      }
    });
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching audit statistics',
      error: error.message
    });
  }
}

/**
 * GET /audit/actions
 * Get all unique actions with frequency
 */
async function getActionFrequency(req, res) {
  try {
    const { limit = 10 } = req.query;

    const result = await AuditService.getActionFrequency(parseInt(limit));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching action frequency:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching action frequency',
      error: error.message
    });
  }
}

/**
 * GET /audit/resources
 * Get resource activity summary
 */
async function getResourceActivity(req, res) {
  try {
    const { limit = 10 } = req.query;

    const result = await AuditService.getResourceActivity(parseInt(limit));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching resource activity:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching resource activity',
      error: error.message
    });
  }
}

/**
 * GET /audit/users
 * Get user activity summary
 */
async function getUserActivity(req, res) {
  try {
    const { limit = 10 } = req.query;

    const result = await AuditService.getUserActivity(parseInt(limit));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching user activity:', error);
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: 'Error fetching user activity',
      error: error.message
    });
  }
}

module.exports = {
  getAuditLogs,
  getUserAuditLogs,
  getResourceAuditTrail,
  getRecentAuditLogs,
  getAuditSummary,
  getAuditStatistics,
  getActionFrequency,
  getResourceActivity,
  getUserActivity
};
