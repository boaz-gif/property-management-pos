
const cron = require('node-cron');
const TenantPaymentService = require('../services/tenantPaymentService');
const NotificationService = require('../services/notificationService');
const Database = require('../utils/database');
const logger = require('../utils/logger');

class TenantPaymentCron {
  constructor() {
    this.setupJobs();
  }

  setupJobs() {
    // Daily at 12:00 AM: Process AutoPay and Reminders
    cron.schedule('0 0 * * *', async () => {
      logger.info('Running daily tenant payment jobs (AutoPay, Reminders)...');
      await this.processAutoPays();
      await this.sendPaymentReminders();
      await this.generateMissingReceipts();
      await this.refreshTenantHomeSummary();
    });

    // Daily at 6:00 AM: Confirmations
    cron.schedule('0 6 * * *', async () => {
      logger.info('Running daily tenant confirmation jobs...');
      // Logic for "Payment received" confirmations if delayed, usually done real-time.
      // But maybe for batched processing or bank transfers clearing.
      // For now, placeholders.
    });

    // Monthly on 1st: Statements
    cron.schedule('0 0 1 * *', async () => {
      logger.info('Running monthly tenant statement generation...');
      await this.generateMonthlyStatements();
    });
    
    console.log('Tenant Payment cron jobs scheduled successfully');
  }

  async processAutoPays() {
    try {
        const today = new Date();
        const query = `
            SELECT * FROM tenant_autopay 
            WHERE is_enabled = TRUE 
            AND next_execution_date <= CURRENT_DATE
        `;
        const result = await Database.query(query);
        const autoPays = result.rows;

        for (const ap of autoPays) {
            try {
                // Get tenant rent/balance
                const status = await TenantPaymentService.getRentStatus(ap.tenant_id);
                let amount = 0;
                
                if (ap.amount_type === 'full_balance') {
                    amount = status.breakdown.total_due;
                } else if (ap.amount_type === 'rent_only') {
                    amount = status.breakdown.base_rent;
                } else {
                    amount = parseFloat(ap.fixed_amount);
                }

                if (amount > 0) {
                    await TenantPaymentService.processPayment(ap.tenant_id, amount, ap.payment_method_id, { role: 'system' });
                    
                    // Update next execution date (add 1 month)
                    // Simplified logic
                    const nextDate = new Date(ap.next_execution_date);
                    nextDate.setMonth(nextDate.getMonth() + 1);
                    
                    await Database.query(`
                        UPDATE tenant_autopay 
                        SET next_execution_date = $1, last_executed_at = NOW(), consecutive_failures = 0, updated_at = NOW()
                        WHERE id = $2
                    `, [nextDate, ap.id]);
                }
            } catch (err) {
                logger.error(`AutoPay failed for tenant ${ap.tenant_id}:`, err);
                // Increment failure count
                await Database.query(`
                    UPDATE tenant_autopay 
                    SET consecutive_failures = consecutive_failures + 1, updated_at = NOW()
                    WHERE id = $1
                `, [ap.id]);
                
                // Notify tenant
                await NotificationService.createNotification({
                    tenant_id: ap.tenant_id,
                    title: 'Auto-Pay Failed',
                    message: `Your automatic payment failed. Please check your payment method or pay manually. Error: ${err.message}`,
                    type: 'payment_failed',
                    priority: 'high'
                });
            }
        }
    } catch (err) {
        logger.error('Error in processAutoPays:', err);
    }
  }

  async sendPaymentReminders() {
      try {
        const now = new Date();
        const dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntilDue > 3) return;

        const result = await Database.query(
          `
          SELECT t.id AS tenant_id, t.user_id, t.balance
          FROM tenants t
          LEFT JOIN tenant_preferences tp ON tp.tenant_id = t.id
          WHERE t.deleted_at IS NULL
            AND t.balance > 0
            AND COALESCE(tp.payment_reminders, TRUE) = TRUE
            AND t.user_id IS NOT NULL
          `
        );

        for (const row of result.rows) {
          await NotificationService.createNotification({
            tenant_id: row.tenant_id,
            user_id: row.user_id,
            title: 'Rent Due Soon',
            message: `Your balance of $${parseFloat(row.balance).toFixed(2)} is due on ${dueDate.toLocaleDateString()}.`,
            type: 'payment_reminder',
            priority: 'normal',
            action_label: 'Pay Now',
            action_url: '/tenant/payments/pay'
          });
        }
      } catch (err) {
        logger.error('Error in sendPaymentReminders:', err);
      }
  }

  async generateMissingReceipts() {
      // Find completed payments without receipts
      const query = `
        SELECT p.* FROM payments p 
        LEFT JOIN payment_receipts pr ON p.id = pr.payment_id
        WHERE p.status = 'completed' AND pr.id IS NULL AND p.deleted_at IS NULL
      `;
      const result = await Database.query(query);
      for (const payment of result.rows) {
          try {
             await TenantPaymentService.generateReceipt(payment.id, payment.tenant_id, { role: 'system' });
          } catch (err) {
              logger.error(`Failed to generate missing receipt for payment ${payment.id}`, err);
          }
      }
  }

  async generateMonthlyStatements() {
      await this.refreshTenantHomeSummary();
  }

  async refreshTenantHomeSummary() {
    try {
      if (process.env.NODE_ENV === 'test') return;
      await Database.query('REFRESH MATERIALIZED VIEW CONCURRENTLY tenant_home_summary');
    } catch (err) {
      try {
        if (process.env.NODE_ENV === 'test') return;
        await Database.query('REFRESH MATERIALIZED VIEW tenant_home_summary');
      } catch (fallbackErr) {
        logger.error('Failed to refresh tenant_home_summary:', fallbackErr);
      }
    }
  }
}

let tenantPaymentCron = null;
if (process.env.NODE_ENV !== 'test' && process.env.DISABLE_CRON !== 'true') {
  tenantPaymentCron = new TenantPaymentCron();
}

module.exports = tenantPaymentCron;
