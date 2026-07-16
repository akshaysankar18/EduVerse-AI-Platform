/**
 * Quiz Model
 * ===========
 * Firestore document shape for quizzes and quiz attempts.
 * Collection: "quizzes"
 */

/**
 * @typedef {object} QuizQuestion
 * @property {string}   id
 * @property {string}   question
 * @property {string[]} options
 * @property {number}   correctIndex
 * @property {string}   explanation
 */

/**
 * @typedef {object} QuizModel
 * @property {string}         id
 * @property {string}         userId
 * @property {string}         title
 * @property {string}         subject
 * @property {string}         topic
 * @property {string}         difficulty  - 'easy' | 'medium' | 'hard'
 * @property {QuizQuestion[]} questions
 * @property {number}         timeLimit   - seconds
 * @property {string}         createdAt
 */

/**
 * @typedef {object} QuizAttemptModel
 * @property {string}   id
 * @property {string}   quizId
 * @property {string}   userId
 * @property {number[]} answers         - selected option indices
 * @property {number}   score           - percentage
 * @property {number}   correctCount
 * @property {number}   totalQuestions
 * @property {number}   timeTaken       - seconds
 * @property {string}   completedAt
 */

const createQuizModel = (data = {}) => ({
  id         : data.id          || '',
  userId     : data.userId      || '',
  title      : data.title       || '',
  subject    : data.subject     || '',
  topic      : data.topic       || '',
  difficulty : data.difficulty  || 'medium',
  questions  : data.questions   || [],
  timeLimit  : data.timeLimit   || 600,
  createdAt  : data.createdAt   || new Date().toISOString(),
});

const createQuizAttemptModel = (data = {}) => ({
  id            : data.id             || '',
  quizId        : data.quizId         || '',
  userId        : data.userId         || '',
  answers       : data.answers        || [],
  score         : data.score          || 0,
  correctCount  : data.correctCount   || 0,
  totalQuestions: data.totalQuestions || 0,
  timeTaken     : data.timeTaken      || 0,
  completedAt   : new Date().toISOString(),
  quizTitle     : data.quizTitle      || '',
  subject       : data.subject        || '',
  topic         : data.topic          || '',
});

const QUIZZES_COLLECTION  = 'quizzes';
const ATTEMPTS_COLLECTION = 'quizAttempts';

module.exports = { createQuizModel, createQuizAttemptModel, QUIZZES_COLLECTION, ATTEMPTS_COLLECTION };
