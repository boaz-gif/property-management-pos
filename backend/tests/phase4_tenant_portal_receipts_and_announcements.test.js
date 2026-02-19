const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

jest.mock('../src/utils/database');
jest.mock('../src/services/auth/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 7 })
}));
jest.mock('../src/services/auth/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));
jest.mock('../src/services/payments/ReceiptService', () => ({
  generateReceipt: jest.fn().mockResolvedValue({ filePath: 'uploads/receipts/test.pdf' })
}));

describe('Phase 4: Tenant portal receipts + announcements', () => {
  const token = 'mock_tenant_token';

  let expectedPermissions = [];

  beforeEach(() => {
    expectedPermissions = [];

    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM users') && query.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [{ id: 7, name: 'Tenant User', role: 'tenant', property_id: 1 }],
          rowCount: 1
        });
      }

      if (query.includes('SELECT organization_id FROM properties WHERE id = $1')) {
        return Promise.resolve({ rows: [{ organization_id: 1 }], rowCount: 1 });
      }

      if (query.includes('FROM user_roles ur') && query.includes('JOIN role_permissions')) {
        const resource = params?.[1];
        const action = params?.[2];
        const ok = expectedPermissions.some((p) => p.resource === resource && p.action === action);
        return Promise.resolve({ rows: ok ? [{ ok: 1 }] : [], rowCount: ok ? 1 : 0 });
      }

      if (query.includes('FROM roles r') && query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (query.includes('FROM tenants t') && query.includes('WHERE t.user_id = $1')) {
        return Promise.resolve({ rows: [{ id: 10, property_id: 1 }], rowCount: 1 });
      }

      if (query.includes('SELECT * FROM payment_receipts WHERE payment_id = $1')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (query.includes('FROM payments p') && query.includes('WHERE p.id = $1') && query.includes('p.tenant_id = $2')) {
        return Promise.resolve({
          rows: [{ id: 55, tenant_id: 10, tenant_name: 'Tenant', tenant_user_id: 7 }],
          rowCount: 1
        });
      }

      if (query.includes('INSERT INTO payment_receipts')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (query.includes('INSERT INTO tenant_announcement_reads') && query.includes('DO UPDATE')) {
        return Promise.resolve({ rows: [{ id: 1 }], rowCount: 1 });
      }

      if (query.trim() === 'BEGIN' || query.trim() === 'COMMIT' || query.trim() === 'ROLLBACK') {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (query.includes('UPDATE tenant_dashboard_widgets')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (query.includes('INSERT INTO tenant_quick_actions_log')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/tenant/payments/:id/receipt generates receipt for tenant payment', async () => {
    expectedPermissions = [{ resource: 'payment', action: 'read' }];

    const res = await request(app)
      .get('/api/tenant/payments/55/receipt')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.payment_id).toBe(55);
    expect(res.body.pdf_url).toBe('uploads/receipts/test.pdf');
  });

  test('POST /api/tenant/announcements/:id/read records viewed state', async () => {
    expectedPermissions = [{ resource: 'tenant', action: 'update' }];

    const res = await request(app)
      .post('/api/tenant/announcements/99/read')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/tenant/announcements/:id/ack records acknowledgment state', async () => {
    expectedPermissions = [{ resource: 'tenant', action: 'update' }];

    const res = await request(app)
      .post('/api/tenant/announcements/99/ack')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('PUT /api/tenant/widgets/order requires dashboard:update', async () => {
    expectedPermissions = [{ resource: 'dashboard', action: 'update' }];

    const res = await request(app)
      .put('/api/tenant/widgets/order')
      .set('Authorization', `Bearer ${token}`)
      .send({ widgets: [] });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('POST /api/tenant/quick-actions requires dashboard:create', async () => {
    expectedPermissions = [{ resource: 'dashboard', action: 'create' }];

    const res = await request(app)
      .post('/api/tenant/quick-actions')
      .set('Authorization', `Bearer ${token}`)
      .send({ action_type: 'pay_now', execution_time_ms: 10 });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

