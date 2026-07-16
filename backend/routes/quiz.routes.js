/**
 * Quiz Routes
 * ============
 * POST /api/quiz/generate
 * POST /api/quiz/submit
 * GET  /api/quiz
 * GET  /api/quiz/attempts
 */

const router = require('express').Router();
const { generateQuiz, submitQuiz, getQuizzes, getAttempts, getQuiz } = require('../controllers/quiz.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

router.use(authenticate);

router.post(
  '/generate',
  [
    body('topic').trim().notEmpty().withMessage('topic is required'),
    body('subject').trim().notEmpty().withMessage('subject is required'),
    body('difficulty').optional().isIn(['easy', 'medium', 'hard']),
    body('numQuestions').optional().isInt({ min: 1, max: 20 }).toInt(),
    handleValidationErrors,
  ],
  generateQuiz,
);

router.post(
  '/submit',
  [
    body('quizId').notEmpty().withMessage('quizId is required'),
    body('answers').isArray().withMessage('answers must be an array'),
    handleValidationErrors,
  ],
  submitQuiz,
);

router.get('/',         getQuizzes);
router.get('/attempts',  getAttempts);
router.get('/:id',       getQuiz);

module.exports = router;
