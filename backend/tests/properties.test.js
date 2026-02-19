const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

// Mock database
jest.mock('../src/utils/database');
jest.mock('../src/services/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'admin', properties: [1] }),
  generateToken: jest.fn().mockReturnValue('mock_new_token')
}));
jest.mock('../src/services/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));

describe('Properties API Endpoints', () => {
  let adminToken;
  let tenantToken;

  beforeAll(() => {
    adminToken = 'mock_admin_token';
    tenantToken = 'mock_tenant_token';
  });

  // Use mockImplementation instead of mockResolvedValueOnce for all tests
  beforeEach(() => {
    Database.query.mockImplementation((query, params) => {
      if (query.includes('FROM user_roles') || query.includes('FROM roles r')) {
        return Promise.resolve({ rows: [{ ok: 1 }], rowCount: 1 });
      }
      // Auth lookup
      if (query.includes('FROM users') && query.includes('role')) {
        return Promise.resolve({ rows: [{ id: 1, role: 'admin', properties: [1], name: 'Admin User' }] });
      }
      // Properties list
      if (query.includes('FROM mv_property_aggregations')) {
        return Promise.resolve({
          rows: [
            { id: 1, name: 'Sunset Apartments', address: '123 Sunset Blvd', units: 20, rent: 1500, active_tenants: 18, status: 'active' },
            { id: 2, name: 'Downtown Complex', address: '456 Main St', units: 30, rent: 1200, active_tenants: 25, status: 'active' }
          ]
        });
      }
      // Property detail
      if (query.includes('FROM properties p') && query.includes('WHERE p.id =')) {
        if (params && params[0] === 999) return Promise.resolve({ rows: [] });
        return Promise.resolve({
          rows: [{ id: 1, name: 'Sunset Apartments', address: '123 Sunset Blvd', units: 20, rent: 1500, active_tenants: 18, status: 'active', description: 'Desc', amenities: ['Pool'] }]
        });
      }
      if (query.includes('SELECT COUNT(*) as count FROM tenants')) {
        return Promise.resolve({ rows: [{ count: '0' }], rowCount: 1 });
      }
      // Creation / Update return
      if (query.includes('INSERT INTO properties') || query.includes('UPDATE properties')) {
        return Promise.resolve({ rows: [{ id: 3, name: 'New/Updated Property', status: 'active' }] });
      }
      // Stats
      if (query.includes('total_properties')) {
        return Promise.resolve({ rows: [{ total_properties: '5', active_properties: '4', total_units: '150', total_occupied: '120', occupancy_rate: '80.00', avg_rent: '1400.00' }] });
      }
      // Default
      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/properties', () => {
    it('should return all properties for authenticated users', async () => {
      const res = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBe(2);
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property details by ID', async () => {
      const res = await request(app)
        .get('/api/properties/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(1);
    });

    it('should return 404 for non-existent property', async () => {
      const res = await request(app)
        .get('/api/properties/999')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property for admin', async () => {
      const propertyData = {
        name: 'New Property',
        address: '789 New St',
        units: 15,
        rent: 1300
      };

      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(propertyData);

      expect(res.statusCode).toEqual(201);
      expect(res.body.success).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidData = { name: 'Test' };
      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);
      expect(res.statusCode).toEqual(400);
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update property for admin', async () => {
      const res = await request(app)
        .put('/api/properties/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated' });

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete property for admin', async () => {
      const res = await request(app)
        .delete('/api/properties/1')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/properties/stats', () => {
    it('should return property statistics', async () => {
      const res = await request(app)
        .get('/api/properties/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('GET /api/properties/search', () => {
    it('should search properties', async () => {
      const res = await request(app)
        .get('/api/properties/search?q=Sunset')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  xdescribe('GET /api/properties/export', () => {
    it('should export properties to CSV', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Test Property', address: '123 Test St', units: 10, rent: 1000, occupancy: 8 }
        ]
      });

      const res = await request(app)
        .get('/api/properties/export')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toEqual(200);
      expect(res.headers['content-type']).toBe('text/csv');
      expect(res.headers['content-disposition']).toBe('attachment; filename=properties.csv');
      expect(res.text).toContain('ID,Name,Address,Units,Rent,Occupancy');
      expect(res.text).toContain('1,"Test Property","123 Test St",10,1000,8');
    });
  });
});
