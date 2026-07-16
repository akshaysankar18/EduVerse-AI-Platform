/**
 * QuizService — quizzes collection
 * ==================================
 * Records quiz attempt results and computes per-user statistics.
 *
 * Collection: quizzes
 * Fields: userId, subject, topic, score, totalQuestions, correctAnswers,
 *         accuracy, timeTaken, difficulty, completedAt
 */

'use strict';

const FirestoreService  = require('./FirestoreService');
const { COLLECTIONS, createQuizSchema } = require('./schema');
const logger            = require('../utils/logger');

class QuizService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.QUIZZES, createQuizSchema);
  }

  // ── Quiz-specific methods ─────────────────────────────────────

  /**
   * Record a completed quiz attempt.
   * Accuracy is auto-calculated from correctAnswers / totalQuestions.
   *
   * @param {string} userId
   * @param {object} data
   * @param {string} data.subject
   * @param {string} data.topic
   * @param {number} data.score           - Raw score
   * @param {number} data.totalQuestions
   * @param {number} data.correctAnswers
   * @param {number} data.timeTaken       - Seconds
   * @param {string} data.difficulty
   * @returns {Promise<object>}
   */
  async recordQuiz(userId, data) {
    if (!userId) throw new Error('QuizService.recordQuiz: userId is required');

    const accuracy = data.totalQuestions > 0
      ? parseFloat(((data.correctAnswers / data.totalQuestions) * 100).toFixed(1))
      : 0;

    return this.createDocument({ ...data, userId, accuracy });
  }

  /**
   * Get all quiz attempts for a user.
   * @param {string} userId
   * @param {object} [options]
   * @param {string} [options.subject] - Filter by subject
   * @param {number} [options.limit]
   * @returns {Promise<object[]>}
   */
  async getQuizzesForUser(userId, { subject, limit = 50 } = {}) {
    const filters = [['userId', '==', userId]];
    if (subject) filters.push(['subject', '==', subject]);
    return this.queryDocuments(filters, 'completedAt', 'desc', limit);
  }

  /**
   * Get quiz attempts for a specific subject.
   * @param {string} userId
   * @param {string} subject
   */
  async getQuizzesBySubject(userId, subject) {
    return this.getQuizzesForUser(userId, { subject });
  }

  /**
   * Get the N most recent quiz attempts.
   * @param {string} userId
   * @param {number} limit
   */
  async getRecentQuizzes(userId, limit = 10) {
    return this.queryDocuments(
      [['userId', '==', userId]],
      'completedAt',
      'desc',
      limit,
    );
  }

  /**
   * Compute aggregate quiz stats for a user.
   * Returns: totalAttempts, averageAccuracy, bestScore, worstScore,
   *          averageTimeTaken, subjectBreakdown, strongestSubject, weakestSubject.
   *
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getQuizStats(userId) {
    const attempts = await this.queryDocuments(
      [['userId', '==', userId]],
      'completedAt',
      'desc',
      500, // large enough to aggregate across all history
    );

    if (!attempts.length) {
      return {
        totalAttempts   : 0,
        averageAccuracy : 0,
        bestScore       : 0,
        worstScore      : 0,
        averageTimeTaken: 0,
        subjectBreakdown: {},
        strongestSubject: '',
        weakestSubject  : '',
      };
    }

    // Basic stats
    const totalAttempts    = attempts.length;
    const avgAccuracy      = parseFloat(
      (attempts.reduce((s, a) => s + (a.accuracy || 0), 0) / totalAttempts).toFixed(1),
    );
    const bestScore        = Math.max(...attempts.map(a => a.accuracy || 0));
    const worstScore       = Math.min(...attempts.map(a => a.accuracy || 0));
    const avgTime          = Math.round(
      attempts.reduce((s, a) => s + (a.timeTaken || 0), 0) / totalAttempts,
    );

    // Per-subject accuracy breakdown
    const subjectMap = {};
    for (const attempt of attempts) {
      const subj = attempt.subject || 'General';
      if (!subjectMap[subj]) subjectMap[subj] = { total: 0, count: 0 };
      subjectMap[subj].total += attempt.accuracy || 0;
      subjectMap[subj].count += 1;
    }

    const subjectBreakdown = {};
    let strongest = { subject: '', accuracy: -1 };
    let weakest   = { subject: '', accuracy: 101 };

    for (const [subject, val] of Object.entries(subjectMap)) {
      const avg = parseFloat((val.total / val.count).toFixed(1));
      subjectBreakdown[subject] = avg;
      if (avg > strongest.accuracy) strongest = { subject, accuracy: avg };
      if (avg < weakest.accuracy)   weakest   = { subject, accuracy: avg };
    }

    return {
      totalAttempts,
      averageAccuracy : avgAccuracy,
      bestScore,
      worstScore,
      averageTimeTaken: avgTime,
      subjectBreakdown,
      strongestSubject: strongest.subject,
      weakestSubject  : weakest.subject,
    };
  }

  /**
   * Count total quizzes taken by a user.
   * @param {string} userId
   */
  async countQuizzes(userId) {
    return this.countDocuments([['userId', '==', userId]]);
  }
}

module.exports = new QuizService();
