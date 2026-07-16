/**
 * Personalization Controller
 * ===========================
 * Dynamically evaluates user activity (quiz scores, active roadmaps, and profile)
 * to output personalized recommendations and study guides.
 */

const { queryDocs, getDoc } = require('../services/firebase.service');
const { USERS_COLLECTION } = require('../models/user.model');
const { ATTEMPTS_COLLECTION } = require('../models/quiz.model');
const { ROADMAPS_COLLECTION } = require('../models/roadmap.model');
const { sendSuccess } = require('../utils/response');

// ── GET /api/personalization/recommendations ──────────────────
const getRecommendations = async (req, res, next) => {
  try {
    const uid = req.user.uid;

    // Fetch user collections in parallel
    const [user, attempts, roadmaps] = await Promise.all([
      getDoc(USERS_COLLECTION, uid),
      queryDocs(ATTEMPTS_COLLECTION, [['userId', '==', uid]], 'completedAt', 'desc', 30),
      queryDocs(ROADMAPS_COLLECTION, [['userId', '==', uid]], 'createdAt', 'desc', 5),
    ]);

    // 1. Identify Weak Topics (score < 70%)
    const topicScores = {};
    attempts.forEach(att => {
      const topic = att.topic || 'General';
      const subject = att.subject || 'General';
      const score = att.score || 0;
      if (!topicScores[topic]) {
        topicScores[topic] = { subject, scores: [] };
      }
      topicScores[topic].scores.push(score);
    });

    const weakTopics = [];
    Object.keys(topicScores).forEach(topic => {
      const info = topicScores[topic];
      const avg = Math.round(info.scores.reduce((sum, s) => sum + s, 0) / info.scores.length);
      if (avg < 70) {
        weakTopics.push({ topic, subject: info.subject, avgScore: avg });
      }
    });

    // 2. Recommend Practice Quizzes & Videos based on Weak Topics
    const practiceQuizzes = [];
    const recommendedVideos = [];
    
    if (weakTopics.length > 0) {
      weakTopics.forEach(wt => {
        practiceQuizzes.push({
          topic: wt.topic,
          subject: wt.subject,
          reason: `Requires revision (average quiz score is ${wt.avgScore}%)`
        });
        recommendedVideos.push({
          title: `${wt.subject}: ${wt.topic} Explained`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(wt.subject + ' ' + wt.topic + ' tutorial')}`,
          description: `Highly rated video lesson to master "${wt.topic}"`
        });
      });
    } else if (roadmaps.length > 0) {
      // Fallback recommendations if they have no failed quizzes but have a roadmap
      const active = roadmaps[0];
      const pending = active.modules?.find(m => m.status !== 'completed');
      if (pending) {
        practiceQuizzes.push({
          topic: pending.name,
          subject: active.subject,
          reason: `Next up on your roadmap "${active.title}"`
        });
        recommendedVideos.push({
          title: `Introduction to ${pending.name}`,
          url: `https://www.youtube.com/results?search_query=${encodeURIComponent(active.subject + ' ' + pending.name)}`,
          description: `Watch this to prepare for your next roadmap phase.`
        });
      }
    } else {
      // General fallbacks
      practiceQuizzes.push({
        topic: 'General Aptitude',
        subject: 'General Studies',
        reason: 'Warm up with a quick practice quiz!'
      });
      recommendedVideos.push({
        title: 'Effective Study Techniques using AI',
        url: 'https://www.youtube.com/results?search_query=effective+study+techniques+ai',
        description: 'Learn how to maximize your study pacing.'
      });
    }

    // 3. Roadmap Next Step module
    const nextSteps = [];
    roadmaps.forEach(r => {
      const nextMod = r.modules?.find(m => m.status !== 'completed');
      if (nextMod) {
        nextSteps.push({
          roadmapId: r.id,
          roadmapTitle: r.title,
          subject: r.subject,
          moduleName: nextMod.name,
          week: nextMod.week
        });
      }
    });

    // 4. Suggest Difficulty Adjustments based on average score
    let totalScore = 0;
    attempts.forEach(a => totalScore += (a.score || 0));
    const overallAvg = attempts.length ? (totalScore / attempts.length) : 75;
    let suggestedDifficulty = 'intermediate';
    if (overallAvg > 85) suggestedDifficulty = 'advanced';
    else if (overallAvg < 60) suggestedDifficulty = 'beginner';

    return sendSuccess(res, {
      data: {
        weakTopics: weakTopics.slice(0, 5),
        practiceQuizzes: practiceQuizzes.slice(0, 3),
        videos: recommendedVideos.slice(0, 3),
        nextSteps: nextSteps.slice(0, 2),
        suggestedDifficulty,
        hasActivity: attempts.length > 0 || roadmaps.length > 0
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecommendations,
};
