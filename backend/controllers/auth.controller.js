/**
 * Auth Controller
 * ================
 * Handles signup, login, token refresh, and profile retrieval.
 */

const { auth }          = require('../config/firebase');
const { createDoc, getDoc, updateDoc } = require('../services/firebase.service');
const { generateTokenPair, verifyRefreshToken } = require('../services/auth.service');
const { createUserModel, sanitizeUser, USERS_COLLECTION } = require('../models/user.model');
const { sendSuccess, sendError } = require('../utils/response');
const logger = require('../utils/logger');

// ── POST /api/auth/signup ─────────────────────────────────────
const signup = async (req, res, next) => {
  try {
    const { email, password, displayName } = req.body;

    // Create user in Firebase Auth
    const firebaseUser = await auth.createUser({ email, password, displayName });

    // Build and store user doc in Firestore
    const userDoc = createUserModel({
      uid        : firebaseUser.uid,
      email,
      displayName: displayName || email.split('@')[0],
    });
    await createDoc(USERS_COLLECTION, firebaseUser.uid, userDoc);

    // Issue JWT pair
    const tokens = generateTokenPair(userDoc);

    logger.info(`[Auth] New user registered: ${email}`);
    return sendSuccess(res, {
      statusCode: 201,
      message   : 'Account created successfully',
      data: { user: sanitizeUser(userDoc), ...tokens },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/login ──────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { firebaseToken } = req.body;
    // Client sends a Firebase ID token obtained via signInWithEmailAndPassword
    // We verify it server-side and issue our own JWT pair
    const decoded = await auth.verifyIdToken(firebaseToken);

    // Fetch or bootstrap Firestore user doc
    let user = await getDoc(USERS_COLLECTION, decoded.uid);
    if (!user) {
      user = createUserModel({ uid: decoded.uid, email: decoded.email, displayName: decoded.name });
      await createDoc(USERS_COLLECTION, decoded.uid, user);
    }

    const tokens = generateTokenPair(user);
    logger.info(`[Auth] User logged in: ${decoded.email}`);
    return sendSuccess(res, {
      message: 'Login successful',
      data: { user: sanitizeUser(user), ...tokens },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/refresh ────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return sendError(res, { statusCode: 400, message: 'Refresh token required' });

    const decoded = verifyRefreshToken(token);
    const user    = await getDoc(USERS_COLLECTION, decoded.uid);
    if (!user) return sendError(res, { statusCode: 404, message: 'User not found' });

    const tokens = generateTokenPair(user);
    return sendSuccess(res, { message: 'Token refreshed', data: tokens });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────
const logout = async (req, res) => {
  // JWT is stateless — client should discard the token.
  // Optionally: revoke Firebase refresh tokens here.
  return sendSuccess(res, { message: 'Logged out successfully' });
};

// ── GET /api/auth/profile ─────────────────────────────────────
const getProfile = async (req, res, next) => {
  try {
    let user = await getDoc(USERS_COLLECTION, req.user.uid);
    if (!user) {
      logger.info(`[Auth] User document not found for ${req.user.uid}. Auto-creating default user.`);
      const userDoc = createUserModel({
        uid: req.user.uid,
        email: req.user.email || 'alex.johnson@eduverse.ai',
        displayName: req.user.displayName || 'Alex Johnson',
      });
      await createDoc(USERS_COLLECTION, req.user.uid, userDoc);
      user = userDoc;
    }
    return sendSuccess(res, { data: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

// ── PUT /api/auth/profile ─────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const allowed = ['displayName', 'photoURL', 'profile'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    let user = await getDoc(USERS_COLLECTION, req.user.uid);
    if (!user) {
      logger.info(`[Auth] User document not found for ${req.user.uid} during update. Auto-creating.`);
      const userDoc = createUserModel({
        uid: req.user.uid,
        email: req.user.email || 'alex.johnson@eduverse.ai',
        displayName: req.user.displayName || 'Alex Johnson',
      });
      await createDoc(USERS_COLLECTION, req.user.uid, userDoc);
      user = userDoc;
    }

    // Merge nested profile fields if profile updates are sent
    if (updates.profile && user.profile) {
      updates.profile = {
        ...user.profile,
        ...updates.profile,
      };
    }

    const updated = await updateDoc(USERS_COLLECTION, req.user.uid, updates);
    return sendSuccess(res, { message: 'Profile updated', data: sanitizeUser(updated) });
  } catch (error) {
    next(error);
  }
};

module.exports = { signup, login, refreshToken, logout, getProfile, updateProfile };
