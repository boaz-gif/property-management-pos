jest.mock('../src/utils/database', () => ({
  query: jest.fn()
}));

const db = require('../src/utils/database');
const AuditService = require('../src/services/auth/auditService');

describe('AuditService detailed audit logs', () => {
  beforeEach(() => {
    db.query.mockReset();
  });

  test('writes to audit_logs and detailed_audit_logs', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 1 }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await AuditService.logOperation({
      userId: 10,
      userEmail: 'a@example.com',
      userRole: 'admin',
      action: 'create',
      resourceType: 'tenant',
      resourceId: 5,
      oldValues: null,
      newValues: { name: 'Test' },
      ipAddress: '127.0.0.1',
      userAgent: 'jest'
    });

    expect(result).toEqual({ id: 1 });
    expect(db.query).toHaveBeenCalledTimes(2);
    expect(String(db.query.mock.calls[0][0])).toMatch(/INSERT INTO audit_logs/i);
    expect(String(db.query.mock.calls[1][0])).toMatch(/INSERT INTO detailed_audit_logs/i);
  });

  test('still returns audit_logs row if detailed insert fails', async () => {
    db.query
      .mockResolvedValueOnce({ rows: [{ id: 2 }] })
      .mockRejectedValueOnce(new Error('no table'));

    const result = await AuditService.logOperation({
      userId: 10,
      action: 'update',
      resourceType: 'tenant',
      resourceId: 5
    });

    expect(result).toEqual({ id: 2 });
    expect(db.query).toHaveBeenCalledTimes(2);
  });
});

