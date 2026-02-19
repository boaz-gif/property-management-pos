/**
 * Simple logger utility for backend operations
 * Provides info, error, warn, debug logging methods
 */

const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logFile = path.join(logsDir, 'app.log');

const formatLog = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  let logMessage = `[${timestamp}] [${level}] ${message}`;
  if (data) {
    logMessage += ` ${JSON.stringify(data)}`;
  }
  return logMessage;
};

const writeLog = (message) => {
  try {
    fs.appendFileSync(logFile, message + '\n', 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
};

const logger = {
  info: (message, data = null) => {
    const logMessage = formatLog('INFO', message, data);
    console.log(logMessage);
    writeLog(logMessage);
  },

  error: (message, data = null) => {
    const logMessage = formatLog('ERROR', message, data);
    console.error(logMessage);
    writeLog(logMessage);
  },

  warn: (message, data = null) => {
    const logMessage = formatLog('WARN', message, data);
    console.warn(logMessage);
    writeLog(logMessage);
  },

  debug: (message, data = null) => {
    const logMessage = formatLog('DEBUG', message, data);
    console.log(logMessage);
    writeLog(logMessage);
  }
};

module.exports = logger;
