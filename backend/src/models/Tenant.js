const Database = require('../utils/database');
const { TENANT_STATUS } = require('../utils/constants');

class Tenant {
  static async findAll(userRole, userProperties, userPropertyId) {
    let query = `
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
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN users u ON p.admin_id = u.id
      LEFT JOIN payments pm ON t.id = pm.tenant_id
      LEFT JOIN maintenance m ON t.id = m.tenant_id
    `;
    
    let whereClause = '';
    let params = [];
    
    // Role-based filtering
    if (userRole === 'tenant') {
      whereClause = ' WHERE t.id = $1';
      params = [userPropertyId];
    } else if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      whereClause = ' WHERE t.property_id = ANY($1)';
      params = [userProperties];
    }
    
    query += whereClause + ' GROUP BY t.id, p.name, p.address, u.name ORDER BY t.created_at DESC';
    
    const result = await Database.query(query, params);
    return result.rows;
  }

  static async findById(id, userRole, userProperties, userPropertyId) {
    // Check access permissions
    if (userRole === 'tenant' && parseInt(id) !== userPropertyId) {
      throw new Error('Access denied');
    }
    
    if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      // Verify tenant belongs to admin's property
      const propertyCheck = await Database.query(
        'SELECT property_id FROM tenants WHERE id = $1',
        [id]
      );
      
      if (propertyCheck.rows.length === 0 || !userProperties.includes(propertyCheck.rows[0].property_id)) {
        throw new Error('Access denied');
      }
    }
    
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
      LEFT JOIN properties p ON t.property_id = p.id
      LEFT JOIN users u ON p.admin_id = u.id
      LEFT JOIN payments pm ON t.id = pm.tenant_id
      LEFT JOIN maintenance m ON t.id = m.tenant_id
      WHERE t.id = $1
      GROUP BY t.id, p.name, p.address, u.name
    `;
    
    const result = await Database.query(query, [id]);
    return result.rows[0];
  }

  static async create(tenantData, createdBy) {
    const { name, email, property_id, unit, rent, move_in, status = TENANT_STATUS.ACTIVE, admin_id } = tenantData;
    
    // Check if unit is already occupied
    const unitCheck = await Database.query(
      'SELECT id FROM tenants WHERE property_id = $1 AND unit = $2 AND status = $3',
      [property_id, unit, TENANT_STATUS.ACTIVE]
    );
    
    if (unitCheck.rows.length > 0) {
      throw new Error(`Unit ${unit} is already occupied in this property`);
    }
    
    // Check if tenant with email already exists
    const emailCheck = await Database.query(
      'SELECT id FROM tenants WHERE email = $1',
      [email]
    );
    
    if (emailCheck.rows.length > 0) {
      throw new Error('A tenant with this email already exists');
    }
    
    // Convert move_in date to proper format for PostgreSQL
    const formattedMoveInDate = this.formatDateForDatabase(move_in);
    
    const query = `
      INSERT INTO tenants (name, email, property_id, unit, rent, balance, move_in, status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, 0, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [name, email, property_id, unit, rent, formattedMoveInDate, status];
    const result = await Database.query(query, values);
    
    // Update property occupancy
    await this.updatePropertyOccupancy(property_id);
    
    return result.rows[0];
  }
  
  // Add this helper method to format dates for database
  static formatDateForDatabase(dateStr) {
    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }
    
    // Parse the date using our existing parseDate method
    const date = this.parseDate(dateStr);
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    // Format as YYYY-MM-DD for PostgreSQL
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Add this helper method if not already present
  static parseDate(dateStr) {
    // Clean the input string
    dateStr = dateStr.trim();
  
    // Try YYYY-MM-DD format first
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date(NaN) : date;
    }
  
    // Try MM/DD/YYYY format
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('/');
    
      // Validate we have exactly 3 parts
      if (parts.length !== 3) {
        return new Date(NaN);
      }
    
      const monthStr = parts[0];
      const dayStr = parts[1];
      const yearStr = parts[2];
    
      // Parse as integers
      const month = parseInt(monthStr, 10);
      const day = parseInt(dayStr, 10);
      const year = parseInt(yearStr, 10);
    
      // Validate year
      if (isNaN(year) || year < 1900 || year > 2100) {
        return new Date(NaN);
      }
    
      // Validate month (1-12, since we're dealing with user input)
      if (isNaN(month) || month < 1 || month > 12) {
        return new Date(NaN);
      }
    
      // Validate day (1-31, basic validation)
      if (isNaN(day) || day < 1 || day > 31) {
        return new Date(NaN);
      }
    
      // Create date object (month is 0-indexed in JavaScript)
      const date = new Date(year, month - 1, day);
    
      // Check if the date is valid (e.g., February 30th would be invalid)
      if (date.getMonth() !== month - 1 || date.getDate() !== day) {
        return new Date(NaN);
      }
    
      return date;
    }
  
    // Try parsing as-is (for other formats)
    const parsedDate = new Date(dateStr);
  
    // Check if the parsed date is valid
    if (isNaN(parsedDate.getTime())) {
      return new Date(NaN);
    }
  
    return parsedDate;
  }

  static async update(id, tenantData, userRole, userProperties, userPropertyId) {
    // Check access permissions
    if (userRole === 'tenant' && parseInt(id) !== userPropertyId) {
      throw new Error('Access denied');
    }
    
    if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      // Verify tenant belongs to admin's property
      const propertyCheck = await Database.query(
        'SELECT property_id FROM tenants WHERE id = $1',
        [id]
      );
      
      if (propertyCheck.rows.length === 0 || !userProperties.includes(propertyCheck.rows[0].property_id)) {
        throw new Error('Access denied');
      }
    }
    
    // Get current tenant data
    const currentTenant = await Database.query('SELECT * FROM tenants WHERE id = $1', [id]);
    if (currentTenant.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const current = currentTenant.rows[0];
    
    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramCount = 1;
    let propertyChanged = false;
    let unitChanged = false;
    
    // Only include fields that are provided
    if (tenantData.name !== undefined) {
      updateFields.push(`name = $${paramCount}`);
      values.push(tenantData.name);
      paramCount++;
    }
    
    if (tenantData.email !== undefined) {
      // Check if email is already used by another tenant
      if (tenantData.email !== current.email) {
        const emailCheck = await Database.query(
          'SELECT id FROM tenants WHERE email = $1 AND id != $2',
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
      updateFields.push(`property_id = $${paramCount}`);
      values.push(tenantData.property_id);
      paramCount++;
    }
    
    if (tenantData.unit !== undefined) {
      if (tenantData.unit !== current.unit) {
        // Check if new unit is available
        const unitCheck = await Database.query(
          'SELECT id FROM tenants WHERE property_id = $1 AND unit = $2 AND status = $3 AND id != $4',
          [tenantData.property_id || current.property_id, tenantData.unit, TENANT_STATUS.ACTIVE, id]
        );
        
        if (unitCheck.rows.length > 0) {
          throw new Error(`Unit ${tenantData.unit} is already occupied in this property`);
        }
        
        unitChanged = true;
      }
      
      updateFields.push(`unit = $${paramCount}`);
      values.push(tenantData.unit);
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
      // Format move_in date for database
      const formattedMoveInDate = this.formatDateForDatabase(tenantData.move_in);
      updateFields.push(`move_in = $${paramCount}`);
      values.push(formattedMoveInDate);
      paramCount++;
    }
    
    if (tenantData.status !== undefined) {
      // Validate status transitions
      if (!this.isValidStatusTransition(current.status, tenantData.status)) {
        throw new Error(`Cannot change status from ${current.status} to ${tenantData.status}`);
      }
      
      updateFields.push(`status = $${paramCount}`);
      values.push(tenantData.status);
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
      UPDATE tenants 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;
    
    const result = await Database.query(query, values);
    const updatedTenant = result.rows[0];
    
    // Update property occupancy if property or unit changed
    if (propertyChanged || unitChanged) {
      await this.updatePropertyOccupancy(current.property_id);
      if (propertyChanged) {
        await this.updatePropertyOccupancy(updatedTenant.property_id);
      }
    }
    
    return updatedTenant;
  }

  static async delete(id, userRole, userProperties, userPropertyId) {
    // Check access permissions
    if (userRole === 'tenant' && parseInt(id) !== userPropertyId) {
      throw new Error('Access denied');
    }
    
    if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      // Verify tenant belongs to admin's property
      const propertyCheck = await Database.query(
        'SELECT property_id FROM tenants WHERE id = $1',
        [id]
      );
      
      if (propertyCheck.rows.length === 0 || !userProperties.includes(propertyCheck.rows[0].property_id)) {
        throw new Error('Access denied');
      }
    }
    
    // Check if tenant has unpaid balance
    const balanceCheck = await Database.query(
      'SELECT balance FROM tenants WHERE id = $1',
      [id]
    );
    
    if (balanceCheck.rows.length > 0 && parseFloat(balanceCheck.rows[0].balance) > 0) {
      throw new Error('Cannot delete tenant with outstanding balance');
    }
    
    // Check if tenant has pending maintenance requests
    const maintenanceCheck = await Database.query(
      'SELECT COUNT(*) as count FROM maintenance WHERE tenant_id = $1 AND status IN ($2, $3)',
      [id, 'open', 'in-progress']
    );
    
    if (parseInt(maintenanceCheck.rows[0].count) > 0) {
      throw new Error('Cannot delete tenant with open maintenance requests');
    }
    
    // Get property_id before deletion
    const propertyCheck = await Database.query(
      'SELECT property_id FROM tenants WHERE id = $1',
      [id]
    );
    
    const propertyId = propertyCheck.rows[0].property_id;
    
    const query = 'DELETE FROM tenants WHERE id = $1';
    await Database.query(query, [id]);
    
    // Update property occupancy
    await this.updatePropertyOccupancy(propertyId);
    
    return { message: 'Tenant deleted successfully' };
  }

  static async updateBalance(tenantId, amount, type) {
    const query = `
      UPDATE tenants 
      SET balance = balance $1 $2, updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `;
    
    const operator = type === 'payment' ? '-' : '+';
    const result = await Database.query(query, [operator, amount, tenantId]);
    return result.rows[0];
  }

  static async updatePropertyOccupancy(propertyId) {
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

  static async getTenantStats(userRole, userProperties, userPropertyId) {
    let whereClause = '';
    let params = [];
    
    if (userRole === 'tenant') {
      whereClause = ' WHERE id = $1';
      params = [userPropertyId];
    } else if (userRole === 'admin' && userProperties && userProperties.length > 0) {
      whereClause = ' WHERE property_id = ANY($1)';
      params = [userProperties];
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

  static async isValidStatusTransition(currentStatus, newStatus) {
    const validTransitions = {
      [TENANT_STATUS.ACTIVE]: [TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE, TENANT_STATUS.EVICTED],
      [TENANT_STATUS.INACTIVE]: [TENANT_STATUS.ACTIVE, TENANT_STATUS.INACTIVE, TENANT_STATUS.EVICTED],
      [TENANT_STATUS.EVICTED]: [TENANT_STATUS.EVICTED] // Evicted is final state
    };
    
    return validTransitions[currentStatus] && validTransitions[currentStatus].includes(newStatus);
  }

  static async getRentSchedule(tenantId, userRole, userPropertyId) {
    // Check access permissions
    if (userRole === 'tenant' && parseInt(tenantId) !== userPropertyId) {
      throw new Error('Access denied');
    }
    
    const tenant = await Database.query(
      'SELECT t.*, p.name as property_name FROM tenants t LEFT JOIN properties p ON t.property_id = p.id WHERE t.id = $1',
      [tenantId]
    );
    
    if (tenant.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const tenantData = tenant.rows[0];
    
    // Generate rent schedule for next 12 months
    const schedule = [];
    const currentDate = new Date();
    const moveInDate = new Date(tenantData.move_in);
    
    for (let i = 0; i < 12; i++) {
      const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      
      // Skip months before move-in date
      if (dueDate < moveInDate) continue;
      
      schedule.push({
        due_date: dueDate.toISOString().split('T')[0],
        amount: tenantData.rent,
        status: 'pending',
        paid_date: null
      });
    }
    
    return {
      tenant: tenantData,
      schedule
    };
  }
}

module.exports = Tenant;