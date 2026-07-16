/**
 * Roadmap Controller
 * ===================
 * AI-powered learning roadmap generation and management.
 */

const { v4: uuidv4 } = require('uuid');
const geminiService = require('../services/gemini.service');
const { createDoc, getDoc, updateDoc, deleteDoc, queryDocs } = require('../services/firebase.service');
const { createRoadmapModel, ROADMAPS_COLLECTION } = require('../models/roadmap.model');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// ── POST /api/roadmap/create ──────────────────────────────────
const createRoadmap = async (req, res, next) => {
  try {
    const { goal, subject, level = 'beginner', weeks = 4 } = req.body;
    if (!goal || !subject) {
      return sendError(res, { statusCode: 400, message: 'goal and subject are required' });
    }

    const uid    = req.user.uid;
    const aiData = await geminiService.generateRoadmap(goal, subject, level, weeks);

    const id      = uuidv4();
    const roadmap = createRoadmapModel({
      id,
      userId    : uid,
      title     : aiData.title || `${subject} Roadmap`,
      goal,
      subject,
      level,
      totalWeeks: weeks,
      modules   : aiData.modules || [],
    });

    const { createNotification } = require('../services/notification.service');
    await createDoc(ROADMAPS_COLLECTION, id, roadmap);
    await createNotification(uid, 'roadmap_generated', 'Roadmap Generated 🗺️', `Successfully generated learning roadmap: "${roadmap.title}"`);
    logger.info(`[Roadmap] Created roadmap ${id} for user ${uid}`);
    return sendSuccess(res, { statusCode: 201, message: 'Roadmap created', data: roadmap });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/roadmap ──────────────────────────────────────────
const getRoadmaps = async (req, res, next) => {
  try {
    const roadmaps = await queryDocs(
      ROADMAPS_COLLECTION,
      [['userId', '==', req.user.uid]],
      'createdAt',
      'desc',
      10,
    );
    return sendSuccess(res, { data: roadmaps });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/roadmap/:id ──────────────────────────────────────
const getRoadmap = async (req, res, next) => {
  try {
    const roadmap = await getDoc(ROADMAPS_COLLECTION, req.params.id);
    if (!roadmap || roadmap.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Roadmap not found' });
    }
    return sendSuccess(res, { data: roadmap });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/roadmap/update/:id ───────────────────────────────
const updateRoadmap = async (req, res, next) => {
  try {
    const { id } = req.params;
    const roadmap = await getDoc(ROADMAPS_COLLECTION, id);
    if (!roadmap || roadmap.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Roadmap not found' });
    }

    const allowed = ['title', 'modules', 'progress', 'status'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const updated = await updateDoc(ROADMAPS_COLLECTION, id, updates);
    return sendSuccess(res, { message: 'Roadmap updated', data: updated });
  } catch (error) {
    next(error);
  }
};

// ── DELETE /api/roadmap/:id ───────────────────────────────────
const deleteRoadmap = async (req, res, next) => {
  try {
    const roadmap = await getDoc(ROADMAPS_COLLECTION, req.params.id);
    if (!roadmap || roadmap.userId !== req.user.uid) {
      return sendError(res, { statusCode: 404, message: 'Roadmap not found' });
    }
    await deleteDoc(ROADMAPS_COLLECTION, req.params.id);
    return sendSuccess(res, { message: 'Roadmap deleted' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRoadmap, getRoadmaps, getRoadmap, updateRoadmap, deleteRoadmap };
