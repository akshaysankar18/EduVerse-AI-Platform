/**
 * Planner Controller
 * ===================
 * CRUD for study planner tasks.
 */

const { v4: uuidv4 } = require('uuid');
const { createDoc, getDoc, updateDoc, deleteDoc, queryDocs, countDocs } = require('../services/firebase.service');
const { createPlannerModel, PLANNERS_COLLECTION } = require('../models/planner.model');
const { sendSuccess, sendError, paginationMeta } = require('../utils/response');
const logger = require('../utils/logger');

// ── POST /api/planner/create ──────────────────────────────────
const createTask = async (req, res, next) => {
  try {
    const uid  = req.user.uid;
    const id   = uuidv4();
    const task = createPlannerModel({ id, userId: uid, ...req.body });

    await createDoc(PLANNERS_COLLECTION, id, task);
    logger.info(`[Planner] Task created: ${id} by user ${uid}`);
    return sendSuccess(res, { statusCode: 201, message: 'Task created', data: task });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/planner ──────────────────────────────────────────
const getTasks = async (req, res, next) => {
  try {
    const uid           = req.user.uid;
    const { status, priority, page = 1, limit = 20 } = req.query;

    const filters = [['userId', '==', uid]];
    if (status)   filters.push(['status',   '==', status]);
    if (priority) filters.push(['priority', '==', priority]);

    const [tasks, total] = await Promise.all([
      queryDocs(PLANNERS_COLLECTION, filters, 'createdAt', 'desc', parseInt(limit)),
      countDocs(PLANNERS_COLLECTION, [['userId', '==', uid]]),
    ]);

    return sendSuccess(res, {
      data: tasks,
      meta: paginationMeta({ page, limit, total }),
    });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/planner/update/:id ───────────────────────────────
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uid    = req.user.uid;

    const existing = await getDoc(PLANNERS_COLLECTION, id);
    if (!existing)            return sendError(res, { statusCode: 404, message: 'Task not found' });
    if (existing.userId !== uid) return sendError(res, { statusCode: 403, message: 'Forbidden' });

    const allowed = ['title', 'description', 'subject', 'dueDate', 'priority', 'status', 'estimatedHours', 'tags'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await updateDoc(PLANNERS_COLLECTION, id, updates);

    // Trigger notification if task state changes to completed
    if (updates.status === 'completed' && existing.status !== 'completed') {
      const { createNotification } = require('../services/notification.service');
      await createNotification(uid, 'goal_achieved', 'Study Goal Achieved 🌟', `Successfully completed task: "${existing.title}"`);
    }

    return sendSuccess(res, { message: 'Task updated', data: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/planner/delete/:id ───────────────────────────
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const uid    = req.user.uid;

    const existing = await getDoc(PLANNERS_COLLECTION, id);
    if (!existing)            return sendError(res, { statusCode: 404, message: 'Task not found' });
    if (existing.userId !== uid) return sendError(res, { statusCode: 403, message: 'Forbidden' });

    await deleteDoc(PLANNERS_COLLECTION, id);
    return sendSuccess(res, { message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/planner/:id ──────────────────────────────────────
const getTask = async (req, res, next) => {
  try {
    const task = await getDoc(PLANNERS_COLLECTION, req.params.id);
    if (!task || task.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Task not found' });
    }
    return sendSuccess(res, { data: task });
  } catch (error) {
    next(error);
  }
};

module.exports = { createTask, getTasks, updateTask, deleteTask, getTask };
