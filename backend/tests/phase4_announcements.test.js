const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

jest.mock('../src/utils/database');
jest.mock('../src/services/auth/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'admin', properties: [1] })
}));
jest.mock('../src/services/auth/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));

describe('Phase 4: Property Announcements API', () => {
  const adminToken = 'mock_admin_token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/properties/:propertyId/announcements lists announcements', async () => {
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r') || query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM users') && query.includes('WHERE id =')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'admin', properties: [1], name: 'Admin User' }], rowCount: 1 });
      }
      if (query.includes('FROM property_announcements')) {
        return Promise.resolve({ rows: [{ id: 10, property_id: 1, title: 'Notice', content: 'Hello', published: true }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .get('/api/properties/1/announcements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBe(1);
  });

  test('POST /api/properties/:propertyId/announcements creates announcement', async () => {
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r') || query.includes('JOIN role_permissions')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      if (query.includes('FROM users') && query.includes('WHERE id =')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'admin', properties: [1], name: 'Admin User' }], rowCount: 1 });
      }
      if (query.includes('INSERT INTO property_announcements')) {
        return Promise.resolve({ rows: [{ id: 11, property_id: 1, title: 'New', content: 'Body', published: false }], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const res = await request(app)
      .post('/api/properties/1/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'New', content: 'Body' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('New');
  });
});

