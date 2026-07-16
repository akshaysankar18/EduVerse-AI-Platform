/**
 * Global Search Routes
 * =====================
 * GET /api/search
 */

const router = require('express').Router();
const { searchAll } = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);

router.get('/', searchAll);

module.exports = router;
