const Database = require('../utils/database');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');

class Payment extends BaseSoftDeleteModel {
  constructor() {
    super('payments', Database);
  }

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
      WHERE id = $1 AND deleted_at IS NULL
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
      WHERE pm.tenant_id = $1 AND pm.deleted_at IS NULL
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
      JOIN tenants t ON pm.tenant_id = t.id AND t.deleted_at IS NULL
      WHERE pm.id = $1 AND pm.deleted_at IS NULL
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

  static async archive(id, user) {
    const query = `
      UPDATE payments 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
      WHERE id = $2 AND deleted_at IS NULL 
      RETURNING *
    `;
    const result = await Database.query(query, [user.id, id]);
    return result.rows[0];
  }

  static async restore(id, user) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Only admins can restore archived payments');
    }
    
    const query = `
      UPDATE payments 
      SET deleted_at = NULL, deleted_by = NULL 
      WHERE id = $1 AND deleted_at IS NOT NULL 
      RETURNING *
    `;
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Payment not found or not archived');
    }
    
    return result.rows[0];
  }

  static async permanentDelete(id, user) {
    if (user.role !== 'super_admin') {
      throw new Error('Only super admins can permanently delete records');
    }
    
    const query = 'DELETE FROM payments WHERE id = $1 RETURNING *';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Payment not found');
    }
    
    return result.rows[0];
  }

  static async findAll(user) {
    const { role, properties, id: userId, email: userEmail, property_id: userPropertyId } = user;
    
    let query = `
      SELECT p.*, t.name as tenant_name, t.email as tenant_email, pr.name as property_name
      FROM payments p
      JOIN tenants t ON p.tenant_id = t.id
      JOIN properties pr ON t.property_id = pr.id
      WHERE p.deleted_at IS NULL
    `;
    
    const params = [];
    let paramCount = 1;
    
    if (role === 'tenant') {
      query += ` AND p.tenant_id = $${paramCount++}`;
      params.push(userPropertyId); // userPropertyId stores tenant record ID for tenants
    } else if (role === 'admin' && properties && properties.length > 0) {
      query += ` AND t.property_id = ANY($${paramCount++})`;
      params.push(properties);
    }
    
    query += ` ORDER BY p.date DESC, p.created_at DESC`;
    
    const result = await Database.query(query, params);
    return result.rows;
  }

  static async getStats(user) {
    const { role, properties, property_id: userPropertyId } = user;
    
    let whereClause = 'WHERE p.deleted_at IS NULL';
    const params = [];
    let paramCount = 1;
    
    if (role === 'tenant') {
      whereClause += ` AND p.tenant_id = $${paramCount++}`;
      params.push(userPropertyId);
    } else if (role === 'admin' && properties && properties.length > 0) {
      whereClause += ` AND t.property_id = ANY($${paramCount++})`;
      params.push(properties);
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

module.exports = Payment;
