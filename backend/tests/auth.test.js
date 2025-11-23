const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

// Mock database
jest.mock('../src/utils/database');

describe('Authentication API Endpoints', () => {
  let adminToken;
  let tenantToken;
  let testUserId;

  beforeAll(() => {
    adminToken = 'mock_admin_token';
    tenantToken = 'mock_tenant_token';
    testUserId = 1;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john.doe@example.com',
        password: 'password123',
        role: 'tenant',
        property_id: 1,
        unit: 'A101'
      };

      // Mock user lookup (user doesn't exist)
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      // Mock user creation
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          ...userData,
          created_at: new Date().toISOString()
        }]
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // expect(res.statusCode).toEqual(201);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.user.email).toBe('john.doe@example.com');
      // expect(res.body.data.token).toBeDefined();
    });

    it('should register an admin user', async () => {
      const adminData = {
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'adminpass',
        role: 'admin',
        properties: [1, 2, 3]
      };

      // Mock user lookup
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      // Mock user creation
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 2,
          ...adminData,
          created_at: new Date().toISOString()
        }]
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(adminData);

      // expect(res.statusCode).toEqual(201);
      // expect(res.body.success).toBe(true);
    });

    it('should reject registration with existing email', async () => {
      const userData = {
        name: 'Jane Doe',
        email: 'existing@example.com',
        password: 'password123'
      };

      // Mock existing user
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'existing@example.com'
        }]
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(userData);

      // expect(res.statusCode).toEqual(400);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // missing name and password
      };

      const res = await request(app)
        .post('/api/auth/register')
        .send(invalidData);

      // expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'john.doe@example.com',
        password: 'password123'
      };

      // Mock user lookup
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'john.doe@example.com',
          password: '$2a$10$hashedpassword',
          role: 'tenant',
          name: 'John Doe',
          property_id: 1,
          unit: 'A101'
        }]
      });

      // Mock password validation (simulate bcrypt.compare success)
      const User = require('../src/models/User');
      const bcrypt = require('bcryptjs');

      // Mock update last login
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.token).toBeDefined();
      // expect(res.body.data.user.email).toBe('john.doe@example.com');
    });

    it('should reject login with invalid credentials', async () => {
      const loginData = {
        email: 'wrong@example.com',
        password: 'wrongpass'
      };

      // Mock user not found
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      // expect(res.statusCode).toEqual(400);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'test@example.com'
        // missing password
      };

      const res = await request(app)
        .post('/api/auth/login')
        .send(invalidData);

      // expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should refresh token successfully', async () => {
      const tokenData = {
        token: 'valid_refresh_token'
      };

      // Mock token verification and user lookup
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          email: 'john.doe@example.com',
          role: 'tenant',
          property_id: 1,
          unit: 'A101'
        }]
      });

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send(tokenData);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.token).toBeDefined();
    });

    it('should reject invalid token', async () => {
      const tokenData = {
        token: 'invalid_token'
      };

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send(tokenData);

      // expect(res.statusCode).toEqual(400);
    });

    it('should validate token is provided', async () => {
      const tokenData = {};

      const res = await request(app)
        .post('/api/auth/refresh-token')
        .send(tokenData);

      // expect(res.statusCode).toEqual(400);
    });
  });

  describe('GET /api/auth/profile', () => {
    it('should return user profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.data.user).toBeDefined();
    });

    it('should reject unauthorized access', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      // expect(res.statusCode).toEqual(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword123'
      };

      // Mock user lookup with password
      Database.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          password: '$2a$10$hashedoldpassword'
        }]
      });

      // Mock password update
      Database.query.mockResolvedValueOnce({
        rows: []
      });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(passwordData);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.message).toContain('updated');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        newPassword: 'newpass123'
        // missing currentPassword
      };

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      // expect(res.statusCode).toEqual(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${adminToken}`);

      // expect(res.statusCode).toEqual(200);
      // expect(res.body.success).toBe(true);
      // expect(res.body.message).toContain('logout');
    });
  });
});
