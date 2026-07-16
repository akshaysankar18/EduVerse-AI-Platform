/**
 * File Upload Middleware (Multer)
 * ================================
 * Configures multer for memory storage with file type
 * and size validation. Exports named multer instances.
 */

const multer = require('multer');
const path   = require('path');
const { AppError } = require('./error.middleware');

const MAX_SIZE_BYTES = (parseInt(process.env.MAX_FILE_SIZE_MB) || 10) * 1024 * 1024;

const ALLOWED_MIME_TYPES = (
  process.env.ALLOWED_FILE_TYPES ||
  'image/jpeg,image/png,image/gif,image/webp,application/pdf,text/plain'
).split(',');

const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const PDF_MIME_TYPES   = ['application/pdf'];

// ── Storage ──────────────────────────────────────────────────
// Use memory storage — blobs are sent to Firebase Storage
const memoryStorage = multer.memoryStorage();

// ── File filter factory ──────────────────────────────────────
const buildFileFilter = (allowedTypes) => (_req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`,
        400,
      ),
      false,
    );
  }
};

// ── Multer instances ─────────────────────────────────────────

/** Accepts images only (JPEG, PNG, GIF, WebP) — single field "image" */
const uploadImage = multer({
  storage   : memoryStorage,
  limits    : { fileSize: MAX_SIZE_BYTES },
  fileFilter: buildFileFilter(IMAGE_MIME_TYPES),
}).single('image');

/** Accepts PDFs only — single field "pdf" */
const uploadPDF = multer({
  storage   : memoryStorage,
  limits    : { fileSize: MAX_SIZE_BYTES },
  fileFilter: buildFileFilter(PDF_MIME_TYPES),
}).single('pdf');

/** Accepts images + PDFs — single field "file" */
const uploadFile = multer({
  storage   : memoryStorage,
  limits    : { fileSize: MAX_SIZE_BYTES },
  fileFilter: buildFileFilter(ALLOWED_MIME_TYPES),
}).single('file');

/** Multiple files (up to 5) — any allowed type */
const uploadMultiple = multer({
  storage   : memoryStorage,
  limits    : { fileSize: MAX_SIZE_BYTES, files: 5 },
  fileFilter: buildFileFilter(ALLOWED_MIME_TYPES),
}).array('files', 5);

// ── Wrapper to convert multer callback errors to Express errors ──
const wrapMulter = (multerFn) => (req, res, next) => {
  multerFn(req, res, (err) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new AppError(err.message, 400));
    }
    next(err);
  });
};

module.exports = {
  uploadImage   : wrapMulter(uploadImage),
  uploadPDF     : wrapMulter(uploadPDF),
  uploadFile    : wrapMulter(uploadFile),
  uploadMultiple: wrapMulter(uploadMultiple),
};
