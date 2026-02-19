const { v4: uuidv4 } = require('uuid');

const MAX_ID_LENGTH = 128;
const SAFE_ID_REGEX = /^[a-zA-Z0-9._:\-]+$/;

function normalizeId(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_ID_LENGTH) return null;
  if (!SAFE_ID_REGEX.test(trimmed)) return null;
  return trimmed;
}

function createTraceId() {
  return uuidv4();
}

function ensureTraceContext(req, res) {
  const incomingTraceId = normalizeId(req?.headers?.['x-trace-id']);
  const incomingActionId = normalizeId(req?.headers?.['x-action-id']);

  const traceId = incomingTraceId || createTraceId();
  const actionId = incomingActionId || null;

  if (req) {
    req.traceId = traceId;
    req.actionId = actionId;
  }

  if (res && typeof res.setHeader === 'function') {
    if (!res.getHeader || !res.getHeader('X-Trace-Id')) res.setHeader('X-Trace-Id', traceId);
    if (actionId && (!res.getHeader || !res.getHeader('X-Action-Id'))) res.setHeader('X-Action-Id', actionId);
  }

  return { traceId, actionId };
}

module.exports = {
  MAX_ID_LENGTH,
  SAFE_ID_REGEX,
  normalizeId,
  createTraceId,
  ensureTraceContext
};

