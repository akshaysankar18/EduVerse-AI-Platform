/**
 * TaskService — tasks collection
 * ================================
 * Manages to-do/study tasks per user.
 *
 * Collection: tasks
 * Fields: userId, title, description, dueDate, priority,
 *         status, reminder, completedAt, createdAt, updatedAt
 */

'use strict';

const FirestoreService  = require('./FirestoreService');
const { COLLECTIONS, createTaskSchema, TASK_STATUSES, PRIORITIES } = require('./schema');
const logger            = require('../utils/logger');

class TaskService extends FirestoreService {
  constructor() {
    super(COLLECTIONS.TASKS, createTaskSchema);
  }

  // ── Task-specific methods ─────────────────────────────────────

  /**
   * Create a new task for a user.
   * @param {string} userId
   * @param {object} data
   * @returns {Promise<object>}
   */
  async createTask(userId, data) {
    if (!userId)       throw new Error('TaskService.createTask: userId is required');
    if (!data.title)   throw new Error('TaskService.createTask: title is required');
    return this.createDocument({ ...data, userId });
  }

  /**
   * Get all tasks for a user.
   * @param {string} userId
   * @param {object} [options]
   * @param {string} [options.status]   - Filter by status ('pending'|'in_progress'|'completed')
   * @param {string} [options.priority] - Filter by priority ('low'|'medium'|'high')
   * @param {number} [options.limit]
   * @returns {Promise<object[]>}
   */
  async getTasksForUser(userId, { status, priority, limit = 50 } = {}) {
    const filters = [['userId', '==', userId]];
    if (status   && TASK_STATUSES.includes(status))   filters.push(['status',   '==', status]);
    if (priority && PRIORITIES.includes(priority))    filters.push(['priority', '==', priority]);
    return this.queryDocuments(filters, 'createdAt', 'desc', limit);
  }

  /**
   * Get tasks due today or overdue.
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async getOverdueTasks(userId) {
    const today   = new Date().toISOString().split('T')[0]; // 'YYYY-MM-DD'
    const filters = [
      ['userId', '==',  userId],
      ['status', '!=',  'completed'],
      ['dueDate', '<=', today],
    ];
    return this.queryDocuments(filters, 'dueDate', 'asc', 50);
  }

  /**
   * Get tasks by status.
   * @param {string} userId
   * @param {string} status
   */
  async getTasksByStatus(userId, status) {
    return this.getTasksForUser(userId, { status });
  }

  /**
   * Get a single task (validates ownership).
   * @param {string} taskId
   * @param {string} userId
   */
  async getTask(taskId, userId) {
    const task = await this.getDocument(taskId);
    if (!task || task.userId !== userId) return null;
    return task;
  }

  /**
   * Update a task.
   * @param {string} taskId
   * @param {string} userId
   * @param {object} data
   */
  async updateTask(taskId, userId, data) {
    const task = await this.getTask(taskId, userId);
    if (!task) throw new Error(`Task ${taskId} not found or access denied`);

    const allowed = ['title', 'description', 'dueDate', 'priority', 'status', 'reminder'];
    const sanitized = {};
    for (const key of allowed) {
      if (data[key] !== undefined) sanitized[key] = data[key];
    }

    // Auto-stamp completedAt when status changes to completed
    if (sanitized.status === 'completed' && task.status !== 'completed') {
      sanitized.completedAt = new Date().toISOString();
    }
    // Clear completedAt if un-completing
    if (sanitized.status && sanitized.status !== 'completed') {
      sanitized.completedAt = null;
    }

    return this.updateDocument(taskId, sanitized);
  }

  /**
   * Mark a task as completed.
   * @param {string} taskId
   * @param {string} userId
   */
  async completeTask(taskId, userId) {
    return this.updateTask(taskId, userId, { status: 'completed' });
  }

  /**
   * Delete a task.
   * @param {string} taskId
   * @param {string} userId
   */
  async deleteTask(taskId, userId) {
    const task = await this.getTask(taskId, userId);
    if (!task) throw new Error(`Task ${taskId} not found or access denied`);
    return this.deleteDocument(taskId);
  }

  /**
   * Count tasks for a user grouped by status.
   * @param {string} userId
   * @returns {Promise<{ pending: number, in_progress: number, completed: number, total: number }>}
   */
  async getTaskCounts(userId) {
    const [pending, inProgress, completed] = await Promise.all([
      this.countDocuments([['userId', '==', userId], ['status', '==', 'pending']]),
      this.countDocuments([['userId', '==', userId], ['status', '==', 'in_progress']]),
      this.countDocuments([['userId', '==', userId], ['status', '==', 'completed']]),
    ]);
    return {
      pending,
      in_progress: inProgress,
      completed,
      total: pending + inProgress + completed,
    };
  }

  /**
   * Get the next N upcoming tasks (non-completed, sorted by dueDate).
   * @param {string} userId
   * @param {number} limit
   */
  async getUpcomingTasks(userId, limit = 5) {
    return this.queryDocuments(
      [['userId', '==', userId], ['status', '!=', 'completed']],
      'dueDate',
      'asc',
      limit,
    );
  }
}

module.exports = new TaskService();
