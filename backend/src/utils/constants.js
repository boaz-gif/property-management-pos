// User Roles
const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  TENANT: 'tenant'
};

// Property Status
const PROPERTY_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  MAINTENANCE: 'maintenance'
};

// Tenant Status
const TENANT_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  EVICTED: 'evicted'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment Type
const PAYMENT_TYPE = {
  RENT: 'rent',
  DEPOSIT: 'deposit',
  FEE: 'fee',
  OTHER: 'other'
};

// Payment Method
const PAYMENT_METHOD = {
  CARD: 'card',
  BANK: 'bank',
  CHECK: 'check',
  CASH: 'cash'
};

// Maintenance Priority
const MAINTENANCE_PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Maintenance Status
const MAINTENANCE_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Notification Types
const NOTIFICATION_TYPES = {
  PAYMENT: 'payment',
  MAINTENANCE: 'maintenance',
  TENANT: 'tenant',
  SYSTEM: 'system'
};

// Document Types
const DOCUMENT_TYPES = {
  LEASE: 'lease',
  PAYMENT_RECEIPT: 'payment_receipt',
  MAINTENANCE_REPORT: 'maintenance_report',
  ID_DOCUMENT: 'id_document',
  OTHER: 'other'
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

module.exports = {
  USER_ROLES,
  PROPERTY_STATUS,
  TENANT_STATUS,
  PAYMENT_STATUS,
  PAYMENT_TYPE,
  PAYMENT_METHOD,
  MAINTENANCE_PRIORITY,
  MAINTENANCE_STATUS,
  NOTIFICATION_TYPES,
  DOCUMENT_TYPES,
  HTTP_STATUS
};