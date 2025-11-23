const Database = require('../utils/database');

class Lease {
  static async create(leaseData, createdBy) {
    const { tenantId, propertyId, unit, rent, startDate, endDate, status } = leaseData;

    // Validate lease data
    if (!tenantId || !propertyId || !rent || !startDate || !endDate) {
      throw new Error('All lease fields are required');
    }

    if (rent <= 0) {
      throw new Error('Rent must be greater than 0');
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();

    if (start >= end) {
      throw new Error('End date must be after start date');
    }

    if (start < today) {
      throw new Error('Start date cannot be in the past');
    }

    // Generate lease document URL (placeholder for actual implementation)
    const documentUrl = `https://example.com/leases/${tenantId}_${Date.now()}.pdf`;

    const query = `
      INSERT INTO leases (tenant_id, property_id, unit, rent, start_date, end_date, status, document_url, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;

    const values = [tenantId, propertyId, unit, rent, startDate, endDate, status || 'active', documentUrl];
    const result = await Database.query(query, values);

    return result.rows[0];
  }

  static async getLeaseByTenantId(tenantId, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    const query = `
      SELECT l.*,
             p.name as property_name,
             p.address as property_address,
             CASE
               WHEN l.status = 'active' THEN 'Active'
               WHEN l.status = 'expired' THEN 'Expired'
               WHEN l.status = 'terminated' THEN 'Terminated'
               ELSE l.status
             END as status_display
      FROM leases l
      JOIN properties p ON l.property_id = p.id
      WHERE l.tenant_id = $1
      ORDER BY l.created_at DESC
      LIMIT 1
    `;

    const result = await Database.query(query, [tenantId]);
    return result.rows[0];
  }

  static async updateLease(leaseId, leaseData, user) {
    const { endDate, status } = leaseData;

    // Validate permissions
    if (user.role === 'tenant') {
      // Tenants can only terminate their own leases
      const leaseCheck = await Database.query('SELECT tenant_id FROM leases WHERE id = $1', [leaseId]);
      if (leaseCheck.rows.length === 0 || parseInt(leaseCheck.rows[0].tenant_id) !== parseInt(user.property_id)) {
        throw new Error('Access denied');
      }
      if (status && status !== 'terminated') {
        throw new Error('Tenants can only terminate their leases');
      }
    }

    const updates = [];
    const values = [leaseId];
    let paramCount = 1;

    if (endDate) {
      updates.push(`end_date = $${++paramCount}`);
      values.push(endDate);
    }

    if (status) {
      updates.push(`status = $${++paramCount}`);
      values.push(status);
    }

    updates.push('updated_at = NOW()');

    const query = `
      UPDATE leases
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async generateLeaseDocument(leaseData) {
    // In a real implementation, this would generate a PDF document
    // For now, return a placeholder
    const documentUrl = `https://example.com/leases/${leaseData.tenantId}_${Date.now()}.pdf`;

    return {
      url: documentUrl,
      documentId: `lease_${leaseData.tenantId}_${Date.now()}`,
      type: 'lease_agreement',
      generated_at: new Date().toISOString()
    };
  }

  static async getLeasesByProperty(propertyId, user) {
    if (user.role === 'admin') {
      const propertyCheck = await Database.query('SELECT id FROM properties WHERE id = $1 AND admin_id = $2', [propertyId, user.id]);
      if (propertyCheck.rows.length === 0) {
        throw new Error('Access denied');
      }
    }

    const query = `
      SELECT l.*, t.name as tenant_name, t.email as tenant_email,
             CASE
               WHEN l.status = 'active' THEN 'Active'
               WHEN l.status = 'expired' THEN 'Expired'
               WHEN l.status = 'terminated' THEN 'Terminated'
               ELSE l.status
             END as status_display
      FROM leases l
      JOIN tenants t ON l.tenant_id = t.id
      WHERE l.property_id = $1
      ORDER BY l.end_date ASC
    `;

    const result = await Database.query(query, [propertyId]);
    return result.rows;
  }
}

module.exports = Lease;
