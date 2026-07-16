/**
 * Firebase Storage Service
 * =========================
 * Helpers for uploading files to and generating signed URLs from
 * Firebase Cloud Storage.
 */

const path   = require('path');
const { v4: uuidv4 } = require('uuid');
const { storage } = require('../config/firebase');
const logger      = require('../utils/logger');

/**
 * Upload a file buffer to Firebase Storage.
 * @param {Buffer} buffer
 * @param {string} originalName   - Original filename (for extension)
 * @param {string} mimeType
 * @param {string} folder         - Storage folder path (e.g. 'notes/userId')
 * @returns {Promise<{ url, fileName, path }>}
 */
const uploadFile = async (buffer, originalName, mimeType, folder = 'uploads') => {
  const ext      = path.extname(originalName) || '';
  const fileName = `${uuidv4()}${ext}`;
  const filePath = `${folder}/${fileName}`;

  const file = storage.file(filePath);

  await file.save(buffer, {
    metadata: {
      contentType: mimeType,
      metadata   : { firebaseStorageDownloadTokens: uuidv4() },
    },
  });

  // Make the file publicly readable
  await file.makePublic();

  const publicUrl = `https://storage.googleapis.com/${storage.name}/${filePath}`;
  logger.debug(`[Storage] Uploaded ${filePath}`);

  return { url: publicUrl, fileName, path: filePath };
};

/**
 * Delete a file from Firebase Storage.
 * @param {string} filePath - Storage path (e.g. 'uploads/userId/file.pdf')
 */
const deleteFile = async (filePath) => {
  try {
    await storage.file(filePath).delete();
    logger.debug(`[Storage] Deleted ${filePath}`);
    return true;
  } catch (error) {
    logger.warn(`[Storage] Could not delete ${filePath}: ${error.message}`);
    return false;
  }
};

/**
 * Generate a signed URL for temporary private access.
 * @param {string} filePath
 * @param {number} expiresInMinutes
 * @returns {Promise<string>} Signed URL
 */
const getSignedUrl = async (filePath, expiresInMinutes = 60) => {
  const [url] = await storage.file(filePath).getSignedUrl({
    action : 'read',
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });
  return url;
};

module.exports = { uploadFile, deleteFile, getSignedUrl };
