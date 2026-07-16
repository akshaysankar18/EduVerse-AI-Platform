/**
 * Winston Logger Utility
 * =======================
 * Provides structured, leveled logging with file and console transports.
 */

const { createLogger, format, transports } = require('winston');
const path = require('path');
const fs   = require('fs');

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const { combine, timestamp, printf, colorize, errors } = format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `[${timestamp}] ${level}: ${stack || message}`;
});

const logger = createLogger({
  level : process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat,
  ),
  transports: [
    // Console (coloured in development)
    new transports.Console({
      format: combine(
        colorize({ all: true }),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat,
      ),
      silent: process.env.NODE_ENV === 'test',
    }),
    // Combined log file
    new transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize : 5_242_880, // 5 MB
      maxFiles: 5,
    }),
    // Error-only log file
    new transports.File({
      filename: path.join(logsDir, 'error.log'),
      level   : 'error',
      maxsize : 5_242_880,
      maxFiles: 3,
    }),
  ],
  exceptionHandlers: [
    new transports.File({ filename: path.join(logsDir, 'exceptions.log') }),
  ],
  rejectionHandlers: [
    new transports.File({ filename: path.join(logsDir, 'rejections.log') }),
  ],
});

module.exports = logger;
