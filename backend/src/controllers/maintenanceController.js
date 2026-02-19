const MaintenanceService = require('../services/maintenance/maintenanceService');
const NotificationService = require('../services/communications/notificationService');
const { HTTP_STATUS } = require('../utils/constants');

class MaintenanceController {
  static async getAllRequests(req, res, next) {
    try {
      const requests = await MaintenanceService.getAllRequests(req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: requests
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRequestById(req, res, next) {
    try {
      const request = await MaintenanceService.getRequestById(req.params.id, req.user);
      res.status(HTTP_STATUS.OK).json({
        success: true,
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  static async createRequest(req, res, next) {
    try {
      const request = await MaintenanceService.createRequest(req.body, req.user);

      // Emit real-time maintenance request notification via Socket.io
      if (global.io) {
        try {
          global.io.to('maintenance-admins').emit('new_maintenance_request', {
            id: request.id,
            tenant_name: request.tenant_name,
            tenant_id: request.tenant_id,
            property_id: request.property_id,
            title: request.title,
            description: request.description,
            priority: request.priority,
            status: request.status,
            created_at: request.created_at,
            timestamp: new Date().toISOString()
          });

          console.log(`Maintenance request ${request.id} emitted to admins via Socket.io`);
        } catch (socketError) {
          console.warn('Failed to emit Socket.io event:', socketError);
        }
      }

      // Send email notification to admins
      try {
        const adminQuery = `
          SELECT u.email, u.name, t.property_id
          FROM users u
          JOIN properties p ON p.admin_id = u.id
          WHERE p.id = $1 AND u.role IN ('admin', 'super_admin')
        `;
        const adminResult = await require('../utils/database').query(adminQuery, [request.property_id]);
        
        for (const admin of adminResult.rows) {
          await NotificationService.sendMaintenanceNotificationEmail(admin.email, {
            tenant_name: request.tenant_name,
            tenant_id: request.tenant_id,
            title: request.title,
            description: request.description,
            priority: request.priority,
            request_id: request.id
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send maintenance notification emails:', notificationError);
      }

      res.status(HTTP_STATUS.CREATED).json({
        success: true,
        message: 'Maintenance request created successfully',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateRequest(req, res, next) {
    try {
      const oldStatus = req.body.oldStatus; // Pass old status for comparison
      const request = await MaintenanceService.updateRequest(req.params.id, req.body, req.user);

      // Emit real-time maintenance status update via Socket.io
      if (global.io) {
        try {
          global.io.to('maintenance-admins').emit('maintenance_status_changed', {
            request_id: request.id,
            old_status: oldStatus,
            new_status: request.status,
            property_id: request.property_id,
            updated_at: new Date().toISOString(),
            updated_by: req.user.id
          });

          // Also broadcast to property-specific room
          global.io.to(`maintenance-property-${request.property_id}`).emit('maintenance_status_changed', {
            request_id: request.id,
            old_status: oldStatus,
            new_status: request.status,
            updated_at: new Date().toISOString(),
            updated_by: req.user.id
          });

          console.log(`Maintenance request ${request.id} status updated via Socket.io`);
        } catch (socketError) {
          console.warn('Failed to emit Socket.io status update:', socketError);
        }
      }

      res.status(HTTP_STATUS.OK).json({
        success: true,
        message: 'Maintenance request updated',
        data: request
      });
    } catch (error) {
      next(error);
    }
  }

  // Soft Delete Methods
  static async archiveRequest(req, res, next) {
    try {
      const { id } = req.params;
      const result = await MaintenanceService.archiveRequest(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Maintenance request archived', data: result });
    } catch (error) { next(error); }
  }

  static async restoreRequest(req, res, next) {
    try {
      const { id } = req.params;
      const result = await MaintenanceService.restoreRequest(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Maintenance request restored', data: result });
    } catch (error) { next(error); }
  }

  static async permanentDeleteRequest(req, res, next) {
    try {
      const { id } = req.params;
      if (req.user.role !== 'super_admin') {
        return res.status(HTTP_STATUS.FORBIDDEN).json({ error: 'Only super admins can permanently delete records' });
      }
      const result = await MaintenanceService.permanentDeleteRequest(id, req.user);
      res.status(HTTP_STATUS.OK).json({ success: true, message: 'Maintenance request permanently deleted', data: result });
    } catch (error) { next(error); }
  }
}

module.exports = MaintenanceController;
