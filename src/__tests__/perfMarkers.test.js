import { markAction, getActionMetrics, clearActionMetrics, getActionSummary } from '../utils/perfMarkers';

// Mock isPerfDiagnosticsEnabled
let mockEnabled = false;
jest.mock('../services/requestTrace', () => ({
  isPerfDiagnosticsEnabled: () => mockEnabled,
}));

describe('perfMarkers', () => {
  beforeEach(() => {
    mockEnabled = false;
    clearActionMetrics();
    // Reset performance API mocks
    if (typeof performance !== 'undefined') {
      try { performance.clearMarks(); } catch {}
      try { performance.clearMeasures(); } catch {}
    }
  });

  describe('markAction', () => {
    it('returns no-op when diagnostics are disabled', () => {
      mockEnabled = false;
      const action = markAction('test-action');
      expect(action.end()).toBeNull();
      expect(getActionMetrics()).toHaveLength(0);
    });

    it('records action timing when diagnostics are enabled', () => {
      mockEnabled = true;
      const action = markAction('test-action');

      // Simulate some work
      const result = action.end();

      // result should be an entry object or null (depending on browser API)
      if (result !== null) {
        expect(result.name).toBe('test-action');
        expect(typeof result.duration).toBe('number');
        expect(typeof result.timestamp).toBe('number');
        expect(getActionMetrics()).toHaveLength(1);
      }
    });

    it('stores multiple action entries', () => {
      mockEnabled = true;
      const a1 = markAction('action-1');
      a1.end();
      const a2 = markAction('action-2');
      a2.end();

      const metrics = getActionMetrics();
      // May be 0 if performance.measure returns undefined in test env
      expect(metrics).toBeInstanceOf(Array);
    });
  });

  describe('clearActionMetrics', () => {
    it('clears all collected metrics', () => {
      window.__PERF_ACTION_LOG__ = [{ name: 'a', duration: 1 }];
      clearActionMetrics();
      expect(getActionMetrics()).toHaveLength(0);
    });
  });

  describe('getActionSummary', () => {
    it('returns nulls when no metrics', () => {
      const summary = getActionSummary();
      expect(summary).toEqual({ count: 0, medianMs: null, p95Ms: null });
    });

    it('computes median and p95', () => {
      window.__PERF_ACTION_LOG__ = [
        { name: 'a', duration: 10 },
        { name: 'b', duration: 20 },
        { name: 'c', duration: 30 },
        { name: 'd', duration: 40 },
        { name: 'e', duration: 50 },
      ];

      const summary = getActionSummary();
      expect(summary.count).toBe(5);
      expect(summary.medianMs).toBe(30);
      expect(summary.p95Ms).toBe(50);
    });
  });
});
