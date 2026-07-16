/**
 * Quiz Controller
 * ================
 * AI quiz generation and attempt submission.
 */

const { v4: uuidv4 } = require('uuid');
const geminiService = require('../services/gemini.service');
const { createDoc, getDoc, queryDocs, countDocs } = require('../services/firebase.service');
const { createQuizModel, createQuizAttemptModel, QUIZZES_COLLECTION, ATTEMPTS_COLLECTION } = require('../models/quiz.model');
const { updateDoc } = require('../services/firebase.service');
const { USERS_COLLECTION } = require('../models/user.model');
const { FieldValue } = require('firebase-admin/firestore');
const { sendSuccess, sendError, paginationMeta } = require('../utils/response');
const logger = require('../utils/logger');

// ── POST /api/quiz/generate ───────────────────────────────────
const generateQuiz = async (req, res, next) => {
  try {
    const { topic, subject, difficulty = 'medium', numQuestions = 10 } = req.body;
    if (!topic || !subject) {
      return sendError(res, { statusCode: 400, message: 'topic and subject are required' });
    }

    const uid    = req.user.uid;
    const result = await geminiService.generateQuiz(topic, subject, difficulty, numQuestions);

    if (!result.questions?.length) {
      return sendError(res, { statusCode: 500, message: 'Failed to generate quiz questions' });
    }

    const id   = uuidv4();
    const quiz = createQuizModel({
      id,
      userId    : uid,
      title     : `${subject}: ${topic} Quiz`,
      subject,
      topic,
      difficulty,
      questions : result.questions.map((q, i) => ({ id: `q${i + 1}`, ...q })),
    });

    await createDoc(QUIZZES_COLLECTION, id, quiz);
    logger.info(`[Quiz] Generated quiz ${id} for user ${uid}`);
    return sendSuccess(res, { statusCode: 201, message: 'Quiz generated', data: quiz });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/quiz/submit ─────────────────────────────────────
const submitQuiz = async (req, res, next) => {
  try {
    const { quizId, answers, timeTaken = 0 } = req.body;
    if (!quizId || !Array.isArray(answers)) {
      return sendError(res, { statusCode: 400, message: 'quizId and answers array are required' });
    }

    const uid  = req.user.uid;
    const quiz = await getDoc(QUIZZES_COLLECTION, quizId);
    if (!quiz) return sendError(res, { statusCode: 404, message: 'Quiz not found' });

    // Grade the quiz
    let correctCount = 0;
    const gradedAnswers = quiz.questions.map((q, i) => {
      const isCorrect = answers[i] === q.correctIndex;
      if (isCorrect) correctCount++;
      return { questionId: q.id, selected: answers[i], correct: q.correctIndex, isCorrect };
    });

    const score  = Math.round((correctCount / quiz.questions.length) * 100);

    const attemptId = uuidv4();
    const attempt   = createQuizAttemptModel({
      id            : attemptId,
      quizId,
      userId        : uid,
      answers,
      gradedAnswers,
      score,
      correctCount,
      totalQuestions: quiz.questions.length,
      timeTaken,
      quizTitle     : quiz.title,
      subject       : quiz.subject,
      topic         : quiz.topic,
    });

    const { createNotification } = require('../services/notification.service');
    await createDoc(ATTEMPTS_COLLECTION, attemptId, attempt);
    await createNotification(uid, 'quiz_completed', 'Quiz Completed 🏆', `You completed "${quiz.title}" with a score of ${score}%`);

    // Update user stats
    await updateDoc(USERS_COLLECTION, uid, {
      'stats.quizzesTaken': FieldValue.increment(1),
      'stats.xp'          : FieldValue.increment(Math.round(score / 10)),
    });

    logger.info(`[Quiz] User ${uid} scored ${score}% on quiz ${quizId}`);
    return sendSuccess(res, {
      message: 'Quiz submitted',
      data: { score, correctCount, totalQuestions: quiz.questions.length, gradedAnswers, attemptId },
    });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/quiz ─────────────────────────────────────────────
const getQuizzes = async (req, res, next) => {
  try {
    const { subject, page = 1, limit = 20 } = req.query;
    const filters = [['userId', '==', req.user.uid]];
    if (subject) filters.push(['subject', '==', subject]);

    const [quizzes, total] = await Promise.all([
      queryDocs(QUIZZES_COLLECTION, filters, 'createdAt', 'desc', parseInt(limit)),
      countDocs(QUIZZES_COLLECTION, [['userId', '==', req.user.uid]]),
    ]);

    return sendSuccess(res, { data: quizzes, meta: paginationMeta({ page, limit, total }) });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/quiz/attempts ────────────────────────────────────
const getAttempts = async (req, res, next) => {
  try {
    const attempts = await queryDocs(
      ATTEMPTS_COLLECTION,
      [['userId', '==', req.user.uid]],
      'completedAt',
      'desc',
      20,
    );
    return sendSuccess(res, { data: attempts });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/quiz/:id ─────────────────────────────────────────
const getQuiz = async (req, res, next) => {
  try {
    const quiz = await getDoc(QUIZZES_COLLECTION, req.params.id);
    if (!quiz || quiz.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Quiz not found' });
    }
    return sendSuccess(res, { data: quiz });
  } catch (error) {
    next(error);
  }
};

module.exports = { generateQuiz, submitQuiz, getQuizzes, getAttempts, getQuiz };
