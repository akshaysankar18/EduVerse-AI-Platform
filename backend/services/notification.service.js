/**
 * Notification Service
 * =====================
 * Handles creation and logging of notifications in Firestore.
 */

const { createDoc } = require('./firebase.service');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

const NOTIFICATIONS_COLLECTION = 'notifications';

/**
 * Log a notification in Firestore.
 * @param {string} userId
 * @param {string} type     - 'roadmap_generated', 'quiz_completed', 'notes_uploaded', etc.
 * @param {string} title
 * @param {string} message
 * @returns {Promise<object>} The saved notification document
 */
const createNotification = async (userId, type, title, message) => {
  try {
    const id = uuidv4();
    const notif = {
      id,
      userId,
      type,
      title,
      message,
      read: false,
      createdAt: new Date().toISOString(),
    };
    await createDoc(NOTIFICATIONS_COLLECTION, id, notif);
    logger.info(`[Notification] Created notification ${id} of type ${type} for user ${userId}`);
    return notif;
  } catch (error) {
    logger.error(`[Notification] Failed to create notification: ${error.message}`);
    throw error;
  }
};

module.exports = {
  createNotification,
  NOTIFICATIONS_COLLECTION,
};
