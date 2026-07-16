/**
 * Notification Controller
 * =======================
 * Manages retrieval, read state toggles, and deletion of user notifications.
 */

const { queryDocs, getDoc, updateDoc, deleteDoc } = require('../services/firebase.service');
const { NOTIFICATIONS_COLLECTION } = require('../services/notification.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// ── GET /api/notifications ────────────────────────────────────
const getNotifications = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { limit = 50 } = req.query;

    const list = await queryDocs(
      NOTIFICATIONS_COLLECTION,
      [['userId', '==', uid]],
      'createdAt',
      'desc',
      parseInt(limit)
    );

    return sendSuccess(res, { data: list });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/notifications/:id/read ───────────────────────────
const markRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const notif = await getDoc(NOTIFICATIONS_COLLECTION, id);
    if (!notif || notif.userId !== uid) {
      return sendError(res, { statusCode: 404, message: 'Notification not found' });
    }

    const updated = await updateDoc(NOTIFICATIONS_COLLECTION, id, { read: true });
    return sendSuccess(res, { message: 'Notification marked as read', data: updated });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/notifications/read-all ───────────────────────────
const markAllRead = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // Fetch unread notifications for this user
    const unread = await queryDocs(
      NOTIFICATIONS_COLLECTION,
      [['userId', '==', uid], ['read', '==', false]],
      '' // No ordering to avoid indexes
    );

    const updatePromises = unread.map(notif => 
      updateDoc(NOTIFICATIONS_COLLECTION, notif.id, { read: true })
    );
    await Promise.all(updatePromises);

    logger.info(`[Notification] Marked all (${unread.length}) notifications as read for user ${uid}`);
    return sendSuccess(res, { message: `Marked ${unread.length} notifications as read` });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/notifications/:id ─────────────────────────────
const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uid = req.user.uid;

    const notif = await getDoc(NOTIFICATIONS_COLLECTION, id);
    if (!notif || notif.userId !== uid) {
      return sendError(res, { statusCode: 404, message: 'Notification not found' });
    }

    await deleteDoc(NOTIFICATIONS_COLLECTION, id);
    return sendSuccess(res, { message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
};
