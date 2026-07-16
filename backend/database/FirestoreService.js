/**
 * FirestoreService — Base Class
 * ==============================
 * Abstract-style base with full CRUD operations that every
 * collection-specific service inherits.
 *
 * Provided reusable methods:
 *  • createDocument(data, docId?)
 *  • updateDocument(docId, data)
 *  • deleteDocument(docId)
 *  • getDocument(docId)
 *  • getCollection(limitCount?, orderField?, direction?)
 *  • queryDocuments(filters, orderField?, direction?, limitCount?, cursor?)
 *  • countDocuments(filters?)
 *  • batchCreate(items[])
 *  • runTransaction(updateFn)
 *  • documentExists(docId)
 */

'use strict';

const { db }   = require('../config/firebase');
const logger   = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

class FirestoreService {
  /**
   * @param {string} collectionName - Firestore collection path
   * @param {Function} schemaFactory - Factory that shapes raw data into the doc schema
   */
  constructor(collectionName, schemaFactory = null) {
    if (!collectionName) throw new Error('FirestoreService requires a collectionName');
    this.collection     = collectionName;
    this.schemaFactory  = schemaFactory;
    this._col           = () => db.collection(this.collection);
  }

  // ── Internal helpers ─────────────────────────────────────────

  /** Apply the schema factory if one was provided. */
  _shape(data) {
    return this.schemaFactory ? this.schemaFactory(data) : data;
  }

  /** Convert a DocumentSnapshot to a plain object with `id`. */
  _snap(doc) {
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  // ── createDocument ───────────────────────────────────────────

  /**
   * Create a new Firestore document.
   * @param {object}  data   - Raw document data (will be run through schemaFactory)
   * @param {string}  [docId] - Explicit doc ID; auto-generated UUID if omitted
   * @returns {Promise<object>} The persisted document including its `id`
   */
  async createDocument(data, docId = null) {
    try {
      const id  = docId || uuidv4();
      const ref = this._col().doc(id);
      const doc = { ...this._shape(data), id };

      await ref.set(doc);
      logger.debug(`[Firestore][${this.collection}] Created document: ${id}`);
      return doc;
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] createDocument failed: ${error.message}`);
      throw error;
    }
  }

  // ── updateDocument ───────────────────────────────────────────

  /**
   * Partially update a document. Automatically stamps `updatedAt`.
   * @param {string} docId
   * @param {object} data  - Fields to update (merged, not replaced)
   * @returns {Promise<object>} The updated document
   */
  async updateDocument(docId, data) {
    try {
      const payload = { ...data, updatedAt: new Date().toISOString() };
      await this._col().doc(docId).update(payload);
      logger.debug(`[Firestore][${this.collection}] Updated document: ${docId}`);
      return this.getDocument(docId);
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] updateDocument(${docId}) failed: ${error.message}`);
      throw error;
    }
  }

  // ── deleteDocument ───────────────────────────────────────────

  /**
   * Hard-delete a document.
   * @param {string} docId
   * @returns {Promise<{ id: string, deleted: true }>}
   */
  async deleteDocument(docId) {
    try {
      await this._col().doc(docId).delete();
      logger.debug(`[Firestore][${this.collection}] Deleted document: ${docId}`);
      return { id: docId, deleted: true };
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] deleteDocument(${docId}) failed: ${error.message}`);
      throw error;
    }
  }

  // ── getDocument ──────────────────────────────────────────────

  /**
   * Retrieve a single document by ID.
   * @param {string} docId
   * @returns {Promise<object|null>} Document data or null if not found
   */
  async getDocument(docId) {
    try {
      const snap = await this._col().doc(docId).get();
      if (!snap.exists) {
        logger.debug(`[Firestore][${this.collection}] Document not found: ${docId}`);
        return null;
      }
      return this._snap(snap);
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] getDocument(${docId}) failed: ${error.message}`);
      throw error;
    }
  }

  // ── getCollection ────────────────────────────────────────────

  /**
   * Fetch all documents in the collection (with optional limit/order).
   * @param {number} limitCount
   * @param {string} orderField
   * @param {'asc'|'desc'} direction
   * @returns {Promise<object[]>}
   */
  async getCollection(limitCount = 100, orderField = 'createdAt', direction = 'desc') {
    try {
      const snap = await this._col()
        .orderBy(orderField, direction)
        .limit(limitCount)
        .get();
      return snap.docs.map(d => this._snap(d));
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] getCollection failed: ${error.message}`);
      throw error;
    }
  }

  // ── queryDocuments ───────────────────────────────────────────

  /**
   * Query documents with filters, ordering, and pagination.
   *
   * @param {Array<[field, operator, value]>} filters
   *   e.g. [['userId','==','abc'], ['status','==','pending']]
   * @param {string}        orderField
   * @param {'asc'|'desc'}  direction
   * @param {number}        limitCount
   * @param {object|null}   cursor  - Firestore DocumentSnapshot for startAfter pagination
   * @returns {Promise<object[]>}
   */
  async queryDocuments(
    filters    = [],
    orderField = 'createdAt',
    direction  = 'desc',
    limitCount = 20,
    cursor     = null,
  ) {
    try {
      let query = this._col();

      for (const [field, op, value] of filters) {
        query = query.where(field, op, value);
      }

      query = query.orderBy(orderField, direction).limit(limitCount);

      if (cursor) {
        query = query.startAfter(cursor);
      }

      const snap = await query.get();
      return snap.docs.map(d => this._snap(d));
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] queryDocuments failed: ${error.message}`);
      throw error;
    }
  }

  // ── countDocuments ───────────────────────────────────────────

  /**
   * Count documents matching optional filters (Firestore aggregation query).
   * @param {Array<[field, operator, value]>} filters
   * @returns {Promise<number>}
   */
  async countDocuments(filters = []) {
    try {
      let query = this._col();
      for (const [field, op, value] of filters) {
        query = query.where(field, op, value);
      }
      const agg = await query.count().get();
      return agg.data().count;
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] countDocuments failed: ${error.message}`);
      throw error;
    }
  }

  // ── documentExists ───────────────────────────────────────────

  /**
   * Check whether a document exists without fetching its data.
   * @param {string} docId
   * @returns {Promise<boolean>}
   */
  async documentExists(docId) {
    try {
      const snap = await this._col().doc(docId).get();
      return snap.exists;
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] documentExists(${docId}) failed: ${error.message}`);
      throw error;
    }
  }

  // ── batchCreate ──────────────────────────────────────────────

  /**
   * Atomically write multiple documents in a single batch.
   * @param {Array<{ data: object, docId?: string }>} items
   * @returns {Promise<object[]>} All created documents
   */
  async batchCreate(items) {
    try {
      const batch   = db.batch();
      const results = [];

      for (const item of items) {
        const id  = item.docId || uuidv4();
        const ref = this._col().doc(id);
        const doc = { ...this._shape(item.data), id };
        batch.set(ref, doc);
        results.push(doc);
      }

      await batch.commit();
      logger.debug(`[Firestore][${this.collection}] Batch created ${items.length} documents`);
      return results;
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] batchCreate failed: ${error.message}`);
      throw error;
    }
  }

  // ── runTransaction ───────────────────────────────────────────

  /**
   * Run an operation inside a Firestore transaction.
   * @param {Function} updateFn  - Receives (transaction, docRef) — must return void
   * @param {string}   docId     - Document to lock during transaction
   * @returns {Promise<any>}
   */
  async runTransaction(updateFn, docId) {
    try {
      const ref = this._col().doc(docId);
      return await db.runTransaction(t => updateFn(t, ref));
    } catch (error) {
      logger.error(`[Firestore][${this.collection}] runTransaction failed: ${error.message}`);
      throw error;
    }
  }
}

module.exports = FirestoreService;
