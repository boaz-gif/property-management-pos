const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

jest.mock('../src/utils/database');
jest.mock('../src/services/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'admin', properties: [1] })
}));
jest.mock('../src/services/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));

describe('Document API Endpoints', () => {
  let adminToken = 'mock_admin_token';
  
  // Create a dummy file for testing
  const testFilePath = path.join(__dirname, 'test-file.pdf');
  
  beforeAll(() => {
    fs.writeFileSync(testFilePath, 'This is a test file content.');
  });
  
  afterAll(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/documents/upload', () => {
    it('should upload a file successfully', async () => {
      // Robust mock implementation
      Database.query.mockImplementation((query, params) => {
        if (query.includes('FROM user_roles') || query.includes('FROM roles r')) {
          return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
        }
        if (query.includes('FROM users')) {
          return Promise.resolve({ rows: [{ id: 1, role: 'admin', name: 'Admin User', properties: [1] }] });
        }
        if (query.includes('INSERT INTO documents')) {
          return Promise.resolve({ rows: [{ id: 1, name: 'test-file.pdf', url: 'uploads/test-file.pdf' }] });
        }
        // Default for audit logs or other queries
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', testFilePath);

      if (res.statusCode !== 201) console.log('Upload Error:', res.body);
      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/documents', () => {
    it('should list documents', async () => {
      // Robust mock implementation
      Database.query.mockImplementation((query, params) => {
        if (query.includes('FROM user_roles') || query.includes('FROM roles r')) {
          return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
        }
        if (query.includes('FROM users')) {
          return Promise.resolve({ rows: [{ id: 1, role: 'admin', name: 'Admin User', properties: [1] }] });
        }
        if (query.includes('FROM documents')) {
          return Promise.resolve({ rows: [{ id: 1, name: 'Lease.pdf' }] });
        }
        // Default for audit logs or other queries
        return Promise.resolve({ rows: [], rowCount: 0 });
      });

      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`);

      if (res.statusCode !== 200) console.log('List Error:', res.body);
      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBe(1);
    });
  });
});
