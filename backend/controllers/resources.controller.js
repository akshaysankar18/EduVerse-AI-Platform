/**
 * Learning Resources Controller
 * =============================
 * Handles resource search queries, caching, and retrieval of history.
 */

const { v4: uuidv4 } = require('uuid');
const resourcesService = require('../services/resources.service');
const { createDoc, queryDocs } = require('../services/firebase.service');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

const RESOURCE_HISTORY_COLLECTION = 'resource_history';

/**
 * POST /api/resources/search
 * Generates or returns cached resources list.
 */
const searchResources = async (req, res, next) => {
  try {
    const { topic, subject, level = 'intermediate' } = req.body;
    const uid = req.user.uid;

    if (!topic || !topic.trim() || !subject || !subject.trim()) {
      return sendError(res, { statusCode: 400, message: 'topic and subject are required' });
    }

    const cleanTopic = topic.trim();
    const cleanSubject = subject.trim();
    const cleanLevel = level.trim();

    // Check cache by querying user's history first (in-memory matching to avoid Firestore index requirements)
    const historyList = await queryDocs(
      RESOURCE_HISTORY_COLLECTION,
      [['userId', '==', uid]],
      'createdAt',
      'desc',
      100
    );

    const cachedEntry = historyList.find(
      entry =>
        entry.topic.toLowerCase() === cleanTopic.toLowerCase() &&
        entry.subject.toLowerCase() === cleanSubject.toLowerCase() &&
        entry.level.toLowerCase() === cleanLevel.toLowerCase()
    );

    if (cachedEntry) {
      logger.info(`[Resources Controller] Returning cached resources for topic: "${cleanTopic}"`);
      return sendSuccess(res, {
        statusCode: 200,
        message: 'Resources retrieved from cache',
        data: cachedEntry.resources,
        cached: true,
        historyId: cachedEntry.id
      });
    }

    // Call Gemini to generate the resources
    const generatedData = await resourcesService.generateResources(cleanTopic, cleanSubject, cleanLevel);

    // Save to Firestore
    const historyId = uuidv4();
    const historyDoc = {
      id: historyId,
      userId: uid,
      topic: cleanTopic,
      subject: cleanSubject,
      level: cleanLevel,
      resources: generatedData,
      createdAt: new Date().toISOString(),
    };

    await createDoc(RESOURCE_HISTORY_COLLECTION, historyId, historyDoc);
    logger.info(`[Resources Controller] Generated and saved resources for topic: "${cleanTopic}"`);

    return sendSuccess(res, {
      statusCode: 201,
      message: 'Resources generated successfully',
      data: generatedData,
      cached: false,
      historyId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/resources/history
 * Returns search history for current user.
 */
const getResourcesHistory = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    
    const history = await queryDocs(
      RESOURCE_HISTORY_COLLECTION,
      [['userId', '==', uid]],
      'createdAt',
      'desc',
      30
    );

    return sendSuccess(res, {
      data: history
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchResources,
  getResourcesHistory,
};
