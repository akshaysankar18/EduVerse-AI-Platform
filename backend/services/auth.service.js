/**
 * Authentication Service
 * =======================
 * Handles JWT generation, verification, and token refresh logic.
 */

const jwt  = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const JWT_SECRET          = () => process.env.JWT_SECRET || 'eduverse_secure_default_jwt_secret_key_32_chars_long';
const JWT_EXPIRES_IN      = () => process.env.JWT_EXPIRES_IN      || '7d';
const JWT_REFRESH_SECRET  = () => process.env.JWT_REFRESH_SECRET  || process.env.JWT_SECRET || 'eduverse_secure_default_refresh_secret_key_32_chars_long';
const JWT_REFRESH_EXPIRES = () => process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate an access token.
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET(), { expiresIn: JWT_EXPIRES_IN() });
};

/**
 * Generate a refresh token.
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, JWT_REFRESH_SECRET(), { expiresIn: JWT_REFRESH_EXPIRES() });
};

/**
 * Verify an access token.
 * @returns {object} decoded payload
 * @throws {Error}
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, JWT_SECRET());
};

/**
 * Verify a refresh token.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, JWT_REFRESH_SECRET());
};

/**
 * Generate both tokens for a user.
 * @param {{ uid, email, role }} user
 * @returns {{ accessToken, refreshToken }}
 */
const generateTokenPair = (user) => {
  const payload = { uid: user.uid, email: user.email, role: user.role || 'student' };
  return {
    accessToken : generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
};

/**
 * Hash a plain-text password.
 */
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
};

/**
 * Compare a plain-text password against a hash.
 */
const comparePassword = async (plain, hashed) => {
  return bcrypt.compare(plain, hashed);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
  hashPassword,
  comparePassword,
};
