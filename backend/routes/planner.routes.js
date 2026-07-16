/**
 * Study Planner Routes
 * =====================
 * POST   /api/planner/create
 * GET    /api/planner
 * GET    /api/planner/:id
 * PUT    /api/planner/update/:id
 * DELETE /api/planner/delete/:id
 */

const router = require('express').Router();
const { createTask, getTasks, updateTask, deleteTask, getTask } = require('../controllers/planner.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

router.use(authenticate);

router.post(
  '/create',
  [
    body('title').trim().notEmpty().withMessage('title is required'),
    body('subject').trim().notEmpty().withMessage('subject is required'),
    body('priority').optional().isIn(['low', 'medium', 'high']).withMessage('priority must be low | medium | high'),
    body('status').optional().isIn(['pending', 'in_progress', 'completed']).withMessage('invalid status'),
    handleValidationErrors,
  ],
  createTask,
);

router.get('/',        getTasks);
router.get('/:id',     getTask);
router.put('/update/:id',    updateTask);
router.delete('/delete/:id', deleteTask);

module.exports = router;
