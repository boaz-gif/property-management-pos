/**
 * Request Span Tracker
 *
 * Records per-request timing spans (middleware chain, route handler, total).
 * Activated only when the PERF_SPAN_TRACKING feature flag is enabled.
 *
 * Integrates with the existing PerformanceMonitor singleton.
 */
const { getFlag } = require('./featureFlags');
const { ensureTraceContext } = require('./requestTrace');

/**
 * Express middleware: starts a span for the incoming request.
 * Should be mounted early in the middleware chain (after body parsers).
 */
function spanMiddleware(req, res, next) {
  if (!getFlag('PERF_SPAN_TRACKING')) return next();

  // Ensure trace context (reuse existing utility)
  ensureTraceContext(req, res);

  const startHr = process.hrtime.bigint();

  req.__span = {
    startHr,
    traceId: req.traceId || null,
    actionId: req.actionId || null,
    method: req.method,
    url: req.originalUrl || req.url,
    middlewareDoneHr: null,
    routeHandlerDoneHr: null,
  };

  // Hook into response finish
  const originalEnd = res.end;
  res.end = function (...args) {
    const endHr = process.hrtime.bigint();
    if (req.__span) {
      req.__span.endHr = endHr;
      req.__span.totalNs = Number(endHr - startHr);
      req.__span.totalMs = req.__span.totalNs / 1e6;
      req.__span.statusCode = res.statusCode;

      // Emit span data for collection
      try {
        const spanData = getSpanSummary(req);
        if (spanData) {
          // Store in global array for monitoring endpoint
          global.__PERF_SPANS__ = global.__PERF_SPANS__ || [];
          global.__PERF_SPANS__.push(spanData);

          // Keep only last 1000 spans
          if (global.__PERF_SPANS__.length > 1000) {
            global.__PERF_SPANS__ = global.__PERF_SPANS__.slice(-500);
          }
        }
      } catch { /* best effort */ }
    }
    return originalEnd.apply(this, args);
  };

  next();
}

/**
 * Mark the end of middleware chain (call before route handler).
 * Useful if you mount this as a separate middleware right before routes.
 */
function markMiddlewareDone(req, _res, next) {
  if (req.__span) {
    req.__span.middlewareDoneHr = process.hrtime.bigint();
    req.__span.middlewareMs = Number(req.__span.middlewareDoneHr - req.__span.startHr) / 1e6;
  }
  next();
}

/**
 * Build a span summary object from the request.
 * @param {object} req – Express request with __span attached
 * @returns {object|null}
 */
function getSpanSummary(req) {
  if (!req?.__span) return null;

  const span = req.__span;
  return {
    traceId: span.traceId,
    actionId: span.actionId,
    method: span.method,
    url: span.url,
    statusCode: span.statusCode || null,
    totalMs: span.totalMs ?? null,
    middlewareMs: span.middlewareMs ?? null,
    timestamp: Date.now(),
  };
}

/**
 * Get all stored spans (for monitoring endpoints).
 * @param {number} [limit=100] – max entries to return
 * @returns {Array}
 */
function getSpans(limit = 100) {
  const spans = global.__PERF_SPANS__ || [];
  return spans.slice(-limit);
}

/**
 * Clear stored spans.
 */
function clearSpans() {
  global.__PERF_SPANS__ = [];
}

/**
 * Cascade detection: count sequential requests within the same action ID.
 * @param {string} [actionId] – optional filter by action
 * @returns {{ actionId: string, cascadeDepth: number, spans: Array }[]}
 */
function detectCascades(actionId) {
  const spans = global.__PERF_SPANS__ || [];

  // Group by actionId
  const groups = {};
  for (const span of spans) {
    if (!span.actionId) continue;
    if (actionId && span.actionId !== actionId) continue;
    if (!groups[span.actionId]) groups[span.actionId] = [];
    groups[span.actionId].push(span);
  }

  const results = [];
  for (const [aid, actionSpans] of Object.entries(groups)) {
    // Sort by timestamp to find sequential calls
    actionSpans.sort((a, b) => a.timestamp - b.timestamp);

    // Count sequential calls where next starts after previous ends
    let cascadeDepth = 1;
    for (let i = 1; i < actionSpans.length; i++) {
      const prev = actionSpans[i - 1];
      const curr = actionSpans[i];
      // If the current request started within 50ms of previous ending, it's sequential
      const prevEnd = prev.timestamp + (prev.totalMs || 0);
      if (curr.timestamp >= prevEnd - 50) {
        cascadeDepth++;
      }
    }

    results.push({
      actionId: aid,
      cascadeDepth,
      requestCount: actionSpans.length,
      totalMs: actionSpans.reduce((sum, s) => sum + (s.totalMs || 0), 0),
      spans: actionSpans,
    });
  }

  return results;
}

/**
 * Get cascade statistics summary.
 * @returns {{ maxDepth: number, avgDepth: number, cascadesOver3: number, total: number }}
 */
function getCascadeReport() {
  const cascades = detectCascades();
  if (cascades.length === 0) {
    return { maxDepth: 0, avgDepth: 0, cascadesOver3: 0, total: 0 };
  }

  const depths = cascades.map((c) => c.cascadeDepth);
  const maxDepth = Math.max(...depths);
  const avgDepth = depths.reduce((a, b) => a + b, 0) / depths.length;
  const cascadesOver3 = depths.filter((d) => d > 3).length;

  return { maxDepth, avgDepth: Math.round(avgDepth * 100) / 100, cascadesOver3, total: cascades.length };
}

module.exports = {
  spanMiddleware,
  markMiddlewareDone,
  getSpanSummary,
  getSpans,
  clearSpans,
  detectCascades,
  getCascadeReport,
};
