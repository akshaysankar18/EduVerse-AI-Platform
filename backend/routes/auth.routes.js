/**
 * Auth Routes
 * ============
 * POST /api/auth/signup
 * POST /api/auth/login
 * POST /api/auth/refresh
 * POST /api/auth/logout
 * GET  /api/auth/profile
 * PUT  /api/auth/profile
 */

const router = require('express').Router();
const { signup, login, refreshToken, logout, getProfile, updateProfile } = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validateEmail, validatePassword, validateName, handleValidationErrors, body } = require('../utils/validators');

// ── Public routes ─────────────────────────────────────────────

router.post(
  '/signup',
  [
    validateEmail(),
    validatePassword(),
    validateName('displayName').optional(),
    handleValidationErrors,
  ],
  signup,
);

router.post(
  '/login',
  [
    body('firebaseToken').notEmpty().withMessage('firebaseToken is required'),
    handleValidationErrors,
  ],
  login,
);

router.post(
  '/refresh',
  [
    body('refreshToken').notEmpty().withMessage('refreshToken is required'),
    handleValidationErrors,
  ],
  refreshToken,
);

// ── Protected routes ──────────────────────────────────────────

router.post('/logout', authenticate, logout);
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfile);

module.exports = router;
