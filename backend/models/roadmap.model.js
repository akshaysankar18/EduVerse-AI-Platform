/**
 * Roadmap Model
 * ==============
 * Firestore document shape for learning roadmaps.
 * Collection: "roadmaps"
 */

/**
 * @typedef {object} RoadmapStep
 * @property {string}  id
 * @property {string}  title
 * @property {string}  description
 * @property {string}  type          - 'video' | 'article' | 'exercise' | 'project'
 * @property {string}  url
 * @property {number}  estimatedHours
 * @property {boolean} completed
 * @property {string}  completedAt
 */

/**
 * @typedef {object} RoadmapModule
 * @property {string}       id
 * @property {string}       title
 * @property {RoadmapStep[]} steps
 * @property {number}       progress  - 0-100
 */

/**
 * @typedef {object} RoadmapModel
 * @property {string}          id
 * @property {string}          userId
 * @property {string}          title
 * @property {string}          goal
 * @property {string}          subject
 * @property {string}          level       - 'beginner' | 'intermediate' | 'advanced'
 * @property {number}          totalWeeks
 * @property {RoadmapModule[]} modules
 * @property {number}          progress    - 0-100
 * @property {string}          status      - 'active' | 'completed' | 'paused'
 * @property {string}          createdAt
 * @property {string}          updatedAt
 */

const createRoadmapModel = (data = {}) => ({
  id        : data.id         || '',
  userId    : data.userId     || '',
  title     : data.title      || '',
  goal      : data.goal       || '',
  subject   : data.subject    || '',
  level     : data.level      || 'beginner',
  totalWeeks: data.totalWeeks || 4,
  modules   : data.modules    || [],
  progress  : data.progress   || 0,
  status    : data.status     || 'active',
  createdAt : data.createdAt  || new Date().toISOString(),
  updatedAt : new Date().toISOString(),
});

const ROADMAPS_COLLECTION = 'roadmaps';

module.exports = { createRoadmapModel, ROADMAPS_COLLECTION };
