/**
 * Authentication Middleware
 * ==========================
 * Verifies JWT tokens issued by our own auth service.
 * Optionally also verifies Firebase ID tokens when needed.
 */

const jwt    = require('jsonwebtoken');
const { auth } = require('../config/firebase');
const { sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Primary middleware: verifies our own JWT.
 * Attaches decoded user payload to req.user.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      if (process.env.NODE_ENV === 'development') {
        const headerEmail = req.headers['x-user-email'];
        const headerName = req.headers['x-user-name'];

        if (headerEmail && headerEmail.trim() !== '') {
          const cleanEmail = headerEmail.trim().toLowerCase();
          const derivedUid = 'user-' + cleanEmail.replace(/[^a-z0-9]/g, '_');
          req.user = {
            uid: derivedUid,
            email: cleanEmail,
            role: 'student',
            displayName: headerName ? headerName.trim() : cleanEmail.split('@')[0],
          };
          logger.info(`[Auth] Dev Mode: Authenticated via headers as ${derivedUid} (${cleanEmail})`);
        } else {
          req.user = {
            uid: 'demo-user-001',
            email: 'alex.johnson@eduverse.ai',
            role: 'student',
            displayName: 'Alex Johnson',
          };
          logger.info('[Auth] Dev Mode: Falling back to default demo-user-001');
        }
        return next();
      }
      return sendError(res, {
        statusCode: 401,
        message   : 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'eduverse_secure_default_jwt_secret_key_32_chars_long');
    req.user = decoded; // { uid, email, role, iat, exp }
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return sendError(res, { statusCode: 401, message: 'Token expired. Please log in again.' });
    }
    if (error.name === 'JsonWebTokenError') {
      return sendError(res, { statusCode: 401, message: 'Invalid token.' });
    }
    logger.error('Auth middleware error:', error.message);
    return sendError(res, { statusCode: 401, message: 'Authentication failed.' });
  }
};

/**
 * Optional: verify a Firebase ID token directly.
 * Use when the client authenticates via Firebase client SDK.
 */
const authenticateFirebase = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return sendError(res, { statusCode: 401, message: 'No Firebase ID token provided.' });
    }

    const idToken    = authHeader.split(' ')[1];
    const decoded    = await auth.verifyIdToken(idToken);
    req.user = {
      uid  : decoded.uid,
      email: decoded.email,
      role : decoded.role || 'student',
    };
    next();
  } catch (error) {
    logger.error('Firebase auth middleware error:', error.message);
    return sendError(res, { statusCode: 401, message: 'Firebase authentication failed.' });
  }
};

/**
 * Role-based access control.
 * Usage: router.get('/admin', authenticate, authorize('admin'), handler)
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return sendError(res, { statusCode: 401, message: 'Not authenticated.' });
  }
  if (!roles.includes(req.user.role)) {
    return sendError(res, {
      statusCode: 403,
      message   : `Access denied. Required role(s): ${roles.join(', ')}`,
    });
  }
  next();
};

/**
 * Optional authentication — attaches user if token present but does not block.
 */
const optionalAuth = (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token  = authHeader.split(' ')[1];
      req.user     = jwt.verify(token, process.env.JWT_SECRET || 'eduverse_secure_default_jwt_secret_key_32_chars_long');
    }
  } catch {
    req.user = null;
  }
  next();
};

module.exports = { authenticate, authenticateFirebase, authorize, optionalAuth };
