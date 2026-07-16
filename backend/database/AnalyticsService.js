/**
 * AnalyticsService — analytics collection
 * =========================================
 * One document per user (keyed by uid) holding aggregated statistics.
 * The document is upserted (created or merged) — never duplicated.
 *
 * Collection: analytics
 * Fields: userId, totalStudyHours, weeklyHours, monthlyHours,
 *         studyStreak, completedTasks, completedQuizzes, averageAccuracy,
 *         strongestSubject, weakestSubject, subjectBreakdown, updatedAt
 */

'use strict';

const FirestoreService    = require('./FirestoreService');
const { COLLECTIONS, createAnalyticsSchema } = require('./schema');
const { db }              = require('../config/firebase');
const logger              = require('../utils/logger');

class AnalyticsService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.ANALYTICS, createAnalyticsSchema);
  }

  // ── Analytics-specific methods ────────────────────────────────

  /**
   * Get (or initialise) analytics for a user.
   * Creates a blank record if one doesn't exist yet.
   * @param {string} userId
   * @returns {Promise<object>}
   */
  async getAnalytics(userId) {
    let doc = await this.getDocument(userId);
    if (!doc) {
      doc = await this.createDocument({ userId }, userId);
    }
    return doc;
  }

  /**
   * Directly update analytics fields.
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async updateAnalytics(userId, data) {
    const exists = await this.documentExists(userId);
    if (!exists) {
      return this.createDocument({ userId, ...data }, userId);
    }
    return this.updateDocument(userId, data);
  }

  /**
   * Recalculate and overwrite analytics from raw data sources.
   * Call this after bulk imports or periodic refresh jobs.
   *
   * @param {string} userId
   * @param {object} sources
   * @param {object[]} sources.quizAttempts  - Array of quiz docs
   * @param {number}   sources.totalStudyHours
   * @param {number}   sources.weeklyHours
   * @param {number}   sources.monthlyHours
   * @param {number}   sources.studyStreak
   * @param {number}   sources.completedTasks
   * @returns {Promise<object>}
   */
  async recalculate(userId, sources = {}) {
    const {
      quizAttempts   = [],
      totalStudyHours = 0,
      weeklyHours    = 0,
      monthlyHours   = 0,
      studyStreak    = 0,
      completedTasks = 0,
    } = sources;

    const completedQuizzes = quizAttempts.length;
    let averageAccuracy    = 0;
    const subjectMap       = {};

    for (const attempt of quizAttempts) {
      const subj = attempt.subject || 'General';
      if (!subjectMap[subj]) subjectMap[subj] = { total: 0, count: 0 };
      subjectMap[subj].total += attempt.accuracy || 0;
      subjectMap[subj].count += 1;
      averageAccuracy += attempt.accuracy || 0;
    }

    if (completedQuizzes > 0) {
      averageAccuracy = parseFloat((averageAccuracy / completedQuizzes).toFixed(1));
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

    const payload = {
      userId,
      totalStudyHours,
      weeklyHours,
      monthlyHours,
      studyStreak,
      completedTasks,
      completedQuizzes,
      averageAccuracy,
      strongestSubject : strongest.subject,
      weakestSubject   : weakest.subject,
      subjectBreakdown,
    };

    return this.updateAnalytics(userId, payload);
  }

  /**
   * Increment a single numeric counter in the analytics doc atomically.
   * @param {string} userId
   * @param {'completedTasks'|'completedQuizzes'|'studyStreak'} field
   * @param {number} amount
   */
  async increment(userId, field, amount = 1) {
    const allowed = [
      'completedTasks', 'completedQuizzes',
      'studyStreak',    'totalStudyHours',
      'weeklyHours',    'monthlyHours',
    ];
    if (!allowed.includes(field)) throw new Error(`AnalyticsService.increment: invalid field "${field}"`);

    return this.runTransaction(async (t, ref) => {
      const snap = await t.get(ref);
      const current = snap.exists ? (snap.data()[field] || 0) : 0;
      const update  = { [field]: parseFloat((current + amount).toFixed(2)), updatedAt: new Date().toISOString() };

      if (snap.exists) {
        t.update(ref, update);
      } else {
        t.set(ref, { ...createAnalyticsSchema({ userId }), ...update });
      }
    }, userId);
  }

  /**
   * Reset weekly/monthly hours (call from a scheduled Cloud Function).
   * @param {string} userId
   * @param {'weekly'|'monthly'} period
   */
  async resetPeriodHours(userId, period) {
    const field = period === 'monthly' ? 'monthlyHours' : 'weeklyHours';
    return this.updateDocument(userId, { [field]: 0 });
  }
}

module.exports = new AnalyticsService();
