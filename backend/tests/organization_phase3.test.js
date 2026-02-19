const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

jest.mock('../src/utils/database');
jest.mock('../src/services/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'admin', properties: [1] })
}));
jest.mock('../src/services/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));

describe('Phase 3: Organizations / Teams / Workflows', () => {
  const adminToken = 'mock_admin_token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/organizations lists organizations', async () => {
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r') || query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM users') && query.includes('WHERE id =')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'admin', properties: [1], name: 'Admin User' }], rowCount: 1 });
      }
      if (query.includes('FROM organizations')) {
        return Promise.resolve({ rows: [{ id: 1, name: 'Org 1', slug: 'org-1' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app).get('/api/organizations').set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  test('GET /api/organizations/:id/teams lists teams', async () => {
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r') || query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM users') && query.includes('WHERE id =')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'admin', properties: [1], name: 'Admin User' }], rowCount: 1 });
      }
      if (query.includes('FROM teams')) {
        return Promise.resolve({ rows: [{ id: 10, organization_id: 1, name: 'Ops' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .get('/api/organizations/1/teams')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', '1');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  test('GET /api/organizations/:id/workflows lists workflows', async () => {
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r') || query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM users') && query.includes('WHERE id =')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'admin', properties: [1], name: 'Admin User' }], rowCount: 1 });
      }
      if (query.includes('FROM workflow_definitions')) {
        return Promise.resolve({ rows: [{ id: 20, organization_id: 1, name: 'WF', resource_type: 'maintenance' }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .get('/api/organizations/1/workflows')
      .set('Authorization', `Bearer ${adminToken}`)
      .set('X-Organization-Id', '1');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });
});

