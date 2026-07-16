/**
 * Personalization Routes
 * =======================
 * GET /api/personalization/recommendations
 */

const router = require('express').Router();
const { getRecommendations } = require('../controllers/personalization.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/recommendations', getRecommendations);

module.exports = router;
