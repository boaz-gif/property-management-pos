const MAX_ID_LENGTH = 128;
const SAFE_ID_REGEX = /^[a-zA-Z0-9._:\-]+$/;

export function normalizeId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_ID_LENGTH) return null;
  if (!SAFE_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

export function isPerfDiagnosticsEnabled() {
  if (process.env.REACT_APP_PERF_DIAGNOSTICS === 'true') return true;
  try {
    return window?.localStorage?.getItem('perfDiagnostics') === 'true';
  } catch {
    return false;
  }
}

export function createTraceId() {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : null;
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
  return `t_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

let currentActionId = null;

export function setCurrentActionId(actionId) {
  currentActionId = normalizeId(actionId);
  return currentActionId;
}

export function getCurrentActionId() {
  return currentActionId;
}

export function ensureTraceHeaders(headers = {}) {
  const nextHeaders = { ...headers };
  if (!nextHeaders['X-Trace-Id']) nextHeaders['X-Trace-Id'] = createTraceId();
  const actionId = getCurrentActionId();
  if (actionId && !nextHeaders['X-Action-Id']) nextHeaders['X-Action-Id'] = actionId;
  return nextHeaders;
}

