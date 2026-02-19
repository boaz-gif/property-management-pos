const cron = require('node-cron');
const adminDashboardService = require('../services/adminDashboardService');
const logger = require('../utils/logger');
const Database = require('../utils/database');

class AdminDashboardCron {
  constructor() {
    this.isRunning = false;
    this.setupJobs();
  }

  setupJobs() {
    // Daily metrics calculation at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      await this.calculateDailyMetrics();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    // Hourly real-time metrics update
    cron.schedule('0 * * * *', async () => {
      await this.updateRealTimeMetrics();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    // Weekly performance report on Monday 6:00 AM
    cron.schedule('0 6 * * 1', async () => {
      await this.generateWeeklyReport();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    // Monthly metrics archive on 1st of month at 8:00 AM
    cron.schedule('0 8 1 * *', async () => {
      await this.archiveMonthlyMetrics();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    // Action items generation every 4 hours
    cron.schedule('0 */4 * * *', async () => {
      await this.generateActionItems();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    // Cache cleanup every 6 hours
    cron.schedule('0 */6 * * *', async () => {
      await this.cleanupCache();
    }, {
      scheduled: true,
      timezone: 'America/New_York'
    });

    console.log('Admin Dashboard cron jobs scheduled successfully');
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
      logger.info('Starting daily metrics calculation...');

      // Get all active admins
      const adminsQuery = `
        SELECT id, name, email 
        FROM users 
        WHERE role = 'admin' 
          AND deleted_at IS NULL
      `;
      
      const adminsResult = await Database.query(adminsQuery);
      const admins = adminsResult.rows;

      let successCount = 0;
      let errorCount = 0;

      // Calculate metrics for each admin
      for (const admin of admins) {
        try {
          await adminDashboardService.generateMetricsForAdmin(admin.id);
          successCount++;
          
          logger.info(`Generated daily metrics for admin: ${admin.name} (${admin.email})`);
        } catch (error) {
          errorCount++;
          logger.error(`Failed to generate metrics for admin ${admin.id}:`, error);
        }
      }

      // Generate property metrics
      await this.calculatePropertyMetrics();

      // Generate action items
      await this.generateActionItems();

      const duration = Date.now() - startTime;
      logger.info(`Daily metrics calculation completed in ${duration}ms. Success: ${successCount}, Errors: ${errorCount}`);

      // Log completion
      await this.logCronExecution('daily_metrics', {
        success: true,
        duration,
        adminsProcessed: successCount,
        errors: errorCount
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      logger.error('Daily metrics calculation failed:', error);
      
      await this.logCronExecution('daily_metrics', {
        success: false,
        duration,
        error: error.message
      });
    } finally {
      this.isRunning = false;
    }
  }

  // Update real-time metrics
  async updateRealTimeMetrics() {
    try {
      logger.debug('Updating real-time metrics...');

      // Update only critical metrics that change frequently
      const criticalMetricsQuery = `
        UPDATE admin_dashboard_metrics adm
        SET 
          active_maintenance_requests = subquery.active_maintenance,
          urgent_maintenance_count = subquery.urgent_maintenance
        FROM (
          SELECT 
            p.admin_id,
            COUNT(m.id) FILTER (WHERE m.status = 'open' OR m.status = 'in-progress') as active_maintenance,
            COUNT(m.id) FILTER (WHERE m.priority = 'high' AND m.status = 'open') as urgent_maintenance
          FROM properties p
          LEFT JOIN maintenance m ON p.id = m.property_id AND m.deleted_at IS NULL
          WHERE p.deleted_at IS NULL
          GROUP BY p.admin_id
        ) subquery
        WHERE adm.admin_id = subquery.admin_id 
          AND adm.metric_date = CURRENT_DATE
      `;

      await Database.query(criticalMetricsQuery);
      
      logger.debug('Real-time metrics updated successfully');
    } catch (error) {
      logger.error('Failed to update real-time metrics:', error);
    }
  }

  // Calculate property metrics
  async calculatePropertyMetrics() {
    try {
      logger.info('Calculating property metrics...');

      // Get all active properties
      const propertiesQuery = `
        SELECT id, admin_id, units, name
        FROM properties 
        WHERE deleted_at IS NULL
      `;
      
      const propertiesResult = await Database.query(propertiesQuery);
      const properties = propertiesResult.rows;

      for (const property of properties) {
        try {
          await this.calculatePropertyMetricsForProperty(property.id);
        } catch (error) {
          logger.error(`Failed to calculate metrics for property ${property.id}:`, error);
        }
      }

      logger.info(`Property metrics calculation completed for ${properties.length} properties`);
    } catch (error) {
      logger.error('Property metrics calculation failed:', error);
    }
  }

  // Calculate metrics for a specific property
  async calculatePropertyMetricsForProperty(propertyId) {
    const query = `
      INSERT INTO property_metrics (
        property_id, metric_date, total_units, occupied_units, occupancy_rate,
        revenue, collected, collection_rate, expenses, net_operating_income,
        maintenance_requests, maintenance_resolved, maintenance_cost,
        avg_resolution_time_hours
      )
      SELECT 
        p.id,
        CURRENT_DATE,
        p.units,
        COALESCE(active_tenants.count, 0),
        CASE 
          WHEN p.units > 0 
          THEN ROUND((COALESCE(active_tenants.count, 0)::DECIMAL / p.units) * 100, 2)
          ELSE 0 
        END,
        COALESCE(monthly_revenue.total, 0),
        COALESCE(collected_revenue.total, 0),
        CASE 
          WHEN COALESCE(monthly_revenue.total, 0) > 0 
          THEN ROUND((COALESCE(collected_revenue.total, 0) / COALESCE(monthly_revenue.total, 0)) * 100, 2)
          ELSE 0 
        END,
        COALESCE(monthly_expenses.total, 0),
        COALESCE(collected_revenue.total, 0) - COALESCE(monthly_expenses.total, 0),
        COALESCE(maintenance_stats.total_requests, 0),
        COALESCE(maintenance_stats.resolved_requests, 0),
        COALESCE(maintenance_stats.total_cost, 0),
        COALESCE(maintenance_stats.avg_resolution_time, 0)
      FROM properties p
      LEFT JOIN (
        SELECT 
          property_id, 
          COUNT(*) as count
        FROM tenants 
        WHERE status = 'active' AND deleted_at IS NULL
        GROUP BY property_id
      ) active_tenants ON p.id = active_tenants.property_id
      LEFT JOIN (
        SELECT 
          t.property_id,
          SUM(t.rent) as total
        FROM tenants t
        WHERE t.status = 'active' AND t.deleted_at IS NULL
        GROUP BY t.property_id
      ) monthly_revenue ON p.id = monthly_revenue.property_id
      LEFT JOIN (
        SELECT 
          t.property_id,
          SUM(pm.amount) as total
        FROM tenants t
        JOIN payments pm ON t.id = pm.tenant_id
        WHERE pm.status = 'completed' 
          AND pm.deleted_at IS NULL 
          AND t.deleted_at IS NULL
          AND pm.date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY t.property_id
      ) collected_revenue ON p.id = collected_revenue.property_id
      LEFT JOIN (
        SELECT 
          property_id,
          SUM(amount) as total
        FROM property_expenses 
        WHERE deleted_at IS NULL 
          AND expense_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY property_id
      ) monthly_expenses ON p.id = monthly_expenses.property_id
      LEFT JOIN (
        SELECT 
          property_id,
          COUNT(*) as total_requests,
          COUNT(*) FILTER (WHERE status = 'completed') as resolved_requests,
          COALESCE(SUM(amount), 0) as total_cost,
          COALESCE(
            AVG(
              CASE 
                WHEN completed_date IS NOT NULL 
                THEN (DATE_PART('epoch', completed_date) - DATE_PART('epoch', date)) / 3600
                ELSE NULL 
              END
            ), 0
          ) as avg_resolution_time
        FROM maintenance 
        WHERE deleted_at IS NULL 
          AND date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY property_id
      ) maintenance_stats ON p.id = maintenance_stats.property_id
      WHERE p.id = $1
      ON CONFLICT (property_id, metric_date) 
      DO UPDATE SET
        total_units = EXCLUDED.total_units,
        occupied_units = EXCLUDED.occupied_units,
        occupancy_rate = EXCLUDED.occupancy_rate,
        revenue = EXCLUDED.revenue,
        collected = EXCLUDED.collected,
        collection_rate = EXCLUDED.collection_rate,
        expenses = EXCLUDED.expenses,
        net_operating_income = EXCLUDED.net_operating_income,
        maintenance_requests = EXCLUDED.maintenance_requests,
        maintenance_resolved = EXCLUDED.maintenance_resolved,
        maintenance_cost = EXCLUDED.maintenance_cost,
        avg_resolution_time_hours = EXCLUDED.avg_resolution_time_hours
    `;

    await Database.query(query, [propertyId]);
  }

  // Generate action items for all admins
  async generateActionItems() {
    try {
      logger.debug('Generating action items...');

      // Get all active admins
      const adminsQuery = `
        SELECT id, name, email 
        FROM users 
        WHERE role = 'admin' 
          AND deleted_at IS NULL
      `;
      
      const adminsResult = await Database.query(adminsQuery);
      const admins = adminsResult.rows;

      for (const admin of admins) {
        try {
          await adminDashboardService.generateActionItems(admin.id);
        } catch (error) {
          logger.error(`Failed to generate action items for admin ${admin.id}:`, error);
        }
      }

      logger.debug('Action items generation completed');
    } catch (error) {
      logger.error('Action items generation failed:', error);
    }
  }

  // Generate weekly performance report
  async generateWeeklyReport() {
    try {
      logger.info('Generating weekly performance report...');

      const reportQuery = `
        SELECT 
          u.id as admin_id,
          u.name as admin_name,
          u.email as admin_email,
          COUNT(DISTINCT p.id) as total_properties,
          COALESCE(SUM(p.units), 0) as total_units,
          COALESCE(AVG(adm.occupancy_rate), 0) as avg_occupancy_rate,
          COALESCE(SUM(adm.monthly_revenue), 0) as total_revenue,
          COALESCE(SUM(adm.collected_revenue), 0) as total_collected,
          COALESCE(AVG(adm.collection_rate), 0) as avg_collection_rate,
          COALESCE(SUM(adm.active_maintenance_requests), 0) as total_maintenance,
          COALESCE(COUNT(aai.id), 0) as pending_action_items
        FROM users u
        LEFT JOIN properties p ON u.id = p.admin_id AND p.deleted_at IS NULL
        LEFT JOIN admin_dashboard_metrics adm ON u.id = adm.admin_id 
          AND adm.metric_date >= CURRENT_DATE - INTERVAL '7 days'
        LEFT JOIN admin_action_items aai ON u.id = aai.admin_id 
          AND aai.status = 'pending'
        WHERE u.role = 'admin' AND u.deleted_at IS NULL
        GROUP BY u.id, u.name, u.email
      `;

      const reportResult = await Database.query(reportQuery);
      const reportData = reportResult.rows;

      // Log the weekly report
      logger.info('Weekly Performance Report:', {
        date: new Date().toISOString(),
        admins: reportData.length,
        totalProperties: reportData.reduce((sum, row) => sum + parseInt(row.total_properties), 0),
        totalRevenue: reportData.reduce((sum, row) => sum + parseFloat(row.total_revenue), 0),
        avgOccupancy: (reportData.reduce((sum, row) => sum + parseFloat(row.avg_occupancy_rate), 0) / reportData.length).toFixed(2)
      });

      // Store report in database for historical tracking
      await this.storeWeeklyReport(reportData);

    } catch (error) {
      logger.error('Weekly report generation failed:', error);
    }
  }

  // Store weekly report in database
  async storeWeeklyReport(reportData) {
    try {
      for (const adminData of reportData) {
        const query = `
          INSERT INTO weekly_performance_reports (
            admin_id, report_date, total_properties, total_units,
            avg_occupancy_rate, total_revenue, total_collected,
            avg_collection_rate, total_maintenance, pending_action_items
          ) VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7, $8, $9)
          ON CONFLICT (admin_id, report_date) 
          DO UPDATE SET
            total_properties = EXCLUDED.total_properties,
            total_units = EXCLUDED.total_units,
            avg_occupancy_rate = EXCLUDED.avg_occupancy_rate,
            total_revenue = EXCLUDED.total_revenue,
            total_collected = EXCLUDED.total_collected,
            avg_collection_rate = EXCLUDED.avg_collection_rate,
            total_maintenance = EXCLUDED.total_maintenance,
            pending_action_items = EXCLUDED.pending_action_items
        `;

        await Database.query(query, [
          adminData.admin_id,
          parseInt(adminData.total_properties),
          parseInt(adminData.total_units),
          parseFloat(adminData.avg_occupancy_rate),
          parseFloat(adminData.total_revenue),
          parseFloat(adminData.total_collected),
          parseFloat(adminData.avg_collection_rate),
          parseInt(adminData.total_maintenance),
          parseInt(adminData.pending_action_items)
        ]);
      }
    } catch (error) {
      logger.error('Failed to store weekly report:', error);
    }
  }

  // Archive monthly metrics
  async archiveMonthlyMetrics() {
    try {
      logger.info('Archiving monthly metrics...');

      // Archive old admin dashboard metrics (keep last 13 months)
      const archiveAdminMetricsQuery = `
        DELETE FROM admin_dashboard_metrics 
        WHERE metric_date < CURRENT_DATE - INTERVAL '13 months'
      `;
      
      await Database.query(archiveAdminMetricsQuery);

      // Archive old property metrics (keep last 13 months)
      const archivePropertyMetricsQuery = `
        DELETE FROM property_metrics 
        WHERE metric_date < CURRENT_DATE - INTERVAL '13 months'
      `;
      
      await Database.query(archivePropertyMetricsQuery);

      // Archive old action items (keep completed items for 6 months)
      const archiveActionItemsQuery = `
        DELETE FROM admin_action_items 
        WHERE status IN ('completed', 'dismissed') 
          AND (completed_at < CURRENT_DATE - INTERVAL '6 months' OR dismissed_at < CURRENT_DATE - INTERVAL '6 months')
      `;
      
      await Database.query(archiveActionItemsQuery);

      logger.info('Monthly metrics archive completed');
    } catch (error) {
      logger.error('Monthly metrics archive failed:', error);
    }
  }

  // Cleanup cache
  async cleanupCache() {
    try {
      logger.debug('Cleaning up dashboard cache...');

      // This would integrate with your cache system
      // For now, we'll just log the action
      const Cache = require('../utils/cache');
      
      // Clear dashboard overview cache for all admins
      const adminsQuery = `
        SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL
      `;
      
      const adminsResult = await Database.query(adminsQuery);
      const admins = adminsResult.rows;

      for (const admin of admins) {
        const cacheKey = Cache.generateKey('admin_dashboard', 'overview', { adminId: admin.id });
        await Cache.delete(cacheKey);
      }

      logger.debug(`Cache cleanup completed for ${admins.length} admins`);
    } catch (error) {
      logger.error('Cache cleanup failed:', error);
    }
  }

  // Log cron execution
  async logCronExecution(jobName, details) {
    try {
      const query = `
        INSERT INTO cron_execution_logs (
          job_name, execution_date, success, duration, details
        ) VALUES ($1, NOW(), $2, $3, $4)
      `;

      await Database.query(query, [
        jobName,
        details.success,
        details.duration,
        JSON.stringify(details)
      ]);
    } catch (error) {
      logger.error('Failed to log cron execution:', error);
    }
  }

  // Manual trigger for testing
  async triggerJob(jobName) {
    switch (jobName) {
      case 'daily_metrics':
        await this.calculateDailyMetrics();
        break;
      case 'realtime_metrics':
        await this.updateRealTimeMetrics();
        break;
      case 'action_items':
        await this.generateActionItems();
        break;
      case 'weekly_report':
        await this.generateWeeklyReport();
        break;
      case 'archive':
        await this.archiveMonthlyMetrics();
        break;
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

let adminDashboardCron = null;
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_CRON !== 'true') {
  adminDashboardCron = new AdminDashboardCron();
}

module.exports = adminDashboardCron;
