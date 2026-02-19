/**
 * Performance Action Markers
 *
 * Wraps `performance.mark()` / `performance.measure()` to record timing of
 * user actions (navigation, button clicks, form submit, etc.).
 *
 * Activated only when perf diagnostics flag is enabled → zero overhead
 * in production.
 */
import { isPerfDiagnosticsEnabled } from '../services/requestTrace';

const MARKER_PREFIX = 'perf:action:';

/**
 * Start timing a user action.
 *
 * @param {string} actionName – descriptive name, e.g. "nav:properties"
 * @returns {{ end: () => object|null }} – call `end()` to finish the measure.
 *          Returns `null` from `end()` when diagnostics are disabled.
 */
export function markAction(actionName) {
  if (!isPerfDiagnosticsEnabled()) {
    return { end: () => null };
  }

  const startMark = `${MARKER_PREFIX}${actionName}:start`;
  const endMark = `${MARKER_PREFIX}${actionName}:end`;
  const measureName = `${MARKER_PREFIX}${actionName}`;

  try {
    performance.mark(startMark);
  } catch {
    return { end: () => null };
  }

  return {
    end() {
      try {
        performance.mark(endMark);
        const [measure] = performance.measure(measureName, startMark, endMark);
        const entry = {
          name: actionName,
          startTime: measure?.startTime ?? 0,
          duration: measure?.duration ?? 0,
          timestamp: Date.now(),
        };

        // Stash in global array for baseline scripts to collect
        window.__PERF_ACTION_LOG__ = window.__PERF_ACTION_LOG__ || [];
        window.__PERF_ACTION_LOG__.push(entry);

        // Cleanup marks
        performance.clearMarks(startMark);
        performance.clearMarks(endMark);
        performance.clearMeasures(measureName);

        return entry;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Return all captured action metrics.
 * @returns {Array<{name:string, startTime:number, duration:number, timestamp:number}>}
 */
export function getActionMetrics() {
  return window.__PERF_ACTION_LOG__ || [];
}

/**
 * Clear captured action metrics.
 */
export function clearActionMetrics() {
  window.__PERF_ACTION_LOG__ = [];
}

/**
 * Get a summary (median / p95) of action metrics.
 * @returns {{ count: number, medianMs: number|null, p95Ms: number|null }}
 */
export function getActionSummary() {
  const entries = getActionMetrics();
  if (entries.length === 0) return { count: 0, medianMs: null, p95Ms: null };

  const durations = entries.map((e) => e.duration).sort((a, b) => a - b);
  const median = durations[Math.floor(durations.length / 2)];
  const p95 = durations[Math.floor(durations.length * 0.95)];
  return { count: durations.length, medianMs: median, p95Ms: p95 };
}
