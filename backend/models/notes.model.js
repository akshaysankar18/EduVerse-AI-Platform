/**
 * Notes Model
 * ============
 * Firestore document shape for AI-generated and user-uploaded notes.
 * Collection: "notes"
 */

/**
 * @typedef {object} NotesModel
 * @property {string}   id
 * @property {string}   userId
 * @property {string}   title
 * @property {string}   content        - Markdown content
 * @property {string}   summary        - AI-generated summary
 * @property {string}   subject
 * @property {string[]} tags
 * @property {string}   sourceType     - 'ai_generated' | 'uploaded' | 'manual'
 * @property {string}   fileURL        - Storage URL if uploaded
 * @property {string}   fileName
 * @property {boolean}  isFavorite
 * @property {string}   createdAt
 * @property {string}   updatedAt
 */

const createNotesModel = (data = {}) => ({
  id        : data.id         || '',
  userId    : data.userId     || '',
  title     : data.title      || '',
  content   : data.content    || '',
  summary   : data.summary    || '',
  subject   : data.subject    || '',
  tags      : data.tags       || [],
  sourceType: data.sourceType || 'ai_generated',
  fileURL   : data.fileURL    || '',
  fileName  : data.fileName   || '',
  isFavorite: data.isFavorite || false,
  createdAt : data.createdAt  || new Date().toISOString(),
  updatedAt : new Date().toISOString(),
});

const NOTES_COLLECTION = 'notes';

module.exports = { createNotesModel, NOTES_COLLECTION };
