const Tenant = require('../models/Tenant');
const Database = require('../utils/database');
const { logger } = require('../utils/logger');

class LeaseService {
  /**
   * Check if a lease will expire within the specified number of days
   */
  static isExpiringWithinDays(leaseEndDate, days = 30) {
    if (!leaseEndDate) return false;
    
    const endDate = new Date(leaseEndDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));
    
    return daysUntilExpiry > 0 && daysUntilExpiry <= days;
  }

  /**
   * Check if a lease has expired
   */
  static isExpired(leaseEndDate) {
    if (!leaseEndDate) return false;
    
    const endDate = new Date(leaseEndDate);
    const today = new Date();
    
    return endDate < today;
  }

  /**
   * Get days remaining until lease expiration
   */
  static getDaysRemaining(leaseEndDate) {
    if (!leaseEndDate) return null;
    
    const endDate = new Date(leaseEndDate);
    const today = new Date();
    const daysRemaining = Math.floor((endDate - today) / (1000 * 60 * 60 * 24));
    
    return daysRemaining >= 0 ? daysRemaining : -1; // -1 indicates expired
  }

  /**
   * Validate lease dates
   */
  static validateLeaseDates(leaseStartDate, leaseEndDate) {
    const errors = [];
    
    if (!leaseStartDate) {
      errors.push('Lease start date is required');
    } else {
      const startDate = new Date(leaseStartDate);
      if (isNaN(startDate.getTime())) {
        errors.push('Invalid lease start date format');
      }
    }
    
    if (!leaseEndDate) {
      errors.push('Lease end date is required');
    } else {
      const endDate = new Date(leaseEndDate);
      if (isNaN(endDate.getTime())) {
        errors.push('Invalid lease end date format');
      }
    }
    
    if (leaseStartDate && leaseEndDate) {
      const startDate = new Date(leaseStartDate);
      const endDate = new Date(leaseEndDate);
      
      if (startDate >= endDate) {
        errors.push('Lease end date must be after lease start date');
      }
      
      // Check if lease duration is reasonable (at least 1 day, max 5 years)
      const durationDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (durationDays < 1) {
        errors.push('Lease duration must be at least 1 day');
      }
      if (durationDays > 1825) { // 5 years
        errors.push('Lease duration cannot exceed 5 years');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Find all leases expiring within the specified days threshold
   */
  static async findExpiringLeases(daysThreshold = 30) {
    try {
      const leases = await Tenant.findExpiringLeases(daysThreshold);
      
      return leases.map(lease => ({
        ...lease,
        days_remaining: Math.floor(lease.days_remaining)
      }));
    } catch (error) {
      logger.error('Error finding expiring leases:', error);
      throw error;
    }
  }

  /**
   * Find all expired leases
   */
  static async findExpiredLeases() {
    try {
      const leases = await Tenant.findExpiredLeases();
      
      return leases.map(lease => ({
        ...lease,
        days_expired: Math.floor(lease.days_expired)
      }));
    } catch (error) {
      logger.error('Error finding expired leases:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive lease status for a tenant
   */
  static async getTenantLeaseStatus(tenantId) {
    try {
      const leaseStatus = await Tenant.getLeaseStatus(tenantId);
      
      if (!leaseStatus) {
        return null;
      }
      
      return {
        ...leaseStatus,
        days_remaining: leaseStatus.days_remaining,
        is_expired: this.isExpired(leaseStatus.lease_end_date),
        is_expiring_soon: this.isExpiringWithinDays(leaseStatus.lease_end_date, 30),
        lease_status_display: this.getLeaseStatusDisplay(leaseStatus.lease_end_date)
      };
    } catch (error) {
      logger.error('Error getting tenant lease status:', error);
      throw error;
    }
  }

  /**
   * Get human-readable lease status display
   */
  static getLeaseStatusDisplay(leaseEndDate) {
    if (!leaseEndDate) {
      return 'No lease';
    }
    
    const daysRemaining = this.getDaysRemaining(leaseEndDate);
    
    if (daysRemaining < 0) {
      return `Expired ${Math.abs(daysRemaining)} days ago`;
    } else if (daysRemaining === 0) {
      return 'Expires today';
    } else if (daysRemaining === 1) {
      return 'Expires tomorrow';
    } else if (daysRemaining <= 7) {
      return `Expires in ${daysRemaining} days`;
    } else if (daysRemaining <= 30) {
      return `Expires in ${daysRemaining} days (${Math.ceil(daysRemaining / 7)} weeks)`;
    } else {
      return `Expires in ${daysRemaining} days (${Math.floor(daysRemaining / 30)} months)`;
    }
  }

  /**
   * Renew a tenant's lease
   */
  static async renewLease(tenantId, newLeaseEndDate) {
    try {
      const validation = this.validateLeaseDates(new Date().toISOString().split('T')[0], newLeaseEndDate);
      
      if (!validation.isValid) {
        const error = new Error('Invalid lease dates');
        error.details = validation.errors;
        throw error;
      }
      
      const renewedTenant = await Tenant.renewLease(tenantId, newLeaseEndDate);
      
      // Log to lease history
      await Tenant.addLeaseHistory(tenantId, {
        lease_start_date: renewedTenant.lease_start_date,
        lease_end_date: renewedTenant.lease_end_date,
        status: 'renewed',
        notes: `Lease renewed on ${new Date().toLocaleDateString()}`
      });
      
      return renewedTenant;
    } catch (error) {
      logger.error('Error renewing lease:', error);
      throw error;
    }
  }

  /**
   * Get lease history for a tenant
   */
  static async getTenantLeaseHistory(tenantId) {
    try {
      return await Tenant.getLeaseHistory(tenantId);
    } catch (error) {
      logger.error('Error getting lease history:', error);
      throw error;
    }
  }

  /**
   * Calculate lease expiration statistics for admin dashboard
   */
  static async getLeaseStatistics() {
    try {
      const activeLeases = await Database.query(`
        SELECT COUNT(*) as count FROM tenants 
        WHERE lease_end_date > CURRENT_DATE AND status = 'active'
      `);
      
      const expiringLeases = await Database.query(`
        SELECT COUNT(*) as count FROM tenants 
        WHERE lease_end_date > CURRENT_DATE 
          AND lease_end_date <= CURRENT_DATE + INTERVAL '30 days' 
          AND status = 'active'
      `);
      
      const expiredLeases = await Database.query(`
        SELECT COUNT(*) as count FROM tenants 
        WHERE lease_end_date < CURRENT_DATE AND status = 'active'
      `);
      
      const noLeaseLeases = await Database.query(`
        SELECT COUNT(*) as count FROM tenants 
        WHERE lease_end_date IS NULL AND status = 'active'
      `);
      
      return {
        total_active_leases: parseInt(activeLeases.rows[0].count),
        expiring_soon: parseInt(expiringLeases.rows[0].count),
        expired: parseInt(expiredLeases.rows[0].count),
        no_lease: parseInt(noLeaseLeases.rows[0].count)
      };
    } catch (error) {
      logger.error('Error getting lease statistics:', error);
      throw error;
    }
  }

  /**
   * Format lease information for display
   */
  static formatLeaseInfo(tenant) {
    return {
      id: tenant.id,
      name: tenant.name,
      email: tenant.email,
      lease_start_date: tenant.lease_start_date,
      lease_end_date: tenant.lease_end_date,
      lease_status: tenant.lease_status,
      days_remaining: this.getDaysRemaining(tenant.lease_end_date),
      status_display: this.getLeaseStatusDisplay(tenant.lease_end_date),
      is_expired: this.isExpired(tenant.lease_end_date),
      is_expiring_soon: this.isExpiringWithinDays(tenant.lease_end_date, 30),
      property_id: tenant.property_id,
      property_name: tenant.property_name
    };
  }
}

module.exports = LeaseService;
