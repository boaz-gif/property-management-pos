const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

let mockCurrentUserId = 5;

jest.mock('../src/utils/database');
jest.mock('../src/services/authService', () => ({
  verifyToken: jest.fn(() => ({ id: mockCurrentUserId }))
}));
jest.mock('../src/services/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));
jest.mock('../src/services/PermissionService', () => ({
  ensurePermission: jest.fn().mockResolvedValue(true),
  ensurePropertyAccess: jest.fn().mockResolvedValue(true),
  ensureTenantAccess: jest.fn().mockResolvedValue(true),
  ensureOrganizationAccess: jest.fn().mockResolvedValue(true),
  hasPermission: jest.fn().mockResolvedValue(true),
  hasScopedRole: jest.fn().mockResolvedValue(false),
}));

describe('Phase 10: Property lease settings + bulk lease apply', () => {
  const token = 'mock_token';

  beforeEach(() => {
    mockCurrentUserId = 5;

    Database.query.mockImplementation((query, params) => {
      const q = String(query);

      if (q.includes('FROM users') && q.includes('WHERE id = $1')) {
        const id = params?.[0];
        if (id === 5) return Promise.resolve({ rows: [{ id: 5, role: 'admin', properties: [1], organization_id: 1 }], rowCount: 1 });
        return Promise.resolve({ rows: [{ id, role: 'tenant', property_id: 1, organization_id: 1 }], rowCount: 1 });
      }

      if (q.includes('SELECT * FROM property_lease_settings')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes('INSERT INTO property_lease_settings') && q.includes('ON CONFLICT')) {
        return Promise.resolve({
          rows: [{ property_id: 1, default_term_days: 180, reminder_days: [7], notify_tenant: true, notify_admin: true }],
          rowCount: 1
        });
      }

      if (q.includes('INSERT INTO property_lease_settings') && q.includes('VALUES ($1)')) {
        return Promise.resolve({
          rows: [{ property_id: 1, default_term_days: 365, reminder_days: [30, 14, 7], notify_tenant: true, notify_admin: true }],
          rowCount: 1
        });
      }

      if (q.includes('UPDATE tenants') && q.includes('WHERE') && q.includes('property_id = $3')) {
        return Promise.resolve({ rows: [{ id: 11 }, { id: 12 }], rowCount: 2 });
      }

      if (q.includes('SELECT default_term_days FROM property_lease_settings')) {
        return Promise.resolve({ rows: [{ default_term_days: 365 }], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Admin can fetch default property lease settings (auto-created)', async () => {
    const res = await request(app)
      .get('/api/properties/1/lease-settings')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.property_id).toBe(1);
  });

  test('Admin can update property lease settings', async () => {
    const res = await request(app)
      .put('/api/properties/1/lease-settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ default_term_days: 180, reminder_days: [7] });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.default_term_days).toBe(180);
    expect(res.body.data.reminder_days).toEqual([7]);
  });

  test('Admin can bulk set lease dates for property tenants', async () => {
    const res = await request(app)
      .post('/api/properties/1/leases/bulk-set')
      .set('Authorization', `Bearer ${token}`)
      .send({ lease_start_date: '2026-01-01', lease_end_date: '2026-12-31', only_missing: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.updated_count).toBe(2);
  });
});
