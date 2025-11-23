const Notification = require('../models/Notification');
const Database = require('../utils/database'); // Still needed for admin lookup

class NotificationService {
  static async create(notificationData) {
    return await Notification.create(notificationData);
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
    if (user.role === 'tenant' && parseInt(tenantId) !== parseInt(user.property_id)) {
      throw new Error('Access denied');
    }
    return await Notification.findByTenantId(tenantId);
  }
  
  static async getUserNotifications(user) {
    return await Notification.findByUserId(user.id);
  }

  static async markAsRead(notificationId, user) {
    return await Notification.markAsRead(notificationId, user.id);
  }

  static async getUnreadCount(tenantId, user) {
    // Legacy support for tenantId param, but we use user.id mostly now
    // If tenant, verify ID
    if (user.role === 'tenant' && tenantId && parseInt(tenantId) !== parseInt(user.property_id)) {
      throw new Error('Access denied');
    }
    return await Notification.getUnreadCount(user.id);
  }
}

module.exports = NotificationService;