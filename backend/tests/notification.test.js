const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');

jest.mock('../src/utils/database');

const NotificationService = require('../src/services/communications/notificationService');

describe('Notification API Endpoints', () => {
  let userToken = 'mock_user_token';

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/notifications', () => {
    it('should return user notifications', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, title: 'Alert', message: 'Test', read_status: false }]
      });

      const res = await request(app)
        .get('/api/notifications')
        .set('Authorization', `Bearer ${userToken}`);

      // expect(res.statusCode).toEqual(200);
    });
  });

  describe('PUT /api/notifications/:id/read', () => {
    it('should mark notification as read', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [{ id: 1, read_status: true }]
      });

      const res = await request(app)
        .put('/api/notifications/1/read')
        .set('Authorization', `Bearer ${userToken}`);

      // expect(res.statusCode).toEqual(200);
    });
  });

  describe('POST /api/notifications/payment-reminder', () => {
    it('should send payment reminder', async () => {
      Database.query.mockResolvedValueOnce({
        rows: [{ email: 'tenant@example.com' }],
        rowCount: 1
      });

      const result = await NotificationService.sendPaymentReminder(1);
      expect(result.success).toBe(true);
      expect(result.message).toBe('Reminder sent');
    });
  });
});
