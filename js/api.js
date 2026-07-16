/* ============================================================
   EDUVERSE AI — FRONTEND API SERVICE
   ============================================================ */

'use strict';

const API_BASE_URL =
  (window.location.hostname === '127.0.0.1' ||
   window.location.hostname === 'localhost' ||
   window.location.hostname === '')
    ? 'http://127.0.0.1:5000/api'
    : 'https://eduverse-ai-platform.onrender.com/api';

window.API_BASE_URL = API_BASE_URL;

/**
 * Centralized request helper for unified API calling.
 * Automatically injects auth headers, logs in dev mode, handles 401 redirects,
 * and normalizes error reporting.
 */
async function request(path, options = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path}`;
  const newOptions = { ...options };
  
  if (!newOptions.headers) {
    newOptions.headers = {};
  }
  
  // Set application/json headers by default for standard payloads
  if (newOptions.body && !(newOptions.body instanceof FormData)) {
    if (!newOptions.headers['Content-Type'] && !newOptions.headers['content-type']) {
      newOptions.headers['Content-Type'] = 'application/json';
    }
  }

  // Inject session details (Token-based and Dev-mode header fallbacks)
  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('userName');
  const token = localStorage.getItem('token');

  if (token) {
    newOptions.headers['Authorization'] = `Bearer ${token}`;
  }
  if (email) {
    newOptions.headers['X-User-Email'] = email;
  }
  if (name) {
    newOptions.headers['X-User-Name'] = name;
  }

  // Development Logging
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '';
  if (isDev) {
    console.groupCollapsed(`%c[API Request] ${newOptions.method || 'GET'} ${path}`, 'color: #7CFF4F; font-weight: bold;');
    console.log('Full URL:', url);
    console.log('Headers:', newOptions.headers);
    if (newOptions.body) {
      if (newOptions.body instanceof FormData) {
        console.log('Body Payload: [FormData]');
      } else {
        try {
          console.log('Body Payload:', JSON.parse(newOptions.body));
        } catch {
          console.log('Body Payload (raw):', newOptions.body);
        }
      }
    }
    console.groupEnd();
  }

  try {
    const response = await fetch(url, newOptions);

    if (isDev) {
      console.groupCollapsed(`%c[API Response] ${response.status} ${path}`, 'color: #3B82F6; font-weight: bold;');
      console.log('Status Text:', response.statusText);
      console.groupEnd();
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        if (typeof showToast === 'function') {
          showToast('Session expired. Please log in again.', 'error');
        }
        setTimeout(() => {
          window.location.replace('onboarding.html?mode=login');
        }, 1200);
        throw new Error('Unauthorized session. Redirecting to login.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[API Error] Request failed for ${path}:`, error.message);
    if (typeof showToast === 'function') {
      showToast(error.message || 'Connection failure. Please try again.', 'error');
    }
    throw error;
  }
}

// Backup window.fetch interceptor for legacy scripts/external components
const originalFetch = window.fetch;
window.fetch = function (url, options = {}) {
  if (typeof url === 'string' && url.includes('/api/')) {
    const email = localStorage.getItem('userEmail');
    const name = localStorage.getItem('userName');
    const token = localStorage.getItem('token');
    
    const newOptions = { ...options };
    if (!newOptions.headers) {
      newOptions.headers = {};
    }
    
    if (newOptions.headers instanceof Headers) {
      if (token) newOptions.headers.set('Authorization', `Bearer ${token}`);
      if (email) newOptions.headers.set('X-User-Email', email);
      if (name) newOptions.headers.set('X-User-Name', name);
    } else if (Array.isArray(newOptions.headers)) {
      if (token) newOptions.headers.push(['Authorization', `Bearer ${token}`]);
      if (email) newOptions.headers.push(['X-User-Email', email]);
      if (name) newOptions.headers.push(['X-User-Name', name]);
    } else {
      newOptions.headers = {
        ...newOptions.headers,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(email ? { 'X-User-Email': email } : {}),
        ...(name ? { 'X-User-Name': name } : {})
      };
    }
    return originalFetch(url, newOptions);
  }
  return originalFetch(url, options);
};

window.EduVerseAPI = {
  // ---- AI Mentor ----
  sendMentorMessage(message, history = [], context = '') {
    return request('/mentor/chat', {
      method: 'POST',
      body: JSON.stringify({ message, history, context }),
    });
  },

  getMentorHistory(limit = 20) {
    return request(`/mentor/history?limit=${limit}`);
  },

  // ---- Study Planner ----
  getTasks(status = '', priority = '') {
    let url = `/planner?limit=100`;
    if (status)   url += `&status=${status}`;
    if (priority) url += `&priority=${priority}`;
    return request(url);
  },

  createTask(taskData) {
    return request('/planner/create', {
      method: 'POST',
      body: JSON.stringify(taskData),
    });
  },

  updateTask(taskId, taskData) {
    return request(`/planner/update/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(taskData),
    });
  },

  deleteTask(taskId) {
    return request(`/planner/delete/${taskId}`, {
      method: 'DELETE',
    });
  },

  // ---- Notes Assistant ----
  getNotes(subject = '') {
    let url = `/notes?limit=100`;
    if (subject) url += `&subject=${subject}`;
    return request(url);
  },

  getNote(noteId) {
    return request(`/notes/${noteId}`);
  },

  generateNotes(topic, subject, level = 'intermediate') {
    return request('/notes/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, subject, level }),
    });
  },

  uploadNotes(formData) {
    return request('/notes/upload', {
      method: 'POST',
      body: formData,
    });
  },

  deleteNote(noteId) {
    return request(`/notes/${noteId}`, {
      method: 'DELETE',
    });
  },

  // ---- Quiz Center ----
  generateQuiz(topic, subject, difficulty = 'medium', numQuestions = 10) {
    return request('/quiz/generate', {
      method: 'POST',
      body: JSON.stringify({ topic, subject, difficulty, numQuestions }),
    });
  },

  submitQuiz(quizId, answers, timeTaken = 0) {
    return request('/quiz/submit', {
      method: 'POST',
      body: JSON.stringify({ quizId, answers, timeTaken }),
    });
  },

  getQuizzes(subject = '') {
    let url = `/quiz?limit=100`;
    if (subject) url += `&subject=${subject}`;
    return request(url);
  },

  getAttempts() {
    return request('/quiz/attempts');
  },

  getQuiz(quizId) {
    return request(`/quiz/${quizId}`);
  },

  // ---- Learning Roadmap ----
  createRoadmap(goal, subject, level = 'beginner', weeks = 4) {
    return request('/roadmap/create', {
      method: 'POST',
      body: JSON.stringify({ goal, subject, level, weeks }),
    });
  },

  getRoadmaps() {
    return request('/roadmap');
  },

  getRoadmap(roadmapId) {
    return request(`/roadmap/${roadmapId}`);
  },

  updateRoadmap(roadmapId, updates) {
    return request(`/roadmap/update/${roadmapId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  deleteRoadmap(roadmapId) {
    return request(`/roadmap/${roadmapId}`, {
      method: 'DELETE',
    });
  },

  // ---- Career Hub ----
  reviewResume(formData) {
    return request('/career/resume/review', {
      method: 'POST',
      body: formData,
    });
  },

  startInterview(role, level = 'mid', type = 'technical') {
    return request('/career/interview/start', {
      method: 'POST',
      body: JSON.stringify({ role, level, type }),
    });
  },

  getCareerHistory() {
    return request('/career/history');
  },

  // ---- Analytics & Dashboard ----
  getAnalytics() {
    return request('/analytics');
  },

  getProgress() {
    return request('/analytics/progress');
  },

  // ---- Auth Profile ----
  getProfile() {
    return request('/auth/profile');
  },

  updateProfile(profileData) {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    });
  },

  // ---- Note Interactivity Modules ----
  getFlashcards(noteId) {
    return request(`/notes/${noteId}/flashcards`, {
      method: 'POST',
    });
  },

  generateQuizFromNote(noteId, options = {}) {
    return request(`/notes/${noteId}/quiz`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  },

  generateMindmap(noteId) {
    return request(`/notes/${noteId}/mindmap`, {
      method: 'POST',
    });
  },

  askNoteQuestion(noteId, question) {
    return request(`/notes/${noteId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  },

  // ---- Learning Resources ----
  searchResources(query, type = 'all') {
    return request('/resources/search', {
      method: 'POST',
      body: JSON.stringify({ query, type }),
    });
  },

  getResourcesHistory() {
    return request('/resources/history');
  },

  // ---- Notifications ----
  getNotifications() {
    return request('/notifications');
  },

  markNotificationRead(id) {
    return request(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  },

  markAllNotificationsRead() {
    return request('/notifications/read-all', {
      method: 'PUT',
    });
  },

  // ---- Search ----
  searchAll(q) {
    return request(`/search?q=${encodeURIComponent(q)}`);
  },

  // ---- Recommendations ----
  getRecommendations() {
    return request('/personalization/recommendations');
  },
};
