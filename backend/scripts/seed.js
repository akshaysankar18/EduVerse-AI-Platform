/**
 * EduVerse AI — Firestore Seed Script
 * =====================================
 * Generates complete demo data for one sample user across the active collections.
 *
 * Usage:
 *   node scripts/seed.js              → Writes to real Firestore (requires .env)
 *   node scripts/seed.js --dry-run    → Prints JSON to console only
 *
 * Seed user:
 *   uid   : demo-user-001
 *   name  : Alex Johnson
 *   email : alex.johnson@eduverse.ai
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const isDryRun = process.argv.includes('--dry-run');

// ── Demo data definitions ─────────────────────────────────────

const DEMO_UID   = 'demo-user-001';
const DEMO_EMAIL = 'alex.johnson@eduverse.ai';
const NOW        = new Date();

/** Subtract N days from a date and return ISO string. */
const daysAgo  = (n) => new Date(NOW - n * 864e5).toISOString();
/** Add N days to today and return ISO date string (YYYY-MM-DD). */
const daysFrom = (n) => new Date(NOW.getTime() + n * 864e5).toISOString().split('T')[0];

// ── User document ─────────────────────────────────────────────
const demoUser = {
  uid            : DEMO_UID,
  displayName    : 'Alex Johnson',
  email          : DEMO_EMAIL,
  photoURL       : 'https://api.dicebear.com/7.x/avataaars/svg?seed=AlexJohnson',
  role           : 'student',
  profile: {
    bio         : 'Passionate student learning full-stack web development.',
    institution : 'EduVerse Academy',
    major       : 'Computer Science',
    goal        : 'Become a full-stack developer and land a tech job',
    interests   : ['Web Development', 'AI', 'JavaScript'],
    learningStyle: 'visual',
  },
  stats: {
    xp           : 875,
    streak       : 14,
    totalSessions: 42,
    quizzesTaken : 5,
  },
  createdAt      : daysAgo(90),
  updatedAt      : daysAgo(0),
};

// ── Roadmaps (replaces study_plans) ───────────────────────────
const demoRoadmaps = [
  {
    id: 'roadmap-001',
    userId: DEMO_UID,
    title: 'JavaScript Mastery — 30 Days',
    goal: 'Become a full-stack developer and land a tech job',
    subject: 'JavaScript',
    level: 'intermediate',
    totalWeeks: 4,
    modules: [
      {
        id: 'mod-1',
        title: 'Phase 1: Advanced Async JS',
        description: 'Master Promises, async/await, Event Loop, and API integrations.',
        status: 'completed'
      },
      {
        id: 'mod-2',
        title: 'Phase 2: DOM & Event Handling',
        description: 'Understand capturing/bubbling, custom events, and performance optimization.',
        status: 'completed'
      },
      {
        id: 'mod-3',
        title: 'Phase 3: JavaScript Modules & Tooling',
        description: 'ES6 Modules, Webpack/Vite basics, and NPM packages.',
        status: 'in_progress'
      },
      {
        id: 'mod-4',
        title: 'Phase 4: Design Patterns & Best Practices',
        description: 'Learn closures, factory patterns, singleton pattern, and testing with Jest.',
        status: 'pending'
      }
    ],
    progress: 50,
    status: 'active',
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1)
  },
  {
    id: 'roadmap-002',
    userId: DEMO_UID,
    title: 'HTML & CSS Fundamentals',
    goal: 'Learn web design basics',
    subject: 'Web Development',
    level: 'beginner',
    totalWeeks: 2,
    modules: [
      {
        id: 'mod-1',
        title: 'Phase 1: Semantic HTML5',
        description: 'Learn SEO-friendly semantic tags, forms, and validation.',
        status: 'completed'
      },
      {
        id: 'mod-2',
        title: 'Phase 2: CSS Layouts',
        description: 'Master Flexbox, Grid, Responsive Web Design, and Media Queries.',
        status: 'completed'
      }
    ],
    progress: 100,
    status: 'completed',
    createdAt: daysAgo(60),
    updatedAt: daysAgo(15)
  }
];

// ── Tasks (replaces tasks, matches planners) ─────────────────
const demoTasks = [
  {
    id          : 'task-001',
    userId      : DEMO_UID,
    title       : 'Complete JavaScript Promises module',
    description : 'Study async/await patterns and promise chaining',
    subject     : 'JavaScript',
    dueDate     : daysFrom(2),
    priority    : 'high',
    status      : 'in_progress',
    estimatedHours : 2,
    tags        : ['async', 'javascript'],
    createdAt   : daysAgo(3),
    updatedAt   : daysAgo(1),
  },
  {
    id          : 'task-002',
    userId      : DEMO_UID,
    title       : 'Solve 5 LeetCode problems',
    description : 'Focus on arrays and hash maps — easy to medium difficulty',
    subject     : 'Computer Science',
    dueDate     : daysFrom(1),
    priority    : 'medium',
    status      : 'pending',
    estimatedHours : 3,
    tags        : ['dsa', 'leetcode'],
    createdAt   : daysAgo(1),
    updatedAt   : daysAgo(1),
  },
  {
    id          : 'task-003',
    userId      : DEMO_UID,
    title       : 'Build a todo app with React',
    description : 'Practice useState, useEffect, and component composition',
    subject     : 'React',
    dueDate     : daysFrom(5),
    priority    : 'high',
    status      : 'pending',
    estimatedHours : 4,
    tags        : ['frontend', 'react'],
    createdAt   : daysAgo(2),
    updatedAt   : daysAgo(2),
  },
  {
    id          : 'task-004',
    userId      : DEMO_UID,
    title       : 'Review HTML/CSS flexbox',
    description : 'Re-read MDN documentation on flexbox layout',
    subject     : 'Web Development',
    dueDate     : daysFrom(-3),
    priority    : 'low',
    status      : 'completed',
    estimatedHours : 1,
    tags        : ['css', 'flexbox'],
    createdAt   : daysAgo(10),
    updatedAt   : daysAgo(3),
  },
  {
    id          : 'task-005',
    userId      : DEMO_UID,
    title       : 'Watch Node.js REST API tutorial',
    description : 'Full YouTube series — part 1 to 4',
    subject     : 'Node.js',
    dueDate     : daysFrom(3),
    priority    : 'medium',
    status      : 'pending',
    estimatedHours : 2,
    tags        : ['backend', 'api'],
    createdAt   : daysAgo(1),
    updatedAt   : daysAgo(1),
  },
];

// ── Notes ─────────────────────────────────────────────────────
const demoNotes = [
  {
    id        : 'note-001',
    userId    : DEMO_UID,
    title     : 'JavaScript — Event Loop & Async',
    subject   : 'JavaScript',
    content   : `# JavaScript Event Loop\n\n## Key Concepts\n\n### Call Stack\nThe call stack is a data structure that tracks function calls...\n\n### Callback Queue\nAsynchronous callbacks are queued here after their operations complete.\n\n### Event Loop\nThe event loop continuously checks if the call stack is empty, then moves callbacks from the queue.\n\n## Async/Await\n\n\`\`\`js\nasync function fetchData() {\n  try {\n    const data = await fetch(\'/api/data\');\n    return data.json();\n  } catch (err) {\n    console.error(err);\n  }\n}\n\`\`\`\n\n## Summary\nUse async/await for cleaner asynchronous code. Always handle errors with try/catch.`,
    tags      : ['javascript', 'async', 'event-loop', 'promises'],
    sourceType: 'manual',
    fileURL   : '',
    createdAt : daysAgo(10),
    updatedAt : daysAgo(5),
  },
  {
    id        : 'note-002',
    userId    : DEMO_UID,
    title     : 'Big-O Notation — Quick Reference',
    subject   : 'Computer Science',
    content   : `# Big-O Notation\n\n| Notation | Name | Example |\n|---|---|---|\n| O(1) | Constant | Array index access |\n| O(log n) | Logarithmic | Binary search |\n| O(n) | Linear | Linear search |\n| O(n log n) | Linearithmic | Merge sort |\n| O(n²) | Quadratic | Bubble sort |\n| O(2ⁿ) | Exponential | Recursive Fibonacci |\n\n## Tips\n- Always aim for O(n log n) or better\n- Space complexity matters too\n- Amortized analysis for dynamic arrays`,
    tags      : ['algorithms', 'big-o', 'complexity', 'dsa'],
    sourceType: 'ai_generated',
    fileURL   : '',
    createdAt : daysAgo(15),
    updatedAt : daysAgo(8),
  },
  {
    id        : 'note-003',
    userId    : DEMO_UID,
    title     : 'React Hooks — useState & useEffect',
    subject   : 'React',
    content   : `# React Hooks\n\n## useState\n\`\`\`jsx\nconst [count, setCount] = useState(0);\n\`\`\`\n\n## useEffect\n\`\`\`jsx\nuseEffect(() => {\n  // runs after render\n  return () => { /* cleanup */ };\n}, [dependencies]);\n\`\`\`\n\n## Rules of Hooks\n1. Only call hooks at the top level\n2. Only call hooks from React functions`,
    tags      : ['react', 'hooks', 'useState', 'useEffect'],
    sourceType: 'manual',
    fileURL   : '',
    createdAt : daysAgo(5),
    updatedAt : daysAgo(2),
  },
];

// ── Quiz Attempts (replaces quizzes) ──────────────────────────
const demoQuizzes = [
  {
    id            : 'attempt-001',
    quizId        : 'quiz-legacy-001',
    userId        : DEMO_UID,
    subject       : 'JavaScript',
    topic         : 'Variables and Data Types',
    score         : 90, // percentage
    correctCount  : 9,
    totalQuestions: 10,
    timeTaken     : 340,
    difficulty    : 'easy',
    completedAt   : daysAgo(14),
    quizTitle     : 'JavaScript: Variables and Data Types Quiz',
  },
  {
    id            : 'attempt-002',
    quizId        : 'quiz-legacy-002',
    userId        : DEMO_UID,
    subject       : 'Computer Science',
    topic         : 'Arrays and Linked Lists',
    score         : 70, // percentage
    correctCount  : 7,
    totalQuestions: 10,
    timeTaken     : 520,
    difficulty    : 'medium',
    completedAt   : daysAgo(10),
    quizTitle     : 'Computer Science: Arrays and Linked Lists Quiz',
  },
  {
    id            : 'attempt-003',
    quizId        : 'quiz-legacy-003',
    userId        : DEMO_UID,
    subject       : 'JavaScript',
    topic         : 'Closures and Scope',
    score         : 80, // percentage
    correctCount  : 8,
    totalQuestions: 10,
    timeTaken     : 480,
    difficulty    : 'medium',
    completedAt   : daysAgo(7),
    quizTitle     : 'JavaScript: Closures and Scope Quiz',
  },
  {
    id            : 'attempt-004',
    quizId        : 'quiz-legacy-004',
    userId        : DEMO_UID,
    subject       : 'Computer Science',
    topic         : 'Sorting Algorithms',
    score         : 50, // percentage
    correctCount  : 5,
    totalQuestions: 10,
    timeTaken     : 620,
    difficulty    : 'hard',
    completedAt   : daysAgo(5),
    quizTitle     : 'Computer Science: Sorting Algorithms Quiz',
  },
  {
    id            : 'attempt-005',
    quizId        : 'quiz-legacy-005',
    userId        : DEMO_UID,
    subject       : 'React',
    topic         : 'Component Lifecycle',
    score         : 75, // percentage
    correctCount  : 6,
    totalQuestions: 8,
    timeTaken     : 390,
    difficulty    : 'medium',
    completedAt   : daysAgo(2),
    quizTitle     : 'React: Component Lifecycle Quiz',
  },
];

// ── Analytics ─────────────────────────────────────────────────
const demoAnalytics = {
  id               : DEMO_UID,
  userId           : DEMO_UID,
  totalStudyHours  : 87.5,
  weeklyHours      : 12.0,
  monthlyHours     : 42.0,
  studyStreak      : 14,
  completedTasks   : 8,
  completedQuizzes : 5,
  averageAccuracy  : 73.0,
  strongestSubject : 'JavaScript',
  weakestSubject   : 'Computer Science',
  subjectBreakdown : {
    JavaScript       : 85.0,
    'Computer Science': 60.0,
    React            : 75.0,
  },
  updatedAt: daysAgo(0),
};

// ── Chat history (replaces ai_chat_history) ───────────────────
const demoChatHistory = [
  {
    id       : 'chat-001',
    userId   : DEMO_UID,
    userMsg  : 'Can you explain JavaScript closures?',
    botMsg   : 'A closure is a function that retains access to its lexical scope even when executed outside that scope. Here\'s an example:\n\n```js\nfunction counter() {\n  let count = 0;\n  return () => ++count;\n}\nconst inc = counter();\ninc(); // 1\ninc(); // 2\n```\n\nThe inner arrow function "closes over" the `count` variable.',
    tokens   : 150,
    createdAt: daysAgo(7),
  },
  {
    id       : 'chat-002',
    userId   : DEMO_UID,
    userMsg  : 'What is O(n log n) and when does it appear?',
    botMsg   : 'O(n log n) — also called linearithmic complexity — appears in efficient sorting algorithms like Merge Sort and Quick Sort (average case). It means the algorithm does n operations, each taking log n time. For 1,000 items that\'s about 10,000 operations — much better than O(n²) = 1,000,000!',
    tokens   : 120,
    createdAt: daysAgo(10),
  },
];

// ── Seed function ─────────────────────────────────────────────

const allData = {
  users          : [demoUser],
  roadmaps       : demoRoadmaps,
  planners       : demoTasks,
  notes          : demoNotes,
  quizAttempts   : demoQuizzes,
  analytics      : [demoAnalytics],
  chatHistory    : demoChatHistory,
};

async function seed() {
  if (isDryRun) {
    console.log('\n🌱 EduVerse AI — Seed Data (DRY RUN)\n');
    console.log('━'.repeat(60));
    for (const [collection, docs] of Object.entries(allData)) {
      console.log(`\n📂 ${collection} (${docs.length} document${docs.length !== 1 ? 's' : ''})`);
      docs.forEach(doc => console.log(`   • ${doc.id || doc.uid} — ${doc.title || doc.subject || doc.name || doc.userMsg || ''}`));
    }
    console.log('\n━'.repeat(60));
    console.log('\n✅ Dry run complete. No data was written to Firestore.\n');
    console.log('   To seed real Firestore, run: node scripts/seed.js\n');
    return;
  }

  // Real Firestore write
  const { db } = require('../config/firebase');
  console.log('\n🌱 EduVerse AI — Seeding Firestore...\n');

  for (const [collection, docs] of Object.entries(allData)) {
    console.log(`Seeding ${collection}...`);
    const batch = db.batch();

    for (const doc of docs) {
      const docId = doc.id || doc.uid;
      const ref   = db.collection(collection).doc(docId);
      batch.set(ref, { ...doc, id: docId }, { merge: true });
    }

    await batch.commit();
    console.log(`  ✅ ${docs.length} document(s) written to ${collection}`);
  }

  console.log('\n🎉 Seed complete! EduVerse AI database is ready.\n');
  console.log(`Demo user: ${DEMO_EMAIL} (uid: ${DEMO_UID})\n`);
}

// ── Run ───────────────────────────────────────────────────────
seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
