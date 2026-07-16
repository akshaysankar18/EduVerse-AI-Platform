# EduVerse AI — Backend API

> Scalable **Node.js + Express** REST API powering the EduVerse AI educational platform.  
> Integrates **Firebase** (Auth / Firestore / Storage) and **Google Gemini AI**.

---

## 🏗️ Project Structure

```
backend/
├── server.js               # Entry point
├── package.json
├── .env.example            # Environment variable template
│
├── config/
│   ├── firebase.js         # Firebase Admin SDK init
│   └── gemini.js           # Gemini AI client init
│
├── middleware/
│   ├── auth.middleware.js  # JWT verification & RBAC
│   ├── error.middleware.js # Global error handler
│   ├── upload.middleware.js# Multer file upload
│   └── logger.middleware.js# Morgan HTTP logging
│
├── routes/                 # Express routers (thin layer)
├── controllers/            # Business logic per feature
├── services/               # Firebase, Gemini, Storage helpers
├── models/                 # Firestore document shapes
└── utils/                  # Logger, response helpers, validators
```

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your actual Firebase & Gemini credentials
```

### 3. Run in development mode
```bash
npm run dev
```

### 4. Run in production
```bash
npm start
```

Server starts at **http://localhost:5000**  
Health check: **http://localhost:5000/health**

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `JWT_SECRET` | Secret for signing access tokens |
| `JWT_EXPIRES_IN` | Access token expiry (e.g. `7d`) |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens |
| `FIREBASE_PROJECT_ID` | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Service account email |
| `FIREBASE_PRIVATE_KEY` | Service account private key |
| `FIREBASE_STORAGE_BUCKET` | Cloud Storage bucket |
| `GEMINI_API_KEY` | Google Gemini API key |
| `GEMINI_MODEL` | Gemini model name (default: `gemini-1.5-flash`) |
| `CORS_ORIGIN` | Comma-separated allowed origins |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Register new user |
| POST | `/api/auth/login` | Public | Login with Firebase ID token |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| POST | `/api/auth/logout` | 🔒 JWT | Logout |
| GET | `/api/auth/profile` | 🔒 JWT | Get user profile |
| PUT | `/api/auth/profile` | 🔒 JWT | Update user profile |

### AI Mentor
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/mentor/chat` | 🔒 JWT | Chat with AI mentor |
| POST | `/api/mentor/upload-pdf` | 🔒 JWT | Upload & analyse PDF |
| POST | `/api/mentor/upload-image` | 🔒 JWT | Upload & analyse image |
| GET | `/api/mentor/history` | 🔒 JWT | Get chat history |

### Study Planner
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/planner/create` | 🔒 JWT | Create a task |
| GET | `/api/planner` | 🔒 JWT | List tasks (filterable) |
| GET | `/api/planner/:id` | 🔒 JWT | Get single task |
| PUT | `/api/planner/update/:id` | 🔒 JWT | Update task |
| DELETE | `/api/planner/delete/:id` | 🔒 JWT | Delete task |

### Notes Assistant
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/notes/generate` | 🔒 JWT | Generate AI notes |
| POST | `/api/notes/upload` | 🔒 JWT | Upload & summarise file |
| GET | `/api/notes` | 🔒 JWT | List notes |
| GET | `/api/notes/:id` | 🔒 JWT | Get single note |
| DELETE | `/api/notes/:id` | 🔒 JWT | Delete note |

### Quiz Center
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/quiz/generate` | 🔒 JWT | Generate AI quiz |
| POST | `/api/quiz/submit` | 🔒 JWT | Submit & grade quiz |
| GET | `/api/quiz` | 🔒 JWT | List quizzes |
| GET | `/api/quiz/attempts` | 🔒 JWT | Get attempt history |

### Learning Roadmap
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/roadmap/create` | 🔒 JWT | Generate AI roadmap |
| GET | `/api/roadmap` | 🔒 JWT | List roadmaps |
| GET | `/api/roadmap/:id` | 🔒 JWT | Get single roadmap |
| PUT | `/api/roadmap/update/:id` | 🔒 JWT | Update roadmap |
| DELETE | `/api/roadmap/:id` | 🔒 JWT | Delete roadmap |

### Career Hub
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/career/resume/review` | 🔒 JWT | AI resume review |
| POST | `/api/career/interview/start` | 🔒 JWT | Generate interview questions |
| GET | `/api/career/history` | 🔒 JWT | Get career activity |

### Analytics
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/analytics` | 🔒 JWT | Full analytics dashboard data |
| GET | `/api/analytics/progress` | 🔒 JWT | Roadmap & quiz progress |

---

## 🔐 Authentication Flow

```
Client                      Backend                     Firebase
  │                            │                            │
  │── signup(email, pw) ──────▶│── createUser ─────────────▶│
  │                            │◀─ uid ─────────────────────│
  │◀── { accessToken, ─────────│                            │
  │      refreshToken }        │                            │
  │                            │                            │
  │── login(firebaseToken) ───▶│── verifyIdToken ──────────▶│
  │                            │◀─ decoded uid ─────────────│
  │◀── { accessToken, ─────────│                            │
  │      refreshToken }        │                            │
  │                            │                            │
  │── GET /protected ─────────▶│                            │
  │   Authorization: Bearer .. │── jwt.verify() ────────────│
  │◀── 200 OK ─────────────────│                            │
```

---

## 🧩 Firestore Collections

| Collection | Description |
|---|---|
| `users` | User profiles and stats |
| `planners` | Study planner tasks |
| `notes` | AI-generated and uploaded notes |
| `quizzes` | Generated quizzes |
| `quizAttempts` | Quiz submission records |
| `roadmaps` | Learning roadmaps |
| `chatHistory` | AI mentor conversations |
| `careerActivity` | Resume reviews & interview sessions |

---

## 🛡️ Security Features

- **Helmet** — HTTP security headers
- **CORS** — Origin whitelist from env var
- **Rate Limiting** — 100 req / 15 min per IP
- **JWT** — Short-lived access tokens + refresh tokens
- **Multer** — MIME-type whitelisting and file size limits
- **Input Validation** — express-validator on all mutation endpoints
- **RBAC** — Role-based access control middleware

---

## 📦 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js ≥ 18 |
| Framework | Express 4 |
| Auth | Firebase Auth + JWT (jsonwebtoken) |
| Database | Cloud Firestore |
| Storage | Firebase Cloud Storage |
| AI | Google Gemini 1.5 Flash |
| Logging | Winston + Morgan |
| Validation | express-validator |
| File Uploads | Multer |
| Security | Helmet, CORS, express-rate-limit |
