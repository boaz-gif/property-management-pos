const {
  spanMiddleware,
  markMiddlewareDone,
  getSpanSummary,
  getSpans,
  clearSpans,
  detectCascades,
  getCascadeReport,
} = require('../../src/utils/spanTracker');

// Mock featureFlags
jest.mock('../../src/utils/featureFlags', () => ({
  getFlag: jest.fn((name) => {
    if (name === 'PERF_SPAN_TRACKING') return true;
    return false;
  }),
}));

// Mock requestTrace
jest.mock('../../src/utils/requestTrace', () => ({
  ensureTraceContext: jest.fn((req, res) => {
    req.traceId = req.traceId || 'test-trace-id';
    req.actionId = req.actionId || null;
  }),
}));

describe('spanTracker', () => {
  beforeEach(() => {
    clearSpans();
  });

  describe('spanMiddleware', () => {
    it('attaches __span to request when flag is enabled', (done) => {
      const req = { method: 'GET', url: '/test', originalUrl: '/test', headers: {} };
      const res = { setHeader: jest.fn(), end: jest.fn() };
      const next = () => {
        expect(req.__span).toBeDefined();
        expect(req.__span.method).toBe('GET');
        expect(req.__span.url).toBe('/test');
        expect(req.__span.startHr).toBeDefined();
        done();
      };
      spanMiddleware(req, res, next);
    });

    it('records span data on response end', (done) => {
      const req = { method: 'GET', url: '/api/test', originalUrl: '/api/test', headers: {} };
      const mockEnd = jest.fn();
      const res = {
        setHeader: jest.fn(),
        end: mockEnd,
        statusCode: 200,
      };

      spanMiddleware(req, res, () => {
        // Simulate response end
        res.end();
        expect(req.__span.totalMs).toBeDefined();
        expect(req.__span.totalMs).toBeGreaterThanOrEqual(0);

        const spans = getSpans();
        expect(spans.length).toBeGreaterThanOrEqual(1);
        const lastSpan = spans[spans.length - 1];
        expect(lastSpan.method).toBe('GET');
        expect(lastSpan.url).toBe('/api/test');
        done();
      });
    });
  });

  describe('markMiddlewareDone', () => {
    it('records middleware completion time', (done) => {
      const req = {
        __span: {
          startHr: process.hrtime.bigint(),
        },
      };
      markMiddlewareDone(req, {}, () => {
        expect(req.__span.middlewareDoneHr).toBeDefined();
        expect(req.__span.middlewareMs).toBeDefined();
        expect(req.__span.middlewareMs).toBeGreaterThanOrEqual(0);
        done();
      });
    });

    it('is a no-op when no __span exists', (done) => {
      const req = {};
      markMiddlewareDone(req, {}, () => {
        expect(req.__span).toBeUndefined();
        done();
      });
    });
  });

  describe('getSpanSummary', () => {
    it('returns null for request without __span', () => {
      expect(getSpanSummary({})).toBeNull();
      expect(getSpanSummary(null)).toBeNull();
    });

    it('returns summary for request with __span', () => {
      const req = {
        __span: {
          traceId: 'trace-1',
          actionId: 'action-1',
          method: 'POST',
          url: '/api/data',
          statusCode: 201,
          totalMs: 42.5,
          middlewareMs: 5.2,
        },
      };
      const summary = getSpanSummary(req);
      expect(summary.traceId).toBe('trace-1');
      expect(summary.actionId).toBe('action-1');
      expect(summary.method).toBe('POST');
      expect(summary.totalMs).toBe(42.5);
    });
  });

  describe('detectCascades', () => {
    it('returns empty array when no spans exist', () => {
      expect(detectCascades()).toEqual([]);
    });

    it('groups spans by actionId and counts cascade depth', () => {
      global.__PERF_SPANS__ = [
        { traceId: 't1', actionId: 'a1', method: 'GET', url: '/1', totalMs: 10, timestamp: 1000 },
        { traceId: 't2', actionId: 'a1', method: 'GET', url: '/2', totalMs: 10, timestamp: 1010 },
        { traceId: 't3', actionId: 'a1', method: 'GET', url: '/3', totalMs: 10, timestamp: 1020 },
        { traceId: 't4', actionId: 'a2', method: 'GET', url: '/4', totalMs: 10, timestamp: 1000 },
      ];

      const cascades = detectCascades();
      expect(cascades.length).toBe(2);

      const a1 = cascades.find((c) => c.actionId === 'a1');
      expect(a1.requestCount).toBe(3);
      expect(a1.cascadeDepth).toBeGreaterThanOrEqual(2);

      const a2 = cascades.find((c) => c.actionId === 'a2');
      expect(a2.requestCount).toBe(1);
      expect(a2.cascadeDepth).toBe(1);
    });

    it('filters by actionId when provided', () => {
      global.__PERF_SPANS__ = [
        { traceId: 't1', actionId: 'a1', method: 'GET', url: '/1', totalMs: 10, timestamp: 1000 },
        { traceId: 't2', actionId: 'a2', method: 'GET', url: '/2', totalMs: 10, timestamp: 1000 },
      ];

      const cascades = detectCascades('a1');
      expect(cascades.length).toBe(1);
      expect(cascades[0].actionId).toBe('a1');
    });
  });

  describe('getCascadeReport', () => {
    it('returns zeros when no spans exist', () => {
      const report = getCascadeReport();
      expect(report).toEqual({ maxDepth: 0, avgDepth: 0, cascadesOver3: 0, total: 0 });
    });

    it('computes cascade statistics', () => {
      global.__PERF_SPANS__ = [
        { traceId: 't1', actionId: 'a1', method: 'GET', url: '/1', totalMs: 10, timestamp: 1000 },
        { traceId: 't2', actionId: 'a1', method: 'GET', url: '/2', totalMs: 10, timestamp: 1010 },
        { traceId: 't3', actionId: 'a1', method: 'GET', url: '/3', totalMs: 10, timestamp: 1020 },
        { traceId: 't4', actionId: 'a1', method: 'GET', url: '/4', totalMs: 10, timestamp: 1030 },
        { traceId: 't5', actionId: 'a1', method: 'GET', url: '/5', totalMs: 10, timestamp: 1040 },
      ];

      const report = getCascadeReport();
      expect(report.maxDepth).toBeGreaterThanOrEqual(2);
      expect(report.total).toBe(1);
    });
  });

  describe('clearSpans', () => {
    it('clears all stored spans', () => {
      global.__PERF_SPANS__ = [{ traceId: 't1' }];
      clearSpans();
      expect(getSpans()).toHaveLength(0);
    });
  });
});
