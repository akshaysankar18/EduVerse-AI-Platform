/**
 * Planner Model
 * ==============
 * Firestore document shape for study planner tasks.
 * Collection: "planners" → sub-collection per user via userId field
 */

/**
 * @typedef {object} PlannerModel
 * @property {string}   id
 * @property {string}   userId
 * @property {string}   title
 * @property {string}   description
 * @property {string}   subject
 * @property {string}   dueDate     - ISO date string
 * @property {string}   priority    - 'low' | 'medium' | 'high'
 * @property {string}   status      - 'pending' | 'in_progress' | 'completed'
 * @property {number}   estimatedHours
 * @property {string[]} tags
 * @property {string}   createdAt
 * @property {string}   updatedAt
 */

const createPlannerModel = (data = {}) => ({
  id             : data.id              || '',
  userId         : data.userId          || '',
  title          : data.title           || '',
  description    : data.description     || '',
  subject        : data.subject         || '',
  dueDate        : data.dueDate         || '',
  priority       : data.priority        || 'medium',
  status         : data.status          || 'pending',
  estimatedHours : data.estimatedHours  || 1,
  tags           : data.tags            || [],
  createdAt      : data.createdAt       || new Date().toISOString(),
  updatedAt      : new Date().toISOString(),
});

const PLANNERS_COLLECTION = 'planners';

module.exports = { createPlannerModel, PLANNERS_COLLECTION };
