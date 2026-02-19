const Database = require('../src/utils/database');

jest.mock('../src/utils/database');
jest.mock('../src/services/payments/ReceiptService', () => ({
  generateReceipt: jest.fn().mockResolvedValue({ filePath: 'uploads/receipts/unit.pdf' })
}));

describe('TenantPaymentService.generateReceipt', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('enforces tenant boundary for non-system callers', async () => {
    const TenantPaymentService = require('../src/services/payments/tenantPaymentService');

    Database.query.mockImplementation((query, params) => {
      if (query.includes('SELECT * FROM payment_receipts')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (query.includes('FROM payments p') && query.includes('p.tenant_id = $2')) {
        expect(params).toEqual([55, 10]);
        return Promise.resolve({
          rows: [{ id: 55, tenant_id: 10, tenant_name: 'Tenant', tenant_user_id: 7 }],
          rowCount: 1
        });
      }
      if (query.includes('INSERT INTO payment_receipts')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const receipt = await TenantPaymentService.generateReceipt(55, 10, { id: 7, role: 'tenant' });
    expect(receipt.payment_id).toBe(55);
    expect(receipt.pdf_url).toBe('uploads/receipts/unit.pdf');
  });

  test('allows system caller without tenantId', async () => {
    const TenantPaymentService = require('../src/services/payments/tenantPaymentService');

    Database.query.mockImplementation((query, params) => {
      if (query.includes('SELECT * FROM payment_receipts')) {
        return Promise.resolve({ rows: [], rowCount: 0 });
      }
      if (query.includes('FROM payments p') && !query.includes('p.tenant_id = $2')) {
        expect(params).toEqual([55]);
        return Promise.resolve({
          rows: [{ id: 55, tenant_id: 10, tenant_name: 'Tenant', tenant_user_id: 7 }],
          rowCount: 1
        });
      }
      if (query.includes('INSERT INTO payment_receipts')) {
        return Promise.resolve({ rows: [], rowCount: 1 });
      }
      return Promise.resolve({ rows: [], rowCount: 0 });
    });

    const receipt = await TenantPaymentService.generateReceipt(55, { role: 'system' });
    expect(receipt.payment_id).toBe(55);
  });
});
