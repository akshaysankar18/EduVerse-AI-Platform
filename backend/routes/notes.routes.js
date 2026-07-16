/**
 * Notes Routes
 * =============
 * POST   /api/notes/generate
 * POST   /api/notes/upload
 * GET    /api/notes
 * GET    /api/notes/:id
 * DELETE /api/notes/:id
 *
 * POST   /api/notes/:id/flashcards
 * POST   /api/notes/:id/quiz
 * POST   /api/notes/:id/mindmap
 * POST   /api/notes/:id/questions
 *
 * IMPORTANT: The /:id/sub-path routes MUST be registered BEFORE the bare
 * /:id GET/DELETE routes, otherwise Express will match /:id first and treat
 * "flashcards", "quiz", "mindmap", "questions" as note IDs, returning 404.
 */

const router = require('express').Router();
const {
  generateNotes,
  uploadNotes,
  getNotes,
  getNote,
  deleteNote,
  generateFlashcards,
  generateQuizFromNote,
  generateMindmap,
  answerQuestion,
} = require('../controllers/notes.controller');
const { authenticate }         = require('../middleware/auth.middleware');
const { uploadFile }           = require('../middleware/upload.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

router.use(authenticate);

// ── Static / non-parameterised routes first ─────────────────
router.post(
  '/generate',
  [
    body('topic').trim().notEmpty().withMessage('topic is required'),
    body('subject').trim().notEmpty().withMessage('subject is required'),
    body('level').optional().isIn(['beginner', 'intermediate', 'advanced']),
    handleValidationErrors,
  ],
  generateNotes,
);

router.post('/upload', uploadFile, uploadNotes);
router.get('/',        getNotes);

// ── Sub-path param routes — MUST come before bare /:id ──────
// These would be shadowed if GET /:id were registered first.
router.post('/:id/flashcards', generateFlashcards);
router.post('/:id/quiz',       generateQuizFromNote);
router.post('/:id/mindmap',    generateMindmap);
router.post('/:id/questions',  answerQuestion);

// ── Bare param routes ────────────────────────────────────────
router.get('/:id',    getNote);
router.delete('/:id', deleteNote);

module.exports = router;
