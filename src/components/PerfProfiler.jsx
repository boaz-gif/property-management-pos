import React, { Profiler, useCallback, useRef } from 'react';
import { getFlag } from '../utils/featureFlags';

/**
 * PerfProfiler – React Profiler wrapper for route-level render diagnostics.
 *
 * When the PERF_PROFILER flag is enabled, wraps children in a <Profiler> that
 * logs commit durations, phases, and render counts to
 * `window.__PERF_PROFILER_LOG__`.
 *
 * When disabled, renders children directly — zero overhead.
 *
 * Usage:
 *   <PerfProfiler id="dashboard">
 *     <DashboardPage />
 *   </PerfProfiler>
 */
function PerfProfiler({ id, children }) {
  const renderCount = useRef(0);

  const onRenderCallback = useCallback(
    (
      profilerId, // the "id" prop
      phase,      // "mount" | "update" | "nested-update"
      actualDuration,
      baseDuration,
      startTime,
      commitTime
    ) => {
      renderCount.current += 1;

      const entry = {
        id: profilerId,
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        renderCount: renderCount.current,
        timestamp: Date.now(),
      };

      try {
        window.__PERF_PROFILER_LOG__ = window.__PERF_PROFILER_LOG__ || [];
        window.__PERF_PROFILER_LOG__.push(entry);
      } catch {
        // Restricted context
      }
    },
    []
  );

  if (!getFlag('PERF_PROFILER')) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

/**
 * Get all profiler log entries.
 * @returns {Array}
 */
export function getProfilerLog() {
  return (typeof window !== 'undefined' && window.__PERF_PROFILER_LOG__) || [];
}

/**
 * Clear profiler log.
 */
export function clearProfilerLog() {
  if (typeof window !== 'undefined') {
    window.__PERF_PROFILER_LOG__ = [];
  }
}

export default PerfProfiler;
