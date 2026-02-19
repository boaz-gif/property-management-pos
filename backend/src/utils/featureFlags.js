/**
 * Backend Feature Flags Module
 *
 * Source: process.env.FF_<NAME>  →  falls back to hard-coded default.
 *
 * All flags default to `false` (safe = off) unless explicitly enabled.
 */

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------
const FLAG_REGISTRY = {
  // Phase 1 – diagnostics
  PERF_SPAN_TRACKING: false,     // request span timing middleware
  PERF_CASCADE_DETECTION: false, // cascade depth tracking per action
  PERF_TRACE_LOGGING: false,     // verbose trace logging in morgan

  // Phase 2 – quick wins
  REQUEST_BATCHING: false,       // batch aggregation endpoint
  REDIS_CACHE_READS: false,      // Redis caching for read-heavy endpoints
  N_PLUS_ONE_FIX: false,         // batched DB queries for N+1 paths

  // Phase 3 – structural
  FEATURE_MODULES: false,        // use new feature-module imports

  // Phase 4 – optimisation
  PAYLOAD_SLIM: false,           // field selection & smaller payloads
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function envKey(name) {
  return `FF_${name}`;
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
function getFlag(name, defaultValue) {
  const envVal = process.env[envKey(name)];
  if (envVal !== undefined) {
    const parsed = toBool(envVal);
    if (parsed !== undefined) return parsed;
  }

  if (defaultValue !== undefined) return defaultValue;
  if (name in FLAG_REGISTRY) return FLAG_REGISTRY[name];
  return false;
}

/**
 * Snapshot of every known flag with resolved value and source.
 */
function getAllFlags() {
  const result = {};
  for (const name of Object.keys(FLAG_REGISTRY)) {
    let source = 'default';
    let value = FLAG_REGISTRY[name];

    const envVal = process.env[envKey(name)];
    if (envVal !== undefined) {
      const parsed = toBool(envVal);
      if (parsed !== undefined) {
        value = parsed;
        source = 'env';
      }
    }

    result[name] = { value, source };
  }
  return result;
}

module.exports = {
  FLAG_REGISTRY,
  getFlag,
  getAllFlags,
};
