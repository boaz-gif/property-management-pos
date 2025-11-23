const Database = require('../utils/database');

class Payment {
  static async create(paymentData) {
    const { tenantId, amount, method, type, status, createdBy } = paymentData;

    // Validate payment data
    if (!tenantId || !amount || !method || !type) {
      throw new Error('All payment fields are required');
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than 0');
    }

    const validMethods = ['card', 'bank', 'check', 'cash'];
    if (!validMethods.includes(method)) {
      throw new Error(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
    }

    const query = `
      INSERT INTO payments (tenant_id, amount, date, type, method, status, created_at, updated_at)
      VALUES ($1, $2, CURRENT_DATE, $3, $4, $5, NOW(), NOW())
      RETURNING *
    `;

    const values = [tenantId, amount, type || 'rent', method, status || 'completed'];
    const result = await Database.query(query, values);

    return result.rows[0];
  }

  static async updateStatus(paymentId, status, updatedBy) {
    const validStatuses = ['pending', 'completed', 'failed', 'refunded'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid payment status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const query = `
      UPDATE payments
      SET status = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    const result = await Database.query(query, [paymentId, status]);
    return result.rows[0];
  }

  static async getPaymentHistory(tenantId, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    const query = `
      SELECT pm.*,
             CASE
               WHEN pm.status = 'completed' THEN 'Paid'
               WHEN pm.status = 'pending' THEN 'Pending'
               WHEN pm.status = 'failed' THEN 'Failed'
               WHEN pm.status = 'refunded' THEN 'Refunded'
               ELSE pm.status
             END as status_display
      FROM payments pm
      WHERE pm.tenant_id = $1
      ORDER BY pm.date DESC, pm.created_at DESC
      LIMIT 20
    `;

    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  static async getById(paymentId, user) {
    const query = `
      SELECT pm.*, t.name as tenant_name
      FROM payments pm
      JOIN tenants t ON pm.tenant_id = t.id
      WHERE pm.id = $1
    `;

    const result = await Database.query(query, [paymentId]);

    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }

    const payment = result.rows[0];

    // Check access permissions
    if (user.role === 'tenant' && parseInt(payment.tenant_id) !== parseInt(user.property_id)) {
      throw new Error('Access denied');
    }

    return payment;
  }
}

module.exports = Payment;
