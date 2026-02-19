const db = require('../utils/database');
const { HTTP_STATUS } = require('../utils/constants');

/**
 * AuditService - Handles all audit logging operations
 * 
 * Responsibilities:
 * - Log operations (create, update, delete)
 * - Query audit logs with filters
 * - Track who did what, when, and with what IP/user agent
 */
class AuditService {
  /**
   * Log an operation to the audit log
   * 
   * @param {Object} auditData - Data to log
   * @param {number} auditData.userId - User who performed the action
   * @param {string} auditData.userEmail - User email (captured at time of action)
   * @param {string} auditData.userRole - User role (captured at time of action)
   * @param {string} auditData.action - Action performed (create, update, delete, etc)
   * @param {string} auditData.resourceType - Type of resource affected (tenant, property, etc)
   * @param {number} auditData.resourceId - ID of the affected resource
   * @param {Object} auditData.oldValues - State before change (for updates)
   * @param {Object} auditData.newValues - State after change (for updates)
   * @param {string} auditData.ipAddress - Client IP address
   * @param {string} auditData.userAgent - Client user agent
   * @param {string} auditData.status - 'success' or 'failed' (default: 'success')
   * @param {string} auditData.errorMessage - Error message if failed
   * @returns {Promise<Object>} - Created audit log entry
   */
  static async logOperation({
    userId,
    userEmail = null,
    userRole = null,
    action,
    resourceType,
    resourceId,
    oldValues = null,
    newValues = null,
    ipAddress = null,
    userAgent = null,
    sessionId = null,
    status = 'success',
    errorMessage = null
  }) {
    const query = `
      INSERT INTO audit_logs (
        user_id,
        user_email,
        user_role,
        action,
        resource_type,
        resource_id,
        old_values,
        new_values,
        ip_address,
        user_agent,
        status,
        error_message,
        created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING *;
    `;

    try {
      const result = await db.query(query, [
        userId,
        userEmail,
        userRole,
        action,
        resourceType,
        resourceId,
        oldValues ? JSON.stringify(oldValues) : null,
        newValues ? JSON.stringify(newValues) : null,
        ipAddress,
        userAgent,
        status,
        errorMessage
      ]);

      try {
        await db.query(
          `
            INSERT INTO detailed_audit_logs (
              user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent, session_id, created_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
          `,
          [
            userId,
            action,
            resourceType,
            resourceId,
            oldValues ? JSON.stringify(oldValues) : null,
            newValues ? JSON.stringify(newValues) : null,
            ipAddress,
            userAgent,
            sessionId
          ]
        );
      } catch (detailedErr) {
        console.error('Error logging detailed audit operation:', detailedErr);
      }

      return result.rows[0];
    } catch (error) {
      console.error('Error logging audit operation:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
      return null;
    }
  }

  /**
   * Get all audit logs with optional filtering and pagination
   * 
   * @param {Object} filters - Filter criteria
   * @param {number} filters.userId - Filter by user who performed action
   * @param {string} filters.action - Filter by action type
   * @param {string} filters.resourceType - Filter by resource type
   * @param {Date} filters.startDate - Filter by start date
   * @param {Date} filters.endDate - Filter by end date
   * @param {number} filters.page - Page number (default: 1)
   * @param {number} filters.limit - Results per page (default: 50, max: 500)
   * @returns {Promise<Object>} - { data: [], total, page, totalPages }
   */
  static async getAuditLogs({
    userId = null,
    action = null,
    resourceType = null,
    startDate = null,
    endDate = null,
    page = 1,
    limit = 50
  }) {
    // Validate pagination
    limit = Math.min(Math.max(limit, 1), 500);
    page = Math.max(page, 1);
    const offset = (page - 1) * limit;

    // Build dynamic query
    let whereConditions = ['1=1'];
    let params = [];
    let paramIndex = 1;

    if (userId) {
      whereConditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      whereConditions.push(`action = $${paramIndex}`);
      params.push(action);
      paramIndex++;
    }

    if (resourceType) {
      whereConditions.push(`resource_type = $${paramIndex}`);
      params.push(resourceType);
      paramIndex++;
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      params.push(endDate);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    try {
      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM audit_logs WHERE ${whereClause}`;
      const countResult = await db.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const dataQuery = `
        SELECT *
        FROM audit_logs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      
      const dataParams = [...params, limit, offset];
      const dataResult = await db.query(dataQuery, dataParams);

      return {
        data: dataResult.rows.map(row => this._formatAuditLog(row)),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit logs for a specific user
   * 
   * @param {number} userId - User ID
   * @param {number} limit - Results per page (default: 50)
   * @param {number} page - Page number (default: 1)
   * @returns {Promise<Array>} - Audit logs for the user
   */
  static async getUserAuditLogs(userId, limit = 50, page = 1) {
    return this.getAuditLogs({ userId, limit, page });
  }

  /**
   * Get audit trail for a specific resource
   * Shows all changes made to a resource over time
   * 
   * @param {string} resourceType - Type of resource (tenant, property, etc)
   * @param {number} resourceId - ID of the resource
   * @param {number} limit - Results per page
   * @param {number} page - Page number
   * @returns {Promise<Array>} - All changes to that resource
   */
  static async getResourceAuditTrail(resourceType, resourceId, limit = 100, page = 1) {
    const query = `
      SELECT *
      FROM audit_logs
      WHERE resource_type = $1 AND resource_id = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    try {
      const offset = (page - 1) * limit;
      const result = await db.query(query, [resourceType, resourceId, limit, offset]);
      
      return result.rows.map(row => this._formatAuditLog(row));
    } catch (error) {
      console.error('Error fetching resource audit trail:', error);
      throw error;
    }
  }

  /**
   * Get recent audit logs (last N days)
   * 
   * @param {number} days - Number of days to look back (default: 7)
   * @param {number} limit - Max results (default: 100)
   * @returns {Promise<Array>} - Recent audit logs
   */
  static async getRecentAuditLogs(days = 7, limit = 100) {
    const query = `
      SELECT *
      FROM audit_logs
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      ORDER BY created_at DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows.map(row => this._formatAuditLog(row));
    } catch (error) {
      console.error('Error fetching recent audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit summary statistics
   * 
   * @returns {Promise<Object>} - Audit statistics
   */
  static async getAuditSummary() {
    const query = `
      SELECT
        COUNT(*) as total_operations,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT resource_type) as resource_types,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_operations,
        MAX(created_at) as last_operation
      FROM audit_logs
    `;

    try {
      const result = await db.query(query);
      return {
        totalOperations: parseInt(result.rows[0].total_operations),
        uniqueUsers: parseInt(result.rows[0].unique_users),
        resourceTypes: parseInt(result.rows[0].resource_types),
        failedOperations: parseInt(result.rows[0].failed_operations),
        lastOperation: result.rows[0].last_operation
      };
    } catch (error) {
      console.error('Error fetching audit summary:', error);
      throw error;
    }
  }

  /**
   * Get action frequency (what operations happen most)
   * 
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Action frequency statistics
   */
  static async getActionFrequency(limit = 10) {
    const query = `
      SELECT
        action,
        COUNT(*) as count,
        COUNT(DISTINCT user_id) as users
      FROM audit_logs
      GROUP BY action
      ORDER BY count DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching action frequency:', error);
      throw error;
    }
  }

  /**
   * Get resource activity (which resources are most affected)
   * 
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - Resource activity statistics
   */
  static async getResourceActivity(limit = 10) {
    const query = `
      SELECT
        resource_type,
        COUNT(*) as total_changes,
        COUNT(DISTINCT resource_id) as unique_resources,
        COUNT(DISTINCT user_id) as unique_users
      FROM audit_logs
      WHERE action IN ('create', 'update', 'delete')
      GROUP BY resource_type
      ORDER BY total_changes DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching resource activity:', error);
      throw error;
    }
  }

  /**
   * Get user activity (what users are most active)
   * 
   * @param {number} limit - Max results
   * @returns {Promise<Array>} - User activity statistics
   */
  static async getUserActivity(limit = 10) {
    const query = `
      SELECT
        u.id,
        u.name,
        u.email,
        u.role,
        COUNT(*) as total_operations,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_operations,
        MAX(created_at) as last_operation
      FROM audit_logs al
      JOIN users u ON al.user_id = u.id
      GROUP BY u.id, u.name, u.email, u.role
      ORDER BY total_operations DESC
      LIMIT $1
    `;

    try {
      const result = await db.query(query, [limit]);
      return result.rows;
    } catch (error) {
      console.error('Error fetching user activity:', error);
      throw error;
    }
  }

  /**
   * Internal helper: Format audit log entry for response
   * Parses JSON fields and formats data
   */
  static _formatAuditLog(row) {
    return {
      id: row.id,
      userId: row.user_id,
      userEmail: row.user_email,
      userRole: row.user_role,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      oldValues: row.old_values ? JSON.parse(row.old_values) : null,
      newValues: row.new_values ? JSON.parse(row.new_values) : null,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      status: row.status,
      errorMessage: row.error_message,
      createdAt: row.created_at
    };
  }
}

module.exports = AuditService;
