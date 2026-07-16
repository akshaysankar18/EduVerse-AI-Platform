/**
 * User Model
 * ===========
 * Defines the Firestore document shape for a user.
 * Collection: "users"
 */

/**
 * @typedef {object} UserModel
 * @property {string}   uid            - Firebase UID (doc ID)
 * @property {string}   email
 * @property {string}   displayName
 * @property {string}   photoURL
 * @property {string}   role           - 'student' | 'teacher' | 'admin'
 * @property {object}   profile
 * @property {string}   profile.bio
 * @property {string}   profile.institution
 * @property {string}   profile.major
 * @property {string}   profile.goal
 * @property {string[]} profile.interests
 * @property {string}   profile.learningStyle
 * @property {object}   stats
 * @property {number}   stats.xp
 * @property {number}   stats.streak
 * @property {number}   stats.totalSessions
 * @property {number}   stats.quizzesTaken
 * @property {string}   createdAt      - ISO timestamp
 * @property {string}   updatedAt      - ISO timestamp
 */

/**
 * Create a new user document payload.
 * @param {Partial<UserModel>} data
 * @returns {UserModel}
 */
const createUserModel = (data = {}) => ({
  uid        : data.uid         || '',
  email      : data.email       || '',
  displayName: data.displayName || '',
  photoURL   : data.photoURL    || '',
  role       : data.role        || 'student',
  profile: {
    bio         : data.profile?.bio          || '',
    institution : data.profile?.institution  || '',
    major       : data.profile?.major        || '',
    goal        : data.profile?.goal         || '',
    interests   : data.profile?.interests    || [],
    learningStyle: data.profile?.learningStyle || '',
  },
  stats: {
    xp           : 0,
    streak       : 0,
    totalSessions: 0,
    quizzesTaken : 0,
  },
  createdAt: data.createdAt || new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

/** Fields safe to expose to the client (exclude sensitive data) */
const sanitizeUser = (user) => {
  const { uid, email, displayName, photoURL, role, profile, stats, createdAt } = user;
  return { uid, email, displayName, photoURL, role, profile, stats, createdAt };
};

const USERS_COLLECTION = 'users';

module.exports = { createUserModel, sanitizeUser, USERS_COLLECTION };
