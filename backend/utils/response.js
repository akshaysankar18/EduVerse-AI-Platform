/**
 * Standardised API Response Utility
 * ===================================
 * Provides consistent response shapes across all endpoints.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {object}  options
 * @param {any}     options.data      - Payload to send
 * @param {string}  options.message   - Human-readable message
 * @param {number}  options.statusCode - HTTP status (default 200)
 * @param {object}  options.meta      - Pagination or extra metadata
 */
const sendSuccess = (res, { data = null, message = 'Success', statusCode = 200, meta = null } = {}) => {
  const body = {
    success  : true,
    message,
    timestamp: new Date().toISOString(),
  };

  if (data  !== null) body.data = data;
  if (meta  !== null) body.meta = meta;

  return res.status(statusCode).json(body);
};

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object}  options
 * @param {string}  options.message   - Human-readable error message
 * @param {number}  options.statusCode - HTTP status (default 500)
 * @param {any}     options.errors    - Validation error details
 */
const sendError = (res, { message = 'An error occurred', statusCode = 500, errors = null } = {}) => {
  const body = {
    success  : false,
    message,
    timestamp: new Date().toISOString(),
  };

  if (errors !== null) body.errors = errors;

  return res.status(statusCode).json(body);
};

/**
 * Build pagination meta for list responses.
 */
const paginationMeta = ({ page, limit, total }) => ({
  page      : Number(page),
  limit     : Number(limit),
  total,
  totalPages: Math.ceil(total / limit),
  hasNext   : page * limit < total,
  hasPrev   : page > 1,
});

module.exports = { sendSuccess, sendError, paginationMeta };
