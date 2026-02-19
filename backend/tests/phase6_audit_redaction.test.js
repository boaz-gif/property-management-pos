jest.mock('../src/services/auditService', () => ({
  logOperation: jest.fn().mockResolvedValue({ id: 1 })
}));

const { auditMiddleware } = require('../src/middleware/auditMiddleware');
const AuditService = require('../src/services/auditService');

describe('auditMiddleware redaction', () => {
  beforeEach(() => {
    AuditService.logOperation.mockClear();
  });

  test('redacts sensitive fields in POST body', async () => {
    const req = {
      method: 'POST',
      path: '/payments',
      body: { amount: 10, password: 'secret', token: 'abc', nested: { ssn: '123' } },
      user: { id: 1, email: 'u@example.com', role: 'admin' },
      headers: { 'user-agent': 'jest' }
    };

    const res = {
      statusCode: 200,
      json: jest.fn()
    };

    await new Promise((resolve) => auditMiddleware(req, res, resolve));
    res.json({ data: { id: 99 } });

    expect(AuditService.logOperation).toHaveBeenCalledTimes(1);
    const call = AuditService.logOperation.mock.calls[0][0];
    expect(call.newValues.password).toBe('[REDACTED]');
    expect(call.newValues.token).toBe('[REDACTED]');
    expect(call.newValues.nested.ssn).toBe('[REDACTED]');
  });
});

