const AuditService = require('../services/auditService');
const db = require('../utils/database');

/**
 * Audit Middleware - Automatically logs operations
 * 
 * Usage:
 *   router.post('/tenants', authenticate, authorize(ROLES.ADMIN), auditMiddleware, tenantController.create)
 * 
 * The middleware will:
 * 1. Capture the request (method, body, user)
 * 2. Call the next middleware/controller
 * 3. Log the operation with before/after values
 */

/**
 * Audit middleware for operations
 * Logs create, update, delete operations with before/after values
 */
function auditMiddleware(req, res, next) {
  // Store original response.json for later
  const originalJson = res.json;

  // Store request data for later use
  // Capture user email and role at time of request (not dynamically later)
  req.auditData = {
    userId: req.user?.id,
    userEmail: req.user?.email || null,
    userRole: req.user?.role || null,
    ipAddress: getClientIp(req),
    userAgent: req.headers['user-agent'] || 'Unknown',
    sessionId: req.headers['x-session-id'] || null,
    action: getActionFromMethod(req.method),
    resourceType: null,
    resourceId: null,
    oldValues: null,
    newValues: null
  };

  // Extract resource type and ID from route
  const pathSegments = req.path.split('/').filter(s => s);
  if (pathSegments.length > 0) {
    // Determine resource type from first path segment
    const resourceTypeMap = {
      'tenants': 'tenant',
      'properties': 'property',
      'maintenance': 'maintenance',
      'payments': 'payment',
      'notifications': 'notification',
      'documents': 'document',
      'users': 'user'
    };

    req.auditData.resourceType = resourceTypeMap[pathSegments[0]] || pathSegments[0];

    // Extract resource ID if present
    const idParam = pathSegments[1];
    if (idParam && !isNaN(idParam)) {
      req.auditData.resourceId = parseInt(idParam);
    }
  }

  // For UPDATE operations, fetch the old values
  if (req.method === 'PUT' || req.method === 'PATCH') {
    captureOldValues(req, res)
      .then(oldValues => {
        req.auditData.oldValues = redactSensitive(oldValues);
        req.auditData.newValues = redactSensitive(req.body);

        // Override response.json to capture the response
        res.json = function(data) {
          // Call original with same context
          originalJson.call(this, data);

          // Log the successful operation
          logAuditAsync(req.auditData, 'success');
        };

        next();
      })
      .catch(err => {
        console.error('Error capturing old values:', err);
        // Continue anyway - don't block the request
        req.auditData.newValues = redactSensitive(req.body);

        res.json = function(data) {
          originalJson.call(this, data);
          logAuditAsync(req.auditData, 'success');
        };

        next();
      });
  } else if (req.method === 'POST') {
    // For CREATE operations, the new values are in the request body
    req.auditData.newValues = redactSensitive(req.body);

    res.json = function(data) {
      originalJson.call(this, data);

      // Extract created resource ID if available
      if (data && data.data && data.data.id) {
        req.auditData.resourceId = data.data.id;
      }

      logAuditAsync(req.auditData, 'success');
    };

    next();
  } else if (req.method === 'DELETE') {
    // For DELETE operations, capture the old values
    captureOldValues(req, res)
      .then(oldValues => {
        req.auditData.oldValues = redactSensitive(oldValues);

        res.json = function(data) {
          originalJson.call(this, data);
          logAuditAsync(req.auditData, 'success');
        };

        next();
      })
      .catch(err => {
        console.error('Error capturing old values for delete:', err);
        res.json = function(data) {
          originalJson.call(this, data);
          logAuditAsync(req.auditData, 'success');
        };

        next();
      });
  } else {
    // For other methods, just call next
    next();
  }
}

/**
 * Capture old values before an update/delete
 * Fetches the current state from database
 */
async function captureOldValues(req, res) {
  try {
    if (!req.auditData.resourceType || !req.auditData.resourceId) {
      return null;
    }

    const resourceId = req.auditData.resourceId;
    const resourceType = req.auditData.resourceType;

    // Map resource type to table name
    const tableMap = {
      'tenant': 'tenants',
      'property': 'properties',
      'maintenance': 'maintenance_requests',
      'payment': 'payments',
      'notification': 'notifications',
      'document': 'documents',
      'user': 'users'
    };

    const tableName = tableMap[resourceType];
    if (!tableName) {
      return null;
    }

    // Fetch current record
    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const result = await db.query(query, [resourceId]);

    if (result.rows.length > 0) {
      // Exclude sensitive fields from audit
      const row = result.rows[0];
      const sensitiveFields = ['password', 'password_hash', 'api_key', 'secret', 'token', 'refresh_token', 'authorization'];
      
      const filtered = {};
      for (const [key, value] of Object.entries(row)) {
        if (!sensitiveFields.includes(key)) {
          filtered[key] = value;
        }
      }

      return filtered;
    }

    return null;
  } catch (error) {
    console.error('Error capturing old values:', error);
    return null;
  }
}

function redactSensitive(value) {
  const keys = [
    'password',
    'password_hash',
    'api_key',
    'secret',
    'token',
    'refresh_token',
    'authorization',
    'ssn',
    'bank_account',
    'routing_number',
    'account_number'
  ];

  const walk = (input) => {
    if (input === null || input === undefined) return input;
    if (Array.isArray(input)) return input.map(walk);
    if (typeof input !== 'object') return input;

    const output = {};
    for (const [k, v] of Object.entries(input)) {
      const keyLower = String(k).toLowerCase();
      const isSensitive =
        keys.includes(keyLower) ||
        keyLower.includes('password') ||
        keyLower.includes('token') ||
        keyLower.includes('secret') ||
        keyLower.includes('ssn') ||
        keyLower.includes('bank');
      output[k] = isSensitive ? '[REDACTED]' : walk(v);
    }
    return output;
  };

  return walk(value);
}

/**
 * Log audit entry asynchronously
 * This shouldn't block the response
 */
function logAuditAsync(auditData, status, errorMessage = null) {
  // Only log if we have required data
  if (!auditData.userId || !auditData.action || !auditData.resourceType) {
    return;
  }

  // Log in background (don't wait)
  AuditService.logOperation({
    userId: auditData.userId,
    userEmail: auditData.userEmail,
    userRole: auditData.userRole,
    action: auditData.action,
    resourceType: auditData.resourceType,
    resourceId: auditData.resourceId,
    oldValues: auditData.oldValues,
    newValues: auditData.newValues,
    ipAddress: auditData.ipAddress,
    userAgent: auditData.userAgent,
    sessionId: auditData.sessionId,
    status: status,
    errorMessage: errorMessage
  }).catch(err => {
    console.error('Failed to log audit entry:', err);
  });
}

/**
 * Get client IP address from request
 * Handles proxies and load balancers
 */
function getClientIp(req) {
  return (
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    req.connection?.remoteAddress ||
    req.ip ||
    'Unknown'
  );
}

/**
 * Convert HTTP method to audit action
 */
function getActionFromMethod(method) {
  const methodMap = {
    'POST': 'create',
    'PUT': 'update',
    'PATCH': 'update',
    'DELETE': 'delete',
    'GET': 'read'
  };

  return methodMap[method] || method.toLowerCase();
}

/**
 * Error handler for audit logging
 * Wraps controllers to log failed operations
 */
function auditErrorHandler(controller) {
  return async (req, res, next) => {
    const originalJson = res.json;
    const auditData = req.auditData || {};

    res.json = function(data) {
      // Check if this is an error response
      if (res.statusCode >= 400 && auditData.userId) {
        const errorMessage = data?.message || data?.error || 'Unknown error';
        logAuditAsync(auditData, 'failed', errorMessage);
      }

      originalJson.call(this, data);
    };

    try {
      await controller(req, res, next);
    } catch (error) {
      if (auditData.userId) {
        logAuditAsync(auditData, 'failed', error.message);
      }
      next(error);
    }
  };
}

/**
 * Selective audit middleware
 * Only audits specific actions
 */
function selectiveAudit(actions = ['create', 'update', 'delete']) {
  return (req, res, next) => {
    const method = req.method;
    const action = getActionFromMethod(method);

    if (actions.includes(action)) {
      auditMiddleware(req, res, next);
    } else {
      next();
    }
  };
}

function auditView(resourceType, getResourceId) {
  return (req, res, next) => {
    const user = req.user;
    if (!user?.id) return next();

    const auditData = {
      userId: user.id,
      userEmail: user.email || null,
      userRole: user.role || null,
      ipAddress: getClientIp(req),
      userAgent: req.headers['user-agent'] || 'Unknown',
      sessionId: req.headers['x-session-id'] || null,
      action: 'read',
      resourceType,
      resourceId: typeof getResourceId === 'function' ? getResourceId(req) : null,
      oldValues: null,
      newValues: null
    };

    res.on('finish', () => {
      if (res.statusCode >= 400) {
        logAuditAsync(auditData, 'failed', `HTTP ${res.statusCode}`);
        return;
      }
      logAuditAsync(auditData, 'success');
    });

    next();
  };
}

module.exports = {
  auditMiddleware,
  auditErrorHandler,
  selectiveAudit,
  auditView,
  logAuditAsync
};
