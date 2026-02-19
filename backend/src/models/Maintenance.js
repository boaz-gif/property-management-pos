const Database = require('../utils/database');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');

class Maintenance extends BaseSoftDeleteModel {
  constructor() {
    super('maintenance', Database);
  }

  static async create(requestData) {
    const { tenantId, propertyId, title, description, priority, status, unit } = requestData;

    const query = `
      INSERT INTO maintenance (tenant_id, property_id, title, issue, priority, status, unit, date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING *
    `;

    const values = [
      tenantId, 
      propertyId, 
      title, 
      description || title, // Use description for issue if provided, else title
      priority || 'medium', 
      status || 'open',
      unit
    ];

    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async findById(id, userRole, userProperties, userPropertyId) {
    let query = `
      SELECT m.*, 
             t.name as tenant_name, 
             t.email as tenant_email,
             p.name as property_name,
             p.address as property_address,
             u.name as assigned_to_name
      FROM maintenance m
      JOIN tenants t ON m.tenant_id = t.id AND t.deleted_at IS NULL
      JOIN properties p ON m.property_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN users u ON m.assigned_to = u.id AND u.deleted_at IS NULL
      WHERE m.id = $1 AND m.deleted_at IS NULL
    `;

    const params = [id];

    // Access control
    if (userRole === 'tenant') {
      query += ` AND m.tenant_id = $2`;
      params.push(userPropertyId);
    }

    const result = await Database.query(query, params);
    
    // Additional security check if needed (e.g. for admin)
    if (result.rows.length > 0) {
        const record = result.rows[0];
        if (userRole === 'admin' && userProperties && !userProperties.includes(record.property_id)) {
            return null; // Access denied
        }
    }

    return result.rows[0];
  }

  static async findByTenantId(tenantId) {
    const query = `
      SELECT m.*,
             CASE
               WHEN m.status = 'open' THEN 'Open'
               WHEN m.status = 'in-progress' THEN 'In Progress'
               WHEN m.status = 'completed' THEN 'Completed'
               ELSE m.status
             END as status_display
      FROM maintenance m
      WHERE m.tenant_id = $1 AND m.deleted_at IS NULL
      ORDER BY m.date DESC
      LIMIT 10
    `;
    
    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  static async findAll(userRole, userProperties, userPropertyId) {
    let query = `
      SELECT m.*, 
             t.name as tenant_name,
             p.name as property_name,
             CASE 
               WHEN m.priority = 'high' THEN 1
               WHEN m.priority = 'medium' THEN 2
               ELSE 3
             END as priority_order
      FROM maintenance m
      JOIN tenants t ON m.tenant_id = t.id AND t.deleted_at IS NULL
      JOIN properties p ON m.property_id = p.id AND p.deleted_at IS NULL
      WHERE m.deleted_at IS NULL
    `;

    const params = [];

    if (userRole === 'tenant') {
      query += ` AND m.tenant_id = $1`;
      params.push(userPropertyId);
    } else if (userRole === 'admin') {
      // Filter by properties owned by admin
      if (userProperties && userProperties.length > 0) {
        query += ` AND m.property_id = ANY($1)`;
        params.push(userProperties);
      } else {
        // Admin with no properties sees nothing
        return [];
      }
    }

    query += ` ORDER BY m.status = 'completed', priority_order, m.created_at DESC`;

    const result = await Database.query(query, params);
    return result.rows;
  }

  static async update(id, updateData) {
    const { status, priority, assignedTo, resolution } = updateData;
    
    const updates = [];
    const values = [id];
    let paramCount = 1;

    if (status) {
      updates.push(`status = $${++paramCount}`);
      values.push(status);
    }

    if (priority) {
      updates.push(`priority = $${++paramCount}`);
      values.push(priority);
    }

    if (assignedTo) {
      updates.push(`assigned_to = $${++paramCount}`);
      values.push(assignedTo);
    }
    
    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE maintenance
      SET ${updates.join(', ')}
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async archive(id, user) {
    const query = `
      UPDATE maintenance 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
      WHERE id = $2 AND deleted_at IS NULL 
      RETURNING *
    `;
    const result = await Database.query(query, [user.id, id]);
    return result.rows[0];
  }

  static async restore(id, user) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Only admins can restore archived maintenance requests');
    }
    
    const query = `
      UPDATE maintenance 
      SET deleted_at = NULL, deleted_by = NULL 
      WHERE id = $1 AND deleted_at IS NOT NULL 
      RETURNING *
    `;
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Maintenance request not found or not archived');
    }
    
    return result.rows[0];
  }

  static async permanentDelete(id, user) {
    if (user.role !== 'super_admin') {
      throw new Error('Only super admins can permanently delete records');
    }
    
    const query = 'DELETE FROM maintenance WHERE id = $1 RETURNING *';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Maintenance request not found');
    }
    
    return result.rows[0];
  }
}

module.exports = Maintenance;
