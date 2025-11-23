const Database = require('../utils/database');

class Dispute {
  static async create(disputeData) {
    const { tenantId, chargeId, reason, status, createdBy } = disputeData;

    // Validate dispute data
    if (!tenantId || !reason) {
      throw new Error('Tenant ID and reason are required');
    }

    const query = `
      INSERT INTO disputes (tenant_id, charge_id, reason, status, created_at, created_by)
      VALUES ($1, $2, $3, $4, NOW(), $5)
      RETURNING *
    `;

    const values = [tenantId, chargeId, reason, status || 'pending', createdBy];

    const result = await Database.query(query, values);

    return result.rows[0];
  }

  static async getByTenantId(tenantId, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    const query = `
      SELECT d.*,
             c.description as charge_description,
             c.amount as charge_amount,
             c.date as charge_date,
             CASE
               WHEN d.status = 'pending' THEN 'Pending Review'
               WHEN d.status = 'approved' THEN 'Approved'
               WHEN d.status = 'rejected' THEN 'Rejected'
               ELSE d.status
             END as status_display
      FROM disputes d
      LEFT JOIN transactions c ON d.charge_id = c.id
      WHERE d.tenant_id = $1
      ORDER BY d.created_at DESC
      LIMIT 10
    `;

    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  static async resolve(disputeId, resolution, resolvedBy) {
    const query = `
      UPDATE disputes
      SET status = $2, resolution = $3, resolved_at = NOW(), resolved_by = $4
      WHERE id = $1
      RETURNING *
    `;

    const result = await Database.query(query, [disputeId, resolution.status, resolution.message, resolvedBy]);
    return result.rows[0];
  }

  static async getAllPending(user) {
    let query;
    let values = [];

    if (user.role === 'super_admin') {
      query = `
        SELECT d.*, t.name as tenant_name, p.name as property_name, t.email as tenant_email
        FROM disputes d
        JOIN tenants t ON d.tenant_id = t.id
        JOIN properties p ON t.property_id = p.id
        WHERE d.status = 'pending'
        ORDER BY d.created_at DESC
      `;
    } else if (user.role === 'admin') {
      query = `
        SELECT d.*, t.name as tenant_name, p.name as property_name, t.email as tenant_email
        FROM disputes d
        JOIN tenants t ON d.tenant_id = t.id
        JOIN properties p ON t.property_id = p.id
        WHERE d.status = 'pending' AND p.admin_id = $1
        ORDER BY d.created_at DESC
      `;
      values = [user.id];
    }

    const result = await Database.query(query, values);
    return result.rows;
  }
}

module.exports = Dispute;
