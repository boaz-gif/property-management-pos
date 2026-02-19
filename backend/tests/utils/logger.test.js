const buildReqResNext = () => {
  const req = { method: 'GET', url: '/api/health', headers: {}, body: { a: 1 } };
  const res = { getHeader: jest.fn(() => undefined), setHeader: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
};

describe('logger', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test('creates logs directory when missing and sets trace context before morgan', () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => false),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => ({}))
    }));

    const ensureTraceContext = jest.fn(() => ({ traceId: 't1', actionId: null }));
    jest.doMock('../../src/utils/requestTrace', () => ({ ensureTraceContext }));

    const morganMiddleware = jest.fn((req, res, next) => {
      req._morganSeenTraceId = req.traceId;
      next();
    });

    const morgan = jest.fn(() => morganMiddleware);
    morgan.token = jest.fn();
    jest.doMock('morgan', () => morgan);

    const fs = require('fs');
    const { logger } = require('../../src/utils/logger');

    const { req, res, next } = buildReqResNext();
    req.traceId = 'trace-from-test';

    logger(req, res, next);

    expect(fs.mkdirSync).toHaveBeenCalledTimes(1);
    expect(morgan.token).toHaveBeenCalledWith('traceId', expect.any(Function));
    expect(morgan.token).toHaveBeenCalledWith('actionId', expect.any(Function));
    expect(ensureTraceContext).toHaveBeenCalledWith(req, res);
    expect(morganMiddleware).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('does not create logs directory when present', () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => ({}))
    }));

    const ensureTraceContext = jest.fn();
    jest.doMock('../../src/utils/requestTrace', () => ({ ensureTraceContext }));

    const morgan = jest.fn(() => (req, res, next) => next());
    morgan.token = jest.fn();
    jest.doMock('morgan', () => morgan);

    const fs = require('fs');
    const { logger } = require('../../src/utils/logger');

    const { req, res, next } = buildReqResNext();
    logger(req, res, next);

    expect(fs.mkdirSync).not.toHaveBeenCalled();
  });

  test('errorLogger emits trace context', () => {
    jest.doMock('fs', () => ({
      existsSync: jest.fn(() => true),
      mkdirSync: jest.fn(),
      createWriteStream: jest.fn(() => ({}))
    }));

    jest.doMock('../../src/utils/requestTrace', () => ({ ensureTraceContext: jest.fn() }));

    const morgan = jest.fn(() => (req, res, next) => next());
    morgan.token = jest.fn();
    jest.doMock('morgan', () => morgan);

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { errorLogger } = require('../../src/utils/logger');
    const err = new Error('boom');
    const req = { method: 'POST', url: '/x', body: { p: 1 }, traceId: 't2', actionId: 'a2' };
    const res = {};
    const next = jest.fn();

    errorLogger(err, req, res, next);

    expect(consoleError).toHaveBeenCalledWith(expect.stringContaining('boom'), {
      traceId: 't2',
      actionId: 'a2',
      method: 'POST',
      url: '/x',
      body: { p: 1 },
      stack: expect.any(String)
    });
    expect(next).toHaveBeenCalledWith(err);
  });
});

