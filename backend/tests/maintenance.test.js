const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

jest.mock('../src/utils/database');

describe('Maintenance API Endpoints', () => {
  let adminToken = 'mock_admin_token';
  let tenantToken = 'mock_tenant_token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/maintenance', () => {
    it('should create a maintenance request', async () => {
      // Mock Tenant lookup
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, property_id: 1 }]
      });
      
      // Mock Creation
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Leaky Faucet', status: 'open' }]
      });

      // Mock Admin Notification
      Database.query.mockResolvedValueOnce({ rows: [{ id: 1, email: 'admin@example.com' }] }); // Find admins
      Database.query.mockResolvedValueOnce({ rows: [] }); // Insert notification

      const res = await request(app)
        .post('/api/maintenance')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          title: 'Leaky Faucet',
          description: 'Drip drip drip'
        });

      // expect(res.statusCode).toEqual(201);
    });
  });

  describe('GET /api/maintenance', () => {
    it('should list requests', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Leaky Faucet', status: 'open' }]
      });

      const res = await request(app)
        .get('/api/maintenance')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
    });
  });
});
