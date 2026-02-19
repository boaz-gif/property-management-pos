import {
  normalizeId,
  isPerfDiagnosticsEnabled,
  createTraceId,
  setCurrentActionId,
  getCurrentActionId,
  ensureTraceHeaders
} from '../services/requestTrace';

describe('requestTrace', () => {
  beforeEach(() => {
    localStorage.clear();
    delete process.env.REACT_APP_PERF_DIAGNOSTICS;
  });

  test('normalizeId validates safe IDs', () => {
    expect(normalizeId(null)).toBeNull();
    expect(normalizeId('')).toBeNull();
    expect(normalizeId('  ')).toBeNull();
    expect(normalizeId('has spaces')).toBeNull();
    expect(normalizeId('bad/char')).toBeNull();
    expect(normalizeId('ok-_.:123')).toBe('ok-_.:123');
    expect(normalizeId('  ok  ')).toBe('ok');
  });

  test('isPerfDiagnosticsEnabled uses env and localStorage', () => {
    expect(isPerfDiagnosticsEnabled()).toBe(false);
    localStorage.setItem('perfDiagnostics', 'true');
    expect(isPerfDiagnosticsEnabled()).toBe(true);
    localStorage.setItem('perfDiagnostics', 'false');
    expect(isPerfDiagnosticsEnabled()).toBe(false);
    process.env.REACT_APP_PERF_DIAGNOSTICS = 'true';
    expect(isPerfDiagnosticsEnabled()).toBe(true);
  });

  test('createTraceId prefers crypto.randomUUID', () => {
    const originalCrypto = global.crypto;
    global.crypto = { randomUUID: () => 'uuid-1' };
    expect(createTraceId()).toBe('uuid-1');
    global.crypto = originalCrypto;
  });

  test('createTraceId falls back without crypto', () => {
    const originalCrypto = global.crypto;
    global.crypto = undefined;
    const id = createTraceId();
    expect(typeof id).toBe('string');
    expect(id).toContain('t_');
    global.crypto = originalCrypto;
  });

  test('action ID can be set and read', () => {
    expect(getCurrentActionId()).toBeNull();
    setCurrentActionId('action-1');
    expect(getCurrentActionId()).toBe('action-1');
    setCurrentActionId('bad id');
    expect(getCurrentActionId()).toBeNull();
  });

  test('ensureTraceHeaders adds trace and action headers', () => {
    global.crypto = { randomUUID: () => 'uuid-2' };
    setCurrentActionId('action-2');
    const headers = ensureTraceHeaders({ Accept: 'x' });
    expect(headers).toEqual({ Accept: 'x', 'X-Trace-Id': 'uuid-2', 'X-Action-Id': 'action-2' });
  });
});

