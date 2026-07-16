/**
 * Analytics Routes
 * =================
 * GET /api/analytics
 * GET /api/analytics/progress
 */

const router = require('express').Router();
const { getAnalytics, getProgress } = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/',         getAnalytics);
router.get('/progress', getProgress);

module.exports = router;
