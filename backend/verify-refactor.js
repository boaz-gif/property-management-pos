try {
  const Tenant = require('./src/models/Tenant');
  const Payment = require('./src/models/Payment');
  const Maintenance = require('./src/models/Maintenance');
  const TenantService = require('./src/services/tenantService');
  const PermissionService = require('./src/services/PermissionService');
  const scopeMiddleware = require('./src/middleware/scopeMiddleware');

  console.log('All modules imported successfully.');
  
  // Basic checks
  if (typeof Tenant.findByUserId !== 'function') throw new Error('Tenant.findByUserId missing');
  if (typeof Tenant.findByEmail !== 'function') throw new Error('Tenant.findByEmail missing');
  if (typeof Payment.getPaymentHistory !== 'function') throw new Error('Payment.getPaymentHistory missing');
  if (typeof Maintenance.findByTenantId !== 'function') throw new Error('Maintenance.findByTenantId missing');
  if (typeof TenantService.getTenantByUserId !== 'function') throw new Error('TenantService.getTenantByUserId missing');
  if (typeof PermissionService.ensurePropertyAccess !== 'function') throw new Error('PermissionService.ensurePropertyAccess missing');
  
  console.log('Method existence checks passed.');
} catch (error) {
  console.error('Verification failed:', error);
  process.exit(1);
}
