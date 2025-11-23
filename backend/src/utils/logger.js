const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

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

// Custom Morgan format
const morganFormat = ':method :url :status :res[content-length] - :response-time ms';

const logger = morgan(morganFormat, {
  stream: accessLogStream
});

const errorLogger = (err, req, res, next) => {
  console.error(`${new Date().toISOString()} - ${err.message}`, {
    method: req.method,
    url: req.url,
    body: req.body,
    stack: err.stack
  });
  next(err);
};

module.exports = {
  logger,
  errorLogger
};