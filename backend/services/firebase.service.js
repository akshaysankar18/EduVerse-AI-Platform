/**
 * Firebase / Firestore Service
 * =============================
 * Generic CRUD helpers for Firestore collections.
 * All methods return plain JS objects (not Firestore DocumentSnapshot).
 */

const { db } = require('../config/firebase');
const logger  = require('../utils/logger');

/**
 * Create a document.
 * @param {string} collection
 * @param {string} docId       - Use '' or null to auto-generate
 * @param {object} data
 * @returns {Promise<object>}  The saved document with its ID
 */
const createDoc = async (collection, docId, data) => {
  const ref = docId
    ? db.collection(collection).doc(docId)
    : db.collection(collection).doc();

  const payload = { ...data, id: ref.id };
  await ref.set(payload);
  logger.debug(`[Firestore] Created ${collection}/${ref.id}`);
  return payload;
};

/**
 * Get a single document by ID.
 */
const getDoc = async (collection, docId) => {
  const snap = await db.collection(collection).doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() };
};

/**
 * Update fields of an existing document (partial merge).
 */
const updateDoc = async (collection, docId, data) => {
  const payload = { ...data, updatedAt: new Date().toISOString() };
  await db.collection(collection).doc(docId).update(payload);
  logger.debug(`[Firestore] Updated ${collection}/${docId}`);
  return getDoc(collection, docId);
};

/**
 * Delete a document.
 */
const deleteDoc = async (collection, docId) => {
  await db.collection(collection).doc(docId).delete();
  logger.debug(`[Firestore] Deleted ${collection}/${docId}`);
  return true;
};

/**
 * Query documents with optional filters, ordering, and pagination.
 * @param {string}   collection
 * @param {Array}    filters      - Array of [field, operator, value] tuples
 * @param {string}   orderBy      - Field to order by
 * @param {'asc'|'desc'} direction
 * @param {number}   limitCount
 * @param {object}   startAfterDoc - Firestore DocumentSnapshot for pagination
 * @returns {Promise<object[]>}
 */
const queryDocs = async (
  collection,
  filters    = [],
  orderBy    = 'createdAt',
  direction  = 'desc',
  limitCount = 20,
  startAfterDoc = null,
) => {
  let query = db.collection(collection);

  for (const [field, op, value] of filters) {
    query = query.where(field, op, value);
  }

  try {
    let nativeQuery = query;
    if (orderBy) {
      nativeQuery = nativeQuery.orderBy(orderBy, direction);
    }
    nativeQuery = nativeQuery.limit(limitCount);

    if (startAfterDoc) {
      nativeQuery = nativeQuery.startAfter(startAfterDoc);
    }

    const snap = await nativeQuery.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    const isIndexError = error.code === 9 || 
                         (error.message && error.message.includes('index')) || 
                         (error.message && error.message.includes('FAILED_PRECONDITION'));

    if (isIndexError) {
      const snap = await query.get();
      let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (orderBy) {
        results.sort((a, b) => {
          let valA = a[orderBy];
          let valB = b[orderBy];

          // Handle Firebase Timestamps
          if (valA && typeof valA.toMillis === 'function') valA = valA.toMillis();
          if (valB && typeof valB.toMillis === 'function') valB = valB.toMillis();

          if (valA === undefined || valA === null) return 1;
          if (valB === undefined || valB === null) return -1;

          if (typeof valA === 'string' && typeof valB === 'string') {
            return direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          if (valA < valB) return direction === 'asc' ? -1 : 1;
          if (valA > valB) return direction === 'asc' ? 1 : -1;
          return 0;
        });
      }

      return results.slice(0, limitCount);
    }
    throw error;
  }
};

/**
 * Count documents matching filters (uses Firestore count aggregation).
 */
const countDocs = async (collection, filters = []) => {
  let query = db.collection(collection);
  for (const [field, op, value] of filters) {
    query = query.where(field, op, value);
  }
  const agg  = await query.count().get();
  return agg.data().count;
};

/**
 * Batch write helper — creates/updates multiple docs atomically.
 * @param {Array<{ collection, docId, data }>} operations
 */
const batchWrite = async (operations) => {
  const batch = db.batch();
  const results = [];

  for (const op of operations) {
    const ref = op.docId
      ? db.collection(op.collection).doc(op.docId)
      : db.collection(op.collection).doc();
    const payload = { ...op.data, id: ref.id };
    batch.set(ref, payload, { merge: true });
    results.push(payload);
  }

  await batch.commit();
  logger.debug(`[Firestore] Batch wrote ${operations.length} documents`);
  return results;
};

module.exports = { createDoc, getDoc, updateDoc, deleteDoc, queryDocs, countDocs, batchWrite };
