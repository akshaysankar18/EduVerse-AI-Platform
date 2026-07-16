/**
 * UserService — users collection
 * ================================
 * Manages user profile documents.
 * Document ID === Firebase Auth UID.
 *
 * Collection: users
 * Fields: uid, name, email, profilePhoto, role, learningGoal,
 *         learningLevel, studyStreak, totalStudyHours, createdAt, updatedAt
 */

'use strict';

const FirestoreService  = require('./FirestoreService');
const { COLLECTIONS, createUserSchema } = require('./schema');
const { admin }         = require('../config/firebase');
const logger            = require('../utils/logger');

class UserService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.USERS, createUserSchema);
  }

  // ── User-specific methods ─────────────────────────────────────

  /**
   * Create a new user profile document.
   * Uses the Firebase UID as the document ID.
   * @param {object} data - Must include `uid` and `email`
   * @returns {Promise<object>}
   */
  async createUser(data) {
    if (!data.uid)   throw new Error('UserService.createUser: uid is required');
    if (!data.email) throw new Error('UserService.createUser: email is required');
    return this.createDocument(data, data.uid);
  }

  /**
   * Get user by Firebase UID.
   * @param {string} uid
   * @returns {Promise<object|null>}
   */
  async getUserById(uid) {
    return this.getDocument(uid);
  }

  /**
   * Get user by email address.
   * @param {string} email
   * @returns {Promise<object|null>}
   */
  async getUserByEmail(email) {
    const results = await this.queryDocuments(
      [['email', '==', email]],
      'createdAt',
      'desc',
      1,
    );
    return results[0] || null;
  }

  /**
   * Update allowed profile fields.
   * @param {string} uid
   * @param {object} data
   */
  async updateUser(uid, data) {
    const allowed = [
      'name', 'profilePhoto', 'learningGoal',
      'learningLevel', 'role', 'studyStreak', 'totalStudyHours',
    ];
    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }
    return this.updateDocument(uid, sanitized);
  }

  /**
   * Delete a user profile document.
   * @param {string} uid
   */
  async deleteUser(uid) {
    return this.deleteDocument(uid);
  }

  /**
   * Increment the user's study streak by 1.
   * @param {string} uid
   */
  async incrementStreak(uid) {
    return this.runTransaction(async (t, ref) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error(`User ${uid} not found`);
      const current = snap.data().studyStreak || 0;
      t.update(ref, {
        studyStreak: current + 1,
        updatedAt  : new Date().toISOString(),
      });
    }, uid);
  }

  /**
   * Add hours to a user's totalStudyHours counter.
   * @param {string} uid
   * @param {number} hours
   */
  async addStudyHours(uid, hours) {
    return this.runTransaction(async (t, ref) => {
      const snap = await t.get(ref);
      if (!snap.exists) throw new Error(`User ${uid} not found`);
      const current = snap.data().totalStudyHours || 0;
      t.update(ref, {
        totalStudyHours: parseFloat((current + hours).toFixed(2)),
        updatedAt      : new Date().toISOString(),
      });
    }, uid);
  }

  /**
   * Check if a user document already exists.
   * @param {string} uid
   * @returns {Promise<boolean>}
   */
  async userExists(uid) {
    return this.documentExists(uid);
  }
}

module.exports = new UserService();
