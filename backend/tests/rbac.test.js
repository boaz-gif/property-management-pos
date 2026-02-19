const PermissionService = require('../src/services/PermissionService');
const Database = require('../src/utils/database');

jest.mock('../src/utils/database');

describe('RBAC PermissionService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('hasPermission returns true when RBAC query matches', async () => {
    Database.query.mockResolvedValueOnce({ rows: [{ ok: 1 }], rowCount: 1 });

    const ok = await PermissionService.hasPermission({ id: 1 }, 'tenant', 'read', 1);
    expect(ok).toBe(true);
  });

  test('ensurePermission throws when permission not granted', async () => {
    Database.query.mockResolvedValue({ rows: [], rowCount: 0 });
    await expect(
      PermissionService.ensurePermission({ id: 1 }, 'tenant', 'read', { propertyId: 1 })
    ).rejects.toThrow('Access denied');
  });

  test('ensurePermission resolves tenantId from paymentId and enforces tenant boundary', async () => {
    const user = { id: 7, role: 'tenant', property_id: 1 };

    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') && query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('SELECT tenant_id FROM payments')) {
        return Promise.resolve({ rows: [{ tenant_id: 10 }], rowCount: 1 });
      }
      if (query.includes('SELECT id, user_id, property_id FROM tenants')) {
        return Promise.resolve({ rows: [{ id: 10, user_id: 7, property_id: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM roles r') && query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await expect(
      PermissionService.ensurePermission(user, 'payment', 'read', { paymentId: 55, propertyId: 1 })
    ).resolves.toBe(true);
  });

  test('ensurePermission denies tenant access to other tenant paymentId', async () => {
    const user = { id: 7, role: 'tenant', property_id: 1 };

    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') && query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('SELECT tenant_id FROM payments')) {
        return Promise.resolve({ rows: [{ tenant_id: 10 }], rowCount: 1 });
      }
      if (query.includes('SELECT id, user_id, property_id FROM tenants')) {
        return Promise.resolve({ rows: [{ id: 10, user_id: 999, property_id: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM roles r') && query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    await expect(
      PermissionService.ensurePermission(user, 'payment', 'read', { paymentId: 55, propertyId: 1 })
    ).rejects.toThrow('Access denied');
  });
});
