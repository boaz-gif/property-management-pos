const Database = require('../utils/database');
const { logger } = require('../utils/logger');
const { sendEmail } = require('../utils/emailService');

class AdminManagementService {
  // Get comprehensive admin overview with performance metrics
  async getAdminsOverview({ page, limit, sortBy, sortOrder, search, status, requestingUser }) {
    try {
      const offset = (page - 1) * limit;
      
      // Build WHERE conditions
      let whereConditions = ["u.role = 'admin'", "u.deleted_at IS NULL"];
      let queryParams = [];
      let paramIndex = 1;

      if (search) {
        whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
        queryParams.push(`%${search}%`);
        paramIndex++;
      }

      if (status) {
        whereConditions.push(`u.status = $${paramIndex}`);
        queryParams.push(status);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM users u
        ${whereClause}
      `;
      const countResult = await Database.query(countQuery, queryParams);
      const totalRecords = parseInt(countResult.rows[0].total);

      // Get admins with performance data
      const query = `
        SELECT 
          u.id, u.name, u.email, u.status, u.created_at, u.updated_at,
          -- Current metrics from materialized view
          COALESCE(aps.properties_managed, 0) as properties_managed,
          COALESCE(aps.total_units, 0) as total_units,
          COALESCE(aps.occupied_units, 0) as occupied_units,
          COALESCE(aps.occupancy_rate, 0) as occupancy_rate,
          COALESCE(aps.revenue_collected, 0) as revenue_collected,
          COALESCE(aps.revenue_pending, 0) as revenue_pending,
          COALESCE(aps.collection_rate, 0) as collection_rate,
          COALESCE(aps.maintenance_resolved, 0) as maintenance_resolved,
          COALESCE(aps.maintenance_pending, 0) as maintenance_pending,
          COALESCE(aps.avg_resolution_time_hours, 0) as avg_resolution_time_hours,
          COALESCE(aps.new_tenants, 0) as new_tenants,
          COALESCE(aps.churned_tenants, 0) as churned_tenants,
          COALESCE(aps.logins_count, 0) as logins_count,
          COALESCE(aps.actions_count, 0) as actions_count,
          COALESCE(aps.last_active, u.created_at) as last_active,
          -- Capacity information
          COALESCE(aps.max_properties, 50) as max_properties,
          COALESCE(aps.max_units, 500) as max_units,
          COALESCE(aps.max_tenants, 500) as max_tenants,
          COALESCE(aps.current_properties, 0) as current_properties,
          COALESCE(aps.current_units, 0) as current_units,
          COALESCE(aps.current_tenants, 0) as current_tenants,
          COALESCE(aps.active_alerts, 0) as active_alerts,
          -- Capacity percentages
          COALESCE(aps.property_capacity_pct, 0) as property_capacity_pct,
          COALESCE(aps.unit_capacity_pct, 0) as unit_capacity_pct,
          COALESCE(aps.tenant_capacity_pct, 0) as tenant_capacity_pct
        FROM users u
        LEFT JOIN mv_admin_performance_summary aps ON u.id = aps.admin_id
        ${whereClause}
        ORDER BY ${this.getSortColumn(sortBy)} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const result = await Database.query(query, queryParams);

      const totalPages = Math.ceil(totalRecords / limit);

      return {
        admins: result.rows,
        pagination: {
          currentPage: page,
          totalPages,
          totalRecords,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error in getAdminsOverview:', error);
      throw error;
    }
  }

  // Get detailed performance metrics for a specific admin
  async getAdminPerformance(adminId, { startDate, endDate, period }) {
    try {
      const queryParams = [adminId];
      let dateFilter = '';
      
      if (startDate) {
        dateFilter += ` AND metric_date >= $${queryParams.length + 1}`;
        queryParams.push(startDate);
      }
      if (endDate) {
        dateFilter += ` AND metric_date <= $${queryParams.length + 1}`;
        queryParams.push(endDate);
      }

      const query = `
        SELECT 
          metric_date,
          properties_managed,
          total_units,
          occupied_units,
          occupancy_rate,
          revenue_collected,
          revenue_pending,
          collection_rate,
          maintenance_resolved,
          maintenance_pending,
          avg_resolution_time_hours,
          new_tenants,
          churned_tenants,
          tenant_satisfaction_score,
          logins_count,
          actions_count,
          last_active
        FROM admin_metrics
        WHERE admin_id = $1 ${dateFilter}
        ORDER BY metric_date DESC
      `;

      const result = await Database.query(query, queryParams);

      // Calculate period-over-period comparisons
      const performanceData = this.calculatePerformanceComparisons(result.rows, period);

      return {
        metrics: performanceData,
        summary: this.calculatePerformanceSummary(performanceData),
        trends: this.calculateTrends(performanceData)
      };
    } catch (error) {
      logger.error('Error in getAdminPerformance:', error);
      throw error;
    }
  }

  // Get admin activity log
  async getAdminActivity(adminId, { page, limit, startDate, endDate, activityType }) {
    try {
      const offset = (page - 1) * limit;
      const dateFilter = this.buildDateFilter(startDate, endDate);
      
      let whereConditions = ["user_id = $1"];
      let queryParams = [adminId];
      let paramIndex = 2;

      if (activityType) {
        whereConditions.push(`action = $${paramIndex}`);
        queryParams.push(activityType);
        paramIndex++;
      }

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          id,
          action,
          resource_type,
          resource_id,
          details,
          ip_address,
          user_agent,
          timestamp,
          duration_ms,
          status
        FROM audit_logs
        WHERE ${whereClause} ${dateFilter}
        ORDER BY timestamp DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await Database.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM audit_logs
        WHERE ${whereClause} ${dateFilter}
      `;
      const countResult = await Database.query(countQuery, queryParams.slice(0, -2));
      const totalRecords = parseInt(countResult.rows[0].total);

      return {
        activities: result.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords
        }
      };
    } catch (error) {
      logger.error('Error in getAdminActivity:', error);
      throw error;
    }
  }

  // Suspend an admin
  async suspendAdmin(adminId, { reason, notifyTenants, effectiveImmediately, suspendedBy }) {
    try {
      const client = await Database.getClient();
      
      try {
        await client.query('BEGIN');

        // Check for critical pending tasks
        const criticalTasksQuery = `
          SELECT COUNT(*) as critical_count
          FROM maintenance m
          JOIN properties p ON m.property_id = p.id
          WHERE p.admin_id = $1 
            AND m.status = 'open' 
            AND m.priority = 'high'
            AND m.deleted_at IS NULL
        `;
        const criticalTasks = await client.query(criticalTasksQuery, [adminId]);

        if (criticalTasks.rows[0].critical_count > 0) {
          throw new Error('Cannot suspend admin with critical pending maintenance tasks');
        }

        // Update admin status
        const updateQuery = `
          UPDATE users 
          SET status = 'suspended', updated_at = NOW()
          WHERE id = $1 AND role = 'admin'
          RETURNING id, name, email, status
        `;
        const adminResult = await client.query(updateQuery, [adminId]);

        if (adminResult.rows.length === 0) {
          throw new Error('Admin not found');
        }

        // Create suspension record
        await client.query(`
          INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
          VALUES ($1, 'performance_issue', 'high', 'Admin Suspended', $2, $3)
        `, [adminId, `Admin suspended: ${reason}`, { reason, suspendedBy, effectiveImmediately }]);

        // Notify tenants if requested
        if (notifyTenants) {
          await this.notifyTenantsOfAdminSuspension(client, adminId, reason);
        }

        await client.query('COMMIT');

        return {
          admin: adminResult.rows[0],
          criticalTasksResolved: criticalTasks.rows[0].critical_count,
          tenantsNotified: notifyTenants
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error in suspendAdmin:', error);
      throw error;
    }
  }

  // Reassign properties from one admin to another
  async reassignProperties(fromAdminId, { propertyIds, newAdminId, reason, notifyTenants, reassignedBy }) {
    try {
      const client = await Database.getClient();
      
      try {
        await client.query('BEGIN');

        // Validate new admin has capacity
        const capacityCheck = await this.checkAdminCapacity(client, newAdminId, propertyIds.length);
        if (!capacityCheck.hasCapacity) {
          throw new Error(`New admin does not have sufficient capacity. Available: ${capacityCheck.available}, Required: ${propertyIds.length}`);
        }

        // Get property details for notifications
        const propertiesQuery = `
          SELECT p.id, p.name, p.address, t.id as tenant_id, t.name as tenant_name, t.email as tenant_email
          FROM properties p
          LEFT JOIN tenants t ON p.id = t.property_id AND t.status = 'active' AND t.deleted_at IS NULL
          WHERE p.id = ANY($1) AND p.admin_id = $2 AND p.deleted_at IS NULL
        `;
        const propertiesResult = await client.query(propertiesQuery, [propertyIds, fromAdminId]);

        // Update property assignments
        const reassignQuery = `
          UPDATE admin_property_assignments
          SET unassigned_at = NOW(), unassigned_by = $1, unassignment_reason = $2
          WHERE admin_id = $3 AND property_id = ANY($4) AND unassigned_at IS NULL
          RETURNING id
        `;
        await client.query(reassignQuery, [reassignedBy, reason, fromAdminId, propertyIds]);

        // Create new assignments
        const assignmentValues = propertyIds.map(propertyId => 
          `(${newAdminId}, ${propertyId}, ${reassignedBy}, '${reason}')`
        ).join(',');

        await client.query(`
          INSERT INTO admin_property_assignments (admin_id, property_id, assigned_by, unassignment_reason)
          VALUES ${assignmentValues}
        `);

        // Update property admin_id
        await client.query(`
          UPDATE properties 
          SET admin_id = $1, updated_at = NOW()
          WHERE id = ANY($2)
        `, [newAdminId, propertyIds]);

        // Create audit log entries
        for (const property of propertiesResult.rows) {
          await client.query(`
            INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
            VALUES ($1, 'REASSIGN_PROPERTY', 'property', $2, $3)
          `, [reassignedBy, property.id, { 
            fromAdminId, 
            toAdminId: newAdminId, 
            reason,
            propertyName: property.name 
          }]);
        }

        // Notify tenants if requested
        if (notifyTenants) {
          await this.notifyTenantsOfPropertyReassignment(client, propertiesResult.rows, newAdminId);
        }

        await client.query('COMMIT');

        return {
          propertiesReassigned: propertyIds.length,
          tenantsNotified: notifyTenants ? propertiesResult.rows.filter(p => p.tenant_id).length : 0,
          newAdminId
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error in reassignProperties:', error);
      throw error;
    }
  }

  // Update admin capacity rules
  async updateAdminCapacity(adminId, { maxProperties, maxUnits, maxTenants, reason, updatedBy }) {
    try {
      const query = `
        INSERT INTO admin_capacity_rules (admin_id, max_properties, max_units, max_tenants, override_reason, set_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (admin_id) 
        DO UPDATE SET 
          max_properties = EXCLUDED.max_properties,
          max_units = EXCLUDED.max_units,
          max_tenants = EXCLUDED.max_tenants,
          override_reason = EXCLUDED.override_reason,
          set_by = EXCLUDED.set_by,
          updated_at = NOW()
        RETURNING *
      `;

      const result = await Database.query(query, [
        adminId, maxProperties, maxUnits, maxTenants, reason, updatedBy
      ]);

      // Check current usage against new limits
      const capacityStatus = await this.getAdminCapacityStatus(adminId);

      // Create alerts if new limits are exceeded
      if (capacityStatus.exceededLimits.length > 0) {
        await this.createCapacityAlerts(adminId, capacityStatus.exceededLimits);
      }

      return result.rows[0];
    } catch (error) {
      logger.error('Error in updateAdminCapacity:', error);
      throw error;
    }
  }

  // Get admin alerts
  async getAdminAlerts({ page, limit, severity, alertType, adminId, resolved }) {
    try {
      const offset = (page - 1) * limit;
      
      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 1;

      if (adminId) {
        whereConditions.push(`aa.admin_id = $${paramIndex}`);
        queryParams.push(adminId);
        paramIndex++;
      }

      if (severity) {
        whereConditions.push(`aa.severity = $${paramIndex}`);
        queryParams.push(severity);
        paramIndex++;
      }

      if (alertType) {
        whereConditions.push(`aa.alert_type = $${paramIndex}`);
        queryParams.push(alertType);
        paramIndex++;
      }

      whereConditions.push(`aa.resolved = $${paramIndex}`);
      queryParams.push(resolved);
      paramIndex++;

      const whereClause = whereConditions.join(' AND ');

      const query = `
        SELECT 
          aa.id,
          aa.admin_id,
          u.name as admin_name,
          u.email as admin_email,
          aa.alert_type,
          aa.severity,
          aa.title,
          aa.message,
          aa.data,
          aa.resolved,
          aa.resolved_at,
          aa.resolved_by,
          aa.created_at
        FROM admin_alerts aa
        JOIN users u ON aa.admin_id = u.id
        WHERE ${whereClause}
        ORDER BY aa.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);

      const result = await Database.query(query, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM admin_alerts aa
        WHERE ${whereClause}
      `;
      const countResult = await Database.query(countQuery, queryParams.slice(0, -2));
      const totalRecords = parseInt(countResult.rows[0].total);

      return {
        alerts: result.rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(totalRecords / limit),
          totalRecords
        }
      };
    } catch (error) {
      logger.error('Error in getAdminAlerts:', error);
      throw error;
    }
  }

  // Resolve an alert
  async resolveAlert(alertId, { resolution, notes, resolvedBy }) {
    try {
      const query = `
        UPDATE admin_alerts 
        SET resolved = TRUE, resolved_at = NOW(), resolved_by = $1
        WHERE id = $2 AND resolved = FALSE
        RETURNING *
      `;

      const result = await Database.query(query, [resolvedBy, alertId]);

      if (result.rows.length === 0) {
        throw new Error('Alert not found or already resolved');
      }

      // Add resolution details to audit log
      await Database.query(`
        INSERT INTO audit_logs (user_id, action, resource_type, resource_id, details)
        VALUES ($1, 'RESOLVE_ALERT', 'admin_alert', $2, $3)
      `, [resolvedBy, alertId, { resolution, notes }]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error in resolveAlert:', error);
      throw error;
    }
  }

  // Get metrics summary
  async getMetricsSummary({ period, adminId }) {
    try {
      const dateFilter = this.buildPeriodFilter(period);
      
      let whereCondition = '1=1';
      let queryParams = [];
      
      if (adminId) {
        whereCondition = `admin_id = $1`;
        queryParams.push(adminId);
      }

      const query = `
        SELECT 
          COUNT(*) as total_admins,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_admins,
          COUNT(CASE WHEN status = 'suspended' THEN 1 END) as suspended_admins,
          AVG(occupancy_rate) as avg_occupancy_rate,
          AVG(collection_rate) as avg_collection_rate,
          SUM(revenue_collected) as total_revenue_collected,
          SUM(revenue_pending) as total_revenue_pending,
          AVG(maintenance_resolved) as avg_maintenance_resolved,
          SUM(active_alerts) as total_active_alerts
        FROM mv_admin_performance_summary
        WHERE ${whereCondition}
      `;

      const result = await Database.query(query, queryParams);

      return {
        summary: result.rows[0],
        period,
        adminId: adminId || null
      };
    } catch (error) {
      logger.error('Error in getMetricsSummary:', error);
      throw error;
    }
  }

  // Reactivate admin
  async reactivateAdmin(adminId, { reason, reactivatedBy }) {
    try {
      const query = `
        UPDATE users 
        SET status = 'active', updated_at = NOW()
        WHERE id = $1 AND role = 'admin' AND status = 'suspended'
        RETURNING id, name, email, status
      `;

      const result = await Database.query(query, [adminId]);

      if (result.rows.length === 0) {
        throw new Error('Admin not found or not suspended');
      }

      // Create reactivation alert
      await Database.query(`
        INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
        VALUES ($1, 'performance_issue', 'low', 'Admin Reactivated', $2, $3)
      `, [adminId, `Admin reactivated: ${reason}`, { reason, reactivatedBy }]);

      return result.rows[0];
    } catch (error) {
      logger.error('Error in reactivateAdmin:', error);
      throw error;
    }
  }

  // Get admin capacity status
  async getAdminCapacityStatus(adminId) {
    try {
      const query = `
        SELECT 
          aps.admin_id,
          aps.max_properties,
          aps.max_units,
          aps.max_tenants,
          aps.current_properties,
          aps.current_units,
          aps.current_tenants,
          aps.property_capacity_pct,
          aps.unit_capacity_pct,
          aps.tenant_capacity_pct
        FROM mv_admin_performance_summary aps
        WHERE aps.admin_id = $1
      `;

      const result = await Database.query(query, [adminId]);

      if (result.rows.length === 0) {
        throw new Error('Admin not found');
      }

      const capacity = result.rows[0];
      const exceededLimits = [];

      if (capacity.property_capacity_pct > 100) {
        exceededLimits.push({
          type: 'properties',
          current: capacity.current_properties,
          max: capacity.max_properties,
          percentage: capacity.property_capacity_pct
        });
      }

      if (capacity.unit_capacity_pct > 100) {
        exceededLimits.push({
          type: 'units',
          current: capacity.current_units,
          max: capacity.max_units,
          percentage: capacity.unit_capacity_pct
        });
      }

      if (capacity.tenant_capacity_pct > 100) {
        exceededLimits.push({
          type: 'tenants',
          current: capacity.current_tenants,
          max: capacity.max_tenants,
          percentage: capacity.tenant_capacity_pct
        });
      }

      return {
        ...capacity,
        exceededLimits,
        hasCapacity: exceededLimits.length === 0
      };
    } catch (error) {
      logger.error('Error in getAdminCapacityStatus:', error);
      throw error;
    }
  }

  // Perform bulk admin operations
  async performBulkAdminOperation({ operation, adminIds, parameters, initiatedBy }) {
    try {
      const client = await Database.getClient();
      
      try {
        await client.query('BEGIN');

        // Create bulk operation record
        const bulkOpQuery = `
          INSERT INTO bulk_operations (operation_type, entity_type, initiated_by, parameters, total_records)
          VALUES ($1, 'admins', $2, $3, $4)
          RETURNING id
        `;
        const bulkOpResult = await client.query(bulkOpQuery, [
          operation, initiatedBy, { operation, parameters }, adminIds.length
        ]);
        const operationId = bulkOpResult.rows[0].id;

        let results = [];
        let successCount = 0;
        let failureCount = 0;

        for (const adminId of adminIds) {
          try {
            let result;
            switch (operation) {
              case 'suspend':
                result = await this.suspendAdmin(adminId, { ...parameters, suspendedBy: initiatedBy });
                break;
              case 'reactivate':
                result = await this.reactivateAdmin(adminId, { ...parameters, reactivatedBy: initiatedBy });
                break;
              case 'update_capacity':
                result = await this.updateAdminCapacity(adminId, { ...parameters, updatedBy: initiatedBy });
                break;
              default:
                throw new Error(`Unsupported operation: ${operation}`);
            }
            results.push({ adminId, success: true, result });
            successCount++;
          } catch (error) {
            results.push({ adminId, success: false, error: error.message });
            failureCount++;
          }
        }

        // Update bulk operation status
        await client.query(`
          UPDATE bulk_operations 
          SET 
            status = CASE WHEN $1 = 0 THEN 'failed' WHEN $2 = 0 THEN 'completed' ELSE 'partial' END,
            processed_records = $3,
            successful_records = $4,
            failed_records = $5,
            completed_at = NOW(),
            result_summary = $6
          WHERE id = $7
        `, [successCount, failureCount, adminIds.length, successCount, failureCount, JSON.stringify(results), operationId]);

        await client.query('COMMIT');

        return {
          operationId,
          totalRecords: adminIds.length,
          successCount,
          failureCount,
          results
        };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      } finally {
        client.release();
      }
    } catch (error) {
      logger.error('Error in performBulkAdminOperation:', error);
      throw error;
    }
  }

  // Helper methods
  getSortColumn(sortBy) {
    const sortColumns = {
      name: 'u.name',
      email: 'u.email',
      status: 'u.status',
      properties: 'aps.properties_managed',
      occupancy: 'aps.occupancy_rate',
      revenue: 'aps.revenue_collected',
      capacity: 'aps.property_capacity_pct',
      alerts: 'aps.active_alerts'
    };
    return sortColumns[sortBy] || 'u.name';
  }

  buildDateFilter(startDate, endDate) {
    if (startDate && endDate) {
      return `AND metric_date >= $2 AND metric_date <= $3`;
    } else if (startDate) {
      return `AND metric_date >= $2`;
    } else if (endDate) {
      return `AND metric_date <= $2`;
    }
    return '';
  }

  buildPeriodFilter(period) {
    const periodMap = {
      '7d': "created_at >= CURRENT_DATE - INTERVAL '7 days'",
      '30d': "created_at >= CURRENT_DATE - INTERVAL '30 days'",
      '90d': "created_at >= CURRENT_DATE - INTERVAL '90 days'",
      '1y': "created_at >= CURRENT_DATE - INTERVAL '1 year'"
    };
    return periodMap[period] || "created_at >= CURRENT_DATE - INTERVAL '30 days'";
  }

  calculatePerformanceComparisons(metrics, period) {
    // Calculate period-over-period comparisons
    return metrics.map((metric, index) => {
      if (index === 0) return { ...metric, comparison: null };
      
      const previous = metrics[index - 1];
      return {
        ...metric,
        comparison: {
          revenue: this.calculateGrowth(metric.revenue_collected, previous.revenue_collected),
          occupancy: this.calculateGrowth(metric.occupancy_rate, previous.occupancy_rate),
          tenants: this.calculateGrowth(metric.new_tenants, previous.new_tenants)
        }
      };
    });
  }

  calculateGrowth(current, previous) {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  calculatePerformanceSummary(metrics) {
    if (metrics.length === 0) return null;

    const latest = metrics[0];
    const oldest = metrics[metrics.length - 1];

    return {
      totalRevenue: latest.revenue_collected,
      avgOccupancy: metrics.reduce((sum, m) => sum + m.occupancy_rate, 0) / metrics.length,
      totalNewTenants: metrics.reduce((sum, m) => sum + m.new_tenants, 0),
      totalChurnedTenants: metrics.reduce((sum, m) => sum + m.churned_tenants, 0),
      revenueGrowth: this.calculateGrowth(latest.revenue_collected, oldest.revenue_collected)
    };
  }

  calculateTrends(metrics) {
    if (metrics.length < 2) return null;

    // Simple linear regression for trend calculation
    const revenueTrend = this.calculateLinearTrend(metrics.map((m, i) => ({ x: i, y: m.revenue_collected })));
    const occupancyTrend = this.calculateLinearTrend(metrics.map((m, i) => ({ x: i, y: m.occupancy_rate })));

    return {
      revenue: revenueTrend,
      occupancy: occupancyTrend
    };
  }

  calculateLinearTrend(data) {
    const n = data.length;
    const sumX = data.reduce((sum, point) => sum + point.x, 0);
    const sumY = data.reduce((sum, point) => sum + point.y, 0);
    const sumXY = data.reduce((sum, point) => sum + point.x * point.y, 0);
    const sumXX = data.reduce((sum, point) => sum + point.x * point.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept, direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable' };
  }

  async checkAdminCapacity(client, adminId, additionalProperties) {
    const capacityQuery = `
      SELECT 
        acr.max_properties,
        COUNT(ap.property_id) as current_properties
      FROM admin_capacity_rules acr
      LEFT JOIN admin_property_assignments ap ON acr.admin_id = ap.admin_id AND ap.unassigned_at IS NULL
      WHERE acr.admin_id = $1
      GROUP BY acr.max_properties
    `;
    
    const result = await client.query(capacityQuery, [adminId]);
    if (result.rows.length === 0) {
      return { hasCapacity: true, available: 50 }; // Default capacity
    }

    const { max_properties, current_properties } = result.rows[0];
    const available = max_properties - current_properties;
    
    return {
      hasCapacity: available >= additionalProperties,
      available,
      current: current_properties,
      max: max_properties
    };
  }

  async notifyTenantsOfAdminSuspension(client, adminId, reason) {
    const tenantsQuery = `
      SELECT DISTINCT t.email, t.name, p.name as property_name
      FROM tenants t
      JOIN properties p ON t.property_id = p.id
      WHERE p.admin_id = $1 AND t.status = 'active' AND t.deleted_at IS NULL
    `;
    
    const tenants = await client.query(tenantsQuery, [adminId]);
    
    for (const tenant of tenants.rows) {
      await sendEmail({
        to: tenant.email,
        subject: 'Important Update: Property Management Change',
        template: 'admin-suspension',
        data: {
          tenantName: tenant.name,
          propertyName: tenant.property_name,
          reason
        }
      });
    }
  }

  async notifyTenantsOfPropertyReassignment(client, properties, newAdminId) {
    const newAdminQuery = `
      SELECT name, email FROM users WHERE id = $1
    `;
    const newAdmin = await client.query(newAdminQuery, [newAdminId]);
    
    for (const property of properties) {
      if (property.tenant_email) {
        await sendEmail({
          to: property.tenant_email,
          subject: 'Property Management Update',
          template: 'property-reassignment',
          data: {
            tenantName: property.tenant_name,
            propertyName: property.name,
            newAdminName: newAdmin.rows[0].name
          }
        });
      }
    }
  }

  async createCapacityAlerts(adminId, exceededLimits) {
    for (const limit of exceededLimits) {
      await Database.query(`
        INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
        VALUES ($1, 'capacity_warning', 'high', 'Capacity Limit Exceeded', $2, $3)
      `, [
        adminId,
        `${limit.type} capacity exceeded: ${limit.current}/${limit.max} (${limit.percentage.toFixed(1)}%)`,
        limit
      ]);
    }
  }

  async getAdminById(adminId) {
    const query = 'SELECT id, name, email, role, status FROM users WHERE id = $1 AND role = \'admin\' AND deleted_at IS NULL';
    const result = await Database.query(query, [adminId]);
    return result.rows[0] || null;
  }
}

module.exports = new AdminManagementService();
