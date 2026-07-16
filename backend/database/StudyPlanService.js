/**
 * StudyPlanService — study_plans collection
 * ==========================================
 * Manages learning/study plan documents per user.
 *
 * Collection: study_plans
 * Fields: userId, title, subject, difficulty, dailyTarget,
 *         progress, completed, createdAt, updatedAt
 */

'use strict';

const FirestoreService      = require('./FirestoreService');
const { COLLECTIONS, createStudyPlanSchema } = require('./schema');
const logger                = require('../utils/logger');

class StudyPlanService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.STUDY_PLANS, createStudyPlanSchema);
  }

  // ── Plan-specific methods ─────────────────────────────────────

  /**
   * Create a new study plan for a user.
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createPlan(userId, data) {
    if (!userId) throw new Error('StudyPlanService.createPlan: userId is required');
    return this.createDocument({ ...data, userId });
  }

  /**
   * Get all study plans for a user, ordered newest first.
   * @param {string} userId
   * @param {object} [options]
   * @param {boolean} [options.onlyActive]  - Exclude completed plans
   * @param {number}  [options.limit]
   * @returns {Promise<object[]>}
   */
  async getPlansForUser(userId, { onlyActive = false, limit = 50 } = {}) {
    const filters = [['userId', '==', userId]];
    if (onlyActive) filters.push(['completed', '==', false]);
    return this.queryDocuments(filters, 'createdAt', 'desc', limit);
  }

  /**
   * Get a single study plan (validates ownership).
   * @param {string} planId
   * @param {string} userId
   * @returns {Promise<object|null>}
   */
  async getPlan(planId, userId) {
    const plan = await this.getDocument(planId);
    if (!plan || plan.userId !== userId) return null;
    return plan;
  }

  /**
   * Update a study plan.
   * @param {string} planId
   * @param {string} userId
   * @param {object} data
   */
  async updatePlan(planId, userId, data) {
    const plan = await this.getPlan(planId, userId);
    if (!plan) throw new Error(`Study plan ${planId} not found or access denied`);

    const allowed = ['title', 'subject', 'difficulty', 'dailyTarget', 'progress', 'completed'];
    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }
    return this.updateDocument(planId, sanitized);
  }

  /**
   * Delete a study plan.
   * @param {string} planId
   * @param {string} userId
   */
  async deletePlan(planId, userId) {
    const plan = await this.getPlan(planId, userId);
    if (!plan) throw new Error(`Study plan ${planId} not found or access denied`);
    return this.deleteDocument(planId);
  }

  /**
   * Mark a plan as completed.
   * @param {string} planId
   * @param {string} userId
   */
  async completePlan(planId, userId) {
    return this.updatePlan(planId, userId, { completed: true, progress: 100 });
  }

  /**
   * Update only the progress percentage (0-100).
   * @param {string} planId
   * @param {string} userId
   * @param {number} progress
   */
  async updateProgress(planId, userId, progress) {
    const clamped = Math.min(100, Math.max(0, Number(progress)));
    return this.updatePlan(planId, userId, {
      progress: clamped,
      completed: clamped === 100,
    });
  }

  /**
   * Count active plans for a user.
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async countActivePlans(userId) {
    return this.countDocuments([['userId', '==', userId], ['completed', '==', false]]);
  }

  /**
   * Get plans by subject.
   * @param {string} userId
   * @param {string} subject
   */
  async getPlansBySubject(userId, subject) {
    return this.queryDocuments(
      [['userId', '==', userId], ['subject', '==', subject]],
      'createdAt',
      'desc',
      20,
    );
  }
}

module.exports = new StudyPlanService();
