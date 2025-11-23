const Database = require('../utils/database');
const { PROPERTY_STATUS } = require('../utils/constants');

class Property {
  static async findAll(userRole, userProperties) {
    let query = `
      SELECT p.*, 
             u.name as admin_name,
             COUNT(t.id) as tenant_count,
             COUNT(CASE WHEN t.status = 'active' THEN 1 END) as active_tenants
      FROM properties p
      LEFT JOIN users u ON p.admin_id = u.id
      LEFT JOIN tenants t ON p.id = t.property_id
    `;
    
    let whereClause = '';
    let params = [];
    
    // Role-based filtering
    if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      whereClause = ' WHERE p.id = ANY($1)';
      params = [userProperties];
    }
    
    query += whereClause + ' GROUP BY p.id, u.name ORDER BY p.created_at DESC';
    
    const result = await Database.query(query, params);
    return result.rows;
  }

  static async findById(id, userRole, userProperties) {
    // Check access permissions
    if (userRole === 'admin' && userProperties && !userProperties.includes(parseInt(id))) {
      throw new Error('Access denied');
    }
    
    const query = `
      SELECT p.*, 
             u.name as admin_name,
             COUNT(t.id) as tenant_count,
             COUNT(CASE WHEN t.status = 'active' THEN 1 END) as active_tenants
      FROM properties p
      LEFT JOIN users u ON p.admin_id = u.id
      LEFT JOIN tenants t ON p.id = t.property_id
      WHERE p.id = $1
      GROUP BY p.id, u.name
    `;
    
    const result = await Database.query(query, [id]);
    return result.rows[0];
  }

  static async create(propertyData, createdBy) {
    const { name, address, units, rent, status = PROPERTY_STATUS.ACTIVE, admin_id } = propertyData;
    
    const query = `
      INSERT INTO properties (name, address, units, occupied, rent, status, admin_id, created_at, updated_at)
      VALUES ($1, $2, $3, 0, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [name, address, units, rent, status, admin_id];
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async update(id, propertyData, userRole, userProperties) {
    // Check access permissions
    if (userRole === 'admin' && userProperties && !userProperties.includes(parseInt(id))) {
      throw new Error('Access denied');
    }
  
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
  
    // Only include fields that are provided
    if (propertyData.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(propertyData.name);
      paramCount++;
    }
  
    if (propertyData.address !== undefined) {
      updateFields.push(`address = $${paramCount}`);
      values.push(propertyData.address);
      paramCount++;
    }
    
    if (propertyData.units !== undefined) {
      updateFields.push(`units = $${paramCount}`);
      values.push(propertyData.units);
      paramCount++;
    }
    
    if (propertyData.rent !== undefined) {
      updateFields.push(`rent = $${paramCount}`);
      values.push(propertyData.rent);
      paramCount++;
    }
    
    if (propertyData.status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(propertyData.status);
      paramCount++;
    }
    
    if (propertyData.admin_id !== undefined) {
      updateFields.push(`admin_id = $${paramCount}`);
      values.push(propertyData.admin_id);
      paramCount++;
    }
    
    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);
    
    // Add WHERE clause parameter
    values.push(id);
    
    if (updateFields.length === 1) { // Only updated_at
      throw new Error('No valid fields to update');
    }
    
    const query = `
      UPDATE properties 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
      
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async delete(id, userRole, userProperties) {
    // Check access permissions
    if (userRole === 'admin' && userProperties && !userProperties.includes(parseInt(id))) {
      throw new Error('Access denied');
    }
    
    // Check if property has tenants
    const tenantCheck = await Database.query(
      'SELECT COUNT(*) as count FROM tenants WHERE property_id = $1 AND status = $2',
      [id, 'active']
    );
    
    if (parseInt(tenantCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete property with active tenants');
    }
    
    const query = 'DELETE FROM properties WHERE id = $1';
    await Database.query(query, [id]);
  }

  static async updateOccupancy(propertyId) {
    const query = `
      UPDATE properties 
      SET occupied = (
        SELECT COUNT(*) 
        FROM tenants 
        WHERE property_id = $1 AND status = 'active'
      ),
      updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const result = await Database.query(query, [propertyId]);
    return result.rows[0];
  }

  static async getStats(userRole, userProperties) {
    let whereClause = '';
    let params = [];
    
    if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      whereClause = ' WHERE id = ANY($1)';
      params = [userProperties];
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_properties,
        SUM(units) as total_units,
        SUM(occupied) as total_occupied,
        ROUND(SUM(occupied)::decimal / NULLIF(SUM(units), 0) * 100, 2) as occupancy_rate,
        AVG(rent) as avg_rent
      FROM properties
      ${whereClause}
    `;
    
    const result = await Database.query(query, params);
    return result.rows[0];
  }
}

module.exports = Property;