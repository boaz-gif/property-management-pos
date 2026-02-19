const Database = require('../utils/database');
const { PROPERTY_STATUS } = require('../utils/constants');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');

class Property extends BaseSoftDeleteModel {
  constructor() {
    super('properties', Database);
  }

  static async findAll(user) {
    const { role, id: userId, properties, property_id } = user;
    
    // Use materialized view for massive performance improvement
    let query = `
      SELECT 
        id, name, address, units, rent, property_status, admin_id, 
        created_at, updated_at, admin_name,
        tenant_count, active_tenants, total_collected, pending_payments,
        maintenance_count, open_maintenance, occupancy_rate, 
        potential_monthly_revenue, has_maintenance_issues
      FROM mv_property_aggregations
    `;
    
    let whereClause = '';
    let params = [];
    
    // Role-based filtering
    if (role === 'admin') {
      if (Array.isArray(properties) && properties.length > 0) {
        whereClause = ' WHERE id = ANY($1)';
        params = [properties];
      } else {
        whereClause = ' WHERE admin_id = $1';
        params = [userId];
      }
    } else if (role === 'tenant' && property_id) {
      whereClause = ' WHERE id = $1';
      params = [property_id];
    }
    // Super admin sees all
    
    query += whereClause + ' ORDER BY created_at DESC';
    
    const result = await Database.query(query, params);
    return result.rows;
  }

  static async create(propertyData, adminId) {
    const {
      name,
      address,
      units,
      rent,
      status = PROPERTY_STATUS.ACTIVE,
      admin_id
    } = propertyData;

    const query = `
      INSERT INTO properties (name, address, units, occupied, rent, status, admin_id, created_at, updated_at)
      VALUES ($1, $2, $3, 0, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const values = [name, address, units, rent, status, admin_id || adminId];

    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async findById(id, user) {
    const { role, id: userId, properties, property_id } = user;
    const parsedId = parseInt(id);
    
    const query = `
      SELECT p.*, 
             u.name as admin_name,
             po.occupied,
             po.available,
             po.units,
             COUNT(t.id) as tenant_count,
             COUNT(CASE WHEN t.status = 'active' THEN 1 END) as active_tenants
      FROM properties p
      LEFT JOIN users u ON p.admin_id = u.id AND u.deleted_at IS NULL
      LEFT JOIN tenants t ON p.id = t.property_id AND t.deleted_at IS NULL
      LEFT JOIN property_occupancy po ON p.id = po.id
      WHERE p.id = $1
        AND p.deleted_at IS NULL
        AND (
          $2::text IS NULL
          OR ($2 = 'super_admin')
          OR (
            $2 = 'admin'
            AND (
              p.admin_id = $3
              OR p.id = ANY($4)
            )
          )
          OR ($2 = 'tenant' AND p.id = $5)
        )
      GROUP BY p.id, u.name, po.occupied, po.available, po.units
    `;
    
    const params = [
      parsedId,
      role ?? null,
      role === 'admin' ? userId : null,
      Array.isArray(properties) ? properties : [],
      role === 'tenant' ? property_id : null
    ];
    const result = await Database.query(query, params);
    return result.rows[0] || null;
  }

  static async update(id, propertyData, user) {
    const { role, id: userId, properties } = user;
    if (role === 'admin' && !userId) {
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

    if (propertyData.images !== undefined) {
      updateFields.push(`images = $${paramCount}`);
      values.push(JSON.stringify(propertyData.images));
      paramCount++;
    }
    
    // Always update updated_at
    updateFields.push(`updated_at = NOW()`);
    
    const whereParts = [`id = $${paramCount}`, 'deleted_at IS NULL'];
    values.push(id);
    paramCount += 1;

    if (role === 'admin') {
      if (Array.isArray(properties) && properties.length > 0) {
        whereParts.push(`id = ANY($${paramCount})`);
        values.push(properties);
        paramCount += 1;
      } else {
        whereParts.push(`admin_id = $${paramCount}`);
        values.push(userId);
        paramCount += 1;
      }
    }
    
    if (updateFields.length === 1) { // Only updated_at
      throw new Error('No valid fields to update');
    }
    
    const query = `
      UPDATE properties 
      SET ${updateFields.join(', ')}
      WHERE ${whereParts.join(' AND ')}
      RETURNING *
    `;
      
    const result = await Database.query(query, values);
    return result.rows[0];
  }

  static async delete(id, user) {
    return await this.archive(id, user);
  }

  static async archive(id, user) {
    const { role, properties, id: userId } = user;
    
    // Check access permissions
    if (role === 'admin') {
      if (Array.isArray(properties) && properties.includes(parseInt(id))) {
        // ok
      } else {
        const ownerRes = await Database.query(
          'SELECT 1 FROM properties WHERE id = $1 AND admin_id = $2 AND deleted_at IS NULL LIMIT 1',
          [id, userId]
        );
        if (ownerRes.rows.length === 0) throw new Error('Access denied');
      }
    }
    
    // Check if property has active tenants
    const tenantCheck = await Database.query(
      'SELECT COUNT(*) as count FROM tenants WHERE property_id = $1 AND status = $2 AND deleted_at IS NULL',
      [id, 'active']
    );
    
    if (parseInt(tenantCheck.rows[0].count) > 0) {
      throw new Error('Cannot archive property with active tenants');
    }
    
    const query = `
      UPDATE properties 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
      WHERE id = $2 AND deleted_at IS NULL 
      RETURNING *
    `;
    
    const result = await Database.query(query, [userId, id]);
    return result.rows[0];
  }

  static async restore(id, user) {
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new Error('Only admins can restore archived properties');
    }
    
    const query = `
      UPDATE properties 
      SET deleted_at = NULL, deleted_by = NULL 
      WHERE id = $1
        AND deleted_at IS NOT NULL
        AND (
          $2::text IS NULL
          OR ($2 = 'super_admin')
          OR ($2 = 'admin' AND admin_id = $3)
        )
      RETURNING *
    `;
    
    const result = await Database.query(query, [id, user.role ?? null, user.role === 'admin' ? user.id : null]);
    
    if (result.rows.length === 0) {
      throw new Error('Property not found or not archived');
    }
    
    return result.rows[0];
  }

  static async permanentDelete(id, user) {
    if (user.role !== 'super_admin') {
      throw new Error('Only super admins can permanently delete records');
    }
    
    const query = 'DELETE FROM properties WHERE id = $1 RETURNING *';
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Property not found');
    }
    
    return result.rows[0];
  }

  /* Removed: Managed by DB View
  static async updateOccupancy(propertyId) {
    ...
  }
  */

  static async getStats(user) {
    const { role, id: userId, properties } = user;
    let whereClause = ' WHERE deleted_at IS NULL';
    let params = [];
    
    if (role === 'admin') {
      if (Array.isArray(properties) && properties.length > 0) {
        whereClause += ' AND p.id = ANY($1)';
        params = [properties];
      } else {
        whereClause += ' AND p.admin_id = $1';
        params = [userId];
      }
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_properties,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_properties,
        SUM(po.units) as total_units,
        SUM(po.occupied) as total_occupied,
        ROUND(SUM(po.occupied)::decimal / NULLIF(SUM(po.units), 0) * 100, 2) as occupancy_rate,
        AVG(p.rent) as avg_rent
      FROM properties p
      LEFT JOIN property_occupancy po ON p.id = po.id
      ${whereClause}
    `;
    
    const result = await Database.query(query, params);
    return result.rows[0];
  }

  // Image management methods
  static async addImage(propertyId, imageData) {
    const query = `
      UPDATE properties 
      SET images = images || $1::jsonb,
          updated_at = NOW()
      WHERE id = $2 AND deleted_at IS NULL
      RETURNING *
    `;
    
    const imageJson = JSON.stringify([imageData]);
    const result = await Database.query(query, [imageJson, propertyId]);
    return result.rows[0];
  }

  static async removeImage(propertyId, imageId, userId) {
    // Get current images
    const getQuery = 'SELECT images FROM properties WHERE id = $1 AND deleted_at IS NULL';
    const getResult = await Database.query(getQuery, [propertyId]);
    
    if (!getResult.rows[0]) {
      throw new Error('Property not found');
    }

    const images = getResult.rows[0].images || [];
    const imageToRemove = images.find(img => img.id === imageId);

    if (!imageToRemove) {
      throw new Error('Image not found');
    }

    // Archive the image
    const archiveQuery = `
      INSERT INTO property_images_archive 
      (property_id, image_id, image_url, size, mime_type, uploaded_at, deleted_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await Database.query(archiveQuery, [
      propertyId,
      imageId,
      imageToRemove.url,
      imageToRemove.size,
      imageToRemove.mime_type,
      imageToRemove.uploaded_at,
      userId
    ]);

    // Remove image from array
    const updatedImages = images.filter(img => img.id !== imageId);

    const updateQuery = `
      UPDATE properties 
      SET images = $1::jsonb,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await Database.query(updateQuery, [JSON.stringify(updatedImages), propertyId]);
    return result.rows[0];
  }

  static async getImages(propertyId) {
    const query = 'SELECT images FROM properties WHERE id = $1 AND deleted_at IS NULL';
    const result = await Database.query(query, [propertyId]);
    
    if (!result.rows[0]) {
      throw new Error('Property not found');
    }

    return result.rows[0].images || [];
  }
}

module.exports = Property;
