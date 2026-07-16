/**
 * Notification Routes
 * ====================
 * GET    /api/notifications
 * PUT    /api/notifications/read-all
 * PUT    /api/notifications/:id/read
 * DELETE /api/notifications/:id
 */

const router = require('express').Router();
const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Protect all notification routes
router.use(authenticate);

router.get('/', getNotifications);
router.put('/read-all', markAllRead);
router.put('/:id/read', markRead);
router.delete('/:id', deleteNotification);

module.exports = router;
