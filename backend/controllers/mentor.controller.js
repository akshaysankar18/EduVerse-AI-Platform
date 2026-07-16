/**
 * AI Mentor Controller
 * =====================
 * Handles chat, PDF analysis, and image analysis endpoints.
 */

const geminiService  = require('../services/gemini.service');
const storageService = require('../services/storage.service');
const { createDoc, queryDocs } = require('../services/firebase.service');
const { sendSuccess, sendError } = require('../utils/response');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const CHAT_COLLECTION = 'chatHistory';

// ── POST /api/mentor/chat ─────────────────────────────────────
const chat = async (req, res, next) => {
  try {
    const { message, history = [], context = '' } = req.body;
    const uid = req.user.uid;

    if (!message?.trim()) {
      return sendError(res, { statusCode: 400, message: 'Message is required' });
    }

    const result = await geminiService.mentorChat(message, history, context);

    // Persist the exchange to Firestore
    const chatDoc = {
      id       : uuidv4(),
      userId   : uid,
      userMsg  : message,
      botMsg   : result.text,
      tokens   : result.tokens,
      createdAt: new Date().toISOString(),
    };
    await createDoc(CHAT_COLLECTION, chatDoc.id, chatDoc);

    logger.info(`[Mentor] Chat from user ${uid}`);
    return sendSuccess(res, {
      message: 'Response generated',
      data: { reply: result.text, tokens: result.tokens },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/mentor/upload-pdf ──────────────────────────────
const uploadPDF = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, { statusCode: 400, message: 'No PDF file provided' });

    const { prompt = 'Summarise this PDF and extract key learning points.' } = req.body;
    const uid = req.user.uid;

    // Upload to Storage
    const { url, fileName, path: storagePath } = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `mentor/${uid}/pdfs`,
    );

    // Analyse with Gemini
    const result = await geminiService.analyseFile(req.file.buffer, req.file.mimetype, prompt);

    return sendSuccess(res, {
      message: 'PDF analysed successfully',
      data: { analysis: result.text, fileURL: url, fileName, tokens: result.tokens },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/mentor/upload-image ────────────────────────────
const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, { statusCode: 400, message: 'No image file provided' });

    const { prompt = 'Describe and explain the content of this image in an educational context.' } = req.body;
    const uid = req.user.uid;

    // Upload to Storage
    const { url, fileName } = await storageService.uploadFile(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      `mentor/${uid}/images`,
    );

    // Analyse with Gemini vision
    const result = await geminiService.analyseFile(req.file.buffer, req.file.mimetype, prompt);

    return sendSuccess(res, {
      message: 'Image analysed successfully',
      data: { analysis: result.text, imageURL: url, fileName, tokens: result.tokens },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/mentor/history ───────────────────────────────────
const getChatHistory = async (req, res, next) => {
  try {
    const { limit = 20 } = req.query;
    const history = await queryDocs(
      CHAT_COLLECTION,
      [['userId', '==', req.user.uid]],
      'createdAt',
      'desc',
      parseInt(limit),
    );
    return sendSuccess(res, { data: history });
  } catch (error) {
    next(error);
  }
};

module.exports = { chat, uploadPDF, uploadImage, getChatHistory };
