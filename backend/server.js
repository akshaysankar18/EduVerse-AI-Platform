/**
 * EduVerse AI Backend — Main Server Entry Point
 * =============================================
 * Express app setup, middleware registration, route mounting,
 * and server startup.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const logger = console;
const loggerMiddleware = require('./middleware/logger.middleware');
const errorMiddleware = require('./middleware/error.middleware');

// ── Routes ──────────────────────────────────────────────────
const authRoutes = require('./routes/auth.routes');
const mentorRoutes = require('./routes/mentor.routes');
const plannerRoutes = require('./routes/planner.routes');
const notesRoutes = require('./routes/notes.routes');
const quizRoutes = require('./routes/quiz.routes');
const roadmapRoutes = require('./routes/roadmap.routes');
const analyticsRoutes = require('./routes/analytics.routes');
const careerRoutes = require('./routes/career.routes');
const resourcesRoutes = require('./routes/resources.routes');
const notificationRoutes = require('./routes/notification.routes');
const searchRoutes = require('./routes/search.routes');
const personalizationRoutes = require('./routes/personalization.routes');

// ── App Init ─────────────────────────────────────────────────
const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

// ── Security Middleware ───────────────────────────────────────
app.use(helmet());

// CORS
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g., mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    // In development mode, allow localhost, 127.0.0.1, and null (file:///)
    const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
    if (isDev) {
      if (
        origin === 'null' ||
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1')
      ) {
        return callback(null, true);
      }
    }

    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS policy: Origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Email', 'X-User-Name'],
}));

// Rate Limiting
const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
if (!isDev) {
  const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 min
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.',
    },
  });
  app.use('/api/', limiter);
}

// ── General Middleware ────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(loggerMiddleware);

// ── Health Check ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'EduVerse AI API is running 🚀',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV,
  });
});

// ── API Routes ────────────────────────────────────────────────

app.use('/api/auth', authRoutes);
app.use('/api/mentor', mentorRoutes);
app.use('/api/planner', plannerRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/career', careerRoutes);
app.use('/api/resources', resourcesRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/personalization', personalizationRoutes);

// ── 404 Handler ───────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorMiddleware);

// ── Start Server ─────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log("SERVER STARTED");
  console.log(`http://localhost:${PORT}/health`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use.`);
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please terminate the process holding this port or use a different PORT.`);
  } else {
    console.error('❌ Server error:', err);
  }
  process.exit(1);
});