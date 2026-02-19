const Database = require('./database');
const ConversationService = require('../services/conversationService');

class SocketIOConfig {
  static initialize(io) {
    console.log('Initializing Socket.io...');

    // Middleware for authentication
    io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      const userId = socket.handshake.auth.userId;
      const userRole = socket.handshake.auth.userRole;

      if (!token || !userId) {
        console.warn('Socket connection attempt without valid auth');
        return next(new Error('Authentication error'));
      }

      try {
        const res = await Database.query(
          `
            SELECT id, role, property_id, properties
            FROM users
            WHERE id = $1 AND deleted_at IS NULL
          `,
          [parseInt(userId, 10)]
        );
        const user = res.rows[0];
        if (!user) {
          return next(new Error('Authentication error'));
        }

        socket.user = user;
        socket.userId = String(user.id);
        socket.userRole = user.role || userRole;
        socket.token = token;

        next();
      } catch (err) {
        return next(new Error('Authentication error'));
      }
    });

    // Handle client connections
    io.on('connection', (socket) => {
      console.log(`Socket connected: ${socket.id} (User: ${socket.userId})`);

      // Join user to their own room for private messages
      socket.join(`user-${socket.userId}`);

      // Send welcome message
      socket.emit('connect_success', {
        message: 'Connected to real-time server',
        socketId: socket.id,
        userId: socket.userId
      });

      // ====== MAINTENANCE REQUEST NAMESPACE ======
      this.setupMaintenanceNamespace(io, socket);

      // ====== LEASE UPDATE NAMESPACE ======
      this.setupLeaseNamespace(io, socket);

      // ====== ADMIN NOTIFICATIONS NAMESPACE ======
      this.setupAdminNotificationNamespace(io, socket);

      this.setupCommunicationHubNamespace(io, socket);

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`Socket disconnected: ${socket.id} (User: ${socket.userId})`);
      });

      // Error handling
      socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
      });
    });

    console.log('Socket.io initialized successfully');
  }

  /**
   * Setup maintenance request real-time updates
   */
  static setupMaintenanceNamespace(io, socket) {
    // Join maintenance room if user is admin
    if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
      socket.join('maintenance-admins');
      console.log(`Admin ${socket.userId} joined maintenance-admins room`);
    }

    // Tenant joins their property's maintenance room
    socket.on('join_property_maintenance', (propertyId) => {
      socket.join(`maintenance-property-${propertyId}`);
      console.log(`User ${socket.userId} joined maintenance-property-${propertyId}`);
    });

    // Listen for new maintenance requests from tenants
    socket.on('maintenance_request_created', (data) => {
      // Broadcast to admins in maintenance-admins room
      io.to('maintenance-admins').emit('new_maintenance_request', {
        id: data.id,
        tenant_name: data.tenant_name,
        tenant_id: data.tenant_id,
        property_id: data.property_id,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: data.status,
        created_at: data.created_at,
        timestamp: new Date().toISOString()
      });

      console.log(`Maintenance request created: ${data.id} (Tenant: ${data.tenant_id})`);
    });

    // Listen for maintenance status updates
    socket.on('maintenance_status_updated', (data) => {
      // Broadcast to relevant parties
      io.to(`maintenance-property-${data.property_id}`).emit('maintenance_status_changed', {
        request_id: data.request_id,
        old_status: data.old_status,
        new_status: data.new_status,
        updated_at: new Date().toISOString(),
        updated_by: socket.userId
      });

      // Also notify admins
      io.to('maintenance-admins').emit('maintenance_status_changed', {
        request_id: data.request_id,
        old_status: data.old_status,
        new_status: data.new_status,
        updated_at: new Date().toISOString(),
        updated_by: socket.userId
      });

      console.log(`Maintenance request ${data.request_id} status updated: ${data.old_status} -> ${data.new_status}`);
    });

    // Admin acknowledges/responds to maintenance request
    socket.on('maintenance_acknowledged', (data) => {
      io.to(`maintenance-property-${data.property_id}`).emit('maintenance_acknowledged', {
        request_id: data.request_id,
        acknowledged_by: socket.userId,
        message: data.message,
        acknowledged_at: new Date().toISOString()
      });

      console.log(`Maintenance request ${data.request_id} acknowledged by admin ${socket.userId}`);
    });
  }

  /**
   * Setup lease update real-time notifications
   */
  static setupLeaseNamespace(io, socket) {
    // Admins join lease updates room
    if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
      socket.join('lease-admins');
    }

    // Listen for lease expiration alerts
    socket.on('lease_expiration_alert', (data) => {
      io.to('lease-admins').emit('lease_expiration_notification', {
        tenant_id: data.tenant_id,
        tenant_name: data.tenant_name,
        property_name: data.property_name,
        lease_end_date: data.lease_end_date,
        days_remaining: data.days_remaining,
        alert_type: data.alert_type, // 'expiring_soon' or 'expired'
        timestamp: new Date().toISOString()
      });

      console.log(`Lease alert: ${data.tenant_name} - ${data.days_remaining} days remaining`);
    });

    // Listen for lease renewal events
    socket.on('lease_renewed', (data) => {
      io.to('lease-admins').emit('lease_renewal_notification', {
        tenant_id: data.tenant_id,
        tenant_name: data.tenant_name,
        old_end_date: data.old_end_date,
        new_end_date: data.new_end_date,
        renewed_by: socket.userId,
        timestamp: new Date().toISOString()
      });

      console.log(`Lease renewed for tenant ${data.tenant_name}`);
    });
  }

  /**
   * Setup admin notification distribution
   */
  static setupAdminNotificationNamespace(io, socket) {
    // Admin joins their notification room
    if (socket.userRole === 'admin' || socket.userRole === 'super_admin') {
      socket.join(`admin-${socket.userId}`);
      socket.join('all-admins');
    }

    // Listen for broadcast notifications
    socket.on('broadcast_admin_notification', (data) => {
      io.to('all-admins').emit('admin_notification', {
        type: data.type,
        title: data.title,
        message: data.message,
        severity: data.severity, // 'info', 'warning', 'error'
        data: data.data,
        timestamp: new Date().toISOString()
      });

      console.log(`Admin notification broadcast: ${data.title}`);
    });

    // Listen for user-specific notifications
    socket.on('send_user_notification', (data) => {
      io.to(`user-${data.user_id}`).emit('notification_received', {
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data,
        timestamp: new Date().toISOString()
      });

      console.log(`Notification sent to user ${data.user_id}`);
    });
  }

  static setupCommunicationHubNamespace(io, socket) {
    socket.on('hub:join_conversation', async (conversationId, callback) => {
      try {
        const userId = parseInt(socket.userId, 10);
        const convRes = await Database.query(
          'SELECT kind, entity_type, entity_id FROM conversations WHERE id = $1',
          [conversationId]
        );
        const conv = convRes.rows[0] || null;
        const isStrict = conv?.kind === 'tenant_community' || conv?.kind === 'tenant_admin_dm';

        const allowed = await Database.query(
          `
            SELECT 1
            FROM conversation_participants
            WHERE conversation_id = $1
              AND user_id = $2
              AND left_at IS NULL
          `,
          [conversationId, userId]
        );

        if (allowed.rows.length === 0 && (socket.userRole !== 'super_admin' || isStrict)) {
          if (typeof callback === 'function') callback({ success: false, error: 'Access denied' });
          return;
        }

        if (socket.userRole !== 'super_admin') {
          if (conv?.entity_type && conv?.entity_id) {
            await ConversationService.ensureEntityAccess(socket.user || { id: userId, role: socket.userRole }, conv.entity_type, conv.entity_id);
          }
        }

        socket.join(`conversation-${conversationId}`);
        if (typeof callback === 'function') callback({ success: true });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, error: 'Join failed' });
      }
    });

    socket.on('hub:leave_conversation', (conversationId, callback) => {
      socket.leave(`conversation-${conversationId}`);
      if (typeof callback === 'function') callback({ success: true });
    });

    socket.on('hub:typing', (data) => {
      const conversationId = data?.conversation_id;
      if (!conversationId) return;
      socket.to(`conversation-${conversationId}`).emit('hub:typing', {
        conversation_id: conversationId,
        user_id: socket.userId,
        is_typing: Boolean(data?.is_typing)
      });
    });

    socket.on('hub:send_message', async (data, callback) => {
      try {
        const conversationId = data?.conversation_id;
        const content = data?.content;
        const attachments = data?.attachments;

        if (!conversationId || !content) {
          if (typeof callback === 'function') callback({ success: false, error: 'Invalid payload' });
          return;
        }

        const user = socket.user || { id: parseInt(socket.userId, 10), role: socket.userRole };
        const message = await ConversationService.createMessage(user, conversationId, { content, attachments });
        if (typeof callback === 'function') callback({ success: true, data: message });
      } catch (error) {
        if (typeof callback === 'function') callback({ success: false, error: error.message || 'Send failed' });
      }
    });
  }
}

module.exports = SocketIOConfig;
