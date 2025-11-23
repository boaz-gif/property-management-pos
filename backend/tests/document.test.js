const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');
const fs = require('fs');
const path = require('path');

jest.mock('../src/utils/database');
jest.mock('../src/services/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'admin' })
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
      // Mock User lookup for Auth middleware
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, role: 'admin', name: 'Admin User' }]
      });

      // Mock DB insert for Document
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'test-file.pdf', url: 'uploads/test-file.pdf' }]
      });

      const res = await request(app)
        .post('/api/documents/upload')
        .set('Authorization', `Bearer ${adminToken}`)
        .attach('file', testFilePath);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/documents', () => {
    it('should list documents', async () => {
      // Mock User lookup for Auth middleware
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, role: 'admin', name: 'Admin User' }]
      });

      // Mock Document list query
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'Lease.pdf' }]
      });

      const res = await request(app)
        .get('/api/documents')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.data.length).toBe(1);
    });
  });
});
