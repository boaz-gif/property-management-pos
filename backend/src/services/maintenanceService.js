const Maintenance = require('../models/Maintenance');
const Tenant = require('../models/Tenant');
const NotificationService = require('./notificationService');

class MaintenanceService {
  static async createRequest(requestData, user) {
    const { role, property_id: userPropertyId } = user;

    // Only tenants can create requests usually, or admins on behalf of tenants
    if (role === 'tenant') {
      // Ensure tenant is creating for themselves
      requestData.tenantId = userPropertyId;
      
      // Get tenant's property ID
      const tenant = await Tenant.findById(userPropertyId, role, null, userPropertyId);
      if (!tenant) throw new Error('Tenant not found');
      
      requestData.propertyId = tenant.property_id;
      requestData.unit = tenant.unit;
    }

    if (!requestData.tenantId || !requestData.propertyId || !requestData.title) {
      throw new Error('Title is required');
    }

    const request = await Maintenance.create({
      ...requestData,
      createdBy: user.id
    });

    // Notify Admins
    await NotificationService.notifyAdmins({
      type: 'maintenance_request',
      message: `New maintenance request: ${requestData.title}`,
      relatedId: request.id,
      data: request
    }, user);

    return request;
  }

  static async getAllRequests(user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    return await Maintenance.findAll(role, userProperties, userPropertyId);
  }

  static async getRequestById(id, user) {
    const { role, properties: userProperties, property_id: userPropertyId } = user;
    const request = await Maintenance.findById(id, role, userProperties, userPropertyId);
    
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

    // Notify Tenant of update
    if (updatedRequest) {
      await NotificationService.create({
        tenantId: updatedRequest.tenant_id,
        userId: updatedRequest.tenant_id, // Assuming tenant user ID maps or we look it up
        type: 'maintenance_update',
        title: 'Maintenance Update',
        message: `Your request "${updatedRequest.title}" has been updated to: ${updatedRequest.status}`,
        data: updatedRequest
      });
    }

    return updatedRequest;
  }
}

module.exports = MaintenanceService;
