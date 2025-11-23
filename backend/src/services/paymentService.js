const Payment = require('../models/Payment');
const Tenant = require('../models/Tenant');
const Database = require('../utils/database');
const NotificationService = require('./notificationService');
const TenantService = require('./tenantService');

class PaymentService {
  static async getAllPayments(user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    let query = `
      SELECT p.*, t.name as tenant_name, t.email as tenant_email, pr.name as property_name
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN properties pr ON t.property_id = pr.id
    `;
    
    const params = [];
    
    if (role === 'tenant') {
      query += ` WHERE p.tenant_id = $1`;
      params.push(userPropertyId);
    } else if (role === 'admin') {
      query += ` WHERE pr.admin_id = $1`;
      params.push(user.id);
    }
    
    query += ` ORDER BY p.date DESC, p.created_at DESC`;
    
    const result = await Database.query(query, params);
    return result.rows;
  }

  static async getPaymentById(id, user) {
    const payment = await Payment.getById(id, user);
    return payment;
  }

  static async createPayment(paymentData, user) {
    const { tenantId, amount, method, type } = paymentData;
    
    // Use TenantService to process payment as it handles balance updates and notifications
    // This ensures DRY principle and consistency
    return await TenantService.processPayment(tenantId, amount, method, type, user);
  }

  static async updatePaymentStatus(id, status, user) {
    // Only admins can update payment status
    if (user.role === 'tenant') {
      throw new Error('Access denied');
    }
    
    const payment = await Payment.getById(id, user);
    
    if (!payment) {
      throw new Error('Payment not found');
    }
    
    // If status changes from pending to completed, we might need to update balance
    // This logic can be complex depending on if the balance was already updated tentatively
    // For now, we'll assume simple status update
    
    const updatedPayment = await Payment.updateStatus(id, status, user.id);
    
    return updatedPayment;
  }
  
  static async getPaymentStats(user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    let whereClause = '';
    const params = [];
    
    if (role === 'tenant') {
      whereClause = 'WHERE p.tenant_id = $1';
      params.push(userPropertyId);
    } else if (role === 'admin') {
      whereClause = 'WHERE pr.admin_id = $1';
      params.push(user.id);
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as total_revenue,
        AVG(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END) as avg_payment,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_count
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN properties pr ON t.property_id = pr.id
      ${whereClause}
    `;
    
    const result = await Database.query(query, params);
    return result.rows[0];
  }
}

module.exports = PaymentService;
