/* ============================================================
   EDUVERSE AI — DYNAMIC ANALYTICS LOGIC
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const hoursContainer = document.getElementById('study-hours-chart-container');
  const radarContainer = document.getElementById('subject-performance-container');
  const streakGrid = document.getElementById('streak-heatmap-grid');
  const streakHeaderBadge = document.getElementById('streak-header-badge');
  const weakTopicsContainer = document.getElementById('weak-topics-container');

  // Stats Card Elements
  const statHours = document.getElementById('dashboard-stat-hours');
  const statStreak = document.getElementById('dashboard-stat-streak');
  const statGoals = document.getElementById('dashboard-stat-goals');
  const statAccuracy = document.getElementById('dashboard-stat-accuracy');

  async function loadAnalytics() {
    if (typeof window.EduVerseAPI === 'undefined') {
      console.warn('[Analytics] EduVerseAPI not found.');
      return;
    }

    try {
      // 1. Fetch general analytics summary, attempts, and tasks in parallel
      const [analyticsRes, attemptsRes, tasksRes] = await Promise.all([
        window.EduVerseAPI.getAnalytics(),
        window.EduVerseAPI.getAttempts(),
        window.EduVerseAPI.getTasks()
      ]);

      if (!analyticsRes || !analyticsRes.success || !analyticsRes.data) return;
      const data = analyticsRes.data;
      const attempts = (attemptsRes && attemptsRes.success) ? attemptsRes.data : [];
      const allTasks = (tasksRes && tasksRes.success) ? tasksRes.data : [];

      // 2. Populate standard cards
      // Study hours calculation: completed tasks estimated hours + quiz time taken
      let completedHours = 0;
      allTasks.forEach(t => {
        if (t.status === 'completed') {
          completedHours += parseFloat(t.estimatedHours) || 1.0;
        }
      });
      attempts.forEach(att => {
        completedHours += (att.timeTaken || 0) / 3600;
      });

      if (statHours) {
        statHours.textContent = completedHours > 0 ? `${completedHours.toFixed(1)} hrs` : '0 hrs';
      }

      const streak = data.user.streak || 0;
      if (statStreak) statStreak.textContent = streak > 0 ? `${streak} Days` : '0 Days';
      if (streakHeaderBadge) streakHeaderBadge.textContent = `🔥 ${streak} Days`;

      if (statGoals) {
        statGoals.textContent = data.tasks.completed > 0 ? `${data.tasks.completed} / ${data.tasks.total}` : 'No goals completed';
      }

      if (statAccuracy) {
        statAccuracy.textContent = data.quizzes.total > 0 ? `${data.quizzes.avgScore || 0}%` : 'No quizzes taken yet';
      }

      // Populate Detailed Activity Metrics
      const mStudyPlans = document.getElementById('metric-study-plans');
      if (mStudyPlans) mStudyPlans.textContent = data.roadmaps?.total || 0;

      const mCompletedTasks = document.getElementById('metric-completed-tasks');
      if (mCompletedTasks) mCompletedTasks.textContent = data.tasks?.completed || 0;

      const mNotesUploaded = document.getElementById('metric-notes-uploaded');
      if (mNotesUploaded) mNotesUploaded.textContent = data.notes?.total || 0;

      const mQuizzesTaken = document.getElementById('metric-quizzes-taken');
      if (mQuizzesTaken) mQuizzesTaken.textContent = data.quizzes?.total || 0;

      const mQuizScore = document.getElementById('metric-quiz-score');
      if (mQuizScore) mQuizScore.textContent = data.quizzes?.total > 0 ? `${data.quizzes?.avgScore || 0}%` : 'No quizzes taken yet';

      const mFlashcards = document.getElementById('metric-flashcards');
      if (mFlashcards) mFlashcards.textContent = data.notes?.flashcardsGenerated || 0;

      const mMindmaps = document.getElementById('metric-mindmaps');
      if (mMindmaps) mMindmaps.textContent = data.notes?.mindmapsGenerated || 0;

      const mResources = document.getElementById('metric-resources-searched');
      if (mResources) mResources.textContent = data.resources?.searched || 0;

      // 3. Render Daily Study Hours Chart (SVG)
      renderStudyHoursChart(attempts, allTasks);

      // 4. Render Subject Performance Radar (SVG)
      renderSubjectPerformanceRadar(attempts);

      // 5. Render Streak Heatmap
      renderStreakHeatmap(attempts, streak, allTasks);

      // 6. Render Weak Topics List
      renderWeakTopics(attempts);

    } catch (err) {
      console.error('[Analytics] Error loading analytics data:', err);
    }
  }

  // ── Render Study Hours Chart ──────────────────────────────────────
  function renderStudyHoursChart(attempts, allTasks) {
    if (!hoursContainer) return;

    const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    // Initialize default values to 0 if there is no real data yet
    let hours = [0, 0, 0, 0, 0, 0, 0];

    const dailyMap = {};
    const now = new Date();

    // Initialize last 7 days
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dayStr = d.toLocaleDateString(undefined, { weekday: 'short' });
      dailyMap[dayStr] = 0;
    }

    // 1. Add completed tasks hours
    allTasks.forEach(t => {
      if (t.status === 'completed' && t.completedAt) {
        const taskDate = new Date(t.completedAt);
        const diffTime = Math.abs(now - taskDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const dayStr = taskDate.toLocaleDateString(undefined, { weekday: 'short' });
          if (dayStr in dailyMap) {
            dailyMap[dayStr] += parseFloat(t.estimatedHours) || 1.0;
          }
        }
      }
    });

    // 2. Add quiz attempt hours (0.25h base + actual timeTaken)
    attempts.forEach(att => {
      const attDate = new Date(att.completedAt);
      const diffTime = Math.abs(now - attDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const dayStr = attDate.toLocaleDateString(undefined, { weekday: 'short' });
        if (dayStr in dailyMap) {
          dailyMap[dayStr] += 0.25 + (att.timeTaken || 0) / 3600;
        }
      }
    });

    // Map back to weekday order
    const hasRealData = Object.values(dailyMap).some(h => h > 0);
    if (!hasRealData) {
      hoursContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--muted);font-size:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:160px">
          <span style="font-size:28px">📅</span>
          <div style="color:#fff;font-weight:600;font-size:14px">No study hours logged this week</div>
          <div style="max-width:280px;margin:0 auto;color:var(--muted-light)">Complete your first study session, task, or quiz to see your daily progress chart.</div>
        </div>
      `;
      return;
    }

    hours = weekdays.map(day => {
      // If no activity, show a small 0.1h block instead of nothing
      return dailyMap[day] > 0 ? parseFloat(dailyMap[day].toFixed(1)) : 0.1;
    });

    const maxHours = Math.max(...hours, 4);

    // Generate SVG Bars
    const barsSvg = hours.map((h, idx) => {
      const barHeight = Math.round((h / maxHours) * 120);
      const x = 55 + idx * 50;
      const y = 130 - barHeight;
      const labelY = y - 5;
      const textX = x + 18;
      const textY = 165;

      return `
        <rect x="${x}" y="${y}" width="36" height="${barHeight}" rx="6" fill="url(#barGrad)" opacity="0.9"/>
        <text x="${textX}" y="${textY}" fill="#6B7280" font-size="10" text-anchor="middle">${weekdays[idx]}</text>
        <text x="${textX}" y="${labelY}" fill="#7CFF4F" font-size="10" text-anchor="middle">${h}h</text>
      `;
    }).join('');

    hoursContainer.innerHTML = `
      <svg viewBox="0 0 400 180" xmlns="http://www.w3.org/2000/svg" style="width:100%;overflow:visible">
        <defs>
          <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7CFF4F" stop-opacity="0.9"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.6"/>
          </linearGradient>
        </defs>
        <!-- Grid lines -->
        <line x1="40" y1="10" x2="400" y2="10" stroke="#1E1E1E" stroke-width="1"/>
        <line x1="40" y1="50" x2="400" y2="50" stroke="#1E1E1E" stroke-width="1"/>
        <line x1="40" y1="90" x2="400" y2="90" stroke="#1E1E1E" stroke-width="1"/>
        <line x1="40" y1="130" x2="400" y2="130" stroke="#1E1E1E" stroke-width="1"/>
        <!-- Y labels -->
        <text x="30" y="14" fill="#6B7280" font-size="10" text-anchor="end">${maxHours.toFixed(0)}h</text>
        <text x="30" y="54" fill="#6B7280" font-size="10" text-anchor="end">${(maxHours * 0.7).toFixed(0)}h</text>
        <text x="30" y="94" fill="#6B7280" font-size="10" text-anchor="end">${(maxHours * 0.4).toFixed(0)}h</text>
        <text x="30" y="134" fill="#6B7280" font-size="10" text-anchor="end">0h</text>
        <!-- Dynamic Bars -->
        ${barsSvg}
      </svg>
    `;
  }

  // ── Render Subject Performance Radar ──────────────────────────────
  function renderSubjectPerformanceRadar(attempts) {
    if (!radarContainer) return;

    if (attempts.length === 0) {
      radarContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--muted);font-size:13px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;min-height:160px">
          <span style="font-size:28px">⚡</span>
          <div style="color:#fff;font-weight:600;font-size:14px">No quiz attempts yet</div>
          <div style="max-width:280px;margin:0 auto;color:var(--muted-light)">Take a quiz in the Quiz Center to visualize your subject performance.</div>
          <a href="quiz-center.html" class="btn btn-primary btn-sm" style="margin-top:8px"><span>Take a Quiz</span></a>
        </div>
      `;
      return;
    }

    // Subjects and default baseline accuracies (initialize to 0 if no attempts exist)
    const subjects = ['Mathematics', 'Computer Science', 'Chemistry', 'Physics', 'English'];
    const shortNames = ['Maths', 'CS', 'Chem', 'Physics', 'Eng'];
    let scores = [0, 0, 0, 0, 0];

    if (true) {
      const subjectSums = {};
      const subjectCounts = {};

      attempts.forEach(att => {
        if (att.subject) {
          const matchedSub = subjects.find(s => s.toLowerCase().startsWith(att.subject.toLowerCase()) || att.subject.toLowerCase().startsWith(s.toLowerCase()));
          const subKey = matchedSub || att.subject;
          subjectSums[subKey] = (subjectSums[subKey] || 0) + att.score;
          subjectCounts[subKey] = (subjectCounts[subKey] || 0) + 1;
        }
      });

      // Update if user has active scores
      const hasRealScores = Object.keys(subjectSums).length > 0;
      if (hasRealScores) {
        scores = subjects.map((sub, idx) => {
          if (sub in subjectSums) {
            return Math.round(subjectSums[sub] / subjectCounts[sub]);
          }
          return scores[idx]; // fallback to default if not taken yet
        });
      }
    }

    // Radar coordinate math (Center: 150, 120; Max Radius: 80)
    const points = [];
    const circlesSvg = [80, 60, 40, 20].map(r => `
      <circle cx="150" cy="120" r="${r}" fill="none" stroke="#1E1E1E" stroke-width="1"/>
    `).join('');

    const linesSvg = [];
    const labelsSvg = [];
    const markersSvg = [];

    subjects.forEach((sub, idx) => {
      // Angle: index * 72 degrees (converted to radians, start straight up at -90 deg)
      const angle = (-90 + idx * 72) * Math.PI / 180;
      const score = scores[idx];
      const r = 80 * (score / 100);

      // Radar coordinates
      const x = 150 + r * Math.cos(angle);
      const y = 120 + r * Math.sin(angle);
      points.push(`${x},${y}`);

      // Axis lines
      const axisX = 150 + 80 * Math.cos(angle);
      const axisY = 120 + 80 * Math.sin(angle);
      linesSvg.push(`<line x1="150" y1="120" x2="${axisX}" y2="${axisY}" stroke="#1E1E1E" stroke-width="1"/>`);

      // Markers
      markersSvg.push(`<circle cx="${x}" cy="${y}" r="4" fill="#7CFF4F"/>`);

      // Label positioning offsets
      let textAnchor = 'middle';
      let labelX = axisX;
      let labelY = axisY;

      if (idx === 0) { labelY -= 10; } // Top
      else if (idx === 1) { textAnchor = 'start'; labelX += 8; labelY += 2; } // Right
      else if (idx === 2) { textAnchor = 'middle'; labelY += 16; } // Bottom right
      else if (idx === 3) { textAnchor = 'middle'; labelY += 16; } // Bottom left
      else if (idx === 4) { textAnchor = 'end'; labelX -= 8; labelY += 2; } // Left

      labelsSvg.push(`
        <text x="${labelX}" y="${labelY}" text-anchor="${textAnchor}" fill="#9CA3AF" font-size="11">
          ${shortNames[idx]} ${score}%
        </text>
      `);
    });

    radarContainer.innerHTML = `
      <svg viewBox="0 0 300 250" xmlns="http://www.w3.org/2000/svg" style="width:100%">
        <defs>
          <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#7CFF4F" stop-opacity="0.3"/>
            <stop offset="100%" stop-color="#10B981" stop-opacity="0.1"/>
          </linearGradient>
        </defs>
        ${circlesSvg}
        ${linesSvg.join('')}
        <polygon points="${points.join(' ')}" fill="url(#radarFill)" stroke="#7CFF4F" stroke-width="2"/>
        ${markersSvg.join('')}
        ${labelsSvg.join('')}
      </svg>
    `;
  }

  // ── Render Streak Heatmap ──────────────────────────────────────────
  function renderStreakHeatmap(attempts, streak, allTasks) {
    if (!streakGrid) return;

    // Render a 28-day grid (4 weeks)
    const totalCells = 28;
    const now = new Date();
    const dates = [];

    // Prepopulate cells mapping last 28 days
    for (let i = totalCells - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dates.push({
        date: d,
        attemptsCount: 0,
        formatted: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', weekday: 'short' })
      });
    }

    // Populate with real attempt counts
    attempts.forEach(att => {
      const attDate = new Date(att.completedAt).toDateString();
      const cell = dates.find(d => d.date.toDateString() === attDate);
      if (cell) {
        cell.attemptsCount++;
      }
    });

    // Populate with completed tasks count
    if (allTasks && allTasks.length > 0) {
      allTasks.forEach(t => {
        if (t.status === 'completed' && t.completedAt) {
          const taskDate = new Date(t.completedAt).toDateString();
          const cell = dates.find(d => d.date.toDateString() === taskDate);
          if (cell) {
            cell.attemptsCount++;
          }
        }
      });
    }

    // Generate grid HTML
    streakGrid.innerHTML = dates.map(cell => {
      let level = '';
      if (cell.attemptsCount > 3) level = 'level-4';
      else if (cell.attemptsCount === 3) level = 'level-3';
      else if (cell.attemptsCount === 2) level = 'level-2';
      else if (cell.attemptsCount === 1) level = 'level-1';

      return `
        <div class="streak-cell ${level}" data-tooltip="${cell.formatted}: ${cell.attemptsCount} activities"></div>
      `;
    }).join('');
  }

  // ── Render Weak Topics ─────────────────────────────────────────────
  function renderWeakTopics(attempts) {
    if (!weakTopicsContainer) return;

    // Default mock data to guarantee visual excellence on start
    const defaultWeakTopics = [
      { topic: 'Organic Chemistry Reactions', accuracy: 58, count: 3, subject: 'Chemistry' },
      { topic: 'Probability & Statistics', accuracy: 64, count: 5, subject: 'Mathematics' },
      { topic: 'Thermodynamics: Entropy', accuracy: 67, count: 4, subject: 'Chemistry' }
    ];

    if (attempts.length === 0) {
      weakTopicsContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);color:var(--muted)">
          <div style="font-size:24px;margin-bottom:8px">🎯</div>
          <div style="font-weight:600;color:#fff;margin-bottom:4px">No weak topics analyzed</div>
          <div style="font-size:12px">Attempt quizzes in the Quiz Center to populate your weak areas analysis.</div>
          <a href="quiz-center.html" class="btn btn-primary btn-sm" style="display:inline-flex;margin-top:12px"><span>Go to Quiz Center</span></a>
        </div>
      `;
      return;
    }

    // Group attempts by topic
    const topicStats = {};
    attempts.forEach(att => {
      if (att.topic) {
        if (!(att.topic in topicStats)) {
          topicStats[att.topic] = { totalScore: 0, count: 0, subject: att.subject || 'General' };
        }
        topicStats[att.topic].totalScore += att.score;
        topicStats[att.topic].count++;
      }
    });

    const parsedTopics = Object.keys(topicStats).map(topic => {
      const stats = topicStats[topic];
      return {
        topic,
        accuracy: Math.round(stats.totalScore / stats.count),
        count: stats.count,
        subject: stats.subject
      };
    });

    // Filter topics with accuracy < 75%
    const weakTopics = parsedTopics
      .filter(t => t.accuracy < 75)
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 3);

    if (weakTopics.length === 0) {
      // If user is doing awesome, celebrate!
      weakTopicsContainer.innerHTML = `
        <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">
          🎉 All subjects are in excellent standing (above 75% accuracy)! Keep up the great work!
        </div>
      `;
    } else {
      renderWeakTopicsHtml(weakTopics);
    }
  }

  function renderWeakTopicsHtml(topics) {
    weakTopicsContainer.innerHTML = topics.map(t => {
      let grad = 'linear-gradient(90deg, #EF4444, #F59E0B)';
      if (t.accuracy >= 65) grad = 'linear-gradient(90deg, #F59E0B, var(--primary))';
      else if (t.accuracy >= 70) grad = 'var(--primary)';

      return `
        <div style="padding:12px;background:rgba(239,68,68,0.02);border:1px solid var(--border);border-radius:var(--radius)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
            <div style="font-size:13px;font-weight:700">${t.topic}</div>
            <div class="badge badge-gray" style="font-size:11px">${t.accuracy}%</div>
          </div>
          <div class="progress-bar">
            <div class="perf-bar-fill" style="height:100%;width:${t.accuracy}%;background:${grad};border-radius:var(--radius-full)"></div>
          </div>
          <div style="font-size:12px;color:var(--muted-light);margin-top:6px">${t.count} quizzes · Avg ${t.accuracy}% accuracy</div>
        </div>
      `;
    }).join('') + `
      <a href="quiz-center.html" class="btn btn-primary btn-sm w-full" style="justify-content:center;margin-top:8px">
        <span>Practice Weak Topics</span>
      </a>
    `;
  }

  loadAnalytics();
});
