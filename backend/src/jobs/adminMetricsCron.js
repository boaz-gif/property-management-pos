const cron = require('node-cron');
const Database = require('../utils/database');
const { logger } = require('../utils/logger');

class AdminMetricsCron {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.errorCount = 0;
    this.maxErrors = 5;
  }

  // Initialize all admin metrics cron jobs
  initialize() {
    try {
      // Daily metrics calculation at 2:00 AM
      cron.schedule('0 2 * * *', async () => {
        await this.calculateDailyMetrics();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      // Capacity check every 6 hours
      cron.schedule('0 */6 * * *', async () => {
        await this.checkAdminCapacity();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      // Performance anomaly detection daily at 3:00 AM
      cron.schedule('0 3 * * *', async () => {
        await this.detectPerformanceAnomalies();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      // Weekly admin performance ranking on Sunday at 4:00 AM
      cron.schedule('0 4 * * 0', async () => {
        await this.generateWeeklyRankings();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      // Monthly business summary on 1st of each month at 5:00 AM
      cron.schedule('0 5 1 * *', async () => {
        await this.generateMonthlySummary();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      // Refresh materialized views every hour
      cron.schedule('0 * * * *', async () => {
        await this.refreshMaterializedViews();
      }, {
        scheduled: true,
        timezone: 'UTC'
      });

      logger.info('Admin metrics cron jobs initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize admin metrics cron jobs:', error);
    }
  }

  // Calculate daily metrics for all admins
  async calculateDailyMetrics() {
    if (this.isRunning) {
      logger.warn('Daily metrics calculation already running, skipping');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      logger.info('Starting daily admin metrics calculation');

      // Get all active admins
      const adminsQuery = `
        SELECT id, name, email 
        FROM users 
        WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL
      `;
      const adminsResult = await Database.query(adminsQuery);
      const admins = adminsResult.rows;

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const metricDate = yesterday.toISOString().split('T')[0];

      let successCount = 0;
      let errorCount = 0;

      for (const admin of admins) {
        try {
          const metrics = await this.calculateAdminMetrics(admin.id, metricDate);
          await this.saveAdminMetrics(admin.id, metricDate, metrics);
          
          // Check for capacity warnings
          await this.checkCapacityWarnings(admin.id, metrics);
          
          successCount++;
        } catch (error) {
          logger.error(`Failed to calculate metrics for admin ${admin.id}:`, error);
          errorCount++;
        }
      }

      const executionTime = Date.now() - startTime;
      this.lastRun = new Date();
      this.errorCount = 0; // Reset error count on successful completion

      logger.info(`Daily metrics calculation completed. Success: ${successCount}, Errors: ${errorCount}, Time: ${executionTime}ms`);

      // Create execution log
      await this.logCronExecution('daily_metrics', {
        successCount,
        errorCount,
        executionTime,
        totalAdmins: admins.length
      });

    } catch (error) {
      this.errorCount++;
      logger.error('Error in daily metrics calculation:', error);
      
      if (this.errorCount >= this.maxErrors) {
        logger.error(`Max error count (${this.maxErrors}) reached, disabling daily metrics calculation`);
        // In a production environment, you might want to send alerts here
      }
    } finally {
      this.isRunning = false;
    }
  }

  // Calculate metrics for a specific admin
  async calculateAdminMetrics(adminId, metricDate) {
    try {
      const metrics = {};

      // Portfolio metrics
      const portfolioQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as properties_managed,
          COALESCE(SUM(p.units), 0) as total_units,
          COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'active') as occupied_units
        FROM admin_property_assignments apa
        JOIN properties p ON apa.property_id = p.id AND p.deleted_at IS NULL
        LEFT JOIN tenants t ON p.id = t.property_id AND t.status = 'active' AND t.deleted_at IS NULL
        WHERE apa.admin_id = $1 
          AND apa.unassigned_at IS NULL
          AND (apa.assigned_at <= $2 OR apa.assigned_at::date = $2)
      `;
      const portfolioResult = await Database.query(portfolioQuery, [adminId, metricDate]);
      const portfolio = portfolioResult.rows[0];

      metrics.properties_managed = parseInt(portfolio.properties_managed) || 0;
      metrics.total_units = parseInt(portfolio.total_units) || 0;
      metrics.occupied_units = parseInt(portfolio.occupied_units) || 0;
      metrics.occupancy_rate = metrics.total_units > 0 
        ? (metrics.occupied_units / metrics.total_units) * 100 
        : 0;

      // Financial metrics
      const financialQuery = `
        SELECT 
          COALESCE(SUM(CASE WHEN pm.status = 'completed' THEN pm.amount ELSE 0 END), 0) as revenue_collected,
          COALESCE(SUM(CASE WHEN pm.status = 'pending' THEN pm.amount ELSE 0 END), 0) as revenue_pending,
          COUNT(CASE WHEN pm.status = 'completed' THEN 1 END) as completed_payments,
          COUNT(CASE WHEN pm.status = 'pending' THEN 1 END) as pending_payments
        FROM payments pm
        JOIN tenants t ON pm.tenant_id = t.id
        JOIN properties p ON t.property_id = p.id
        WHERE p.admin_id = $1 
          AND pm.date::date = $2
          AND pm.deleted_at IS NULL
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
      `;
      const financialResult = await Database.query(financialQuery, [adminId, metricDate]);
      const financial = financialResult.rows[0];

      metrics.revenue_collected = parseFloat(financial.revenue_collected) || 0;
      metrics.revenue_pending = parseFloat(financial.revenue_pending) || 0;
      
      const totalPayments = parseInt(financial.completed_payments) + parseInt(financial.pending_payments);
      metrics.collection_rate = totalPayments > 0 
        ? (parseInt(financial.completed_payments) / totalPayments) * 100 
        : 0;

      // Maintenance metrics
      const maintenanceQuery = `
        SELECT 
          COUNT(CASE WHEN m.status = 'completed' THEN 1 END) as maintenance_resolved,
          COUNT(CASE WHEN m.status = 'open' THEN 1 END) as maintenance_pending,
          AVG(CASE WHEN m.status = 'completed' THEN 
            (DATE_PART('epoch', m.updated_at) - DATE_PART('epoch', m.created_at)) / 3600 
          END) as avg_resolution_time_hours
        FROM maintenance m
        JOIN properties p ON m.property_id = p.id
        WHERE p.admin_id = $1 
          AND m.created_at::date <= $2
          AND m.deleted_at IS NULL
          AND p.deleted_at IS NULL
      `;
      const maintenanceResult = await Database.query(maintenanceQuery, [adminId, metricDate]);
      const maintenance = maintenanceResult.rows[0];

      metrics.maintenance_resolved = parseInt(maintenance.maintenance_resolved) || 0;
      metrics.maintenance_pending = parseInt(maintenance.maintenance_pending) || 0;
      metrics.avg_resolution_time_hours = parseFloat(maintenance.avg_resolution_time_hours) || 0;

      // Tenant metrics
      const tenantQuery = `
        SELECT 
          COUNT(CASE WHEN t.created_at::date = $2 THEN 1 END) as new_tenants,
          COUNT(CASE WHEN t.status = 'inactive' AND t.updated_at::date = $2 THEN 1 END) as churned_tenants,
          AVG(t.rent) FILTER (WHERE t.status = 'active') as avg_rent
        FROM tenants t
        JOIN properties p ON t.property_id = p.id
        WHERE p.admin_id = $1 
          AND (t.created_at::date <= $2 OR t.created_at::date = $2 OR t.updated_at::date = $2)
          AND t.deleted_at IS NULL
          AND p.deleted_at IS NULL
      `;
      const tenantResult = await Database.query(tenantQuery, [adminId, metricDate]);
      const tenant = tenantResult.rows[0];

      metrics.new_tenants = parseInt(tenant.new_tenants) || 0;
      metrics.churned_tenants = parseInt(tenant.churned_tenants) || 0;

      // Activity metrics
      const activityQuery = `
        SELECT 
          COUNT(CASE WHEN action = 'LOGIN' THEN 1 END) as logins_count,
          COUNT(*) as actions_count,
          MAX(timestamp) as last_active
        FROM audit_logs
        WHERE user_id = $1 
          AND timestamp::date = $2
      `;
      const activityResult = await Database.query(activityQuery, [adminId, metricDate]);
      const activity = activityResult.rows[0];

      metrics.logins_count = parseInt(activity.logins_count) || 0;
      metrics.actions_count = parseInt(activity.actions_count) || 0;
      metrics.last_active = activity.last_active;

      return metrics;
    } catch (error) {
      logger.error(`Error calculating metrics for admin ${adminId}:`, error);
      throw error;
    }
  }

  // Save admin metrics to database
  async saveAdminMetrics(adminId, metricDate, metrics) {
    try {
      const query = `
        INSERT INTO admin_metrics (
          admin_id, metric_date, properties_managed, total_units, occupied_units,
          occupancy_rate, revenue_collected, revenue_pending, collection_rate,
          maintenance_resolved, maintenance_pending, avg_resolution_time_hours,
          new_tenants, churned_tenants, logins_count, actions_count, last_active
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        ON CONFLICT (admin_id, metric_date) 
        DO UPDATE SET
          properties_managed = EXCLUDED.properties_managed,
          total_units = EXCLUDED.total_units,
          occupied_units = EXCLUDED.occupied_units,
          occupancy_rate = EXCLUDED.occupancy_rate,
          revenue_collected = EXCLUDED.revenue_collected,
          revenue_pending = EXCLUDED.revenue_pending,
          collection_rate = EXCLUDED.collection_rate,
          maintenance_resolved = EXCLUDED.maintenance_resolved,
          maintenance_pending = EXCLUDED.maintenance_pending,
          avg_resolution_time_hours = EXCLUDED.avg_resolution_time_hours,
          new_tenants = EXCLUDED.new_tenants,
          churned_tenants = EXCLUDED.churned_tenants,
          logins_count = EXCLUDED.logins_count,
          actions_count = EXCLUDED.actions_count,
          last_active = EXCLUDED.last_active
      `;

      await Database.query(query, [
        adminId, metricDate, metrics.properties_managed, metrics.total_units, metrics.occupied_units,
        metrics.occupancy_rate, metrics.revenue_collected, metrics.revenue_pending, metrics.collection_rate,
        metrics.maintenance_resolved, metrics.maintenance_pending, metrics.avg_resolution_time_hours,
        metrics.new_tenants, metrics.churned_tenants, metrics.logins_count, metrics.actions_count, metrics.last_active
      ]);
    } catch (error) {
      logger.error(`Error saving metrics for admin ${adminId}:`, error);
      throw error;
    }
  }

  // Check for capacity warnings and create alerts
  async checkCapacityWarnings(adminId, metrics) {
    try {
      const capacityQuery = `
        SELECT max_properties, max_units, max_tenants
        FROM admin_capacity_rules
        WHERE admin_id = $1
      `;
      const capacityResult = await Database.query(capacityQuery, [adminId]);
      
      if (capacityResult.rows.length === 0) return;

      const capacity = capacityResult.rows[0];
      const warnings = [];

      // Check property capacity
      if (metrics.properties_managed >= capacity.max_properties * 0.8) {
        warnings.push({
          type: 'properties',
          current: metrics.properties_managed,
          max: capacity.max_properties,
          percentage: (metrics.properties_managed / capacity.max_properties) * 100
        });
      }

      // Check unit capacity
      if (metrics.total_units >= capacity.max_units * 0.8) {
        warnings.push({
          type: 'units',
          current: metrics.total_units,
          max: capacity.max_units,
          percentage: (metrics.total_units / capacity.max_units) * 100
        });
      }

      // Create alerts for warnings
      for (const warning of warnings) {
        const severity = warning.percentage >= 100 ? 'critical' : 'high';
        const title = `Capacity Warning: ${warning.type}`;
        const message = `${warning.type} capacity at ${warning.percentage.toFixed(1)}% (${warning.current}/${warning.max})`;

        await Database.query(`
          INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
          VALUES ($1, 'capacity_warning', $2, $3, $4, $5)
          ON CONFLICT (admin_id, alert_type, created_at::date) DO NOTHING
        `, [adminId, severity, title, message, warning]);
      }
    } catch (error) {
      logger.error(`Error checking capacity warnings for admin ${adminId}:`, error);
    }
  }

  // Check admin capacity and create alerts
  async checkAdminCapacity() {
    try {
      logger.info('Starting admin capacity check');

      const capacityCheckQuery = `
        SELECT 
          aps.admin_id,
          aps.property_capacity_pct,
          aps.unit_capacity_pct,
          aps.tenant_capacity_pct
        FROM mv_admin_performance_summary aps
        WHERE aps.property_capacity_pct > 80 
           OR aps.unit_capacity_pct > 80 
           OR aps.tenant_capacity_pct > 80
      `;

      const result = await Database.query(capacityCheckQuery);
      
      for (const admin of result.rows) {
        const alerts = [];
        
        if (admin.property_capacity_pct > 80) {
          alerts.push({
            type: 'properties',
            percentage: admin.property_capacity_pct,
            severity: admin.property_capacity_pct >= 100 ? 'critical' : 'high'
          });
        }

        if (admin.unit_capacity_pct > 80) {
          alerts.push({
            type: 'units',
            percentage: admin.unit_capacity_pct,
            severity: admin.unit_capacity_pct >= 100 ? 'critical' : 'high'
          });
        }

        if (admin.tenant_capacity_pct > 80) {
          alerts.push({
            type: 'tenants',
            percentage: admin.tenant_capacity_pct,
            severity: admin.tenant_capacity_pct >= 100 ? 'critical' : 'high'
          });
        }

        // Create alerts
        for (const alert of alerts) {
          await Database.query(`
            INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
            VALUES ($1, 'capacity_warning', $2, $3, $4, $5)
            ON CONFLICT (admin_id, alert_type, created_at::date) DO NOTHING
          `, [
            admin.admin_id,
            alert.severity,
            `Capacity Alert: ${alert.type}`,
            `${alert.type} capacity at ${alert.percentage.toFixed(1)}%`,
            { type: alert.type, percentage: alert.percentage }
          ]);
        }
      }

      logger.info(`Capacity check completed. ${result.rows.length} admins with capacity warnings`);
    } catch (error) {
      logger.error('Error in admin capacity check:', error);
    }
  }

  // Detect performance anomalies
  async detectPerformanceAnomalies() {
    try {
      logger.info('Starting performance anomaly detection');

      // Get metrics from last 30 days
      const anomalyQuery = `
        SELECT 
          admin_id,
          AVG(collection_rate) as avg_collection_rate,
          STDDEV(collection_rate) as collection_rate_std,
          AVG(occupancy_rate) as avg_occupancy_rate,
          STDDEV(occupancy_rate) as occupancy_rate_std
        FROM admin_metrics
        WHERE metric_date >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY admin_id
        HAVING COUNT(*) >= 7 -- Need at least 7 days of data
      `;

      const result = await Database.query(anomalyQuery);

      for (const admin of result.rows) {
        // Check for recent anomalies (last 3 days)
        const recentQuery = `
          SELECT 
            metric_date,
            collection_rate,
            occupancy_rate
          FROM admin_metrics
          WHERE admin_id = $1 
            AND metric_date >= CURRENT_DATE - INTERVAL '3 days'
          ORDER BY metric_date DESC
        `;

        const recentResult = await Database.query(recentQuery, [admin.admin_id]);

        for (const recent of recentResult.rows) {
          // Check for collection rate anomalies (more than 2 standard deviations)
          if (admin.collection_rate_std > 0) {
            const zScore = Math.abs(recent.collection_rate - admin.avg_collection_rate) / admin.collection_rate_std;
            if (zScore > 2) {
              await this.createPerformanceAlert(admin.admin_id, 'collection_rate', recent.metric_date, zScore, recent.collection_rate);
            }
          }

          // Check for occupancy rate anomalies
          if (admin.occupancy_rate_std > 0) {
            const zScore = Math.abs(recent.occupancy_rate - admin.avg_occupancy_rate) / admin.occupancy_rate_std;
            if (zScore > 2) {
              await this.createPerformanceAlert(admin.admin_id, 'occupancy_rate', recent.metric_date, zScore, recent.occupancy_rate);
            }
          }
        }
      }

      logger.info('Performance anomaly detection completed');
    } catch (error) {
      logger.error('Error in performance anomaly detection:', error);
    }
  }

  // Create performance alert
  async createPerformanceAlert(adminId, metricType, date, zScore, value) {
    try {
      const severity = zScore > 3 ? 'critical' : 'high';
      const title = `Performance Anomaly: ${metricType}`;
      const message = `${metricType} anomaly detected on ${date}: ${value.toFixed(2)} (Z-score: ${zScore.toFixed(2)})`;

      await Database.query(`
        INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
        VALUES ($1, 'performance_issue', $2, $3, $4, $5)
        ON CONFLICT (admin_id, alert_type, created_at::date) DO NOTHING
      `, [adminId, severity, title, message, {
        metricType,
        date,
        zScore,
        value
      }]);
    } catch (error) {
      logger.error(`Error creating performance alert for admin ${adminId}:`, error);
    }
  }

  // Generate weekly rankings
  async generateWeeklyRankings() {
    try {
      logger.info('Starting weekly admin performance rankings');

      const rankingsQuery = `
        SELECT 
          admin_id,
          AVG(collection_rate) as avg_collection_rate,
          AVG(occupancy_rate) as avg_occupancy_rate,
          SUM(revenue_collected) as total_revenue,
          COUNT(*) as days_active
        FROM admin_metrics
        WHERE metric_date >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY admin_id
        ORDER BY total_revenue DESC
      `;

      const result = await Database.query(rankingsQuery);

      // Create ranking alerts for top performers
      for (let i = 0; i < Math.min(3, result.rows.length); i++) {
        const admin = result.rows[i];
        const rank = i + 1;
        
        await Database.query(`
          INSERT INTO admin_alerts (admin_id, alert_type, severity, title, message, data)
          VALUES ($1, 'performance_issue', 'low', $2, $3, $4)
          ON CONFLICT (admin_id, alert_type, created_at::date) DO NOTHING
        `, [
          admin.admin_id,
          `Top Performer: Rank #${rank}`,
          `Ranked #${rank} this week with $${admin.total_revenue.toFixed(2)} revenue`,
          { rank, totalRevenue: admin.total_revenue, avgCollectionRate: admin.avg_collection_rate }
        ]);
      }

      logger.info(`Weekly rankings generated. ${result.rows.length} admins ranked`);
    } catch (error) {
      logger.error('Error generating weekly rankings:', error);
    }
  }

  // Generate monthly business summary
  async generateMonthlySummary() {
    try {
      logger.info('Starting monthly business summary generation');

      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const summaryMonth = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);

      // Get all admins
      const adminsQuery = `
        SELECT id FROM users WHERE role = 'admin' AND status = 'active' AND deleted_at IS NULL
      `;
      const adminsResult = await Database.query(adminsQuery);

      for (const admin of adminsResult.rows) {
        await this.generateAdminMonthlySummary(admin.id, summaryMonth);
      }

      logger.info(`Monthly business summary generated for ${adminsResult.rows.length} admins`);
    } catch (error) {
      logger.error('Error generating monthly business summary:', error);
    }
  }

  // Generate monthly summary for a specific admin
  async generateAdminMonthlySummary(adminId, summaryMonth) {
    try {
      const endDate = new Date(summaryMonth);
      endDate.setMonth(endDate.getMonth() + 1);

      const summaryQuery = `
        SELECT 
          COUNT(DISTINCT p.id) as total_properties,
          COUNT(DISTINCT CASE WHEN p.status = 'active' THEN p.id END) as active_properties,
          COALESCE(SUM(p.units), 0) as total_units,
          COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as occupied_units,
          COALESCE(SUM(CASE WHEN pm.status = 'completed' THEN pm.amount ELSE 0 END), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN pm.type = 'rent' AND pm.status = 'completed' THEN pm.amount ELSE 0 END), 0) as rent_revenue,
          COALESCE(SUM(CASE WHEN pm.type = 'fee' AND pm.status = 'completed' THEN pm.amount ELSE 0 END), 0) as fee_revenue,
          COALESCE(SUM(CASE WHEN pm.status = 'pending' THEN pm.amount ELSE 0 END), 0) as outstanding_balance,
          COUNT(DISTINCT t.id) as total_tenants,
          COUNT(DISTINCT CASE WHEN t.status = 'active' THEN t.id END) as active_tenants,
          COUNT(CASE WHEN t.created_at >= $1 AND t.created_at < $2 THEN 1 END) as new_tenants,
          COUNT(CASE WHEN t.status = 'inactive' AND t.updated_at >= $1 AND t.updated_at < $2 THEN 1 END) as churned_tenants,
          COUNT(CASE WHEN m.created_at >= $1 AND m.created_at < $2 THEN 1 END) as total_maintenance_requests,
          COUNT(CASE WHEN m.status = 'completed' AND m.created_at >= $1 AND m.created_at < $2 THEN 1 END) as completed_maintenance_requests,
          AVG(CASE WHEN m.status = 'completed' AND m.created_at >= $1 AND m.created_at < $2 THEN 
            (DATE_PART('epoch', m.updated_at) - DATE_PART('epoch', m.created_at)) / 86400 
          END) as avg_resolution_days
        FROM users u
        LEFT JOIN properties p ON u.id = p.admin_id AND p.deleted_at IS NULL
        LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL
        LEFT JOIN payments pm ON t.id = pm.tenant_id AND pm.deleted_at IS NULL
        LEFT JOIN maintenance m ON p.id = m.property_id AND m.deleted_at IS NULL
        WHERE u.id = $3 
          AND u.deleted_at IS NULL
      `;

      const result = await Database.query(summaryQuery, [summaryMonth, endDate, adminId]);
      const summary = result.rows[0];

      // Calculate derived metrics
      const occupancyRate = summary.total_units > 0 
        ? (summary.occupied_units / summary.total_units) * 100 
        : 0;
      
      const collectionRate = (summary.total_revenue + summary.outstanding_balance) > 0
        ? (summary.total_revenue / (summary.total_revenue + summary.outstanding_balance)) * 100
        : 0;

      const retentionRate = summary.total_tenants > 0
        ? ((summary.total_tenants - summary.churned_tenants) / summary.total_tenants) * 100
        : 0;

      // Insert or update monthly summary
      await Database.query(`
        INSERT INTO monthly_business_summary (
          admin_id, summary_month, total_properties, active_properties, total_units,
          occupied_units, avg_occupancy_rate, total_revenue, rent_revenue, fee_revenue,
          outstanding_balance, collection_rate, total_tenants, active_tenants,
          new_tenants, churned_tenants, tenant_retention_rate, total_maintenance_requests,
          completed_maintenance_requests, avg_resolution_time_hours
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20
        )
        ON CONFLICT (admin_id, summary_month) 
        DO UPDATE SET
          total_properties = EXCLUDED.total_properties,
          active_properties = EXCLUDED.active_properties,
          total_units = EXCLUDED.total_units,
          occupied_units = EXCLUDED.occupied_units,
          avg_occupancy_rate = EXCLUDED.avg_occupancy_rate,
          total_revenue = EXCLUDED.total_revenue,
          rent_revenue = EXCLUDED.rent_revenue,
          fee_revenue = EXCLUDED.fee_revenue,
          outstanding_balance = EXCLUDED.outstanding_balance,
          collection_rate = EXCLUDED.collection_rate,
          total_tenants = EXCLUDED.total_tenants,
          active_tenants = EXCLUDED.active_tenants,
          new_tenants = EXCLUDED.new_tenants,
          churned_tenants = EXCLUDED.churned_tenants,
          tenant_retention_rate = EXCLUDED.tenant_retention_rate,
          total_maintenance_requests = EXCLUDED.total_maintenance_requests,
          completed_maintenance_requests = EXCLUDED.completed_maintenance_requests,
          avg_resolution_time_hours = EXCLUDED.avg_resolution_time_hours,
          updated_at = NOW()
      `, [
        adminId, summaryMonth, summary.total_properties, summary.active_properties, summary.total_units,
        summary.occupied_units, occupancyRate, summary.total_revenue, summary.rent_revenue, summary.fee_revenue,
        summary.outstanding_balance, collectionRate, summary.total_tenants, summary.active_tenants,
        summary.new_tenants, summary.churned_tenants, retentionRate, summary.total_maintenance_requests,
        summary.completed_maintenance_requests, summary.avg_resolution_days * 24 // Convert days to hours
      ]);
    } catch (error) {
      logger.error(`Error generating monthly summary for admin ${adminId}:`, error);
    }
  }

  // Refresh materialized views
  async refreshMaterializedViews() {
    try {
      const views = [
        'mv_admin_performance_summary',
        'mv_compliance_dashboard',
        'mv_bulk_operations_dashboard'
      ];

      for (const view of views) {
        try {
          await Database.query(`REFRESH MATERIALIZED VIEW CONCURRENTLY ${view}`);
          logger.debug(`Refreshed materialized view: ${view}`);
        } catch (error) {
          logger.error(`Failed to refresh materialized view ${view}:`, error);
        }
      }
    } catch (error) {
      logger.error('Error refreshing materialized views:', error);
    }
  }

  // Log cron execution
  async logCronExecution(jobType, details) {
    try {
      await Database.query(`
        INSERT INTO audit_logs (user_id, action, resource_type, details, timestamp)
        VALUES (NULL, $1, 'cron_job', $2, NOW())
      `, [jobType, JSON.stringify(details)]);
    } catch (error) {
      logger.error('Error logging cron execution:', error);
    }
  }

  // Get cron status
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      errorCount: this.errorCount,
      maxErrors: this.maxErrors
    };
  }
}

module.exports = new AdminMetricsCron();
