/**
 * Analytics Controller
 * =====================
 * Aggregates user activity data for the analytics dashboard.
 */

const { getDoc, queryDocs, countDocs } = require('../services/firebase.service');
const { USERS_COLLECTION }   = require('../models/user.model');
const { PLANNERS_COLLECTION } = require('../models/planner.model');
const { ATTEMPTS_COLLECTION } = require('../models/quiz.model');
const { ROADMAPS_COLLECTION } = require('../models/roadmap.model');
const { NOTES_COLLECTION }    = require('../models/notes.model');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// ── GET /api/analytics ───────────────────────────────────────
const getAnalytics = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // Fetch all analytics in parallel
    const [
      user,
      totalTasks,
      completedTasks,
      notes,
      totalRoadmaps,
      recentAttempts,
      resourcesSearched,
      totalQuizzes,
    ] = await Promise.all([
      getDoc(USERS_COLLECTION, uid),
      countDocs(PLANNERS_COLLECTION, [['userId', '==', uid]]),
      countDocs(PLANNERS_COLLECTION, [['userId', '==', uid], ['status', '==', 'completed']]),
      queryDocs(NOTES_COLLECTION,    [['userId', '==', uid]], ''),
      countDocs(ROADMAPS_COLLECTION, [['userId', '==', uid]]),
      queryDocs(ATTEMPTS_COLLECTION, [['userId', '==', uid]], 'completedAt', 'desc', 10),
      countDocs('resource_history',  [['userId', '==', uid]]),
      countDocs(ATTEMPTS_COLLECTION, [['userId', '==', uid]]),
    ]);

    if (!user) return sendError(res, { statusCode: 404, message: 'User not found' });

    // Calculate flashcards and mindmaps from notes
    let flashcardsGenerated = 0;
    let mindmapsGenerated = 0;
    if (notes && Array.isArray(notes)) {
      notes.forEach(note => {
        if (note.cachedFlashcards && Array.isArray(note.cachedFlashcards)) {
          flashcardsGenerated += note.cachedFlashcards.length;
        }
        if (note.cachedMindmap) {
          mindmapsGenerated += 1;
        }
      });
    }

    // Compute average quiz score
    const avgScore = recentAttempts.length
      ? Math.round(recentAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / recentAttempts.length)
      : 0;

    // Build score history for chart
    const quizHistory = recentAttempts.map(a => ({
      date     : a.completedAt,
      score    : a.score,
      quizTitle: a.quizTitle || a.quizId,
    })).reverse();

    const analytics = {
      user: {
        displayName: user.displayName,
        xp         : user.stats?.xp         || 0,
        streak     : user.stats?.streak      || 0,
        totalSessions: user.stats?.totalSessions || 0,
        profile    : user.profile            || {},
      },
      tasks: {
        total    : totalTasks,
        completed: completedTasks,
        pending  : totalTasks - completedTasks,
        completionRate: totalTasks > 0
          ? Math.round((completedTasks / totalTasks) * 100)
          : 0,
      },
      notes: {
        total: notes ? notes.length : 0,
        flashcardsGenerated,
        mindmapsGenerated,
      },
      roadmaps: { total: totalRoadmaps },
      quizzes: {
        total  : totalQuizzes,
        avgScore,
        history: quizHistory,
      },
      resources: {
        searched: resourcesSearched,
      },
    };

    return sendSuccess(res, { data: analytics });
  } catch (error) {
    next(error);
  }
};

// ── GET /api/analytics/progress ───────────────────────────────
const getProgress = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    const [roadmaps, attempts] = await Promise.all([
      queryDocs(ROADMAPS_COLLECTION, [['userId', '==', uid]], 'createdAt', 'desc', 5),
      queryDocs(ATTEMPTS_COLLECTION, [['userId', '==', uid]], 'completedAt', 'desc', 30),
    ]);

    return sendSuccess(res, {
      data: {
        roadmapProgress: roadmaps.map(r => ({ title: r.title, progress: r.progress, status: r.status })),
        quizScores     : attempts.map(a => ({ score: a.score, date: a.completedAt })),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAnalytics, getProgress };
