/**
 * ChatHistoryService — ai_chat_history collection
 * =================================================
 * Manages AI mentor conversation threads.
 * Each document = one conversation thread with an array of messages.
 *
 * Collection: ai_chat_history
 * Fields: userId, title, messages[], createdAt, updatedAt
 * Each message: { role, text, timestamp }
 */

'use strict';

const FirestoreService  = require('./FirestoreService');
const { COLLECTIONS, createChatSchema, createMessageSchema } = require('./schema');
const { db }            = require('../config/firebase');
const logger            = require('../utils/logger');

class ChatHistoryService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.AI_CHAT_HISTORY, createChatSchema);
  }

  // ── Chat-specific methods ─────────────────────────────────────

  /**
   * Start a new conversation thread.
   * @param {string} userId
   * @param {string} [title] - Conversation title (auto-set from first message if omitted)
   * @returns {Promise<object>}
   */
  async createChat(userId, title = 'New Conversation') {
    if (!userId) throw new Error('ChatHistoryService.createChat: userId is required');
    return this.createDocument({ userId, title, messages: [] });
  }

  /**
   * Append a message to an existing conversation thread.
   * Uses a transaction to safely append to the messages array.
   *
   * @param {string} chatId
   * @param {string} userId
   * @param {'user'|'assistant'} role
   * @param {string} text
   * @returns {Promise<object>} Updated chat document
   */
  async appendMessage(chatId, userId, role, text) {
    const chat = await this.getDocument(chatId);
    if (!chat)                   throw new Error(`Chat ${chatId} not found`);
    if (chat.userId !== userId)  throw new Error(`Chat ${chatId}: access denied`);

    const message  = createMessageSchema(role, text);
    const messages = [...(chat.messages || []), message];

    // Auto-title from the first user message
    const updates = { messages, updatedAt: new Date().toISOString() };
    if (
      chat.title === 'New Conversation' &&
      role       === 'user' &&
      text.trim()
    ) {
      updates.title = text.slice(0, 60).trim();
    }

    await this._col().doc(chatId).update(updates);
    logger.debug(`[ChatHistory] Appended message to chat ${chatId}`);
    return this.getDocument(chatId);
  }

  /**
   * Get all conversation threads for a user (metadata only, includes messages).
   * @param {string} userId
   * @param {number} [limit]
   * @returns {Promise<object[]>}
   */
  async getChatsForUser(userId, limit = 30) {
    return this.queryDocuments(
      [['userId', '==', userId]],
      'createdAt',
      'desc',
      limit,
    );
  }

  /**
   * Get a single conversation thread (validates ownership).
   * @param {string} chatId
   * @param {string} userId
   */
  async getChat(chatId, userId) {
    const chat = await this.getDocument(chatId);
    if (!chat || chat.userId !== userId) return null;
    return chat;
  }

  /**
   * Rename a conversation thread.
   * @param {string} chatId
   * @param {string} userId
   * @param {string} newTitle
   */
  async renameChat(chatId, userId, newTitle) {
    const chat = await this.getChat(chatId, userId);
    if (!chat) throw new Error(`Chat ${chatId} not found or access denied`);
    return this.updateDocument(chatId, { title: newTitle });
  }

  /**
   * Delete a conversation thread.
   * @param {string} chatId
   * @param {string} userId
   */
  async deleteChat(chatId, userId) {
    const chat = await this.getChat(chatId, userId);
    if (!chat) throw new Error(`Chat ${chatId} not found or access denied`);
    return this.deleteDocument(chatId);
  }

  /**
   * Clear all messages from a thread without deleting the thread.
   * @param {string} chatId
   * @param {string} userId
   */
  async clearMessages(chatId, userId) {
    const chat = await this.getChat(chatId, userId);
    if (!chat) throw new Error(`Chat ${chatId} not found or access denied`);
    return this.updateDocument(chatId, { messages: [] });
  }

  /**
   * Count conversation threads for a user.
   * @param {string} userId
   */
  async countChats(userId) {
    return this.countDocuments([['userId', '==', userId]]);
  }

  /**
   * Get the most recent N messages from a thread (for context injection).
   * @param {string} chatId
   * @param {string} userId
   * @param {number} n
   * @returns {Promise<object[]>} Last n message objects
   */
  async getRecentMessages(chatId, userId, n = 10) {
    const chat = await this.getChat(chatId, userId);
    if (!chat) return [];
    const messages = chat.messages || [];
    return messages.slice(-n);
  }
}

module.exports = new ChatHistoryService();
