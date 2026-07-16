/**
 * EduVerse AI — Database Layer Index
 * =====================================
 * Barrel export for all Firestore service singletons and the schema.
 *
 * Usage:
 *   const { UserService, TaskService, COLLECTIONS } = require('../database');
 */

'use strict';

const FirestoreService   = require('./FirestoreService');
const UserService        = require('./UserService');
const StudyPlanService   = require('./StudyPlanService');
const TaskService        = require('./TaskService');
const NotesService       = require('./NotesService');
const QuizService        = require('./QuizService');
const AnalyticsService   = require('./AnalyticsService');
const ChatHistoryService = require('./ChatHistoryService');
const schema             = require('./schema');

module.exports = {
  // Base class (for extension / advanced usage)
  FirestoreService,

  // Service singletons
  UserService,
  StudyPlanService,
  TaskService,
  NotesService,
  QuizService,
  AnalyticsService,
  ChatHistoryService,

  // Schema constants & factories
  ...schema,
};
