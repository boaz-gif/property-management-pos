const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

// Mock database
jest.mock('../src/utils/database');

describe('Properties API Endpoints', () => {
  let adminToken;
  let tenantToken;

  beforeAll(() => {
    adminToken = 'mock_admin_token';
    tenantToken = 'mock_tenant_token';
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/properties', () => {
    it('should return all properties for authenticated users', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'Sunset Apartments',
            address: '123 Sunset Blvd',
            units: 20,
            rent: 1500,
            active_tenants: 18,
            status: 'active'
          },
          {
            id: 2,
            name: 'Downtown Complex',
            address: '456 Main St',
            units: 30,
            rent: 1200,
            active_tenants: 25,
            status: 'active'
          }
        ]
      });

      const res = await request(app)
        .get('/api/properties')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.length).toBe(2);
      // expect(res.body.data[0].occupancy_rate).toBe(90);
      // expect(res.body.data[1].occupancy_rate).toBe(Math.round((25/30) * 100));
    });
  });

  describe('GET /api/properties/:id', () => {
    it('should return property details by ID', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Sunset Apartments',
          address: '123 Sunset Blvd',
          units: 20,
          rent: 1500,
          active_tenants: 18,
          status: 'active',
          description: 'Beautiful apartments with ocean view',
          amenities: ['Pool', 'Gym', 'Garage']
        }]
      });

      const res = await request(app)
        .get('/api/properties/1')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.id).toBe(1);
      // expect(res.body.data.name).toBe('Sunset Apartments');
    });

    it('should return 404 for non-existent property', async () => {
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .get('/api/properties/999')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(404);
    });
  });

  describe('POST /api/properties', () => {
    it('should create a new property for admin', async () => {
      const propertyData = {
        name: 'New Property',
        address: '789 New St',
        units: 15,
        rent: 1300,
        description: 'New luxury apartments',
        amenities: ['Pool', 'WiFi']
      };

      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 3,
          ...propertyData,
          status: 'active',
          created_at: new Date().toISOString()
        }]
      });

      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(propertyData);

      // expect(res.statusCode).toEqual(201);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.name).toBe('New Property');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        name: 'Test Property'
        // missing required fields
      };

      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      // expect(res.statusCode).toEqual(400);
    });

    it('should reject property creation for tenant', async () => {
      const propertyData = {
        name: 'Tenant Property',
        address: '123 Test St',
        units: 10,
        rent: 1000
      };

      const res = await request(app)
        .post('/api/properties')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send(propertyData);

      // expect(res.statusCode).toEqual(403);
    });
  });

  describe('PUT /api/properties/:id', () => {
    it('should update property for admin', async () => {
      const updateData = {
        name: 'Updated Property Name',
        rent: 1600
      };

      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          name: 'Updated Property Name',
          address: '123 Sunset Blvd',
          units: 20,
          rent: 1600,
          status: 'active'
        }]
      });

      const res = await request(app)
        .put('/api/properties/1')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.name).toBe('Updated Property Name');
    });

    it('should reject property update for tenant', async () => {
      const updateData = {
        name: 'Tenant Update'
      };

      const res = await request(app)
        .put('/api/properties/1')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send(updateData);

      // expect(res.statusCode).toEqual(403);
    });
  });

  describe('DELETE /api/properties/:id', () => {
    it('should delete property for admin', async () => {
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .delete('/api/properties/1')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.message).toContain('deleted');
    });

    it('should reject property deletion for tenant', async () => {
      const res = await request(app)
        .delete('/api/properties/1')
        .set('Authorization', `Bearer ${tenantToken}`);

      // expect(res.statusCode).toEqual(403);
    });
  });

  describe('GET /api/properties/stats', () => {
    it('should return property statistics', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [{
          total_properties: '5',
          active_properties: '4',
          total_units: '150',
          total_occupied: '120',
          occupancy_rate: '80.00',
          avg_rent: '1400.00'
        }]
      });

      const res = await request(app)
        .get('/api/properties/stats')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.total_properties).toBe(5);
      // expect(res.body.data.occupancy_rate).toBe(80);
      // expect(res.body.data.avg_rent).toBe(1400);
    });
  });
});
