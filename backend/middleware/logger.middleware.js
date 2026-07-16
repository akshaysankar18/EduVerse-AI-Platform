/**
 * Request Logger Middleware
 * ==========================
 * Uses Morgan for HTTP request logging, piped through Winston.
 */

const morgan = require('morgan');
const logger = require('../utils/logger');

// Pipe morgan output through Winston
const stream = {
  write: (message) => logger.http(message.trim()),
};

// Skip health-check pings in production to reduce noise
const skip = () => {
  const env = process.env.NODE_ENV || 'development';
  return env === 'production';
};

const loggerMiddleware = morgan(
  ':remote-addr :method :url :status :res[content-length] - :response-time ms',
  { stream, skip: false },
);

module.exports = loggerMiddleware;
