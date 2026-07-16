/**
 * Input Validation Helpers
 * =========================
 * Reusable express-validator chains and custom validators.
 */

const { body, param, query, validationResult } = require('express-validator');
const { sendError } = require('./response');

// ── Reusable validation chains ───────────────────────────────

const validateEmail = () =>
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email address')
    .normalizeEmail();

const validatePassword = () =>
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and a number');

const validateName = (field = 'name') =>
  body(field)
    .trim()
    .notEmpty().withMessage(`${field} is required`)
    .isLength({ min: 2, max: 50 }).withMessage(`${field} must be 2–50 characters`);

const validateObjectId = (field = 'id') =>
  param(field)
    .notEmpty().withMessage(`${field} is required`);

const validatePagination = () => [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer').toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
];

// ── Validation result middleware ─────────────────────────────

/**
 * Express middleware that returns a 422 if validation failed.
 * Call this after running your validation chains.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return sendError(res, {
      statusCode: 422,
      message   : 'Validation failed',
      errors    : errors.array().map(e => ({ field: e.path, message: e.msg })),
    });
  }
  next();
};

// ── Custom validators ────────────────────────────────────────

const isValidDateString = (value) => {
  if (!value) return true; // optional
  const date = new Date(value);
  if (isNaN(date.getTime())) throw new Error('Invalid date format');
  return true;
};

module.exports = {
  // Chains
  validateEmail,
  validatePassword,
  validateName,
  validateObjectId,
  validatePagination,
  // Middleware
  handleValidationErrors,
  // Custom validators
  isValidDateString,
  // Re-export express-validator for convenience
  body,
  param,
  query,
};
