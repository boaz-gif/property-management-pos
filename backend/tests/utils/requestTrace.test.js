jest.mock('uuid', () => ({
  v4: jest.fn(() => 'uuid-1234')
}));

const { normalizeId, createTraceId, ensureTraceContext, MAX_ID_LENGTH } = require('../../src/utils/requestTrace');

describe('requestTrace', () => {
  test('normalizeId rejects non-strings and invalid strings', () => {
    expect(normalizeId(undefined)).toBeNull();
    expect(normalizeId(null)).toBeNull();
    expect(normalizeId(123)).toBeNull();
    expect(normalizeId('')).toBeNull();
    expect(normalizeId('   ')).toBeNull();

    const tooLong = 'a'.repeat(MAX_ID_LENGTH + 1);
    expect(normalizeId(tooLong)).toBeNull();

    expect(normalizeId('has spaces')).toBeNull();
    expect(normalizeId('bad/char')).toBeNull();
    expect(normalizeId('bad?char')).toBeNull();
  });

  test('normalizeId accepts safe IDs and trims whitespace', () => {
    expect(normalizeId('abc')).toBe('abc');
    expect(normalizeId('  abc-_.:123  ')).toBe('abc-_.:123');
  });

  test('createTraceId uses uuid v4', () => {
    expect(createTraceId()).toBe('uuid-1234');
  });

  test('ensureTraceContext sets IDs on req and headers on res', () => {
    const req = { headers: {} };
    const res = {
      getHeader: jest.fn(() => undefined),
      setHeader: jest.fn()
    };

    const ctx = ensureTraceContext(req, res);

    expect(ctx).toEqual({ traceId: 'uuid-1234', actionId: null });
    expect(req.traceId).toBe('uuid-1234');
    expect(req.actionId).toBeNull();
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'uuid-1234');
    expect(res.setHeader).toHaveBeenCalledTimes(1);
  });

  test('ensureTraceContext respects incoming IDs and does not overwrite existing res headers', () => {
    const req = { headers: { 'x-trace-id': 'trace-1', 'x-action-id': 'action-1' } };
    const res = {
      getHeader: jest.fn((name) => (name === 'X-Trace-Id' ? 'already-set' : undefined)),
      setHeader: jest.fn()
    };

    const ctx = ensureTraceContext(req, res);

    expect(ctx).toEqual({ traceId: 'trace-1', actionId: 'action-1' });
    expect(req.traceId).toBe('trace-1');
    expect(req.actionId).toBe('action-1');
    expect(res.setHeader).toHaveBeenCalledWith('X-Action-Id', 'action-1');
    expect(res.setHeader).toHaveBeenCalledTimes(1);
  });

  test('ensureTraceContext skips res header writes when getters are absent', () => {
    const req = { headers: {} };
    const res = {
      setHeader: jest.fn()
    };

    const ctx = ensureTraceContext(req, res);

    expect(ctx).toEqual({ traceId: 'uuid-1234', actionId: null });
    expect(res.setHeader).toHaveBeenCalledWith('X-Trace-Id', 'uuid-1234');
  });
});

