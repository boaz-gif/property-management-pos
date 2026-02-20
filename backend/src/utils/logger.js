const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const { ensureTraceContext } = require('./requestTrace');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Create a write stream for logs
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'),
  { flags: 'a' }
);

// Custom Morgan tokens
morgan.token('traceId', (req) => req.traceId || '-');
morgan.token('actionId', (req) => req.actionId || '-');

// Custom Morgan format
const morganFormat = ':traceId :actionId :method :url :status :res[content-length] - :response-time ms';

const morganMiddleware = morgan(morganFormat, {
  stream: accessLogStream
});

const logger = (req, res, next) => {
  ensureTraceContext(req, res);
  return morganMiddleware(req, res, next);
};

const errorLogger = (err, req, res, next) => {
  console.error(`${new Date().toISOString()} - ${err.message}`, {
    traceId: req.traceId,
    actionId: req.actionId,
    method: req.method,
    url: req.url,
    body: req.body,
    stack: err.stack
  });
  next(err);
};

const appLogger = {
  info: (message, ...args) => console.log(`[${new Date().toISOString()}] [INFO] ${message}`, ...args),
  error: (message, ...args) => console.error(`[${new Date().toISOString()}] [ERROR] ${message}`, ...args),
  warn: (message, ...args) => console.warn(`[${new Date().toISOString()}] [WARN] ${message}`, ...args),
  debug: (message, ...args) => console.log(`[${new Date().toISOString()}] [DEBUG] ${message}`, ...args),
};

// Attach appLogger methods to the logger middleware for files that destructure { logger }
Object.assign(logger, appLogger);

module.exports = {
  logger,
  errorLogger,
  appLogger,
  ...appLogger
};
