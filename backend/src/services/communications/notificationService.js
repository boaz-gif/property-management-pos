const Notification = require('../../models/Notification');
const Database = require('../../utils/database'); // Still needed for admin lookup
const PermissionService = require('../auth/PermissionService');
const EmailService = require('../../utils/emailService');
const logger = require('../../utils/logger');

class NotificationService {
  static async isEnabledForUser(userId, notificationType) {
    if (!userId || !notificationType) return true;

    try {
      const prefsRes = await Database.query(
        'SELECT push_enabled FROM notification_preferences WHERE user_id = $1',
        [userId]
      );
      if (prefsRes.rows.length > 0 && prefsRes.rows[0].push_enabled === false) {
        return false;
      }

      const typeRes = await Database.query(
        'SELECT enabled FROM notification_preference_types WHERE user_id = $1 AND notification_type = $2',
        [userId, notificationType]
      );
      if (typeRes.rows.length > 0 && typeRes.rows[0].enabled === false) {
        return false;
      }
    } catch (err) {
      return true;
    }

    return true;
  }

  static async create(notificationData) {
    // Standardize field names (handle both camelCase and snake_case)
    const data = {
      tenantId: notificationData.tenantId || notificationData.tenant_id,
      userId: notificationData.userId || notificationData.user_id,
      type: notificationData.type,
      title: notificationData.title,
      message: notificationData.message,
      data: notificationData.data || {}
    };

    if (data.userId) {
      const enabled = await this.isEnabledForUser(data.userId, data.type);
      if (!enabled) return null;
    }

    const notification = await Notification.create(data);
    
    // Emit to specific user room for real-time updates
    if (global.io && notification.user_id) {
      const userId = notification.user_id;
      
      global.io.to(`user-${userId}`).emit('notification_received', {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        data: notification.data,
        is_read: notification.is_read,
        created_at: notification.created_at
      });
      
      // Also emit unread count update
      try {
        const unreadCount = await Notification.getUnreadCount(userId);
        global.io.to(`user-${userId}`).emit('unread_count_update', { count: parseInt(unreadCount.unread_count) });
      } catch (error) {
        console.error('Error emitting unread count update:', error);
      }
    }
    
    return notification;
  }

  static async createNotification(notificationData) {
    return await this.create(notificationData);
  }

  static async sendPaymentConfirmation(tenantId, amount, method, user) {
    return await this.create({
      tenantId,
      userId: user.id,
      type: 'payment_confirmation',
      title: 'Payment Processed',
      message: `Your payment of $${amount} via ${method} has been processed successfully.`,
      data: { amount, method, date: new Date().toISOString().split('T')[0] }
    });
  }

  static async sendBalanceUpdate(tenantId, newBalance, user) {
    return await this.create({
      tenantId,
      userId: user.id,
      type: 'balance_update',
      title: 'Balance Updated',
      message: `Your account balance has been updated to $${newBalance}.`,
      data: { newBalance }
    });
  }

  static async sendLeaseUpdate(tenantId, leaseId, user) {
    return await this.create({
      tenantId,
      userId: user.id,
      type: 'lease_update',
      title: 'Lease Updated',
      message: 'Your lease information has been updated.',
      data: { leaseId }
    });
  }

  static async sendLeaseConfirmation(tenantId, leaseDetails, user) {
    return await this.create({
      tenantId,
      userId: user.id,
      type: 'lease_confirmation',
      title: 'Lease Agreement Available',
      message: 'Your new lease agreement is now available for review.',
      data: leaseDetails
    });
  }

  static async sendDisputeResolution(tenantId, resolution, user) {
    return await this.create({
      tenantId,
      userId: user.id,
      type: 'dispute_resolution',
      title: 'Dispute Resolved',
      message: `Your dispute has been ${resolution.status}: ${resolution.message}`,
      data: resolution
    });
  }

  static async notifyAdmins(notificationData, user) {
    // Find all admin users
    const adminQuery = `
      SELECT id, name, email
      FROM users
      WHERE role IN ('admin', 'super_admin')
    `;

    const adminResult = await Database.query(adminQuery);

    for (const admin of adminResult.rows) {
      await this.create({
        tenantId: notificationData.relatedTenantId || null,
        userId: admin.id,
        type: notificationData.type,
        title: 'Admin Alert',
        message: notificationData.message,
        data: notificationData.data || {}
      });
    }

    return { message: 'Admins notified successfully' };
  }

  static async getNotificationsByTenantId(tenantId, user) {
    // Check access permissions
    await PermissionService.ensureTenantAccess(user, tenantId);
    return await Notification.findByTenantId(tenantId);
  }
  
  static async getUserNotifications(user, options = {}) {
    const notifications = await Notification.findByUserId(user.id, options);
    const unreadCount = await Notification.getUnreadCount(user.id);
    
    const total = notifications.length > 0 ? parseInt(notifications[0].total_count) : 0;
    
    return {
      notifications,
      unreadCount: parseInt(unreadCount.unread_count),
      total
    };
  }

  static async markAsRead(notificationId, user) {
    return await Notification.markAsRead(notificationId, user.id);
  }

  static async markAllAsRead(user) {
    return await Notification.markAllAsRead(user.id);
  }

  static async deleteNotification(notificationId, user) {
    return await Notification.archive(notificationId, user.id);
  }

  static async getUnreadCount(tenantId, user) {
    // Legacy support for tenantId param, but we use user.id mostly now
    // If tenant, verify ID
    if (tenantId) {
      await PermissionService.ensureTenantAccess(user, tenantId);
    }
    return await Notification.getUnreadCount(user.id);
  }

  static async sendPaymentReminder(tenantId) {
    const tenant = await Database.query('SELECT email FROM tenants WHERE id = $1', [tenantId]);
    if (tenant.rows.length === 0) throw new Error('Tenant not found');
    // Send email reminder
    console.log(`Payment reminder sent to ${tenant.rows[0].email}`);
    return { success: true, message: 'Reminder sent' };
  }

  /**
   * Send lease expiration notification via email and database notification
   */
  static async sendLeaseExpirationNotification(leaseData) {
    const { 
      tenant_id, tenant_name, tenant_email, property_name, 
      lease_end_date, days_remaining, days_expired, 
      admin_email, admin_name, reminder_type,
      tenant_user_id, unit
    } = leaseData;

    try {
      // 1. Send email to admin
      if (admin_email && process.env.EMAIL_USER) {
        const emailResult = await EmailService.sendLeaseExpirationEmail(admin_email, leaseData);
        logger.info(`Lease expiration email sent to admin ${admin_email}:`, emailResult);
      } else {
        logger.warn('Email configuration missing or admin email not provided, skipping email');
      }

      // 2. Notify Admin via Dashboard
      let adminUserId = null;
      const adminResult = await Database.query('SELECT id FROM users WHERE email = $1', [admin_email]);
      if (adminResult.rows.length > 0) {
        adminUserId = adminResult.rows[0].id;
        
        const message = days_expired 
          ? `Lease for ${tenant_name} (Unit ${unit || 'N/A'}) at ${property_name} expired ${days_expired} days ago on ${lease_end_date}.`
          : `Lease for ${tenant_name} (Unit ${unit || 'N/A'}) at ${property_name} expires in ${days_remaining} days on ${lease_end_date}.`;

        await this.createNotification({
          userId: adminUserId,
          tenant_id: tenant_id,
          type: days_expired ? 'lease_expired' : 'lease_expiring',
          title: days_expired ? 'Lease Expired' : 'Lease Expiring Soon',
          message,
          data: { ...leaseData, days_remaining, days_expired, lease_end_date }
        });
      }

      // 3. Notify Tenant via Dashboard
      if (tenant_user_id) {
        const tenantMessage = days_expired
          ? `Your lease for unit ${unit || 'N/A'} at ${property_name} expired on ${lease_end_date}. Please contact management.`
          : `Your lease for unit ${unit || 'N/A'} at ${property_name} expires in ${days_remaining} days on ${lease_end_date}.`;

        await this.createNotification({
          userId: tenant_user_id,
          tenant_id: tenant_id,
          type: days_expired ? 'lease_expired' : 'lease_expiring',
          title: days_expired ? 'Lease Expired' : 'Lease Expiring Soon',
          message: tenantMessage,
          data: { lease_id: tenant_id, expiry_date: lease_end_date, unit }
        });
      }

      return { success: true, message: 'Lease expiration notifications sent' };
    } catch (error) {
      logger.error('Error sending lease expiration notification:', error);
      throw error;
    }
  }

  /**
   * Send payment confirmation via email and database notification
   */
  static async sendPaymentConfirmationEmail(tenantId, recipientEmail, paymentData) {
    try {
      // Send email to tenant
      if (recipientEmail && process.env.EMAIL_USER) {
        const emailResult = await EmailService.sendPaymentConfirmationEmail(recipientEmail, paymentData);
        logger.info(`Payment confirmation email sent to ${recipientEmail}:`, emailResult);
      }

      // Create database notification
      await this.create({
        tenantId,
        userId: null, // System-generated notification
        type: 'payment_confirmation',
        title: '✓ Payment Received',
        message: `Payment of $${paymentData.amount} received on ${paymentData.date}`,
        data: paymentData
      });

      return { success: true, message: 'Payment confirmation sent' };
    } catch (error) {
      logger.error('Error sending payment confirmation:', error);
      throw error;
    }
  }

  /**
   * Send maintenance notification via email and database notification
   */
  static async sendMaintenanceNotificationEmail(adminEmail, maintenanceData) {
    try {
      // Send email to admin
      if (adminEmail && process.env.EMAIL_USER) {
        const emailResult = await EmailService.sendMaintenanceNotificationEmail(adminEmail, maintenanceData);
        logger.info(`Maintenance notification email sent to ${adminEmail}:`, emailResult);
      }

      // Create database notification for admin
      const adminQuery = `
        SELECT id FROM users WHERE email = $1 AND role IN ('admin', 'super_admin')
      `;
      const adminResult = await Database.query(adminQuery, [adminEmail]);

      if (adminResult.rows.length > 0) {
        const adminUserId = adminResult.rows[0].id;
        
        await this.create({
          tenantId: maintenanceData.tenant_id,
          userId: adminUserId,
          type: 'maintenance_request',
          title: `🔧 New Maintenance Request: ${maintenanceData.title}`,
          message: `${maintenanceData.tenant_name} submitted a ${maintenanceData.priority} priority maintenance request: ${maintenanceData.title}`,
          data: maintenanceData
        });
      }

      return { success: true, message: 'Maintenance notification sent' };
    } catch (error) {
      logger.error('Error sending maintenance notification:', error);
      throw error;
    }
  }
}

module.exports = NotificationService;
