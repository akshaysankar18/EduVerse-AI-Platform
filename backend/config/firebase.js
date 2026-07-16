/**
 * Firebase Admin SDK Configuration
 * =================================
 * Initialises the Firebase Admin app (singleton) using the
 * service account JSON key file at config/firebase-service-account.json.
 *
 * Falls back to environment variables if the file is absent
 * (useful for CI/CD or production environments).
 *
 * Exports: admin, db (Firestore), auth (Firebase Auth), storage (Cloud Storage bucket)
 */

'use strict';

const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth }      = require('firebase-admin/auth');
const { getStorage }   = require('firebase-admin/storage');
const path  = require('path');
const fs    = require('fs');

const SERVICE_ACCOUNT_PATH = path.resolve(__dirname, 'firebase-service-account.json');

// ── Helper: format any error into a readable string ──────────
const formatError = (err) => {
  if (!err) return 'Unknown error';
  // Firebase Admin errors expose details via errorInfo or code
  if (err.errorInfo) return `[${err.errorInfo.code}] ${err.errorInfo.message}`;
  if (err.message)   return err.message;
  return String(err);
};

// ── Initialize Firebase Admin (singleton) ────────────────────
let firebaseApp;

if (admin.getApps().length === 0) {
  try {
    let credential;
    let storageBucket;
    let databaseURL;

    if (fs.existsSync(SERVICE_ACCOUNT_PATH)) {
      // ── Load credentials from JSON key file ─────────────────
      const raw            = fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8');
      const serviceAccount = JSON.parse(raw);

      credential    = admin.cert(serviceAccount);
      storageBucket = `${serviceAccount.project_id}.appspot.com`;
      databaseURL   = `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`;

      console.log(`[Firebase] Project  : ${serviceAccount.project_id}`);
      console.log(`[Firebase] Client   : ${serviceAccount.client_email}`);
      console.log(`[Firebase] Bucket   : ${storageBucket}`);
    } else {
      // ── Fall back to environment variables ───────────────────
      console.warn('[Firebase] Service account file not found — using env vars');

      credential    = admin.cert({
        type        : 'service_account',
        project_id  : process.env.FIREBASE_PROJECT_ID,
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key : (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      });
      storageBucket = process.env.FIREBASE_STORAGE_BUCKET;
      databaseURL   = process.env.FIREBASE_DATABASE_URL;
    }

    firebaseApp = admin.initializeApp({ credential, storageBucket, databaseURL });

    console.log('Firebase Admin initialized successfully');
  } catch (err) {
    console.error('❌ Firebase Admin initialization failed:', formatError(err));
    console.error('   Full error:', err);
    process.exit(1);
  }
} else {
  // App was already initialised (e.g. hot-reload in dev)
  firebaseApp = admin.app();
  console.log('[Firebase] Reusing existing Firebase Admin app');
}

// ── Firestore ─────────────────────────────────────────────────
let db;
try {
  db = getFirestore();
  db.settings({ ignoreUndefinedProperties: true });
} catch (err) {
  console.error('❌ Firestore init failed:', formatError(err));
  process.exit(1);
}

// ── Auth ──────────────────────────────────────────────────────
let auth;
try {
  auth = getAuth();
} catch (err) {
  console.error('❌ Firebase Auth init failed:', formatError(err));
  process.exit(1);
}

// ── Cloud Storage ─────────────────────────────────────────────
// Storage is optional — if no bucket is configured we export null
// and the storage service handles the missing-bucket case gracefully.
let storage = null;
try {
  storage = getStorage().bucket();
} catch (err) {
  console.warn('[Firebase] Storage bucket not configured:', formatError(err));
}

module.exports = { admin, db, auth, storage };
