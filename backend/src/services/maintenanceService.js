const Maintenance = require('../models/Maintenance');
const Tenant = require('../models/Tenant');
const Database = require('../utils/database');
const NotificationService = require('./notificationService');
const PermissionService = require('./PermissionService');
const WorkflowService = require('./workflowService');

class MaintenanceService {
  static async createRequest(requestData, user) {
    const { role, property_id: userPropertyId, email: userEmail } = user;

    // Only tenants can create requests usually, or admins on behalf of tenants
    if (role === 'tenant') {
      // Find the tenant record for this user
      const tenant = await Tenant.findByUserId(user.id);
      if (!tenant) throw new Error('Tenant record not found');
      
      requestData.tenantId = tenant.id;
      requestData.propertyId = tenant.property_id;
      requestData.unit = tenant.unit;
    } else if (requestData.propertyId) {
        // For admins, ensure they have access to the target property
        await PermissionService.ensurePropertyAccess(user, requestData.propertyId);
    }

    if (!requestData.tenantId || !requestData.propertyId || !requestData.title) {
      throw new Error('Title is required');
    }

    const request = await Maintenance.create({
      ...requestData,
      createdBy: user.id
    });

    await WorkflowService.ensureDefaultWorkItemForMaintenance({
      propertyId: request.property_id,
      maintenanceId: request.id,
      user,
    });

    const adminRes = await Database.query(
      'SELECT admin_id FROM properties WHERE id = $1 AND deleted_at IS NULL',
      [request.property_id]
    );
    const adminId = adminRes.rows[0]?.admin_id;
    if (adminId) {
      await NotificationService.createNotification({
        user_id: adminId,
        title: 'New Maintenance Request',
        message: `New request: ${request.title} for Unit ${request.unit || 'N/A'}`,
        type: 'maintenance_request',
        data: { maintenance_id: request.id, tenant_id: request.tenant_id, property_id: request.property_id, unit: request.unit }
      });
    }

    return request;
  }

  static async getAllRequests(user) {
    const { role } = user;
    
    if (role === 'tenant') {
      const tenant = await Tenant.findByUserId(user.id);
      if (!tenant) {
        return [];
      }
      return await Maintenance.findByTenantId(tenant.id);
    } else {
      // For admins, we use the model's findAll which already has some scoping
      // but we could also use PermissionService if we wanted to be more explicit.
      return await Maintenance.findAll(role, user.properties, user.property_id);
    }
  }

  static async getRequestById(id, user) {
    const { role, properties, property_id } = user;
    
    const request = await Maintenance.findById(id, role, properties, property_id);
    
    if (!request) {
      throw new Error('Maintenance request not found');
    }

    // Secondary permission check using PermissionService
    await PermissionService.ensurePropertyAccess(user, request.property_id);
    
    if (role === 'tenant') {
        const tenant = await Tenant.findByUserId(user.id);
        if (!tenant || tenant.id !== request.tenant_id) {
            throw new Error('Access denied');
        }
    }
    
    if (!request) {
      throw new Error('Maintenance request not found or access denied');
    }
    
    return request;
  }

  static async updateRequest(id, updateData, user) {
    const { role, properties: userProperties } = user;

    // Check access first
    const existingRequest = await this.getRequestById(id, user);

    // Tenants can only cancel (if we allow) or update description? 
    // Usually only admins update status/priority
    if (role === 'tenant') {
        // For now, tenants can't update status
        throw new Error('Access denied: Tenants cannot update request status');
    }

    const updatedRequest = await Maintenance.update(id, updateData);

    // Notify Tenant of update if status changed
    if (updatedRequest && updatedRequest.status !== existingRequest.status) {
      const tenantResult = await Database.query('SELECT user_id FROM tenants WHERE id = $1', [updatedRequest.tenant_id]);
      const tenantUserId = tenantResult.rows[0]?.user_id;

      if (tenantUserId) {
        await NotificationService.createNotification({
          user_id: tenantUserId,
          tenant_id: updatedRequest.tenant_id,
          title: `Maintenance ${updatedRequest.status}`,
          message: `Your request "${updatedRequest.title}" is now ${updatedRequest.status}`,
          type: 'maintenance_update',
          data: { maintenance_id: updatedRequest.id, status: updatedRequest.status, old_status: existingRequest.status }
        });
      }
    }

    return updatedRequest;
  }

  static async getMaintenanceByTenantId(tenantId, user) {
    if (!tenantId) {
      throw new Error('Tenant ID is required');
    }

    // Security check
    await PermissionService.ensureTenantAccess(user, tenantId);

    const result = await Maintenance.findByTenantId(tenantId);
    // Always return an array, even if empty (fixes new tenant with no maintenance requests)
    return result || [];
  }
}

module.exports = MaintenanceService;
