/**
 * EduVerse AI — Firestore Database Schema
 * =========================================
 * Single source of truth for all collection names, field
 * constants, and document factory functions.
 *
 * Collections:
 *   USERS             → users
 *   STUDY_PLANS       → study_plans
 *   TASKS             → tasks
 *   NOTES             → notes
 *   QUIZZES           → quizzes
 *   ANALYTICS         → analytics
 *   AI_CHAT_HISTORY   → ai_chat_history
 */

'use strict';

// ── Collection name constants ────────────────────────────────
const COLLECTIONS = Object.freeze({
  USERS           : 'users',
  STUDY_PLANS     : 'study_plans',
  TASKS           : 'tasks',
  NOTES           : 'notes',
  QUIZZES         : 'quizzes',
  ANALYTICS       : 'analytics',
  AI_CHAT_HISTORY : 'ai_chat_history',
});

// ── Enum-style constants ─────────────────────────────────────
const ROLES         = Object.freeze(['student', 'professional']);
const LEVELS        = Object.freeze(['beginner', 'intermediate', 'advanced']);
const PRIORITIES    = Object.freeze(['low', 'medium', 'high']);
const TASK_STATUSES = Object.freeze(['pending', 'in_progress', 'completed']);
const DIFFICULTY    = Object.freeze(['easy', 'medium', 'hard']);

// ── Document factory functions ───────────────────────────────

/**
 * users — one document per Firebase user, keyed by uid.
 */
const createUserSchema = (data = {}) => ({
  uid            : data.uid           || '',
  name           : data.name          || '',
  email          : data.email         || '',
  profilePhoto   : data.profilePhoto  || '',
  role           : ROLES.includes(data.role) ? data.role : 'student',
  learningGoal   : data.learningGoal  || '',
  learningLevel  : LEVELS.includes(data.learningLevel) ? data.learningLevel : 'beginner',
  studyStreak    : typeof data.studyStreak   === 'number' ? data.studyStreak   : 0,
  totalStudyHours: typeof data.totalStudyHours === 'number' ? data.totalStudyHours : 0,
  createdAt      : data.createdAt     || new Date().toISOString(),
  updatedAt      : new Date().toISOString(),
});

/**
 * study_plans — a user's learning plan for a subject.
 */
const createStudyPlanSchema = (data = {}) => ({
  userId     : data.userId      || '',
  title      : data.title       || '',
  subject    : data.subject     || '',
  difficulty : DIFFICULTY.includes(data.difficulty) ? data.difficulty : 'medium',
  dailyTarget: typeof data.dailyTarget === 'number' ? data.dailyTarget : 1,  // hours/day
  progress   : typeof data.progress    === 'number' ? data.progress    : 0,  // 0-100
  completed  : Boolean(data.completed),
  createdAt  : data.createdAt   || new Date().toISOString(),
  updatedAt  : new Date().toISOString(),
});

/**
 * tasks — to-do/study tasks belonging to a user.
 */
const createTaskSchema = (data = {}) => ({
  userId     : data.userId      || '',
  title      : data.title       || '',
  description: data.description || '',
  dueDate    : data.dueDate     || '',    // ISO date string
  priority   : PRIORITIES.includes(data.priority) ? data.priority : 'medium',
  status     : TASK_STATUSES.includes(data.status) ? data.status : 'pending',
  reminder   : Boolean(data.reminder),
  completedAt: data.status === 'completed' ? (data.completedAt || new Date().toISOString()) : null,
  createdAt  : data.createdAt   || new Date().toISOString(),
  updatedAt  : new Date().toISOString(),
});

/**
 * notes — study notes, AI-generated or user-written.
 */
const createNoteSchema = (data = {}) => ({
  userId   : data.userId    || '',
  title    : data.title     || '',
  subject  : data.subject   || '',
  content  : data.content   || '',
  tags     : Array.isArray(data.tags) ? data.tags : [],
  sourceType: data.sourceType || 'manual',   // 'manual' | 'ai_generated' | 'uploaded'
  fileURL  : data.fileURL   || '',
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/**
 * quizzes — individual quiz attempt records.
 */
const createQuizSchema = (data = {}) => ({
  userId        : data.userId         || '',
  subject       : data.subject        || '',
  topic         : data.topic          || '',
  score         : typeof data.score          === 'number' ? data.score          : 0,
  totalQuestions: typeof data.totalQuestions === 'number' ? data.totalQuestions : 0,
  correctAnswers: typeof data.correctAnswers === 'number' ? data.correctAnswers : 0,
  accuracy      : typeof data.accuracy       === 'number' ? data.accuracy       : 0,  // 0-100
  timeTaken     : typeof data.timeTaken      === 'number' ? data.timeTaken      : 0,  // seconds
  difficulty    : DIFFICULTY.includes(data.difficulty) ? data.difficulty : 'medium',
  completedAt   : data.completedAt    || new Date().toISOString(),
});

/**
 * analytics — aggregated stats per user (one doc per user, keyed by uid).
 */
const createAnalyticsSchema = (data = {}) => ({
  userId           : data.userId            || '',
  totalStudyHours  : typeof data.totalStudyHours   === 'number' ? data.totalStudyHours   : 0,
  weeklyHours      : typeof data.weeklyHours        === 'number' ? data.weeklyHours        : 0,
  monthlyHours     : typeof data.monthlyHours       === 'number' ? data.monthlyHours       : 0,
  studyStreak      : typeof data.studyStreak        === 'number' ? data.studyStreak        : 0,
  completedTasks   : typeof data.completedTasks     === 'number' ? data.completedTasks     : 0,
  completedQuizzes : typeof data.completedQuizzes   === 'number' ? data.completedQuizzes   : 0,
  averageAccuracy  : typeof data.averageAccuracy    === 'number' ? data.averageAccuracy    : 0,
  strongestSubject : data.strongestSubject   || '',
  weakestSubject   : data.weakestSubject     || '',
  subjectBreakdown : data.subjectBreakdown   || {},  // { "Math": 5.5, "Physics": 2 }
  updatedAt        : new Date().toISOString(),
});

/**
 * ai_chat_history — conversation threads with the AI mentor.
 */
const createChatSchema = (data = {}) => ({
  userId   : data.userId    || '',
  title    : data.title     || 'New Conversation',
  messages : Array.isArray(data.messages) ? data.messages : [],
  // Each message: { role: 'user'|'assistant', text, timestamp }
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** Build a single chat message object. */
const createMessageSchema = (role, text) => ({
  role     : role === 'assistant' ? 'assistant' : 'user',
  text     : text || '',
  timestamp: new Date().toISOString(),
});

// ── Exports ─────────────────────────────────────────────────
module.exports = {
  COLLECTIONS,
  ROLES,
  LEVELS,
  PRIORITIES,
  TASK_STATUSES,
  DIFFICULTY,
  // Factories
  createUserSchema,
  createStudyPlanSchema,
  createTaskSchema,
  createNoteSchema,
  createQuizSchema,
  createAnalyticsSchema,
  createChatSchema,
  createMessageSchema,
};
