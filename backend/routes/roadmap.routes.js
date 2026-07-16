/**
 * Roadmap Routes
 * ===============
 * POST   /api/roadmap/create
 * GET    /api/roadmap
 * GET    /api/roadmap/:id
 * PUT    /api/roadmap/update/:id
 * DELETE /api/roadmap/:id
 */

const router = require('express').Router();
const { createRoadmap, getRoadmaps, getRoadmap, updateRoadmap, deleteRoadmap } = require('../controllers/roadmap.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

router.use(authenticate);

router.post(
  '/create',
  [
    body('goal').trim().notEmpty().withMessage('goal is required'),
    body('subject').trim().notEmpty().withMessage('subject is required'),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    body('weeks').optional().isInt({ min: 1, max: 52 }).toInt(),
    handleValidationErrors,
  ],
  createRoadmap,
);

router.get('/',             getRoadmaps);
router.get('/:id',          getRoadmap);
router.put('/update/:id',   updateRoadmap);
router.delete('/:id',       deleteRoadmap);

module.exports = router;
