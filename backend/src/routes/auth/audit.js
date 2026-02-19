const express = require('express');
const router = express.Router();

const auditController = require('../../controllers/auditController');
const { authenticate } = require('../../middleware/auth');
const { requirePermission } = require('../../middleware/permissionMiddleware');

/**
 * Audit Routes
 * All routes require authentication and super_admin role
 * 
 * These routes provide access to audit logs for compliance and security purposes
 */

// Apply authentication and authorization to all audit routes
router.use(authenticate);
router.use(requirePermission('audit_log', 'read'));

/**
 * Get all audit logs with optional filters
 * GET /audit/logs
 * 
 * Query parameters:
 *   - userId: Filter by user ID
 *   - action: Filter by action (create, update, delete, etc)
 *   - resourceType: Filter by resource type (tenant, property, etc)
 *   - startDate: Filter by start date (ISO 8601)
 *   - endDate: Filter by end date (ISO 8601)
 *   - page: Page number (default: 1)
 *   - limit: Results per page (default: 50, max: 500)
 */
router.get('/logs', auditController.getAuditLogs);

/**
 * Get audit logs for a specific user
 * GET /audit/user/:userId
 */
router.get('/user/:userId', auditController.getUserAuditLogs);

/**
 * Get audit trail for a specific resource
 * Shows all changes made to that resource
 * GET /audit/resource/:resourceType/:resourceId
 * 
 * Examples:
 *   GET /audit/resource/tenant/5
 *   GET /audit/resource/property/10
 */
router.get('/resource/:resourceType/:resourceId', auditController.getResourceAuditTrail);

/**
 * Get recent audit logs
 * GET /audit/recent
 * 
 * Query parameters:
 *   - days: Look back N days (default: 7)
 *   - limit: Max results (default: 100)
 */
router.get('/recent', auditController.getRecentAuditLogs);

/**
 * Get audit statistics summary
 * GET /audit/summary
 */
router.get('/summary', auditController.getAuditSummary);

/**
 * Get comprehensive audit statistics
 * GET /audit/statistics
 * 
 * Returns:
 *   - Summary (total operations, unique users, etc)
 *   - Top actions (most frequent operations)
 *   - Top resources (most changed resources)
 *   - Top users (most active users)
 */
router.get('/statistics', auditController.getAuditStatistics);

/**
 * Get action frequency
 * GET /audit/actions
 */
router.get('/actions', auditController.getActionFrequency);

/**
 * Get resource activity summary
 * GET /audit/resources
 */
router.get('/resources', auditController.getResourceActivity);

/**
 * Get user activity summary
 * GET /audit/users
 */
router.get('/users', auditController.getUserActivity);

module.exports = router;
