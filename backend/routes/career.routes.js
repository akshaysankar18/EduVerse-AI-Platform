/**
 * Career Hub Routes
 * ==================
 * POST /api/career/resume/review
 * POST /api/career/interview/start
 * GET  /api/career/history
 */

const router = require('express').Router();
const { reviewResume, startInterview, getCareerHistory } = require('../controllers/career.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadFile } = require('../middleware/upload.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

router.use(authenticate);

// Resume review — accepts either raw text body or a file upload
router.post('/resume/review',  uploadFile, reviewResume);

router.post(
  '/interview/start',
  [
    body('role').trim().notEmpty().withMessage('role is required'),
    body('level').optional().isIn(['junior', 'mid', 'senior']),
    body('type').optional().isIn(['technical', 'behavioural', 'mixed']),
    handleValidationErrors,
  ],
  startInterview,
);

router.get('/history', getCareerHistory);

module.exports = router;
