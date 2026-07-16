/**
 * Notes Controller
 * =================
 * AI-generated and uploaded notes management.
 *
 * Caching strategy: generated flashcards, quiz, and mindmap are stored
 * back onto the Firestore note document under dedicated sub-fields
 * (cachedFlashcards, cachedQuiz, cachedMindmap) so repeated requests
 * return the stored result instead of calling Gemini again.
 */

const { v4: uuidv4 } = require('uuid');
const geminiService  = require('../services/gemini.service');
const storageService = require('../services/storage.service');
const {
  createDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  queryDocs,
  countDocs,
} = require('../services/firebase.service');
const { createNotesModel, NOTES_COLLECTION } = require('../models/notes.model');
const { createQuizModel, QUIZZES_COLLECTION } = require('../models/quiz.model');
const { sendSuccess, sendError, paginationMeta } = require('../utils/response');
const logger = require('../utils/logger');

// ── POST /api/notes/generate ──────────────────────────────────
const generateNotes = async (req, res, next) => {
  try {
    const { topic, subject, level = 'intermediate' } = req.body;
    if (!topic || !subject) {
      return sendError(res, { statusCode: 400, message: 'topic and subject are required' });
    }

    const uid    = req.user.uid;
    const result = await geminiService.generateNotes(topic, subject, level);

    const id   = uuidv4();
    const note = createNotesModel({
      id,
      userId    : uid,
      title     : `${subject}: ${topic}`,
      content   : result.text,
      summary   : result.text.slice(0, 300) + '...',
      subject,
      sourceType: 'ai_generated',
      tags      : [subject, topic, level],
    });

    const { createNotification } = require('../services/notification.service');
    await createDoc(NOTES_COLLECTION, id, note);
    await createNotification(uid, 'notes_uploaded', 'Notes Generated 🤖', `Successfully generated AI study notes for topic: "${topic}"`);
    logger.info(`[Notes] Generated notes for user ${uid}: ${topic}`);
    return sendSuccess(res, { statusCode: 201, message: 'Notes generated', data: note });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/notes/upload ────────────────────────────────────
const uploadNotes = async (req, res, next) => {
  try {
    if (!req.file) return sendError(res, { statusCode: 400, message: 'No file provided' });

    const uid  = req.user.uid;
    const { title = req.file.originalname, subject = 'General' } = req.body;

    // Upload to storage with graceful fallback
    let url = '';
    let fileName = '';
    try {
      const upload = await storageService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        `notes/${uid}`,
      );
      url      = upload.url;
      fileName = upload.fileName;
    } catch (storageErr) {
      logger.warn(`[Notes] Storage upload failed, using fallback: ${storageErr.message}`);
      url      = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64').slice(0, 100)}...`;
      fileName = req.file.originalname;
    }

    // Use Gemini to extract and summarise the document
    const aiResult = await geminiService.analyseFile(
      req.file.buffer,
      req.file.mimetype,
      'Extract and summarise the key points from this document as structured study notes.',
    );

    const id   = uuidv4();
    const note = createNotesModel({
      id,
      userId    : uid,
      title,
      content   : aiResult.text,
      summary   : aiResult.text.slice(0, 300) + '...',
      subject,
      sourceType: 'uploaded',
      fileURL   : url,
      fileName,
    });

    const { createNotification } = require('../services/notification.service');
    await createDoc(NOTES_COLLECTION, id, note);
    await createNotification(uid, 'notes_uploaded', 'Notes Uploaded 📚', `Successfully uploaded and summarised: "${note.title}"`);
    logger.info(`[Notes] Uploaded note ${id} for user ${uid}`);
    return sendSuccess(res, { statusCode: 201, message: 'Notes uploaded and summarised', data: note });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/notes ────────────────────────────────────────────
const getNotes = async (req, res, next) => {
  try {
    const uid   = req.user.uid;
    const { subject, page = 1, limit = 20 } = req.query;

    const filters = [['userId', '==', uid]];
    if (subject) filters.push(['subject', '==', subject]);

    const [notes, total] = await Promise.all([
      queryDocs(NOTES_COLLECTION, filters, 'createdAt', 'desc', parseInt(limit)),
      countDocs(NOTES_COLLECTION, [['userId', '==', uid]]),
    ]);

    return sendSuccess(res, { data: notes, meta: paginationMeta({ page, limit, total }) });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/notes/:id ────────────────────────────────────────
const getNote = async (req, res, next) => {
  try {
    const note = await getDoc(NOTES_COLLECTION, req.params.id);
    if (!note || note.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Note not found' });
    }
    return sendSuccess(res, { data: note });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/notes/:id ─────────────────────────────────────
const deleteNote = async (req, res, next) => {
  try {
    const note = await getDoc(NOTES_COLLECTION, req.params.id);
    if (!note || note.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Note not found' });
    }
    await deleteDoc(NOTES_COLLECTION, req.params.id);
    return sendSuccess(res, { message: 'Note deleted' });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/notes/:id/flashcards ───────────────────────────
/**
 * Generate (or return cached) flashcards for a note.
 * Caches result in Firestore under note.cachedFlashcards.
 */
const generateFlashcards = async (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (isDev) {
    logger.info(`[Dev Log] Request URL: ${req.originalUrl}`);
    logger.info(`[Dev Log] Note ID: ${req.params.id}`);
    logger.info(`[Dev Log] Authenticated User ID: ${req.user.uid}`);
  }

  try {
    const note = await getDoc(NOTES_COLLECTION, req.params.id);
    if (isDev) {
      logger.info(`[Dev Log] Firestore Lookup Result: ${note ? 'Found' : 'Not Found'}`);
    }

    if (!note || note.userId !== req.user.uid) {
      if (isDev) logger.info(`[Dev Log] Final API Response: 404 Note not found`);
      return sendError(res, { statusCode: 404, message: 'Note not found' });
    }

    // Return cached result if available
    if (note.cachedFlashcards && note.cachedFlashcards.length > 0) {
      logger.info(`[Notes] Returning cached flashcards for note ${note.id}`);
      if (isDev) logger.info(`[Dev Log] Final API Response: Returning cached flashcards (${note.cachedFlashcards.length} cards)`);
      return sendSuccess(res, { data: note.cachedFlashcards, cached: true });
    }

    // Generate via Gemini
    if (isDev) logger.info(`[Dev Log] Gemini Request: Generate flashcards from note content (${note.content.length} chars)`);
    const flashcards = await geminiService.generateFlashcardsFromContent(note.content);
    if (isDev) logger.info(`[Dev Log] Gemini Response: Generated ${flashcards.length} flashcards`);

    // Persist to Firestore so subsequent calls skip Gemini
    const { createNotification } = require('../services/notification.service');
    await updateDoc(NOTES_COLLECTION, note.id, { cachedFlashcards: flashcards });
    await createNotification(note.userId, 'flashcards_generated', 'Flashcards Generated ⚡', `Generated ${flashcards.length} interactive flashcards for "${note.title}"`);
    logger.info(`[Notes] Generated and cached ${flashcards.length} flashcards for note ${note.id}`);

    if (isDev) logger.info(`[Dev Log] Final API Response: Success 200 (Flashcards generated)`);
    return sendSuccess(res, { data: flashcards, cached: false });
  } catch (error) {
    if (isDev) logger.error(`[Dev Log] Error processing flashcards request: ${error.message}`);
    next(error);
  }
};

// ── POST /api/notes/:id/quiz ──────────────────────────────────
/**
 * Generate (or return cached) a quiz derived from a note.
 * The quiz is saved to the quizzes Firestore collection and a
 * reference (cachedQuizId) is stored on the note document.
 */
const generateQuizFromNote = async (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (isDev) {
    logger.info(`[Dev Log] Request URL: ${req.originalUrl}`);
    logger.info(`[Dev Log] Note ID: ${req.params.id}`);
    logger.info(`[Dev Log] Authenticated User ID: ${req.user.uid}`);
  }

  try {
    const note = await getDoc(NOTES_COLLECTION, req.params.id);
    if (isDev) {
      logger.info(`[Dev Log] Firestore Lookup Result: ${note ? 'Found' : 'Not Found'}`);
    }

    if (!note || note.userId !== req.user.uid) {
      if (isDev) logger.info(`[Dev Log] Final API Response: 404 Note not found`);
      return sendError(res, { statusCode: 404, message: 'Note not found' });
    }

    // Return cached quiz if available
    if (note.cachedQuizId) {
      const cachedQuiz = await getDoc(QUIZZES_COLLECTION, note.cachedQuizId);
      if (cachedQuiz) {
        logger.info(`[Notes] Returning cached quiz ${note.cachedQuizId} for note ${note.id}`);
        if (isDev) logger.info(`[Dev Log] Final API Response: Returning cached quiz ${note.cachedQuizId}`);
        return sendSuccess(res, { data: cachedQuiz, cached: true });
      }
    }

    // Generate via Gemini
    if (isDev) logger.info(`[Dev Log] Gemini Request: Generate quiz from note content (${note.content.length} chars)`);
    const result = await geminiService.generateQuizFromContent(
      note.content,
      note.title,
      note.subject,
      'medium',
      5,
    );
    if (isDev) logger.info(`[Dev Log] Gemini Response: Generated ${result.questions?.length || 0} questions`);

    if (!result.questions?.length) {
      if (isDev) logger.info(`[Dev Log] Final API Response: 500 Failed to generate quiz questions`);
      return sendError(res, { statusCode: 500, message: 'Failed to generate quiz questions' });
    }

    const quizId = uuidv4();
    const quiz   = createQuizModel({
      id        : quizId,
      userId    : req.user.uid,
      title     : `${note.subject}: ${note.title} Quiz`,
      subject   : note.subject,
      topic     : note.title,
      difficulty: 'medium',
      questions : result.questions.map((q, i) => ({ id: `q${i + 1}`, ...q })),
    });

    // Save quiz + cache reference on the note
    const { createNotification } = require('../services/notification.service');
    await createDoc(QUIZZES_COLLECTION, quizId, quiz);
    await updateDoc(NOTES_COLLECTION, note.id, { cachedQuizId: quizId });
    await createNotification(req.user.uid, 'quiz_completed', 'Quiz Generated 📝', `Generated a quiz from notes file: "${note.title}"`);

    logger.info(`[Notes] Generated quiz ${quizId} from note ${note.id} for user ${req.user.uid}`);
    if (isDev) logger.info(`[Dev Log] Final API Response: Success 201 (Quiz generated)`);
    return sendSuccess(res, { statusCode: 201, message: 'Quiz generated from note', data: quiz });
  } catch (error) {
    if (isDev) logger.error(`[Dev Log] Error processing quiz request: ${error.message}`);
    next(error);
  }
};

// ── POST /api/notes/:id/mindmap ───────────────────────────────
/**
 * Generate (or return cached) a mind map for a note.
 * Caches result in Firestore under note.cachedMindmap.
 */
const generateMindmap = async (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (isDev) {
    logger.info(`[Dev Log] Request URL: ${req.originalUrl}`);
    logger.info(`[Dev Log] Note ID: ${req.params.id}`);
    logger.info(`[Dev Log] Authenticated User ID: ${req.user.uid}`);
  }

  try {
    const note = await getDoc(NOTES_COLLECTION, req.params.id);
    if (isDev) {
      logger.info(`[Dev Log] Firestore Lookup Result: ${note ? 'Found' : 'Not Found'}`);
    }

    if (!note || note.userId !== req.user.uid) {
      if (isDev) logger.info(`[Dev Log] Final API Response: 404 Note not found`);
      return sendError(res, { statusCode: 404, message: 'Note not found' });
    }

    // Return cached result if available
    if (note.cachedMindmap && note.cachedMindmap.name) {
      logger.info(`[Notes] Returning cached mind map for note ${note.id}`);
      if (isDev) logger.info(`[Dev Log] Final API Response: Returning cached mind map`);
      return sendSuccess(res, { data: note.cachedMindmap, cached: true });
    }

    // Generate via Gemini
    if (isDev) logger.info(`[Dev Log] Gemini Request: Generate mind map from note content (${note.content.length} chars)`);
    const mindmap = await geminiService.generateMindmapFromContent(note.content);
    if (isDev) logger.info(`[Dev Log] Gemini Response: Generated mind map with root: "${mindmap.name}"`);

    // Persist to Firestore
    const { createNotification } = require('../services/notification.service');
    await updateDoc(NOTES_COLLECTION, note.id, { cachedMindmap: mindmap });
    await createNotification(note.userId, 'mindmap_generated', 'Mind Map Generated 🧠', `Generated interactive study mind map for "${note.title}"`);
    logger.info(`[Notes] Generated and cached mind map for note ${note.id}`);

    if (isDev) logger.info(`[Dev Log] Final API Response: Success 200 (Mind map generated)`);
    return sendSuccess(res, { data: mindmap, cached: false });
  } catch (error) {
    if (isDev) logger.error(`[Dev Log] Error processing mindmap request: ${error.message}`);
    next(error);
  }
};

// ── POST /api/notes/:id/questions ────────────────────────────
/**
 * Answer a follow-up question about the note content using Gemini.
 * Body: { question: string }
 */
const answerQuestion = async (req, res, next) => {
  const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
  if (isDev) {
    logger.info(`[Dev Log] Request URL: ${req.originalUrl}`);
    logger.info(`[Dev Log] Note ID: ${req.params.id}`);
    logger.info(`[Dev Log] Authenticated User ID: ${req.user.uid}`);
  }

  try {
    const note = await getDoc(NOTES_COLLECTION, req.params.id);
    if (isDev) {
      logger.info(`[Dev Log] Firestore Lookup Result: ${note ? 'Found' : 'Not Found'}`);
    }

    if (!note || note.userId !== req.user.uid) {
      if (isDev) logger.info(`[Dev Log] Final API Response: 404 Note not found`);
      return sendError(res, { statusCode: 404, message: 'Note not found' });
    }

    const { question } = req.body;
    if (!question || !question.trim()) {
      if (isDev) logger.info(`[Dev Log] Final API Response: 400 Question is required`);
      return sendError(res, { statusCode: 400, message: 'question is required in the request body' });
    }

    if (isDev) {
      logger.info(`[Dev Log] Gemini Request: Answer question "${question}" using note content`);
    }
    const result = await geminiService.answerNoteQuestion(question.trim(), note.content);
    if (isDev) {
      logger.info(`[Dev Log] Gemini Response: Answered successfully (${result.answer.length} chars)`);
    }

    logger.info(`[Notes] Answered question for note ${note.id}`);
    if (isDev) logger.info(`[Dev Log] Final API Response: Success 200 (Question answered)`);
    return sendSuccess(res, { data: { answer: result.answer } });
  } catch (error) {
    if (isDev) logger.error(`[Dev Log] Error processing question: ${error.message}`);
    next(error);
  }
};

module.exports = {
  generateNotes,
  uploadNotes,
  getNotes,
  getNote,
  deleteNote,
  generateFlashcards,
  generateQuizFromNote,
  generateMindmap,
  answerQuestion,
};
