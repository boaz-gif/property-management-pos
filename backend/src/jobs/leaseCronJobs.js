const cron = require('node-cron');
const LeaseService = require('../services/leaseService');
const NotificationService = require('../services/notificationService');
const Database = require('../utils/database');
const logger = require('../utils/simpleLogger');

class LeaseCronJobs {
  static initialize() {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_CRON === 'true') {
      return;
    }

    // Run lease expiration check daily at 2:00 AM
    cron.schedule('0 2 * * *', async () => {
      try {
        logger.info('Running daily lease expiration check...');
        await this.checkLeaseExpirations();
      } catch (error) {
        logger.error('Error in lease expiration check:', error);
      }
    });

    // Run configurable reminders daily at 3:00 AM (per-property settings)
    cron.schedule('0 3 * * *', async () => {
      try {
        logger.info('Running configurable lease expiration reminders...');
        await this.sendConfigurableLeaseExpirationReminders();
      } catch (error) {
        logger.error('Error in configurable reminder check:', error);
      }
    });

    // Run expired lease check daily at 4:00 AM
    cron.schedule('0 4 * * *', async () => {
      try {
        logger.info('Running expired lease check...');
        await this.handleExpiredLeases();
      } catch (error) {
        logger.error('Error in expired lease check:', error);
      }
    });

    logger.info('Lease cron jobs initialized successfully');
  }

  /**
   * Check and update lease statuses
   */
  static async checkLeaseExpirations() {
    try {
      const query = `
        UPDATE tenants 
        SET updated_at = NOW()
        WHERE lease_end_date IS NOT NULL
          AND status = 'active'
        RETURNING id, name, email, lease_end_date, lease_status
      `;

      const result = await Database.query(query);
      logger.info(`Updated ${result.rows.length} tenant lease statuses`);

      return result.rows;
    } catch (error) {
      logger.error('Error checking lease expirations:', error);
      throw error;
    }
  }

  /**
   * Send lease expiration reminders
   */
  static async sendLeaseExpirationReminders(daysThreshold = 30) {
    try {
      const expiringLeases = await LeaseService.findExpiringLeases(daysThreshold);

      if (expiringLeases.length === 0) {
        logger.info(`No leases expiring within ${daysThreshold} days`);
        return;
      }

      const reminderType = this.getReminderType(daysThreshold);
      let sentCount = 0;
      let errorCount = 0;

      for (const lease of expiringLeases) {
        try {
          // Check if reminder already sent
          const existingReminder = await Database.query(
            `SELECT id FROM lease_expiration_reminders 
             WHERE tenant_id = $1 AND reminder_type = $2`,
            [lease.id, reminderType]
          );

          if (existingReminder.rows.length > 0) {
            continue; // Skip if reminder already sent
          }

          // Send notification to admin
          if (lease.admin_email) {
            await NotificationService.sendLeaseExpirationNotification({
              tenant_id: lease.id,
              tenant_name: lease.name,
              tenant_email: lease.email,
              property_name: lease.property_name,
              lease_end_date: lease.lease_end_date,
              days_remaining: lease.days_remaining,
              admin_email: lease.admin_email,
              admin_name: lease.admin_name,
              reminder_type: reminderType,
              tenant_user_id: lease.tenant_user_id,
              unit: lease.unit
            });

            // Log reminder in database
            await Database.query(
              `INSERT INTO lease_expiration_reminders 
               (tenant_id, property_id, reminder_type, sent_to_email, sent_at)
               VALUES ($1, $2, $3, $4, NOW())`,
              [lease.id, lease.property_id, reminderType, lease.admin_email]
            );

            sentCount++;
          }
        } catch (error) {
          logger.error(`Error sending reminder for tenant ${lease.id}:`, error);
          errorCount++;
        }
      }

      logger.info(
        `Lease ${daysThreshold}-day reminders sent: ${sentCount} successful, ${errorCount} errors`
      );

      return {
        total: expiringLeases.length,
        sent: sentCount,
        errors: errorCount
      };
    } catch (error) {
      logger.error(`Error in ${daysThreshold}-day reminder job:`, error);
      throw error;
    }
  }

  static async getPropertyLeaseSettingsMap(propertyIds) {
    if (!Array.isArray(propertyIds) || propertyIds.length === 0) return new Map();
    const res = await Database.query(
      `
      SELECT property_id, reminder_days, notify_tenant, notify_admin
      FROM property_lease_settings
      WHERE property_id = ANY($1)
      `,
      [propertyIds]
    );
    const map = new Map();
    for (const row of res.rows) {
      map.set(parseInt(row.property_id, 10), {
        reminder_days: Array.isArray(row.reminder_days) ? row.reminder_days.map((d) => parseInt(d, 10)).filter((d) => Number.isFinite(d) && d > 0) : null,
        notify_tenant: row.notify_tenant !== undefined ? Boolean(row.notify_tenant) : true,
        notify_admin: row.notify_admin !== undefined ? Boolean(row.notify_admin) : true
      });
    }
    return map;
  }

  static async getGlobalMaxReminderDays(defaultValue = 30) {
    const res = await Database.query('SELECT reminder_days FROM property_lease_settings');
    let maxDays = defaultValue;
    for (const row of res.rows) {
      if (!Array.isArray(row.reminder_days)) continue;
      for (const d of row.reminder_days) {
        const parsed = parseInt(d, 10);
        if (Number.isFinite(parsed) && parsed > maxDays) maxDays = parsed;
      }
    }
    return maxDays;
  }

  static async sendConfigurableLeaseExpirationReminders() {
    const maxDays = await this.getGlobalMaxReminderDays(30);
    const expiringLeases = await LeaseService.findExpiringLeases(maxDays);

    if (expiringLeases.length === 0) {
      logger.info(`No leases expiring within ${maxDays} days`);
      return { total: 0, sent: 0, errors: 0 };
    }

    const propertyIds = [...new Set(expiringLeases.map((l) => parseInt(l.property_id, 10)).filter((id) => Number.isFinite(id)))];
    const settingsMap = await this.getPropertyLeaseSettingsMap(propertyIds);

    let sentCount = 0;
    let errorCount = 0;

    for (const lease of expiringLeases) {
      try {
        const propertyId = parseInt(lease.property_id, 10);
        const settings = settingsMap.get(propertyId) || { reminder_days: [30, 14, 7], notify_tenant: true, notify_admin: true };
        const reminderDays = settings.reminder_days && settings.reminder_days.length > 0 ? settings.reminder_days : [30, 14, 7];

        const daysRemaining = parseInt(lease.days_remaining, 10);
        if (!reminderDays.includes(daysRemaining)) continue;

        const reminderType = this.getReminderType(daysRemaining);

        const existingReminder = await Database.query(
          `SELECT id FROM lease_expiration_reminders WHERE tenant_id = $1 AND reminder_type = $2`,
          [lease.id, reminderType]
        );
        if (existingReminder.rows.length > 0) continue;

        const leaseData = {
          tenant_id: lease.id,
          tenant_name: lease.name,
          tenant_email: lease.email,
          property_name: lease.property_name,
          lease_end_date: lease.lease_end_date,
          days_remaining: lease.days_remaining,
          admin_email: settings.notify_admin ? lease.admin_email : null,
          admin_name: lease.admin_name,
          reminder_type: reminderType,
          tenant_user_id: settings.notify_tenant ? lease.tenant_user_id : null,
          unit: lease.unit
        };

        if (!leaseData.admin_email && !leaseData.tenant_user_id) continue;

        await NotificationService.sendLeaseExpirationNotification(leaseData);

        await Database.query(
          `
          INSERT INTO lease_expiration_reminders (tenant_id, property_id, reminder_type, sent_to_email, sent_at)
          VALUES ($1, $2, $3, $4, NOW())
          ON CONFLICT DO NOTHING
          `,
          [lease.id, lease.property_id, reminderType, leaseData.admin_email]
        );

        sentCount++;
      } catch (error) {
        logger.error(`Error sending configurable reminder for tenant ${lease.id}:`, error);
        errorCount++;
      }
    }

    logger.info(`Configurable lease reminders sent: ${sentCount} successful, ${errorCount} errors`);
    return { total: expiringLeases.length, sent: sentCount, errors: errorCount };
  }

  /**
   * Handle expired leases
   */
  static async handleExpiredLeases() {
    try {
      const expiredLeases = await LeaseService.findExpiredLeases();

      if (expiredLeases.length === 0) {
        logger.info('No expired leases found');
        return;
      }

      const propertyIds = [...new Set(expiredLeases.map((l) => parseInt(l.property_id, 10)).filter((id) => Number.isFinite(id)))];
      const settingsMap = await this.getPropertyLeaseSettingsMap(propertyIds);

      let processedCount = 0;
      let errorCount = 0;

      for (const lease of expiredLeases) {
        try {
          // Check if expired notification already sent
          const existingReminder = await Database.query(
            `SELECT id FROM lease_expiration_reminders 
             WHERE tenant_id = $1 AND reminder_type = $2`,
            [lease.id, 'expired']
          );

          if (existingReminder.rows.length === 0) {
            // Send expired notification
            const propertyId = parseInt(lease.property_id, 10);
            const settings = settingsMap.get(propertyId) || { notify_tenant: true, notify_admin: true };

            const leaseData = {
              tenant_id: lease.id,
              tenant_name: lease.name,
              tenant_email: lease.email,
              property_name: lease.property_name,
              lease_end_date: lease.lease_end_date,
              days_expired: lease.days_expired,
              admin_email: settings.notify_admin ? lease.admin_email : null,
              admin_name: lease.admin_name,
              reminder_type: 'expired',
              tenant_user_id: settings.notify_tenant ? lease.tenant_user_id : null,
              unit: lease.unit
            };

            if (leaseData.admin_email || leaseData.tenant_user_id) {
              await NotificationService.sendLeaseExpirationNotification({
                ...leaseData
              });

              // Log reminder in database
              await Database.query(
                `INSERT INTO lease_expiration_reminders 
                 (tenant_id, property_id, reminder_type, sent_to_email, sent_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
                [lease.id, lease.property_id, 'expired', leaseData.admin_email]
              );
            }
          }

          processedCount++;
        } catch (error) {
          logger.error(`Error handling expired lease for tenant ${lease.id}:`, error);
          errorCount++;
        }
      }

      logger.info(
        `Expired lease notifications: ${processedCount} processed, ${errorCount} errors`
      );

      return {
        total: expiredLeases.length,
        processed: processedCount,
        errors: errorCount
      };
    } catch (error) {
      logger.error('Error in expired lease handler:', error);
      throw error;
    }
  }

  /**
   * Get reminder type based on days threshold
   */
  static getReminderType(daysThreshold) {
    switch (daysThreshold) {
      case 30:
        return '30_days';
      case 14:
        return '14_days';
      case 7:
        return '7_days';
      default:
        return `${daysThreshold}_days`;
    }
  }

  /**
   * Manually trigger lease expiration check (for testing or manual runs)
   */
  static async manualLeaseCheck() {
    try {
      logger.info('Manual lease check triggered');

      const expiringLeases = await LeaseService.findExpiringLeases(30);
      const expiredLeases = await LeaseService.findExpiredLeases();
      const stats = await LeaseService.getLeaseStatistics();

      return {
        stats,
        expiring_soon: expiringLeases.length,
        expired: expiredLeases.length,
        leases: {
          expiring_soon: expiringLeases.slice(0, 10),
          expired: expiredLeases.slice(0, 10)
        }
      };
    } catch (error) {
      logger.error('Error in manual lease check:', error);
      throw error;
    }
  }

  /**
   * Get next scheduled run time for lease jobs (for admin dashboard info)
   */
  static getScheduleInfo() {
    return {
      lease_expiration_check: '2:00 AM daily',
      reminders: '3:00 AM daily (per property settings)',
      expired_lease_handler: '4:00 AM daily',
      timezone: 'Server timezone'
    };
  }
}

module.exports = LeaseCronJobs;
