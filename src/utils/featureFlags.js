/**
 * Frontend Feature Flags Module
 *
 * Sources (highest priority first):
 *   1. localStorage override  →  for QA / dev toggling at runtime
 *   2. REACT_APP_FF_<NAME> env var  →  build-time default
 *   3. Hard-coded default in FLAG_REGISTRY
 *
 * All flags default to `false` (safe = off) unless explicitly enabled.
 */

// ---------------------------------------------------------------------------
// Registry – add every new flag here with its safe default
// ---------------------------------------------------------------------------
const FLAG_REGISTRY = {
  // Phase 1 – diagnostics (no behaviour change)
  PERF_PROFILER: false,         // React Profiler wrapper around routes
  PERF_ACTION_MARKERS: false,   // performance.mark / measure for user actions
  PERF_TRACE_LOGGING: false,    // verbose request-trace console logging
  CONSOLE_WARNINGS_GATE: false, // treat console.warn/error as test failures

  // Phase 2 – quick wins (behind flags)
  QUERY_DEDUP: false,           // React Query key normalisation / dedup
  REQUEST_BATCHING: false,      // backend batch aggregation endpoint
  REDIS_CACHE_READS: false,     // Redis caching for read-heavy endpoints
  CONTEXT_SPLIT: false,         // split heavy context providers
  GLOBAL_LOADING: false,        // show global progress bar for background fetches

  // Phase 3 – structural
  FEATURE_MODULES: false,       // use new feature-module imports

  // Phase 4 – optimisation
  EXPANDED_VIRTUALISATION: false, // broader react-window usage
  LIGHTHOUSE_BUDGETS: false,      // enforce Lighthouse perf budgets in CI
};

const LS_PREFIX = 'ff_';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envKey(name) {
  return `REACT_APP_FF_${name}`;
}

function toBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === '1') return true;
    if (lower === 'false' || lower === '0') return false;
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Read a feature flag.
 *
 * @param {string} name  – flag name from FLAG_REGISTRY (case-sensitive).
 * @param {boolean} [defaultValue]  – override the registry default.
 * @returns {boolean}
 */
export function getFlag(name, defaultValue) {
  // 1. localStorage override (highest priority)
  try {
    const lsVal = window?.localStorage?.getItem(`${LS_PREFIX}${name}`);
    if (lsVal !== null && lsVal !== undefined) {
      const parsed = toBool(lsVal);
      if (parsed !== undefined) return parsed;
    }
  } catch { /* SSR or restricted context */ }

  // 2. Build-time env var
  try {
    const envVal = process.env[envKey(name)];
    if (envVal !== undefined) {
      const parsed = toBool(envVal);
      if (parsed !== undefined) return parsed;
    }
  } catch { /* env not available */ }

  // 3. Registry / caller default
  if (defaultValue !== undefined) return defaultValue;
  if (name in FLAG_REGISTRY) return FLAG_REGISTRY[name];
  return false;
}

/**
 * Set a runtime override (persists in localStorage).
 */
export function setFlagOverride(name, value) {
  try {
    window.localStorage.setItem(`${LS_PREFIX}${name}`, String(!!value));
  } catch { /* restricted context */ }
}

/**
 * Remove a runtime override so the flag falls back to env / registry.
 */
export function clearFlagOverride(name) {
  try {
    window.localStorage.removeItem(`${LS_PREFIX}${name}`);
  } catch { /* restricted context */ }
}

/**
 * Snapshot of every known flag, its current resolved value, and source.
 */
export function getAllFlags() {
  const result = {};
  for (const name of Object.keys(FLAG_REGISTRY)) {
    let source = 'default';
    let value = FLAG_REGISTRY[name];

    try {
      const envVal = process.env[envKey(name)];
      if (envVal !== undefined) {
        const parsed = toBool(envVal);
        if (parsed !== undefined) {
          value = parsed;
          source = 'env';
        }
      }
    } catch { /* */ }

    try {
      const lsVal = window?.localStorage?.getItem(`${LS_PREFIX}${name}`);
      if (lsVal !== null && lsVal !== undefined) {
        const parsed = toBool(lsVal);
        if (parsed !== undefined) {
          value = parsed;
          source = 'localStorage';
        }
      }
    } catch { /* */ }

    result[name] = { value, source };
  }
  return result;
}

export { FLAG_REGISTRY };
