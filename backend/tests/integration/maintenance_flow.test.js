const request = require('supertest');
const app = require('../../server');
const Database = require('../../src/utils/database');

jest.mock('../../src/utils/database');
// We'll mock auth differently for different tests if needed, or use a generic one
jest.mock('../../src/services/authService', () => ({
  verifyToken: jest.fn().mockReturnValue({ id: 1, role: 'tenant', property_id: 1 })
}));

describe('Integration: Maintenance Flow', () => {
  let tenantToken = 'mock_tenant_token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Maintenance Lifecycle: Create Request -> Notify Admin', async () => {
    // 1. Setup Mock Data
    
    // Mock User lookup (Auth middleware)
    Database.query.mockResolvedValueOnce({
      rows: [{ id: 1, role: 'tenant', property_id: 1, name: 'John Doe' }]
    });

    // Mock Tenant lookup (MaintenanceService getting property_id)
    Database.query.mockResolvedValueOnce({
      rows: [{ id: 1, property_id: 10 }]
    });

    // Mock Maintenance Creation
    Database.query.mockResolvedValueOnce({
      rows: [{ id: 501, title: 'Broken AC', status: 'open', property_id: 10 }]
    });

    // Mock Admin Lookup (NotificationService)
    Database.query.mockResolvedValueOnce({
      rows: [{ id: 99, email: 'admin@example.com' }]
    });

    // Mock Notification Insert (For Admin)
    Database.query.mockResolvedValueOnce({
      rows: [{ id: 601 }]
    });

    // 2. Execute Request
    const res = await request(app)
      .post('/api/maintenance')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({
        title: 'Broken AC',
        description: 'AC is not cooling',
        priority: 'high'
      });

    // 3. Verify Response
    expect(res.statusCode).toEqual(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Broken AC');

    // 4. Verify Side Effects
    
    // Check Admin Lookup - Use regex to be whitespace agnostic
    const adminLookupCall = Database.query.mock.calls.find(call => 
      /SELECT id, name, email.*FROM users.*WHERE role IN/s.test(call[0])
    );
    expect(adminLookupCall).toBeTruthy();

    const notificationInsertCall = Database.query.mock.calls.find(call => 
      call[0].includes('INSERT INTO notifications')
    );
    expect(notificationInsertCall).toBeTruthy();
    expect(notificationInsertCall[1]).toContain(99); // Admin ID
  });
});
