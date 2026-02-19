const request = require('supertest');
const app = require('../../server');
const Database = require('../../src/utils/database');

jest.mock('../../src/utils/database');
// We'll mock auth differently for different tests if needed, or use a generic one
jest.mock('../../src/services/auth/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'tenant', property_id: 1 })
}));

describe('Integration: Maintenance Flow', () => {
  let tenantToken = 'mock_tenant_token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Maintenance Lifecycle: Create Request -> Notify Admin', async () => {
    // 1. Setup Mock Data
    
    // Generic mock implementation to handle all queries correctly
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      // Auth middleware lookup
      if (query.includes('FROM users') && query.includes('role')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'tenant', property_id: 1, name: 'John Doe' }] });
      }
      // Tenant lookup
      if (query.includes('FROM tenants') && query.includes('user_id')) {
        return Promise.resolve({ rows: [{ id: 1, property_id: 10, unit: 'A1' }] });
      }
      // Maintenance Creation
      if (query.includes('INSERT INTO maintenance')) {
        return Promise.resolve({ rows: [{ id: 501, title: 'Broken AC', status: 'open', property_id: 10, unit: 'A1' }] });
      }
      // Admin lookup for notification
      if (query.includes('FROM users') && query.includes('admin')) {
        return Promise.resolve({ rows: [{ id: 99, email: 'admin@example.com' }] });
      }
      // Notification insertion
      if (query.includes('INSERT INTO notifications')) {
        return Promise.resolve({ rows: [{ id: 601 }] });
      }
      // Default / Blacklist check / etc.
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    // 2. Execute Request
    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        title: 'Broken AC',
        description: 'AC is not cooling',
        priority: 'high'
      });

    // 3. Verify Response
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Broken AC');

    // 4. Verify Side Effects
    
    const adminEmailLookupCall = Database.query.mock.calls.find(call =>
      call[0].includes('JOIN properties') && call[0].includes("u.role IN ('admin', 'super_admin')")
    );
    expect(adminEmailLookupCall).toBeTruthy();
  });
});
