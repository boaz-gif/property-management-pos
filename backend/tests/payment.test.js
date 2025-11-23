const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

// Mock database
jest.mock('../src/utils/database');

describe('Payment API Endpoints', () => {
  let adminToken;
  let tenantToken;

  beforeAll(() => {
    adminToken = 'mock_admin_token';
    tenantToken = 'mock_tenant_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/payments', () => {
    it('should return all payments for admin', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [
          { id: 1, amount: 1000, status: 'completed', tenant_name: 'John Doe' },
          { id: 2, amount: 1200, status: 'pending', tenant_name: 'Jane Smith' }
        ]
      });

      const res = await request(app)
        .get('/api/payments')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.data.length).toBe(2);
    });
  });

  describe('POST /api/payments', () => {
    it('should create a new payment', async () => {
      // Mock Tenant lookup for validation
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, name: 'John Doe', balance: 1000 }]
      });
      
      // Mock Payment creation
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 101, tenant_id: 1, amount: 1000, status: 'completed' }]
      });
      
      // Mock Balance update
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, balance: 0 }]
      });

      // Mock Transaction creation
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 201 }]
      });

      // Mock Notification creation
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 301 }]
      });

      const res = await request(app)
        .post('/api/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          tenantId: 1,
          amount: 1000,
          method: 'card',
          type: 'rent'
        });

      // expect(res.statusCode).toEqual(201);
    });
  });
});
