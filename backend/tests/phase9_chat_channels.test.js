const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

let mockCurrentUserId = 7;

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

describe('Phase 9: Tenant community chat + tenant-admin DM', () => {
  const token = 'mock_token';

  beforeEach(() => {
    mockCurrentUserId = 7;
    Database.transaction.mockImplementation(async (fn) => fn({ query: Database.query }));

    Database.query.mockImplementation((query, params) => {
      const q = String(query);

      if (q.includes('FROM users') && q.includes('WHERE id = $1')) {
        const id = params?.[0];
        if (id === 7) {
          return Promise.resolve({ rows: [{ id: 7, role: 'tenant', property_id: 1, organization_id: 1 }], rowCount: 1 });
        }
        if (id === 5) {
          return Promise.resolve({ rows: [{ id: 5, role: 'admin', properties: [1], organization_id: 1 }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [{ id, role: 'admin', properties: [1], organization_id: 1 }], rowCount: 1 });
      }

      if (q.includes('SELECT organization_id FROM properties WHERE id = $1')) {
        return Promise.resolve({ rows: [{ organization_id: 1 }], rowCount: 1 });
      }

      if (q.includes('SELECT admin_id, organization_id FROM properties WHERE id = $1')) {
        return Promise.resolve({ rows: [{ admin_id: 5, organization_id: 1 }], rowCount: 1 });
      }

      if (q.includes("FROM conversations") && q.includes("kind = 'tenant_community'")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes("FROM conversations") && q.includes("kind = 'tenant_admin_dm'")) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes("INSERT INTO conversations") && q.includes("'tenant_community'")) {
        return Promise.resolve({
          rows: [{ id: '00000000-0000-0000-0000-000000000001', property_id: 1, kind: 'tenant_community', subject: 'Community Chat' }],
          rowCount: 1
        });
      }

      if (q.includes("INSERT INTO conversations") && q.includes("'tenant_admin_dm'")) {
        return Promise.resolve({
          rows: [{ id: '00000000-0000-0000-0000-000000000002', property_id: 1, kind: 'tenant_admin_dm', subject: 'Chat with Admin', tenant_user_id: 7, admin_user_id: 5 }],
          rowCount: 1
        });
      }

      if (q.includes('INSERT INTO conversation_participants') && q.includes('FROM users u')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (q.includes('INSERT INTO conversation_participants') && q.includes('VALUES')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (q.includes('SELECT c.*') && q.includes('FROM conversations c') && q.includes('WHERE c.id = $1')) {
        const conversationId = params?.[0];
        if (conversationId === '00000000-0000-0000-0000-000000000001') {
          return Promise.resolve({ rows: [{ id: conversationId, property_id: 1, kind: 'tenant_community', entity_type: null, entity_id: null }], rowCount: 1 });
        }
        if (conversationId === '00000000-0000-0000-0000-000000000002') {
          return Promise.resolve({ rows: [{ id: conversationId, property_id: 1, kind: 'tenant_admin_dm', tenant_user_id: 7, admin_user_id: 5, entity_type: null, entity_id: null }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes('FROM conversation_participants') && q.includes('AND left_at IS NULL')) {
        const userId = params?.[1];
        if (userId === 7) return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes('FROM conversation_participants cp') && q.includes('JOIN users u')) {
        return Promise.resolve({ rows: [{ user_id: 7, role: 'tenant', name: 'Tenant User' }], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Tenant can ensure community conversation', async () => {
    const res = await request(app).get('/api/conversations/community').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kind).toBe('tenant_community');
  });

  test('Tenant can ensure tenant-admin DM conversation', async () => {
    const res = await request(app).get('/api/conversations/admin-dm').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kind).toBe('tenant_admin_dm');
  });

  test('Admin cannot ensure community conversation', async () => {
    mockCurrentUserId = 5;

    const res = await request(app).get('/api/conversations/community').set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });

  test('Admin cannot access tenant community conversation even if ID is known', async () => {
    mockCurrentUserId = 5;

    const res = await request(app)
      .get('/api/conversations/00000000-0000-0000-0000-000000000001')
      .set('Authorization', `Bearer ${token}`);
    expect(res.statusCode).toBe(403);
  });
});
