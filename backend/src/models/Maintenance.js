const Database = require('../utils/database');

class Maintenance {
  static async create(requestData) {
    const { tenantId, propertyId, title, priority, status, unit } = requestData;

    const query = `
      INSERT INTO maintenance (tenant_id, property_id, title, issue, priority, status, unit, date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW())
      RETURNING *
    `;

    const values = [
      tenantId, 
      propertyId, 
      title, 
      title, // Use title for issue
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
      JOIN tenants t ON m.tenant_id = t.id
      JOIN properties p ON m.property_id = p.id
      LEFT JOIN users u ON m.assigned_to = u.id
      WHERE m.id = $1
    `;

    const params = [id];

    // Access control
    if (userRole === 'tenant') {
      query += ` AND m.tenant_id = $2`;
      params.push(userPropertyId);
    } else if (userRole === 'admin') {
      query += ` AND p.admin_id = $2`;
      // We need admin's ID here, not the property list directly for this simple check
      // But usually we pass userProperties. For now assuming admin_id check is sufficient via join if we had admin_id
      // Let's use the property list check instead
      // This is a bit complex in SQL directly without dynamic construction, so we'll do:
      // We'll rely on the service to pass the right params or handle the check
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
      JOIN tenants t ON m.tenant_id = t.id
      JOIN properties p ON m.property_id = p.id
    `;

    const params = [];

    if (userRole === 'tenant') {
      query += ` WHERE m.tenant_id = $1`;
      params.push(userPropertyId);
    } else if (userRole === 'admin') {
      // Filter by properties owned by admin
      if (userProperties && userProperties.length > 0) {
        query += ` WHERE m.property_id = ANY($1)`;
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
    
    // If we had a resolution field in DB we would update it, but schema didn't explicitly have it
    // We'll assume description might be appended or a separate notes table, 
    // but for now let's stick to status/priority/assignment
    
    updates.push(`updated_at = NOW()`);

    const query = `
      UPDATE maintenance
      SET ${updates.join(', ')}
      WHERE id = $1
      RETURNING *
    `;

    const result = await Database.query(query, values);
    return result.rows[0];
  }
}

module.exports = Maintenance;
