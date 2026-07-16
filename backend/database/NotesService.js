/**
 * NotesService — notes collection
 * ==================================
 * Manages study notes (manual, AI-generated, or uploaded).
 *
 * Collection: notes
 * Fields: userId, title, subject, content, tags,
 *         sourceType, fileURL, createdAt, updatedAt
 */

'use strict';

const FirestoreService  = require('./FirestoreService');
const { COLLECTIONS, createNoteSchema } = require('./schema');
const logger            = require('../utils/logger');

class NotesService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.NOTES, createNoteSchema);
  }

  // ── Notes-specific methods ────────────────────────────────────

  /**
   * Create a new note.
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createNote(userId, data) {
    if (!userId)      throw new Error('NotesService.createNote: userId is required');
    if (!data.title)  throw new Error('NotesService.createNote: title is required');
    return this.createDocument({ ...data, userId });
  }

  /**
   * Get all notes for a user.
   * @param {string} userId
   * @param {object} [options]
   * @param {string} [options.subject]  - Filter by subject
   * @param {string} [options.sourceType] - 'manual' | 'ai_generated' | 'uploaded'
   * @param {number} [options.limit]
   * @returns {Promise<object[]>}
   */
  async getNotesForUser(userId, { subject, sourceType, limit = 50 } = {}) {
    const filters = [['userId', '==', userId]];
    if (subject)    filters.push(['subject',    '==', subject]);
    if (sourceType) filters.push(['sourceType', '==', sourceType]);
    return this.queryDocuments(filters, 'updatedAt', 'desc', limit);
  }

  /**
   * Get a single note (validates ownership).
   * @param {string} noteId
   * @param {string} userId
   */
  async getNote(noteId, userId) {
    const note = await this.getDocument(noteId);
    if (!note || note.userId !== userId) return null;
    return note;
  }

  /**
   * Search notes by a tag value.
   * @param {string} userId
   * @param {string} tag
   * @returns {Promise<object[]>}
   */
  async searchByTag(userId, tag) {
    return this.queryDocuments(
      [['userId', '==', userId], ['tags', 'array-contains', tag]],
      'updatedAt',
      'desc',
      50,
    );
  }

  /**
   * Full-text-like title search (prefix match via Firestore range query).
   * Note: For production, use Algolia or Typesense for richer search.
   * @param {string} userId
   * @param {string} searchTerm
   * @returns {Promise<object[]>}
   */
  async searchByTitle(userId, searchTerm) {
    const end = searchTerm + '\uf8ff';
    return this.queryDocuments(
      [
        ['userId', '==', userId],
        ['title', '>=', searchTerm],
        ['title', '<=', end],
      ],
      'title',
      'asc',
      20,
    );
  }

  /**
   * Update note content or metadata.
   * @param {string} noteId
   * @param {string} userId
   * @param {object} data
   */
  async updateNote(noteId, userId, data) {
    const note = await this.getNote(noteId, userId);
    if (!note) throw new Error(`Note ${noteId} not found or access denied`);

    const allowed = ['title', 'subject', 'content', 'tags', 'fileURL'];
    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }
    return this.updateDocument(noteId, sanitized);
  }

  /**
   * Add a tag to a note.
   * @param {string} noteId
   * @param {string} userId
   * @param {string} tag
   */
  async addTag(noteId, userId, tag) {
    const note = await this.getNote(noteId, userId);
    if (!note) throw new Error(`Note ${noteId} not found or access denied`);
    const tags = [...new Set([...(note.tags || []), tag])];
    return this.updateDocument(noteId, { tags });
  }

  /**
   * Delete a note.
   * @param {string} noteId
   * @param {string} userId
   */
  async deleteNote(noteId, userId) {
    const note = await this.getNote(noteId, userId);
    if (!note) throw new Error(`Note ${noteId} not found or access denied`);
    return this.deleteDocument(noteId);
  }

  /**
   * Get all unique subjects a user has notes for.
   * @param {string} userId
   * @returns {Promise<string[]>}
   */
  async getSubjects(userId) {
    const notes = await this.queryDocuments(
      [['userId', '==', userId]],
      'subject',
      'asc',
      200,
    );
    return [...new Set(notes.map(n => n.subject).filter(Boolean))];
  }

  /**
   * Count total notes for a user.
   * @param {string} userId
   */
  async countNotes(userId) {
    return this.countDocuments([['userId', '==', userId]]);
  }
}

module.exports = new NotesService();
