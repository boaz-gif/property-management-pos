const Database = require('../utils/database');
const { TENANT_STATUS } = require('../utils/constants');
const BaseSoftDeleteModel = require('./BaseSoftDeleteModel');
const Pagination = require('../utils/pagination');
const Cache = require('../utils/cache');
const Unit = require('./Unit');

class Tenant extends BaseSoftDeleteModel {
  constructor() {
    super('tenants', Database);
  }

  static async findAll(user, paginationOptions = {}) {
    const { role, id: userId } = user;
    
    // Parse pagination parameters
    const pagination = Pagination.parseQuery(paginationOptions, {
      defaultLimit: 20,
      maxLimit: 100
    });
    
    // Generate cache key
    const cacheKey = Cache.generateKey('tenant', 'findAll', {
      role,
      userId,
      page: pagination.page,
      limit: pagination.limit,
      sort: pagination.sort,
      order: pagination.order
    });
    
    // Use cache wrapper
    return await Cache.cacheQuery(cacheKey, async () => {
      // Use materialized view for massive performance improvement
      let query = `
        SELECT 
          id, property_id, name, email, unit, tenant_status, rent, balance, 
          created_at, updated_at, property_name, property_address, admin_id as property_admin_id,
          payment_count, completed_payments, total_paid, total_pending,
          maintenance_count, open_maintenance, payment_status, 
          occupancy_percentage, has_maintenance_issues
        FROM mv_tenant_aggregations
      `;
      
      let whereClause = '';
      let params = [];
      let paramIndex = 1;
      
      if (role === 'tenant') {
        whereClause = ` WHERE user_id = $${paramIndex}`;
        params = [userId];
        paramIndex++;
      } else if (role === 'admin') {
        whereClause = ` WHERE property_admin_id = $${paramIndex}`;
        params = [userId];
        paramIndex++;
      }
      
      query += whereClause + Pagination.buildOrderBy(pagination, 'created_at');
      
      // Add pagination with correct parameter indexing
      if (pagination.offset !== null) {
        query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params = [...params, pagination.limit, pagination.offset];
      } else {
        query += ` LIMIT $${paramIndex}`;
        params = [...params, pagination.limit];
      }
      
      const result = await Database.query(query, params);
      
      // Get admin names separately to avoid joins in main query
      if (result.rows.length > 0) {
        const adminIds = [...new Set(result.rows.map(row => row.property_admin_id).filter(id => id))];
        
        if (adminIds.length > 0) {
          const adminQuery = `
            SELECT id, name 
            FROM users 
            WHERE id = ANY($1) AND deleted_at IS NULL
          `;
          const adminResult = await Database.query(adminQuery, [adminIds]);
          const adminMap = new Map(adminResult.rows.map(admin => [admin.id, admin.name]));
          
          // Add admin names to results
          result.rows.forEach(row => {
            row.property_admin = adminMap.get(row.property_admin_id) || null;
          });
        }
      }
      
      return result.rows;
    }, 1800); // Cache for 30 minutes
  }

  static async findById(id, user) {
    const { role, id: userId } = user;
    
    if (role === 'tenant') {
      const ownerCheck = await Database.query(
        'SELECT user_id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
        [id]
      );
      if (ownerCheck.rows.length === 0 || ownerCheck.rows[0].user_id !== userId) {
        throw new Error('Access denied');
      }
    } else if (role === 'admin') {
      const ownerCheck = await Database.query(
        `
        SELECT 1
        FROM tenants t
        JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
        WHERE t.id = $1 AND t.deleted_at IS NULL AND p.admin_id = $2
        LIMIT 1
        `,
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) throw new Error('Access denied');
    }
    
    // Use materialized view for performance
    const query = `
      SELECT 
        id, property_id, name, email, unit, tenant_status, rent, balance, 
        created_at, updated_at, property_name, property_address, admin_id as property_admin_id,
        payment_count, completed_payments, total_paid, total_pending,
        maintenance_count, open_maintenance, payment_status, 
        occupancy_percentage, has_maintenance_issues
      FROM mv_tenant_aggregations
      WHERE id = $1
    `;
    
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const tenant = result.rows[0];
    
    // Get admin name
    if (tenant.property_admin_id) {
      const adminQuery = `
        SELECT name 
        FROM users 
        WHERE id = $1 AND deleted_at IS NULL
      `;
      const adminResult = await Database.query(adminQuery, [tenant.property_admin_id]);
      tenant.property_admin = adminResult.rows[0]?.name || null;
    }
    
    return tenant;
  }

  static async findByUserId(userId) {
    const query = `
      SELECT t.*, 
             p.name as property_name,
             p.address as property_address,
             u.name as property_admin,
             COUNT(pm.id) as payment_count,
             COUNT(CASE WHEN pm.status = 'completed' THEN 1 END) as completed_payments,
             COALESCE(SUM(CASE WHEN pm.status = 'completed' THEN pm.amount ELSE 0 END), 0) as total_paid,
             COALESCE(SUM(CASE WHEN pm.status = 'pending' THEN pm.amount ELSE 0 END), 0) as total_pending,
             COUNT(m.id) as maintenance_count,
             COUNT(CASE WHEN m.status = 'open' THEN 1 END) as open_maintenance
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN users u ON p.admin_id = u.id AND u.deleted_at IS NULL
      LEFT JOIN payments pm ON t.id = pm.tenant_id AND pm.deleted_at IS NULL
      LEFT JOIN maintenance m ON t.id = m.tenant_id AND m.deleted_at IS NULL
      WHERE t.user_id = $1
      AND t.status = 'active'
      AND t.deleted_at IS NULL
      GROUP BY t.id, p.name, p.address, u.name
    `;
    
    const result = await Database.query(query, [userId]);
    return result.rows[0];
  }

  static async findByEmail(email) {
    const query = `
      SELECT t.*, 
             p.name as property_name,
             p.address as property_address,
             u.name as property_admin,
             COUNT(pm.id) as payment_count,
             COUNT(CASE WHEN pm.status = 'completed' THEN 1 END) as completed_payments,
             COALESCE(SUM(CASE WHEN pm.status = 'completed' THEN pm.amount ELSE 0 END), 0) as total_paid,
             COALESCE(SUM(CASE WHEN pm.status = 'pending' THEN pm.amount ELSE 0 END), 0) as total_pending,
             COUNT(m.id) as maintenance_count,
             COUNT(CASE WHEN m.status = 'open' THEN 1 END) as open_maintenance
      FROM tenants t
      LEFT JOIN properties p ON t.property_id = p.id AND p.deleted_at IS NULL
      LEFT JOIN users u ON p.admin_id = u.id AND u.deleted_at IS NULL
      LEFT JOIN payments pm ON t.id = pm.tenant_id AND pm.deleted_at IS NULL
      LEFT JOIN maintenance m ON t.id = m.tenant_id AND m.deleted_at IS NULL
      WHERE t.email = $1
      AND t.status = 'active'
      AND t.deleted_at IS NULL
      GROUP BY t.id, p.name, p.address, u.name
    `;
    
    const result = await Database.query(query, [email]);
    return result.rows[0];
  }

  static async create(tenantData, createdBy) {
    const { name, email, property_id, unit, rent, move_in, status = TENANT_STATUS.ACTIVE, admin_id, lease_start_date, lease_end_date } = tenantData;

    const normalizedUnit = unit !== undefined && unit !== null ? String(unit).trim() : '';
    if (!normalizedUnit) {
      throw new Error('unit is required');
    }

    let resolvedUnitId = tenantData.unit_id ?? tenantData.unitId ?? null;
    let resolvedUnitNumber = normalizedUnit;

    if (resolvedUnitId) {
      const unitRes = await Database.query(
        'SELECT id, property_id, unit_number FROM units WHERE id = $1 AND deleted_at IS NULL',
        [resolvedUnitId]
      );
      if (unitRes.rows.length === 0) throw new Error('Unit not found');
      if (parseInt(unitRes.rows[0].property_id) !== parseInt(property_id)) {
        throw new Error('Unit does not belong to this property');
      }
      resolvedUnitNumber = String(unitRes.rows[0].unit_number);
    } else {
      const existingUnit = await Unit.findByPropertyAndNumber(property_id, resolvedUnitNumber);
      if (existingUnit) {
        resolvedUnitId = existingUnit.id;
      } else {
        const createdUnit = await Unit.create(property_id, { unit_number: resolvedUnitNumber }, createdBy);
        resolvedUnitId = createdUnit.id;
      }
    }
    
    const unitCheck = await Database.query(
      'SELECT id FROM tenants WHERE property_id = $1 AND unit = $2 AND status = $3 AND deleted_at IS NULL',
      [property_id, resolvedUnitNumber, TENANT_STATUS.ACTIVE]
    );
    
    if (unitCheck.rows.length > 0) {
      throw new Error(`Unit ${resolvedUnitNumber} is already occupied in this property`);
    }
    
    const emailCheck = await Database.query(
      'SELECT id FROM tenants WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      throw new Error('A tenant with this email already exists');
    }
    
    const formattedMoveInDate = move_in ? this.formatDateForDatabase(move_in) : null;
    const formattedLeaseStartDate = lease_start_date ? this.formatDateForDatabase(lease_start_date) : formattedMoveInDate;
    const formattedLeaseEndDate = lease_end_date ? this.formatDateForDatabase(lease_end_date) : null;
    
    const query = `
      INSERT INTO tenants (name, email, property_id, unit, unit_id, rent, balance, move_in, status, user_id, lease_start_date, lease_end_date, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      name,
      email,
      property_id,
      resolvedUnitNumber,
      resolvedUnitId,
      rent,
      formattedMoveInDate,
      status,
      createdBy,
      formattedLeaseStartDate,
      formattedLeaseEndDate
    ];
    const result = await Database.query(query, values);
    
    // Invalidate cache for this tenant and property
    await Cache.invalidateTenant(result.rows[0].id);
    await Cache.invalidateProperty(property_id);
    await Cache.invalidateMaterializedViews();
    
    // DB trigger handles occupancy update
    // await this.updatePropertyOccupancy(property_id);
    
    return result.rows[0];
  }
  
  static formatDateForDatabase(dateStr) {
    if (!dateStr) return null;
    
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    const date = this.parseDate(dateStr);
    
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  static parseDate(dateStr) {
    if (!dateStr) return new Date(NaN);
    
    dateStr = dateStr.trim();
  
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date(NaN) : date;
    }
  
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
    
      if (parts.length !== 3) {
        return new Date(NaN);
      }
    
      const monthStr = parts[0];
      const dayStr = parts[1];
      const yearStr = parts[2];
    
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);
    
      if (isNaN(year) || year < 1900 || year > 2100) {
        return new Date(NaN);
      }
    
      if (isNaN(month) || month < 1 || month > 12) {
        return new Date(NaN);
      }
    
      if (isNaN(day) || day < 1 || day > 31) {
        return new Date(NaN);
      }
    
      const date = new Date(year, month - 1, day);
    
      if (date.getMonth() !== month - 1 || date.getDate() !== day) {
        return new Date(NaN);
      }
    
      return date;
    }
  
    const parsedDate = new Date(dateStr);
  
    if (isNaN(parsedDate.getTime())) {
      return new Date(NaN);
    }
  
    return parsedDate;
  }

  static async update(id, tenantData, user) {
    const { role, id: userId } = user;

    if (role === 'tenant') {
      const ownerCheck = await Database.query(
        'SELECT 1 FROM tenants WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1',
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) throw new Error('Access denied');
    } else if (role === 'admin') {
      const ownerCheck = await Database.query(
        `
        SELECT 1
        FROM tenants t
        JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
        WHERE t.id = $1 AND t.deleted_at IS NULL AND p.admin_id = $2
        LIMIT 1
        `,
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) throw new Error('Access denied');
    }
    
    const currentTenant = await Database.query('SELECT * FROM tenants WHERE id = $1 AND deleted_at IS NULL', [id]);
    if (currentTenant.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const current = currentTenant.rows[0];

    const nextPropertyId = tenantData.property_id !== undefined ? tenantData.property_id : current.property_id;

    let resolvedNextUnitId = tenantData.unit_id ?? tenantData.unitId ?? undefined;
    let resolvedNextUnitNumber =
      tenantData.unit !== undefined && tenantData.unit !== null ? String(tenantData.unit).trim() : undefined;

    if (resolvedNextUnitId !== undefined) {
      const unitRes = await Database.query(
        'SELECT id, property_id, unit_number FROM units WHERE id = $1 AND deleted_at IS NULL',
        [resolvedNextUnitId]
      );
      if (unitRes.rows.length === 0) throw new Error('Unit not found');
      if (parseInt(unitRes.rows[0].property_id) !== parseInt(nextPropertyId)) {
        throw new Error('Unit does not belong to this property');
      }
      if (!resolvedNextUnitNumber) resolvedNextUnitNumber = String(unitRes.rows[0].unit_number);
      resolvedNextUnitId = unitRes.rows[0].id;
    }

    if (resolvedNextUnitNumber !== undefined) {
      const normalizedNextUnit = String(resolvedNextUnitNumber).trim();
      if (!normalizedNextUnit) throw new Error('unit is required');
      resolvedNextUnitNumber = normalizedNextUnit;

      if (resolvedNextUnitId === undefined) {
        const existingUnit = await Unit.findByPropertyAndNumber(nextPropertyId, resolvedNextUnitNumber);
        if (existingUnit) {
          resolvedNextUnitId = existingUnit.id;
        } else {
          const createdUnit = await Unit.create(nextPropertyId, { unit_number: resolvedNextUnitNumber }, userId);
          resolvedNextUnitId = createdUnit.id;
        }
      }
    }
    
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    let propertyChanged = false;
    let unitChanged = false;
    
    if (tenantData.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(tenantData.name);
      paramCount++;
    }
    
    if (tenantData.email !== undefined) {
      if (tenantData.email !== current.email) {
        const emailCheck = await Database.query(
          'SELECT id FROM tenants WHERE email = $1 AND id != $2 AND deleted_at IS NULL',
          [tenantData.email, id]
        );
        
        if (emailCheck.rows.length > 0) {
          throw new Error('A tenant with this email already exists');
        }
      }
      
      updateFields.push(`email = $${paramCount}`);
      values.push(tenantData.email);
      paramCount++;
    }
    
    if (tenantData.property_id !== undefined) {
      if (tenantData.property_id !== current.property_id) {
        propertyChanged = true;
      }

      if (role === 'admin') {
        const newPropCheck = await Database.query(
          'SELECT 1 FROM properties WHERE id = $1 AND admin_id = $2 AND deleted_at IS NULL LIMIT 1',
          [tenantData.property_id, userId]
        );
        if (newPropCheck.rows.length === 0) {
          throw new Error('Access denied: You cannot move tenants to this property');
        }
      }

      updateFields.push(`property_id = $${paramCount}`);
      values.push(tenantData.property_id);
      paramCount++;
    }

    if (propertyChanged) {
      const unitUpdateRequested =
        tenantData.unit !== undefined || tenantData.unit_id !== undefined || tenantData.unitId !== undefined;
      if (!unitUpdateRequested) {
        throw new Error('unit is required when changing property');
      }
    }
    
    const unitUpdateRequested =
      tenantData.unit !== undefined || tenantData.unit_id !== undefined || tenantData.unitId !== undefined;

    if (unitUpdateRequested) {
      if (resolvedNextUnitNumber !== undefined && resolvedNextUnitNumber !== current.unit) {
        const unitCheck = await Database.query(
          'SELECT id FROM tenants WHERE property_id = $1 AND unit = $2 AND status = $3 AND id != $4 AND deleted_at IS NULL',
          [nextPropertyId, resolvedNextUnitNumber, TENANT_STATUS.ACTIVE, id]
        );
        
        if (unitCheck.rows.length > 0) {
          throw new Error(`Unit ${resolvedNextUnitNumber} is already occupied in this property`);
        }
        
        unitChanged = true;
      }
      
      updateFields.push(`unit = $${paramCount}`);
      values.push(resolvedNextUnitNumber ?? current.unit);
      paramCount++;
    }

    if (resolvedNextUnitId !== undefined) {
      updateFields.push(`unit_id = $${paramCount}`);
      values.push(resolvedNextUnitId);
      paramCount++;
    }
    
    if (tenantData.rent !== undefined) {
      updateFields.push(`rent = $${paramCount}`);
      values.push(tenantData.rent);
      paramCount++;
    }
    
    if (tenantData.balance !== undefined) {
      updateFields.push(`balance = $${paramCount}`);
      values.push(tenantData.balance);
      paramCount++;
    }
    
    if (tenantData.move_in !== undefined) {
      const formattedMoveInDate = this.formatDateForDatabase(tenantData.move_in);
      updateFields.push(`move_in = $${paramCount}`);
      values.push(formattedMoveInDate);
      paramCount++;
    }
    
    if (tenantData.status !== undefined) {
      if (!this.isValidStatusTransition(current.status, tenantData.status)) {
        throw new Error(`Cannot change status from ${current.status} to ${tenantData.status}`);
      }
      
      updateFields.push(`status = $${paramCount}`);
      values.push(tenantData.status);
      paramCount++;
    }
    
    updateFields.push(`updated_at = NOW()`);
    
    values.push(id);
    
    if (updateFields.length === 1) {
      throw new Error('No valid fields to update');
    }
    
    const query = `
      UPDATE tenants 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;
    
    const result = await Database.query(query, values);
    const updatedTenant = result.rows[0];
    
    /*
    if (propertyChanged || unitChanged) {
      await this.updatePropertyOccupancy(current.property_id);
      if (propertyChanged) {
        await this.updatePropertyOccupancy(updatedTenant.property_id);
      }
    }
    */
    
    return updatedTenant;
  }

  static async delete(id, user) {
    return await this.archive(id, user);
  }

  static async archive(id, user) {
    const { role, id: userId } = user;

    if (role === 'tenant') {
      const ownerCheck = await Database.query(
        'SELECT 1 FROM tenants WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1',
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) throw new Error('Access denied');
    }

    if (role === 'admin') {
      const ownerCheck = await Database.query(
        `
        SELECT 1
        FROM tenants t
        JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
        WHERE t.id = $1 AND t.deleted_at IS NULL AND p.admin_id = $2
        LIMIT 1
        `,
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) throw new Error('Access denied');
    }
    
    const balanceCheck = await Database.query(
      'SELECT balance, property_id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [id]
    );
    
    if (balanceCheck.rows.length === 0) {
      throw new Error('Tenant not found or already archived');
    }
    
    if (parseFloat(balanceCheck.rows[0].balance) > 0) {
      throw new Error('Cannot archive tenant with outstanding balance');
    }
    
    const maintenanceCheck = await Database.query(
      'SELECT COUNT(*) as count FROM maintenance WHERE tenant_id = $1 AND status IN ($2, $3) AND deleted_at IS NULL',
      [id, 'open', 'in-progress']
    );
    
    if (parseInt(maintenanceCheck.rows[0].count) > 0) {
      throw new Error('Cannot archive tenant with open maintenance requests');
    }
    
    const propertyId = balanceCheck.rows[0].property_id;
    
    const query = `
      UPDATE tenants 
      SET deleted_at = CURRENT_TIMESTAMP, deleted_by = $1 
      WHERE id = $2 AND deleted_at IS NULL 
      RETURNING *
    `;
    
    const result = await Database.query(query, [userId, id]);
    
    // await this.updatePropertyOccupancy(propertyId);
    
    return result.rows[0];
  }

  static async restore(id, user) {
    const { role, id: userId } = user;
    
    if (role !== 'admin' && role !== 'super_admin') {
      throw new Error('Only admins can restore archived tenants');
    }
    
    if (role === 'admin') {
      const ownerCheck = await Database.query(
        `
        SELECT 1
        FROM tenants t
        JOIN properties p ON p.id = t.property_id AND p.deleted_at IS NULL
        WHERE t.id = $1 AND p.admin_id = $2
        LIMIT 1
        `,
        [id, userId]
      );
      if (ownerCheck.rows.length === 0) throw new Error('Access denied');
    }
    
    const query = `
      UPDATE tenants 
      SET deleted_at = NULL, deleted_by = NULL 
      WHERE id = $1 AND deleted_at IS NOT NULL 
      RETURNING *
    `;
    
    const result = await Database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Tenant not found or not archived');
    }
    
    // await this.updatePropertyOccupancy(result.rows[0].property_id);
    
    return result.rows[0];
  }

  static async permanentDelete(id, user) {
    if (user.role !== 'super_admin') {
      throw new Error('Only super admins can permanently delete records');
    }
    
    const propertyCheck = await Database.query(
      'SELECT property_id FROM tenants WHERE id = $1',
      [id]
    );
    
    if (propertyCheck.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const propertyId = propertyCheck.rows[0].property_id;
    
    const query = 'DELETE FROM tenants WHERE id = $1 RETURNING *';
    const result = await Database.query(query, [id]);
    
    // await this.updatePropertyOccupancy(propertyId);
    
    return result.rows[0];
  }

  static async updateBalance(tenantId, amount, type) {
    // Deprecated: Balance is now managed by database triggers
    console.warn('Tenant.updateBalance is deprecated. Use database triggers for balance updates.');
    return null;
  }

  /* Removed: Managed by DB View
  static async updatePropertyOccupancy(propertyId) {
    ...
  }
  */

  static async getTenantStats(user) {
    const { role, id: userId } = user;
    let whereClause = ' WHERE deleted_at IS NULL';
    let params = [];
    
    if (role === 'tenant') {
      whereClause += ' AND user_id = $1';
      params = [userId];
    } else if (role === 'admin') {
      whereClause += ' AND property_id IN (SELECT id FROM properties WHERE admin_id = $1 AND deleted_at IS NULL)';
      params = [userId];
    }
    
    const query = `
      SELECT 
        COUNT(*) as total_tenants,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_tenants,
        COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactive_tenants,
        COUNT(CASE WHEN status = 'evicted' THEN 1 END) as evicted_tenants,
        COALESCE(SUM(balance), 0) as total_balance,
        COALESCE(SUM(CASE WHEN balance > 0 THEN balance ELSE 0 END), 0) as total_outstanding,
        AVG(rent) as avg_rent,
        COUNT(CASE WHEN balance <= 0 THEN 1 END) as tenants_paid_in_full
      FROM tenants
      ${whereClause}
    `;
    
    const result = await Database.query(query, params);
    return result.rows[0];
  }

  static async findExpiringLeases(daysThreshold = 30) {
    const query = `
      SELECT t.id, t.name, t.email, t.unit, t.lease_end_date, t.status as lease_status, 
             t.user_id as tenant_user_id, t.property_id,
             p.name as property_name, 
             u.email as admin_email, u.name as admin_name,
             DATE_PART('day', t.lease_end_date - CURRENT_DATE) as days_remaining
      FROM tenants t
      JOIN properties p ON t.property_id = p.id AND p.deleted_at IS NULL
      JOIN users u ON p.admin_id = u.id AND u.deleted_at IS NULL
      WHERE t.lease_end_date IS NOT NULL
        AND t.status = 'active'
        AND t.lease_end_date > CURRENT_DATE
        AND t.lease_end_date <= CURRENT_DATE + (INTERVAL '1 day' * $1)
        AND t.deleted_at IS NULL
    `;
    const result = await Database.query(query, [daysThreshold]);
    return result.rows;
  }

  static async findExpiredLeases() {
    const query = `
      SELECT t.id, t.name, t.email, t.unit, t.lease_end_date, t.status as lease_status, 
             t.user_id as tenant_user_id, t.property_id,
             p.name as property_name, 
             u.email as admin_email, u.name as admin_name,
             (CURRENT_DATE - t.lease_end_date)::integer as days_expired
      FROM tenants t
      JOIN properties p ON t.property_id = p.id AND p.deleted_at IS NULL
      JOIN users u ON p.admin_id = u.id AND u.deleted_at IS NULL
      WHERE t.lease_end_date IS NOT NULL
        AND t.status = 'active'
        AND t.lease_end_date < CURRENT_DATE
        AND t.deleted_at IS NULL
    `;
    const result = await Database.query(query);
    return result.rows;
  }

  static isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [TENANT_STATUS.ACTIVE]: [TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE, TENANT_STATUS.EVICTED],
      [TENANT_STATUS.INACTIVE]: [TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE, TENANT_STATUS.EVICTED],
      [TENANT_STATUS.EVICTED]: [TENANT_STATUS.EVICTED]
    };
    
    return validTransitions[currentStatus] && validTransitions[currentStatus].includes(newStatus);
  }
}

module.exports = Tenant;
