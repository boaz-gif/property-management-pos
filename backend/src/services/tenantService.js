const Tenant = require('../models/Tenant');
const Database = require('../utils/database');
const { TENANT_STATUS, HTTP_STATUS } = require('../utils/constants');

class TenantService {
  static async getAllTenants(user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    const tenants = await Tenant.findAll(role, userProperties, userPropertyId);
    
    // Add calculated fields
    const tenantsWithStats = tenants.map(tenant => ({
      ...tenant,
      payment_status: tenant.total_pending > 0 ? 'overdue' : 'current',
      occupancy_percentage: tenant.rent > 0 ? 
        Math.max(0, Math.min(100, (tenant.total_paid / (tenant.total_paid + tenant.total_pending)) * 100)) : 0,
      has_maintenance_issues: tenant.open_maintenance > 0
    }));
    
    return tenantsWithStats;
  }

  static async getTenantById(id, user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    const tenant = await Tenant.findById(id, role, userProperties, userPropertyId);
    
    if (!tenant) {
      throw new Error('Tenant not found');
    }
    
    // Add calculated fields
    return {
      ...tenant,
      payment_status: tenant.total_pending > 0 ? 'overdue' : 'current',
      occupancy_percentage: tenant.rent > 0 ? 
        Math.max(0, Math.min(100, (tenant.total_paid / (tenant.total_paid + tenant.total_pending)) * 100)) : 0,
      has_maintenance_issues: tenant.open_maintenance > 0,
      days_until_due: this.calculateDaysUntilDue(tenant.rent, tenant.total_pending)
    };
  }

  static async createTenant(tenantData, user) {
    const { role } = user;
    
    // Only super_admin and admin can create tenants
    if (role === 'tenant') {
      throw new Error('Access denied: Tenants cannot create other tenants');
    }
    
    // Validate required fields
    const requiredFields = ['name', 'email', 'property_id', 'unit', 'rent', 'move_in'];
    for (const field of requiredFields) {
      if (!tenantData[field]) {
        throw new Error(`${field} is required`);
      }
    }
  
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(tenantData.email)) {
      throw new Error('Invalid email format');
    }
  
    // Validate rent amount
    if (tenantData.rent <= 0) {
      throw new Error('Rent must be greater than 0');
    }
  
    // Enhanced move_in date validation
    this.validateMoveInDate(tenantData.move_in);
  
    // Validate property access for admins
    if (role === 'admin' && user.properties && !user.properties.includes(tenantData.property_id)) {
      throw new Error('Access denied: You cannot add tenants to this property');
    }
  
    const tenant = await Tenant.create(tenantData, user.id);
  
    return tenant;
  }

  // Enhanced date validation method
  static validateMoveInDate(moveInDateStr) {
    // Parse date with multiple format support
    const moveInDate = this.parseDate(moveInDateStr);
  
    // Check if date is valid
    if (isNaN(moveInDate.getTime())) {
      throw new Error(`Invalid move-in date format: "${moveInDateStr}". Please use YYYY-MM-DD or MM/DD/YYYY format`);
    }
    
    const today = new Date();
    
    // Set both dates to midnight for accurate comparison (avoids time zone issues)
    const moveInDateMidnight = new Date(moveInDate.getFullYear(), moveInDate.getMonth(), moveInDate.getDate());
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    // Calculate date boundaries
    const thirtyDaysAgo = new Date(todayMidnight);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const oneYearFromNow = new Date(todayMidnight);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
    
    // Check if date is within allowed range
    if (moveInDateMidnight < thirtyDaysAgo) {
      const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
      const moveInStr = moveInDateMidnight.toISOString().split('T')[0];
      throw new Error(`Move-in date is too far in the past. Earliest allowed date is ${thirtyDaysAgoStr}, but you provided ${moveInStr}`);
    }
    
    if (moveInDateMidnight > oneYearFromNow) {
      const oneYearFromNowStr = oneYearFromNow.toISOString().split('T')[0];
      const moveInStr = moveInDateMidnight.toISOString().split('T')[0];
      throw new Error(`Move-in date is too far in the future. Latest allowed date is ${oneYearFromNowStr}, but you provided ${moveInStr}`);
    }
    
    return true;
  }
  
  // Parse date with multiple format support and better validation
  static parseDate(dateStr) {
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

  // Add this method to the TenantService class for debugging
  static getDateInfo() {
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const thirtyDaysAgo = new Date(todayMidnight);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const oneYearFromNow = new Date(todayMidnight);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
  
    return {
      today: todayMidnight.toISOString().split('T')[0],
      thirty_days_ago: thirtyDaysAgo.toISOString().split('T')[0],
      one_year_from_now: oneYearFromNow.toISOString().split('T')[0],
      server_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  static async updateTenant(id, tenantData, user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    // Only super_admin, admin, and the tenant themselves can update
    if (role === 'tenant' && parseInt(id) !== userPropertyId) {
      throw new Error('Access denied: You can only update your own information');
    }
    
    // Validate email format if provided
    if (tenantData.email !== undefined) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(tenantData.email)) {
        throw new Error('Invalid email format');
      }
    }
    
    // Validate rent amount if provided
    if (tenantData.rent !== undefined && tenantData.rent <= 0) {
      throw new Error('Rent must be greater than 0');
    }
    
    // Validate move_in date if provided
    if (tenantData.move_in !== undefined) {
      const moveInDate = new Date(tenantData.move_in);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (moveInDate < today) {
        throw new Error('Move-in date cannot be in the past');
      }
    }

    /*
    // Validate balance if provided
    if (tenantData.balance !== undefined && tenantData.balance < 0) {
      throw new Error('Balance cannot be negative');
    }
    */

    // Validate property access for admins
    if (role === 'admin' && tenantData.property_id && user.properties && !user.properties.includes(tenantData.property_id)) {
      throw new Error('Access denied: You cannot move tenants to this property');
    }
    
    const tenant = await Tenant.update(id, tenantData, role, userProperties, userPropertyId);
    
    return tenant;
  }

  static async deleteTenant(id, user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    // Only super_admin and admin can delete tenants
    if (role === 'tenant') {
      throw new Error('Access denied: Tenants cannot delete tenant records');
    }
    
    await Tenant.delete(id, role, userProperties, userPropertyId);
    
    return { message: 'Tenant deleted successfully' };
  }

  static async getTenantStats(user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    
    const stats = await Tenant.getTenantStats(role, userProperties, userPropertyId);
    
    return {
      total_tenants: parseInt(stats.total_tenants) || 0,
      active_tenants: parseInt(stats.active_tenants) || 0,
      inactive_tenants: parseInt(stats.inactive_tenants) || 0,
      evicted_tenants: parseInt(stats.evicted_tenants) || 0,
      total_balance: parseFloat(stats.total_balance) || 0,
      total_outstanding: parseFloat(stats.total_outstanding) || 0,
      avg_rent: parseFloat(stats.avg_rent) || 0,
      tenants_paid_in_full: parseInt(stats.tenants_paid_in_full) || 0,
      collection_rate: stats.total_tenants > 0 ? 
        Math.round((stats.tenants_paid_in_full / stats.total_tenants) * 100) : 0
    };
  }

  /*
  static async updateTenantBalance(tenantId, amount, type, user) {
    const { role, property_id: userPropertyId } = user;
      
    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== userPropertyId) {
      throw new Error('Access denied');
    }
      
    if (role === 'admin') {
      // Verify tenant belongs to admin's property
      const tenantCheck = await Database.query(
        'SELECT property_id FROM tenants WHERE id = $1',
        [tenantId]
      );
        
      if (tenantCheck.rows.length === 0 || !user.properties.includes(tenantCheck.rows[0].property_id)) {
        throw new Error('Access denied: You cannot modify balance for tenants outside your properties');
      }
    }
      
    // Validate amount
    if (amount <= 0) {
     throw new Error('Amount must be greater than 0');
    }
      
    // Validate type
    const validTypes = ['payment', 'charge', 'adjustment', 'credit', 'debit'];
    if (!validTypes.includes(type)) {
     throw new Error(`Invalid balance adjustment type. Must be one of: ${validTypes.join(', ')}`);
    }
      
        // Get current tenant data
    const currentTenant = await Database.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );
    
    if (currentTenant.rows.length === 0) {
      throw new Error('Tenant not found');
    }
    
    const currentBalance = parseFloat(currentTenant.rows[0].balance);
    let newBalance;
    let operation;
    
    // Calculate new balance based on type
    switch (type) {
      case 'payment':
        newBalance = currentBalance - amount;
        operation = 'subtract';
        break;
      case 'charge':
      case 'debit':
        newBalance = currentBalance + amount;
        operation = 'add';
        break;
      case 'adjustment':
      case 'credit':
        newBalance = currentBalance + amount;
        operation = 'add';
        break;
      default:
        throw new Error(`Unsupported balance adjustment type: ${type}`);
    }
    
    // Business rule validation
    if (type === 'payment' && newBalance < 0) {
      throw new Error(`Payment amount (${amount}) exceeds current balance (${currentBalance}). Resulting balance would be negative.`);
    }
    
    // Update tenant balance
    const query = `
      UPDATE tenants 
      SET balance = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await Database.query(query, [newBalance, tenantId]);
    const updatedTenant = result.rows[0];
    
   // Create a payment record for tracking
    if (type === 'payment') {
      await this.createPaymentRecord(tenantId, amount, user.id);
    }
    
    // Create a transaction record for other balance changes
    if (type === 'charge' || type === 'adjustment') {
      await this.createTransactionRecord(tenantId, amount, type, user.id);
    }
    
    return {
      message: 'Tenant balance updated successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        email: updatedTenant.email,
        previous_balance: currentBalance,
        new_balance: updatedTenant.balance,
        amount: amount,
        type: type,
        operation: operation
      }
    };
  }
  */

  // Helper method to create payment record
  /*
  static async createPaymentRecord(tenantId, amount, createdBy) {
    try {
      const query = `
        INSERT INTO payments (tenant_id, amount, date, type, method, status, created_at)
        VALUES ($1, $2, CURRENT_DATE, 'rent', 'manual', 'completed', NOW())
        RETURNING *
      `;
    
      await Database.query(query, [tenantId, amount]);
    } catch (error) {
      // Log error but don't fail the balance update
      console.error('Failed to create payment record:', error.message);
    }
  }
  */

  // Helper method to create transaction record
  /*
  static async createTransactionRecord(tenantId, amount, type, createdBy) {
    try {
      const query = `
        INSERT INTO transactions (tenant_id, amount, type, created_by, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        RETURNING *
      `;
    
    await Database.query(query, [tenantId, amount, type, createdBy]);
    } catch (error) {
      // Log error but don't fail the balance update
      console.error('Failed to create transaction record:', error.message);
    }
  }
  */

  static async getRentSchedule(tenantId, user) {
    const { role, property_id: userPropertyId } = user;
    
    const schedule = await Tenant.getRentSchedule(tenantId, role, userPropertyId);
    
    return schedule;
  }

  static async calculateDaysUntilDue(rentAmount, currentBalance) {
    if (currentBalance <= 0) {
      return null; // No payment due
    }
    
    // Simple calculation: days until next rent due
    const today = new Date();
    const nextDueDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const diffTime = nextDueDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  }

  static async getTenantPaymentHistory(tenantId, user) {
    const { role, property_id: userPropertyId } = user;
    
    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== userPropertyId) {
      throw new Error('Access denied');
    }
    
    const query = `
      SELECT pm.*, 
             CASE 
               WHEN pm.status = 'completed' THEN 'Paid'
               WHEN pm.status = 'pending' THEN 'Pending'
               ELSE pm.status
             END as status_display
      FROM payments pm
      WHERE pm.tenant_id = $1
      ORDER BY pm.date DESC
      LIMIT 12
    `;
    
    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  static async getTenantMaintenanceHistory(tenantId, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== userPropertyId) {
      throw new Error('Access denied');
    }

    const query = `
      SELECT m.*,
             CASE
               WHEN m.status = 'open' THEN 'Open'
               WHEN m.status = 'in-progress' THEN 'In Progress'
               WHEN m.status = 'completed' THEN 'Completed'
               ELSE m.status
             END as status_display
      FROM maintenance m
      WHERE m.tenant_id = $1
      ORDER BY m.date DESC
      LIMIT 10
    `;

    const result = await Database.query(query, [tenantId]);
    return result.rows;
  }

  // Enhanced payment processing
  static async processPayment(tenantId, amount, method, type, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    // Create payment record using Payment model
    const Payment = require('../models/Payment');
    const payment = await Payment.create({
      tenantId,
      amount,
      method,
      type: type || 'rent',
      createdBy: user.id
    });

    // Update tenant balance
    await this.adjustTenantBalance(tenantId, amount, 'payment', user);

    // Send payment confirmation notification
    const NotificationService = require('./notificationService');
    await NotificationService.sendPaymentConfirmation(tenantId, amount, method, user);

    return payment;
  }

  // Enhanced balance adjustment (admin approved)
  static async adjustTenantBalance(tenantId, amount, type, user) {
    const { role, property_id: userPropertyId } = user;

    // Check permissions for tenant
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    // Validate amount
    if (amount <= 0) {
      throw new Error('Amount must be greater than 0');
    }

    // Validate type
    const validTypes = ['payment', 'charge', 'adjustment'];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid adjustment type. Must be one of: ${validTypes.join(', ')}`);
    }

    // Get current tenant data
    const currentTenant = await Database.query(
      'SELECT * FROM tenants WHERE id = $1',
      [tenantId]
    );

    if (currentTenant.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const currentBalance = parseFloat(currentTenant.rows[0].balance);
    let newBalance;

    // Calculate new balance
    switch (type) {
      case 'payment':
        newBalance = currentBalance - amount;
        break;
      case 'charge':
        newBalance = currentBalance + amount;
        break;
      case 'adjustment':
        newBalance = currentBalance - amount; // Adjustment typically reduces balance
        break;
      default:
        throw new Error(`Unsupported adjustment type: ${type}`);
    }

    // Business rule validation
    if (type === 'payment' && newBalance < 0) {
      throw new Error(`Payment amount (${amount}) exceeds current balance (${currentBalance}).`);
    }

    // Update tenant balance
    const query = `
      UPDATE tenants
      SET balance = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;

    const result = await Database.query(query, [newBalance, tenantId]);
    const updatedTenant = result.rows[0];

    // Create transaction record
    const transactionQuery = `
      INSERT INTO transactions (tenant_id, amount, type, created_by, created_at)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `;

    await Database.query(transactionQuery, [tenantId, amount, type, user.id]);

    // Send balance update notification
    const NotificationService = require('./notificationService');
    await NotificationService.sendBalanceUpdate(tenantId, newBalance, user);

    return {
      message: 'Balance adjusted successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        balance: newBalance,
        previous_balance: currentBalance,
        adjustment_amount: amount,
        type: type
      }
    };
  }

  // Enhanced balance request (for tenants to request adjustments)
  static async requestBalanceAdjustment(tenantId, amount, reason, user) {
    const { role, property_id: userPropertyId } = user;

    // Only tenants can request balance adjustments
    if (role !== 'tenant' || parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied: Only tenants can request balance adjustments');
    }

    // Validate input
    if (!amount || !reason) {
      throw new Error('Amount and reason are required');
    }

    if (amount <= 0) {
      throw new Error('Request amount must be greater than 0');
    }

    // In a real implementation, this would create a balance adjustment request
    // For now, this is a placeholder
    const request = {
      id: Date.now(),
      tenantId,
      amount,
      reason,
      requestedBy: user.id,
      status: 'pending',
      created_at: new Date().toISOString()
    };

    // Notify admins about the request
    const NotificationService = require('./notificationService');
    await NotificationService.notifyAdmins({
      type: 'balance_adjustment_request',
      message: `Balance adjustment request from ${user.name}: $${amount} for ${reason}`,
      relatedId: request.id,
      data: request
    }, user);

    return request;
  }

  // Enhanced dispute management
  static async createDispute(tenantId, chargeId, reason, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    // Use Dispute model
    const Dispute = require('../models/Dispute');
    const dispute = await Dispute.create({
      tenantId,
      chargeId,
      reason,
      createdBy: user.id
    });

    // Notify admins
    const NotificationService = require('./notificationService');
    await NotificationService.notifyAdmins({
      type: 'dispute',
      message: `New dispute created by ${user.name}`,
      relatedId: dispute.id,
      data: dispute
    }, user);

    return dispute;
  }

  // Enhanced notification access
  static async getNotifications(tenantId, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    const NotificationService = require('./notificationService');
    return await NotificationService.getNotificationsByTenantId(tenantId, user);
  }

  // Enhanced lease access
  static async getLeaseDetails(tenantId, user) {
    const { role, property_id: userPropertyId } = user;

    // Check access permissions
    if (role === 'tenant' && parseInt(tenantId) !== parseInt(userPropertyId)) {
      throw new Error('Access denied');
    }

    const Lease = require('../models/Lease');
    return await Lease.getLeaseByTenantId(tenantId, user);
  }

  // Enhanced financial analytics (basic)
  static async getFinancialSummary(user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;

    // For tenants, only their own
    if (role === 'tenant') {
      const query = `
        SELECT
          t.balance as current_balance,
          t.rent as monthly_rent,
          COUNT(p.id) as total_payments,
          COALESCE(SUM(p.amount), 0) as total_paid
        FROM tenants t
        LEFT JOIN payments p ON t.id = p.tenant_id AND p.status = 'completed'
        WHERE t.id = $1
        GROUP BY t.id, t.balance, t.rent
      `;

      const result = await Database.query(query, [userPropertyId]);
      return result.rows[0] || { current_balance: 0, monthly_rent: 0, total_payments: 0, total_paid: 0 };
    }

    // For admins, property-wide summary
    // This is a simplified version - real analytics would be more comprehensive
    return { message: 'Admin financial summary would be implemented here' };
  }
}

module.exports = TenantService;
