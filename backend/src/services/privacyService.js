const Database = require('../utils/database');
const PermissionService = require('./PermissionService');
const AuditService = require('./auditService');

class PrivacyService {
  static async exportMyData(user, context) {
    const bundle = await this.exportUserBundle(user, user.id, context);
    return bundle;
  }

  static async exportTenantData(user, tenantId, context) {
    await PermissionService.ensureTenantAccess(user, tenantId);

    const tenantRes = await Database.query(
      'SELECT id, user_id FROM tenants WHERE id = $1 AND deleted_at IS NULL',
      [tenantId]
    );
    const targetUserId = tenantRes.rows[0]?.user_id;
    if (!targetUserId) {
      throw new Error('Tenant not found');
    }

    const bundle = await this.exportUserBundle(user, targetUserId, context, { tenantId: parseInt(tenantId, 10) });
    return bundle;
  }

  static async exportUserBundle(requestingUser, targetUserId, context, options = {}) {
    const userRes = await Database.query(
      `
        SELECT id, name, email, role, property_id, properties, created_at, updated_at, deleted_at
        FROM users
        WHERE id = $1
      `,
      [targetUserId]
    );
    const targetUser = userRes.rows[0];
    if (!targetUser) throw new Error('User not found');

    const tenantRes = await Database.query(
      'SELECT * FROM tenants WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [targetUserId]
    );
    const tenant = tenantRes.rows[0] || null;
    const tenantId = options.tenantId || tenant?.id || null;

    const [paymentsRes, maintenanceRes, documentsRes, leasesRes, notificationsRes] = await Promise.all([
      tenantId
        ? Database.query('SELECT * FROM payments WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 200', [tenantId])
        : Promise.resolve({ rows: [] }),
      tenantId
        ? Database.query('SELECT * FROM maintenance WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 200', [tenantId])
        : Promise.resolve({ rows: [] }),
      Database.query('SELECT * FROM documents WHERE (user_id = $1 OR uploaded_by = $1) ORDER BY created_at DESC LIMIT 200', [targetUserId]),
      tenantId
        ? Database.query('SELECT * FROM leases WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 50', [tenantId])
        : Promise.resolve({ rows: [] }),
      Database.query('SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 200', [targetUserId])
    ]);

    const bundle = {
      generated_at: new Date().toISOString(),
      user: targetUser,
      tenant,
      payments: paymentsRes.rows,
      maintenance_requests: maintenanceRes.rows,
      documents: documentsRes.rows,
      leases: leasesRes.rows,
      notifications: notificationsRes.rows
    };

    if (context?.audit) {
      await AuditService.logOperation({
        userId: requestingUser.id,
        userEmail: requestingUser.email,
        userRole: requestingUser.role,
        action: 'export',
        resourceType: 'privacy',
        resourceId: tenantId || targetUserId,
        oldValues: null,
        newValues: { target_user_id: targetUserId, tenant_id: tenantId },
        ipAddress: context.audit.ipAddress,
        userAgent: context.audit.userAgent,
        status: 'success',
        errorMessage: null
      });
    }

    return bundle;
  }

  static async deleteMyAccount(user, context) {
    if (user.role !== 'tenant') {
      throw new Error('Only tenants can self-delete via this endpoint');
    }
    const tenantRes = await Database.query('SELECT id FROM tenants WHERE user_id = $1 AND deleted_at IS NULL', [user.id]);
    const tenantId = tenantRes.rows[0]?.id || null;
    await this.deleteUserAndTenant(user, tenantId, user.id, context);
    return true;
  }

  static async deleteTenant(user, tenantId, context) {
    await PermissionService.ensureTenantAccess(user, tenantId);
    const tenantRes = await Database.query('SELECT user_id FROM tenants WHERE id = $1 AND deleted_at IS NULL', [tenantId]);
    const targetUserId = tenantRes.rows[0]?.user_id;
    if (!targetUserId) throw new Error('Tenant not found');
    await this.deleteUserAndTenant(user, parseInt(tenantId, 10), targetUserId, context);
    return true;
  }

  static async deleteUserAndTenant(requestingUser, tenantId, targetUserId, context) {
    await Database.transaction(async (client) => {
      if (tenantId) {
        await client.query(
          'UPDATE tenants SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL',
          [tenantId, requestingUser.id]
        );
      }

      await client.query(
        `
          UPDATE notifications
          SET deleted_at = NOW(), deleted_by = $2
          WHERE user_id = $1 AND deleted_at IS NULL
        `,
        [targetUserId, requestingUser.id]
      );

      await client.query(
        'UPDATE users SET deleted_at = NOW(), deleted_by = $2 WHERE id = $1 AND deleted_at IS NULL',
        [targetUserId, requestingUser.id]
      );
    });

    if (context?.audit) {
      await AuditService.logOperation({
        userId: requestingUser.id,
        userEmail: requestingUser.email,
        userRole: requestingUser.role,
        action: 'delete',
        resourceType: 'privacy',
        resourceId: tenantId || targetUserId,
        oldValues: null,
        newValues: { target_user_id: targetUserId, tenant_id: tenantId },
        ipAddress: context.audit.ipAddress,
        userAgent: context.audit.userAgent,
        status: 'success',
        errorMessage: null
      });
    }
  }
}

module.exports = PrivacyService;
