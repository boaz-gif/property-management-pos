const Database = require('../../utils/database');
const redisClient = require('../../config/redis');

const ENFORCE_PROPERTY_OWNERSHIP = process.env.ENFORCE_PROPERTY_OWNERSHIP !== 'false';

// Cache configuration for property organization lookups
const PROPERTY_ORG_CACHE_TTL = 86400; // 24 hours in seconds
const PROPERTY_ORG_CACHE_PREFIX = 'property:org:';

// Cache configuration for permissions checks
const PERMISSION_CACHE_TTL = 600; // 10 minutes in seconds
const PERMISSION_CACHE_PREFIX = 'permission:';

class PermissionService {
  static normalizeLegacyRole(role) {
    if (!role) return null;
    if (role === 'super_admin') return 'SUPER_ADMIN';
    if (role === 'admin') return 'ADMIN';
    if (role === 'tenant') return 'TENANT';
    return null;
  }

  static async hasScopedRole(userId, roleNames, propertyId, organizationId) {
    const values = [userId, roleNames];
    const hasPropertyScope = propertyId !== null && propertyId !== undefined && propertyId !== '';
    const hasOrgScope = organizationId !== null && organizationId !== undefined && organizationId !== '';

    let scopeClause = 'TRUE';
    if (hasPropertyScope || hasOrgScope) {
      const scopeParts = ['(ur.property_id IS NULL AND ur.organization_id IS NULL)'];
      let paramIndex = 3;
      if (hasPropertyScope) {
        values.push(parseInt(propertyId));
        scopeParts.push(`ur.property_id = $${paramIndex}`);
        paramIndex += 1;
      }
      if (hasOrgScope) {
        values.push(parseInt(organizationId));
        scopeParts.push(`ur.organization_id = $${paramIndex}`);
        paramIndex += 1;
      }
      scopeClause = `(${scopeParts.join(' OR ')})`;
    }

    const result = await Database.query(
      `
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1
        AND r.name = ANY($2)
        AND ur.valid_from <= NOW()
        AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
        AND ${scopeClause}
      LIMIT 1;
      `,
      values
    );
    return result.rows.length > 0;
  }

  /**
   * Generate a cache key for permission checks
   */
  static _getPermissionCacheKey(userId, resource, action, propertyId, organizationId) {
    return `${PERMISSION_CACHE_PREFIX}${userId}:${resource}:${action}:${propertyId || 'null'}:${organizationId || 'null'}`;
  }

  /**
   * Check if user has permission with caching
   * Uses Redis cache with 10-minute TTL since permissions only change on login
   */
  static async hasPermission(user, resource, action, scope = {}) {
    const userId = user?.id;
    if (!userId) return false;

    const propertyId = typeof scope === 'object' && scope !== null ? scope.propertyId : scope;
    const organizationId = typeof scope === 'object' && scope !== null ? scope.organizationId : undefined;

    const hasPropertyScope = propertyId !== null && propertyId !== undefined && propertyId !== '';
    const hasOrgScope = organizationId !== null && organizationId !== undefined && organizationId !== '';

    // Generate cache key
    const cacheKey = this._getPermissionCacheKey(userId, resource, action, propertyId, organizationId);
    
    // Try to get from cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return cached === true || cached === 'true';
      }
    } catch (cacheError) {
      console.warn('[PermissionService] Permission cache read failed, falling back to DB:', cacheError.message);
    }

    // Build query and execute
    const values = [userId, resource, action];
    let scopeClause = 'TRUE';
    if (hasPropertyScope || hasOrgScope) {
      const scopeParts = ['(ur.property_id IS NULL AND ur.organization_id IS NULL)'];
      let paramIndex = 4;
      if (hasPropertyScope) {
        values.push(parseInt(propertyId));
        scopeParts.push(`ur.property_id = $${paramIndex}`);
        paramIndex += 1;
      }
      if (hasOrgScope) {
        values.push(parseInt(organizationId));
        scopeParts.push(`ur.organization_id = $${paramIndex}`);
        paramIndex += 1;
      }
      scopeClause = `(${scopeParts.join(' OR ')})`;
    }

    const result = await Database.query(
      `
      SELECT 1
      FROM user_roles ur
      JOIN role_permissions rp ON rp.role_id = ur.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE ur.user_id = $1
        AND p.resource = $2
        AND p.action = $3
        AND ur.valid_from <= NOW()
        AND (ur.valid_until IS NULL OR ur.valid_until > NOW())
        AND ${scopeClause}
      LIMIT 1;
      `,
      values
    );

    if (result.rows.length > 0) {
      // Cache the positive result
      try {
        await redisClient.set(cacheKey, true, PERMISSION_CACHE_TTL);
      } catch (cacheError) {
        // Silently ignore cache write failures
      }
      return true;
    }

    const legacyRoleName = this.normalizeLegacyRole(user.role);
    if (!legacyRoleName) {
      // Cache the negative result for legacy role check
      try {
        await redisClient.set(cacheKey, false, PERMISSION_CACHE_TTL);
      } catch (cacheError) {
        // Silently ignore cache write failures
      }
      return false;
    }

    const fallback = await Database.query(
      `
      SELECT 1
      FROM roles r
      JOIN role_permissions rp ON rp.role_id = r.id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = $1
        AND p.resource = $2
        AND p.action = $3
      LIMIT 1;
      `,
      [legacyRoleName, resource, action]
    );
    
    const hasPermission = fallback.rows.length > 0;
    
    // Cache the result
    try {
      await redisClient.set(cacheKey, hasPermission, PERMISSION_CACHE_TTL);
    } catch (cacheError) {
      // Silently ignore cache write failures
    }
    
    return hasPermission;
  }

  static async ensureOrganizationAccess(user, organizationId) {
    const userId = user?.id;
    if (!userId) throw new Error('Access denied');

    if (user?.role === 'super_admin') return true;
    if (await this.hasScopedRole(userId, ['SUPER_ADMIN'], null, null)) return true;

    if (organizationId === null || organizationId === undefined || organizationId === '') {
      throw new Error('Access denied: organization scope required');
    }

    const orgAllowed = await this.hasScopedRole(userId, ['ADMIN'], null, organizationId);
    if (orgAllowed) return true;

    const memberRes = await Database.query(
      'SELECT 1 FROM organization_members WHERE organization_id = $1 AND user_id = $2 LIMIT 1',
      [organizationId, userId]
    );
    if (memberRes.rows.length > 0) return true;

    if (user.role === 'admin') {
      const properties = user?.properties || [];
      if (properties.length > 0) {
        const res = await Database.query(
          'SELECT 1 FROM properties WHERE id = ANY($1) AND organization_id = $2 AND deleted_at IS NULL LIMIT 1',
          [properties, parseInt(organizationId)]
        );
        if (res.rows.length > 0) return true;
      }
    }

    if (user.role === 'tenant' && user.property_id) {
      const res = await Database.query(
        'SELECT 1 FROM properties WHERE id = $1 AND organization_id = $2 AND deleted_at IS NULL LIMIT 1',
        [parseInt(user.property_id), parseInt(organizationId)]
      );
      if (res.rows.length > 0) return true;
    }

    throw new Error('Access denied: You do not have access to this organization');
  }

  static async getOrganizationIdForProperty(propertyId) {
    if (propertyId === null || propertyId === undefined || propertyId === '') return null;
    
    const parsedPropertyId = parseInt(propertyId);
    if (!Number.isFinite(parsedPropertyId)) return null;
    
    const cacheKey = `${PROPERTY_ORG_CACHE_PREFIX}${parsedPropertyId}`;
    
    // Try to get from Redis cache first
    try {
      const cached = await redisClient.get(cacheKey);
      if (cached !== null && cached !== undefined) {
        return cached;
      }
    } catch (cacheError) {
      console.warn('[PermissionService] Redis cache read failed, falling back to DB:', cacheError.message);
    }
    
    // Query from database
    const result = await Database.query('SELECT organization_id FROM properties WHERE id = $1', [parsedPropertyId]);
    const organizationId = result.rows[0]?.organization_id ?? null;
    
    // Store in cache for future requests (24 hour TTL)
    if (organizationId !== null) {
      try {
        await redisClient.set(cacheKey, organizationId, PROPERTY_ORG_CACHE_TTL);
      } catch (cacheError) {
        console.warn('[PermissionService] Redis cache write failed:', cacheError.message);
      }
    }
    
    return organizationId;
  }
  
  /**
   * Invalidate the cached organization_id for a property.
   * Call this when a property's organization is changed.
   */
  static async invalidatePropertyOrgCache(propertyId) {
    const parsedPropertyId = parseInt(propertyId);
    if (!Number.isFinite(parsedPropertyId)) return;
    
    const cacheKey = `${PROPERTY_ORG_CACHE_PREFIX}${parsedPropertyId}`;
    try {
      await redisClient.del(cacheKey);
    } catch (cacheError) {
      console.warn('[PermissionService] Redis cache invalidation failed:', cacheError.message);
    }
  }

  static async ensurePropertyAccess(user, propertyId) {
    if (user?.role === 'super_admin') return true;

    if (await this.hasScopedRole(user.id, ['SUPER_ADMIN'], null, null)) return true;

    if (propertyId === null || propertyId === undefined || propertyId === '') {
      throw new Error('Access denied: property scope required');
    }

    const parsedPropertyId = parseInt(propertyId);

    if (user?.role === 'tenant') {
      if (parseInt(user?.property_id) === parsedPropertyId) return true;
      throw new Error('Access denied: You do not have access to this property');
    }

    if (ENFORCE_PROPERTY_OWNERSHIP && user?.role === 'admin') {
      const legacyProperties = Array.isArray(user?.properties) ? user.properties : [];
      if (legacyProperties.includes(parsedPropertyId)) return true;

      const ownershipRes = await Database.query(
        'SELECT 1 FROM properties WHERE id = $1 AND admin_id = $2 AND deleted_at IS NULL LIMIT 1',
        [parsedPropertyId, user.id]
      );
      if (ownershipRes.rows.length > 0) return true;
      throw new Error('Access denied: You do not own this property');
    }

    const allowed = await this.hasScopedRole(
      user.id,
      ['ADMIN', 'PROPERTY_MANAGER', 'ACCOUNTANT', 'MAINTENANCE_STAFF'],
      propertyId,
      null
    );
    if (allowed) return true;

    const legacyRole = user?.role;
    if (legacyRole === 'admin') {
      const properties = user?.properties || [];
      if (properties.includes(parseInt(propertyId))) return true;
    }

    throw new Error('Access denied: You do not have access to this property');
  }

  static async ensureTenantAccess(user, tenantId) {
    const userId = user?.id;
    if (!userId) throw new Error('Access denied');

    if (user.role === 'super_admin') return true;
    if (await this.hasScopedRole(userId, ['SUPER_ADMIN'], null, null)) return true;

    const result = await Database.query('SELECT id, user_id, property_id FROM tenants WHERE id = $1', [tenantId]);
    if (result.rows.length === 0) {
      throw new Error('Tenant not found');
    }

    const tenant = result.rows[0];

    const isTenant =
      user.role === 'tenant' || (await this.hasScopedRole(userId, ['TENANT'], tenant.property_id, null));

    if (isTenant) {
      if (parseInt(tenant.user_id) !== parseInt(userId)) {
        throw new Error('Access denied: You can only access your own data');
      }
      return true;
    }

    const isAdminLike =
      user.role === 'admin' || (await this.hasScopedRole(userId, ['ADMIN', 'PROPERTY_MANAGER'], tenant.property_id, null));

    if (isAdminLike) {
      await this.ensurePropertyAccess(user, tenant.property_id);
      return true;
    }

    throw new Error('Access denied');
  }

  static async ensurePermission(user, resource, action, context = {}) {
    let propertyId = context.propertyId ?? context?.activeProperty ?? user?.property_id ?? null;
    let organizationId = context.organizationId ?? context?.activeOrganization ?? null;
    let tenantId = context.tenantId ?? null;

    if (resource === 'document' && context.documentId) {
      const docRes = await Database.query('SELECT tenant_id, property_id FROM documents WHERE id = $1', [context.documentId]);
      if (docRes.rows.length > 0) {
        if (tenantId === null || tenantId === undefined || tenantId === '') {
          tenantId = docRes.rows[0].tenant_id;
        }
        if (propertyId === null || propertyId === undefined || propertyId === '') {
          propertyId = docRes.rows[0].property_id;
        }
      }
    }

    if ((organizationId === null || organizationId === undefined || organizationId === '') && propertyId !== null && propertyId !== undefined && propertyId !== '') {
      organizationId = await this.getOrganizationIdForProperty(propertyId);
    }

    const ok = await this.hasPermission(user, resource, action, { propertyId, organizationId });
    if (!ok) {
      throw new Error('Access denied');
    }

    if ((tenantId === null || tenantId === undefined || tenantId === '') && resource === 'payment' && context.paymentId) {
      const paymentRes = await Database.query('SELECT tenant_id FROM payments WHERE id = $1', [context.paymentId]);
      if (paymentRes.rows.length > 0) {
        tenantId = paymentRes.rows[0].tenant_id;
      }
    }

    if ((tenantId === null || tenantId === undefined || tenantId === '') && resource === 'maintenance' && context.maintenanceId) {
      const maintenanceRes = await Database.query('SELECT tenant_id FROM maintenance WHERE id = $1', [context.maintenanceId]);
      if (maintenanceRes.rows.length > 0) {
        tenantId = maintenanceRes.rows[0].tenant_id;
      }
    }

    if (resource === 'property' && propertyId !== null) {
      await this.ensurePropertyAccess(user, propertyId);
      return true;
    }

    if ((resource === 'organization' || resource === 'team' || resource === 'workflow' || resource === 'work_item') && organizationId !== null && organizationId !== undefined && organizationId !== '') {
      await this.ensureOrganizationAccess(user, organizationId);
      return true;
    }

    if (tenantId !== null && tenantId !== undefined && tenantId !== '') {
      if (resource === 'tenant' || resource === 'payment' || resource === 'maintenance' || resource === 'document') {
        await this.ensureTenantAccess(user, tenantId);
      }
    }

    return true;
  }
}

module.exports = PermissionService;
