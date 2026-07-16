/**
 * Learning Resources Routes
 * ===========================
 * POST /api/resources/search
 * GET  /api/resources/history
 */

const router = require('express').Router();
const { searchResources, getResourcesHistory } = require('../controllers/resources.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

// Protect all routes
router.use(authenticate);

router.post(
  '/search',
  [
    body('topic').trim().notEmpty().withMessage('topic is required'),
    body('subject').trim().notEmpty().withMessage('subject is required'),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    handleValidationErrors,
  ],
  searchResources
);

router.get('/history', getResourcesHistory);

module.exports = router;
