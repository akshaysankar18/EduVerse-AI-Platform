/**
 * AI Mentor Routes
 * =================
 * POST /api/mentor/chat
 * POST /api/mentor/upload-pdf
 * POST /api/mentor/upload-image
 * GET  /api/mentor/history
 */

const router = require('express').Router();
const { chat, uploadPDF, uploadImage, getChatHistory } = require('../controllers/mentor.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { uploadPDF: multerPDF, uploadImage: multerImage } = require('../middleware/upload.middleware');
const { body, handleValidationErrors } = require('../utils/validators');

// All mentor routes require authentication
router.use(authenticate);

router.post(
  '/chat',
  [
    body('message').trim().notEmpty().withMessage('message is required'),
    handleValidationErrors,
  ],
  chat,
);

router.post('/upload-pdf',   multerPDF,   uploadPDF);
router.post('/upload-image', multerImage, uploadImage);
router.get('/history', getChatHistory);

module.exports = router;
