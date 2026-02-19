const request = require('supertest');
const app = require('../server');
const Database = require('../src/utils/database');
const ReceiptService = require('../src/services/payments/ReceiptService');
const NotificationService = require('../src/services/communications/notificationService');

let mockCurrentUserId = 11;

jest.mock('../src/utils/database');
jest.mock('../src/services/payments/ReceiptService');
jest.mock('../src/services/communications/notificationService');
jest.mock('../src/services/payments/mpesaService', () => {
  const Actual = jest.requireActual('../src/services/payments/mpesaService');
  Actual.initiateStkPush = jest.fn().mockResolvedValue({
    merchant_request_id: 'm_1',
    checkout_request_id: 'ws_1',
    response_code: '0',
    response_description: 'Success',
    customer_message: 'Check your phone'
  });
  return Actual;
});
jest.mock('../src/services/auth/authService', () => ({
  verifyToken: jest.fn(() => ({ id: mockCurrentUserId }))
}));
jest.mock('../src/services/auth/tokenBlacklistService', () => ({
  isTokenBlacklisted: jest.fn().mockResolvedValue(false)
}));
jest.mock('../src/services/auth/PermissionService', () => ({
  ensurePermission: jest.fn().mockResolvedValue(true),
  ensurePropertyAccess: jest.fn().mockResolvedValue(true),
  ensureTenantAccess: jest.fn().mockResolvedValue(true),
  ensureOrganizationAccess: jest.fn().mockResolvedValue(true),
  hasPermission: jest.fn().mockResolvedValue(true),
  hasScopedRole: jest.fn().mockResolvedValue(false),
}));

describe('Phase 11: M-Pesa STK payment flow', () => {
  const token = 'mock_token';

  beforeEach(() => {
    process.env.MPESA_WEBHOOK_TOKEN = 'testtoken';
    process.env.MPESA_CALLBACK_BASE_URL = 'https://example.com';
    process.env.MPESA_ENVIRONMENT = 'sandbox';
    process.env.MPESA_CONSUMER_KEY = 'ck';
    process.env.MPESA_CONSUMER_SECRET = 'cs';
    process.env.MPESA_PASSKEY = 'pk';
    process.env.MPESA_SHORTCODE = '174379';
    process.env.MPESA_PARTY_B = '174379';

    mockCurrentUserId = 11;
    ReceiptService.generateReceipt.mockResolvedValue({ filePath: 'uploads/receipts/r.pdf' });
    NotificationService.createNotification.mockResolvedValue({ success: true });

    Database.query.mockImplementation((query, params) => {
      const q = String(query);

      if (q === 'BEGIN' || q === 'COMMIT' || q === 'ROLLBACK') {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }

      if (q.includes('FROM users') && q.includes('WHERE id = $1')) {
        const id = params?.[0];
        if (id === 11) {
          return Promise.resolve({ rows: [{ id: 11, role: 'tenant', property_id: 1, organization_id: 1 }], rowCount: 1 });
        }
        return Promise.resolve({ rows: [{ id, role: 'admin', properties: [1], organization_id: 1 }], rowCount: 1 });
      }

      if (q.includes('FROM tenants t') && q.includes('WHERE t.user_id = $1')) {
        return Promise.resolve({ rows: [{ id: 22, user_id: 11, property_id: 1, status: 'active' }], rowCount: 1 });
      }

      if (q.includes('FROM tenant_payment_methods') && q.includes('WHERE id = $1')) {
        return Promise.resolve({
          rows: [{ id: 9, tenant_id: 22, type: 'mpesa', token: '254712345678', last4: '5678', brand: 'M-Pesa' }],
          rowCount: 1
        });
      }

      if (q.includes('SELECT property_id FROM tenants WHERE id = $1')) {
        return Promise.resolve({ rows: [{ property_id: 1 }], rowCount: 1 });
      }

      if (q.includes('INSERT INTO payments') && q.includes("'pending'")) {
        return Promise.resolve({
          rows: [{ id: 100, tenant_id: 22, amount: 500, status: 'pending', method: 'mpesa', type: 'rent' }],
          rowCount: 1
        });
      }

      if (q.includes('INSERT INTO payment_provider_transactions') && q.includes("'mpesa'")) {
        return Promise.resolve({
          rows: [{ id: 200, payment_id: 100, provider: 'mpesa', status: 'initiated' }],
          rowCount: 1
        });
      }

      if (q.includes('UPDATE payment_provider_transactions') && q.includes("SET status = 'pending'")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (q.includes('FROM payment_provider_transactions') && q.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [{ id: 200, payment_id: 100, provider: 'mpesa', checkout_request_id: 'ws_1', status: 'pending' }],
          rowCount: 1
        });
      }

      if (q.includes('FROM payments p') && q.includes('JOIN tenants t') && q.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [{
            id: 100,
            tenant_id: 22,
            status: 'pending',
            amount: 500,
            method: 'mpesa',
            tenant_name: 'Tenant',
            tenant_user_id: 11,
            property_id: 1,
            unit: 'A1'
          }],
          rowCount: 1
        });
      }

      if (q.includes("UPDATE payments SET status = 'completed'")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (q.includes('UPDATE tenants') && q.includes('SET balance = balance -')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (q.includes('INSERT INTO payment_receipts')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      if (q.includes("UPDATE payments SET status = 'failed'")) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }

      return Promise.resolve({ rows: [], rowCount: 0 });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('Tenant initiates M-Pesa STK push and payment becomes pending', async () => {
    const res = await request(app)
      .post('/api/tenant/payments/process')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 500, paymentMethodId: 9 });

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('pending');
    expect(res.body.checkout_request_id).toBe('ws_1');
  });

  test('M-Pesa callback marks payment completed and generates receipt', async () => {
    const res = await request(app)
      .post('/api/payments/mpesa/callback?token=testtoken')
      .send({
        Body: {
          stkCallback: {
            MerchantRequestID: 'm_1',
            CheckoutRequestID: 'ws_1',
            ResultCode: 0,
            ResultDesc: 'The service request is processed successfully.',
            CallbackMetadata: {
              Item: [
                { Name: 'Amount', Value: 500 },
                { Name: 'MpesaReceiptNumber', Value: 'ABCD1234' },
                { Name: 'PhoneNumber', Value: 254712345678 },
                { Name: 'TransactionDate', Value: 20260206220000 }
              ]
            }
          }
        }
      });

    expect(res.statusCode).toBe(200);
    expect(ReceiptService.generateReceipt).toHaveBeenCalled();
    expect(NotificationService.createNotification).toHaveBeenCalled();
  });
});
