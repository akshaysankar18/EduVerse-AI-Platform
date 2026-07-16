/**
 * Global Search Controller
 * ========================
 * Performs in-memory keyword queries across the current user's collections
 * (roadmaps, notes, quizzes, planner tasks, and career activities).
 */

const { queryDocs } = require('../services/firebase.service');
const { sendSuccess } = require('../utils/response');

// ── GET /api/search ───────────────────────────────────────────
const searchAll = async (req, res, next) => {
  try {
    const uid = req.user.uid;
    const { q = '' } = req.query;

    if (!q || !q.trim()) {
      return sendSuccess(res, {
        data: { roadmaps: [], notes: [], quizzes: [], planner: [], career: [] }
      });
    }

    const query = q.trim().toLowerCase();

    // Query all relevant collections for this user in parallel
    const [roadmaps, notes, quizzes, tasks, career] = await Promise.all([
      queryDocs('roadmaps',       [['userId', '==', uid]], ''),
      queryDocs('notes',          [['userId', '==', uid]], ''),
      queryDocs('quizzes',        [['userId', '==', uid]], ''),
      queryDocs('planners',       [['userId', '==', uid]], ''),
      queryDocs('careerActivity', [['userId', '==', uid]], ''),
    ]);

    // Filter results in-memory
    const matchingRoadmaps = roadmaps.filter(r => 
      (r.title && r.title.toLowerCase().includes(query)) ||
      (r.subject && r.subject.toLowerCase().includes(query)) ||
      (r.goal && r.goal.toLowerCase().includes(query))
    );

    const matchingNotes = notes.filter(n => 
      (n.title && n.title.toLowerCase().includes(query)) ||
      (n.subject && n.subject.toLowerCase().includes(query)) ||
      (n.content && n.content.toLowerCase().includes(query))
    );

    const matchingQuizzes = quizzes.filter(qz => 
      (qz.title && qz.title.toLowerCase().includes(query)) ||
      (qz.subject && qz.subject.toLowerCase().includes(query)) ||
      (qz.topic && qz.topic.toLowerCase().includes(query))
    );

    const matchingTasks = tasks.filter(t => 
      (t.title && t.title.toLowerCase().includes(query)) ||
      (t.description && t.description.toLowerCase().includes(query)) ||
      (t.subject && t.subject.toLowerCase().includes(query))
    );

    const matchingCareer = career.filter(c => 
      (c.role && c.role.toLowerCase().includes(query)) ||
      (c.type && c.type.toLowerCase().includes(query)) ||
      (c.feedback && c.feedback.toLowerCase().includes(query))
    );

    return sendSuccess(res, {
      data: {
        roadmaps: matchingRoadmaps.map(r => ({ id: r.id, title: r.title, subject: r.subject, progress: r.progress })),
        notes: matchingNotes.map(n => ({ id: n.id, title: n.title, subject: n.subject, sourceType: n.sourceType })),
        quizzes: matchingQuizzes.map(qz => ({ id: qz.id, title: qz.title, subject: qz.subject })),
        planner: matchingTasks.map(t => ({ id: t.id, title: t.title, subject: t.subject, status: t.status })),
        career: matchingCareer.map(c => ({ id: c.id, role: c.role, type: c.type, score: c.score })),
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  searchAll,
};
