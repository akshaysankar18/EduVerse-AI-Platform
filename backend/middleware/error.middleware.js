/**
 * Global Error Handler Middleware
 * ================================
 * Catches all errors thrown in route handlers / async code.
 * Must be registered LAST in the Express app.
 */

const logger = require('../utils/logger');

// Custom error class for API errors
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details    = details;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Error handler middleware ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message    = err.message    || 'Internal Server Error';

  // Firebase / Firestore specific errors
  if (err.code) {
    switch (err.code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        statusCode = 401; message = 'Invalid credentials'; break;
      case 'auth/email-already-exists':
        statusCode = 409; message = 'Email already in use'; break;
      case 'auth/id-token-expired':
        statusCode = 401; message = 'Session expired. Please log in again.'; break;
      case 'permission-denied':
        statusCode = 403; message = 'Access denied'; break;
      case 'not-found':
        statusCode = 404; message = 'Resource not found'; break;
      default:
        // Keep original message for unknown Firebase codes
        break;
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') { statusCode = 401; message = 'Invalid token'; }
  if (err.name === 'TokenExpiredError') { statusCode = 401; message = 'Token expired'; }

  // Multer / file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') { statusCode = 413; message = 'File too large'; }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') { statusCode = 400; message = 'Unexpected file field'; }

  // Log error (stack in development, message only in production)
  if (statusCode >= 500) {
    logger.error(`${statusCode} ${message}`, {
      stack: err.stack,
      url  : req.originalUrl,
      method: req.method,
    });
  } else {
    logger.warn(`${statusCode} ${message} — ${req.method} ${req.originalUrl}`);
  }

  const body = {
    success  : false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (process.env.NODE_ENV === 'development') {
    body.stack = err.stack;
  }

  if (err.details) body.details = err.details;

  res.status(statusCode).json(body);
};

module.exports = errorMiddleware;
module.exports.AppError = AppError;
