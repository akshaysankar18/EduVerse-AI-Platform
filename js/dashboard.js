/* ============================================
   EDUVERSE AI — DASHBOARD JAVASCRIPT
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ---- AI Mentor Chat ----
  const chatInput   = document.getElementById('chat-input');
  const chatSendBtn = document.getElementById('chat-send');
  const chatMessages = document.getElementById('chat-messages');
  const chatWelcome = document.getElementById('chat-welcome');

  // In-memory chat history (array of { role, text }) for Gemini API context
  let chatHistory = [];

  // Load chat history from backend on page load
  async function loadChatHistory() {
    if (!chatMessages) return;
    if (typeof window.EduVerseAPI === 'undefined') {
      console.warn('[API] EduVerseAPI not found. Chat history loading bypassed.');
      return;
    }

    try {
      const res = await window.EduVerseAPI.getMentorHistory();
      if (res && res.success && res.data && res.data.length > 0) {
        if (chatWelcome) chatWelcome.style.display = 'none';

        // Clear existing static messages (if any)
        chatMessages.innerHTML = '';

        // API history is in descending order (newest first). Reverse it for chronological rendering.
        const sortedHistory = [...res.data].reverse();

        sortedHistory.forEach(exchange => {
          appendMessage(exchange.userMsg, 'user', exchange.createdAt);
          appendMessage(exchange.botMsg, 'ai', exchange.createdAt);
          
          // Populate the history array for subsequent chat turns
          chatHistory.push({ role: 'user', text: exchange.userMsg });
          chatHistory.push({ role: 'assistant', text: exchange.botMsg });
        });

        // Populate left-panel chat history list dynamically!
        const historyList = document.querySelector('.chat-history-list');
        if (historyList) {
          historyList.innerHTML = '';
          const todayStr = new Date().toDateString();
          const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
          
          const groups = { today: [], yesterday: [], older: [] };
          res.data.forEach(exchange => {
            const date = new Date(exchange.createdAt);
            const dateStr = date.toDateString();
            if (dateStr === todayStr) {
              groups.today.push(exchange);
            } else if (dateStr === yesterdayStr) {
              groups.yesterday.push(exchange);
            } else {
              groups.older.push(exchange);
            }
          });

          let html = '';
          if (groups.today.length > 0) {
            html += '<div class="chat-date-label">Today</div>';
            groups.today.forEach(item => {
              html += `<div class="chat-history-item" data-id="${item.id}">${escapeHTML(item.userMsg.slice(0, 32))}${item.userMsg.length > 32 ? '...' : ''}</div>`;
            });
          }
          if (groups.yesterday.length > 0) {
            html += '<div class="chat-date-label">Yesterday</div>';
            groups.yesterday.forEach(item => {
              html += `<div class="chat-history-item" data-id="${item.id}">${escapeHTML(item.userMsg.slice(0, 32))}${item.userMsg.length > 32 ? '...' : ''}</div>`;
            });
          }
          if (groups.older.length > 0) {
            html += '<div class="chat-date-label">Older</div>';
            groups.older.forEach(item => {
              html += `<div class="chat-history-item" data-id="${item.id}">${escapeHTML(item.userMsg.slice(0, 32))}${item.userMsg.length > 32 ? '...' : ''}</div>`;
            });
          }
          
          if (!html) {
            html = '<div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">No chat history yet.</div>';
          }
          historyList.innerHTML = html;

          // Wire click handlers on history items
          historyList.querySelectorAll('.chat-history-item').forEach(item => {
            item.addEventListener('click', function() {
              const exchangeId = this.dataset.id;
              const found = res.data.find(h => h.id === exchangeId);
              if (found) {
                historyList.querySelectorAll('.chat-history-item').forEach(el => el.classList.remove('active'));
                this.classList.add('active');
                
                chatMessages.innerHTML = '';
                if (chatWelcome) chatWelcome.style.display = 'none';
                appendMessage(found.userMsg, 'user', found.createdAt);
                appendMessage(found.botMsg, 'ai', found.createdAt);
                
                // Set context array to this conversation exchange
                chatHistory = [
                  { role: 'user', text: found.userMsg },
                  { role: 'assistant', text: found.botMsg }
                ];
              }
            });
          });
        }
      }
    } catch (error) {
      console.error('[API] Failed to load chat history:', error);
      showToast('Could not load chat history. Using fresh session.', 'error');
    }
  }

  // ---- AI Mentor New Chat Action ----
  const newChatBtns = document.querySelectorAll('[data-tooltip="New Chat"], .chat-history-header button');
  newChatBtns.forEach(btn => {
    btn.removeAttribute('onclick'); // remove inline location.reload()
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      chatHistory = [];
      if (chatMessages) {
        chatMessages.innerHTML = '';
        if (chatWelcome) {
          chatWelcome.style.display = 'block';
          chatMessages.appendChild(chatWelcome);
        }
      }
      const historyList = document.querySelector('.chat-history-list');
      if (historyList) {
        historyList.querySelectorAll('.chat-history-item').forEach(el => el.classList.remove('active'));
      }
      showToast('New chat session started', 'success');
    });
  });

  // Load immediately on page startup
  loadChatHistory().then(() => {
    const pendingPrompt = localStorage.getItem('pending_mentor_prompt');
    if (pendingPrompt && chatInput) {
      localStorage.removeItem('pending_mentor_prompt');
      chatInput.value = pendingPrompt;
      sendMessage();
    }
  });

  let isChatSending = false;
  async function sendMessage() {
    if (isChatSending) return;
    if (!chatInput) return;
    const text = chatInput.value.trim();
    if (!text) return;

    isChatSending = true;
    if (chatSendBtn) {
      chatSendBtn.disabled = true;
      chatSendBtn.style.opacity = '0.5';
    }
    chatInput.disabled = true;

    if (chatWelcome) chatWelcome.style.display = 'none';

    // 1. Add user bubble to chat area
    appendMessage(text, 'user');
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // 2. Add loading typing indicator
    const typingId = showTyping();

    try {
      if (typeof window.EduVerseAPI === 'undefined') {
        throw new Error('EduVerseAPI service is not loaded.');
      }

      // 3. Post to the backend
      const res = await window.EduVerseAPI.sendMentorMessage(text, chatHistory);
      removeTyping(typingId);

      if (res && res.success && res.data) {
        const replyText = res.data.reply;
        
        // 4. Render AI bubble response
        appendMessage(replyText, 'ai');

        // 5. Save the exchange into our local context
        chatHistory.push({ role: 'user', text: text });
        chatHistory.push({ role: 'assistant', text: replyText });
      } else {
        throw new Error(res.message || 'Malformed API response');
      }
    } catch (error) {
      removeTyping(typingId);
      console.error('[Chat] sendMessage failed:', error);
      
      // Handle network errors gracefully in UI
      showToast('Error communicating with AI Mentor', 'error');
      appendMessage('⚠️ Sorry, I had trouble connecting to my servers. Please check that the backend is running and try again.', 'ai');
    } finally {
      isChatSending = false;
      if (chatSendBtn) {
        chatSendBtn.disabled = false;
        chatSendBtn.style.opacity = '';
      }
      chatInput.disabled = false;
      chatInput.focus();
    }
  }

  function appendMessage(text, role, timestamp = null) {
    if (!chatMessages) return;
    
    // Guard against null/undefined text
    const safeText = text || '';
    
    let timeStr;
    if (timestamp) {
      timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    const div = document.createElement('div');
    div.className = `message ${role}`;
    
    // Convert basic markdown asterisks to HTML tags and handle newlines
    const formattedText = typeof window.cleanLatexAndMarkdown === 'function'
      ? window.cleanLatexAndMarkdown(safeText)
      : safeText
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/\n/g, '<br>');

    div.innerHTML = `
      <div class="message-avatar ${role}">${role === 'ai' ? '✦' : 'A'}</div>
      <div>
        <div class="message-bubble ${role}">${formattedText}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  function showTyping() {
    if (!chatMessages) return null;
    const id = 'typing-' + Date.now();
    const div = document.createElement('div');
    div.className = 'message ai';
    div.id = id;
    div.innerHTML = `
      <div class="message-avatar ai">✦</div>
      <div class="message-bubble ai" style="display:flex;gap:5px;align-items:center;padding:14px 18px;">
        <span style="width:7px;height:7px;border-radius:50%;background:var(--muted);animation:blink 1.2s ease 0s infinite"></span>
        <span style="width:7px;height:7px;border-radius:50%;background:var(--muted);animation:blink 1.2s ease 0.2s infinite"></span>
        <span style="width:7px;height:7px;border-radius:50%;background:var(--muted);animation:blink 1.2s ease 0.4s infinite"></span>
      </div>
    `;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
  }

  function removeTyping(id) {
    if (!id) return;
    const el = document.getElementById(id);
    if (el) el.remove();
  }

  if (chatSendBtn) chatSendBtn.addEventListener('click', sendMessage);
  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }

  // ---- Prompt chips ----
  document.querySelectorAll('.prompt-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chatInput) {
        chatInput.value = chip.querySelector('.prompt-chip-text')?.textContent || chip.textContent.trim();
        chatInput.focus();
        sendMessage();
      }
    });
  });

  // ---- Quiz logic ----
  const quizOptions = document.querySelectorAll('.quiz-option');
  let selectedOption = null;

  if (!window.location.pathname.includes('quiz-center')) {
    quizOptions.forEach(opt => {
    opt.addEventListener('click', function() {
      if (selectedOption !== null) return;
      selectedOption = this;
      const isCorrect = this.dataset.correct === 'true';

      quizOptions.forEach(o => o.style.pointerEvents = 'none');

      if (isCorrect) {
        this.classList.add('correct');
        showToast('Correct! Well done! 🎉', 'success');
      } else {
        this.classList.add('wrong');
        quizOptions.forEach(o => { if (o.dataset.correct === 'true') o.classList.add('correct'); });
        showToast('Not quite. Check the correct answer above.', 'error');
      }

      const explanation = document.getElementById('quiz-explanation');
      if (explanation) {
        explanation.style.display = 'block';
        explanation.style.animation = 'fadeInUp 0.4s ease';
      }
    });
  });
}

  // ---- File upload zone ----
  const uploadZone = document.getElementById('upload-zone');
  if (uploadZone) {
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('dragover'); });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) handleFileUpload(file);
    });
    uploadZone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.txt,.docx';
      input.onchange = (e) => handleFileUpload(e.target.files[0]);
      input.click();
    });
  }

  function handleFileUpload(file) {
    if (!file) return;
    showToast(`"${file.name}" uploaded! Analyzing...`, 'success');
    const notesContent = document.getElementById('notes-content');
    if (notesContent) {
      setTimeout(() => {
        notesContent.style.display = 'block';
        notesContent.style.animation = 'fadeInUp 0.5s ease';
      }, 1500);
    }
  }

  // ---- Calendar ----
  const calendarGrid = document.getElementById('calendar-grid');
  if (calendarGrid) buildCalendar();

  function buildCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = now.getDate();

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = days.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    for (let i = 0; i < firstDay; i++) {
      html += `<div class="calendar-day other-month">${new Date(year, month, -firstDay + i + 1).getDate()}</div>`;
    }

    const events = [3, 7, 12, 15, 19, 22, today];
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = d === today;
      const hasEvent = events.includes(d);
      html += `<div class="calendar-day ${isToday ? 'today' : ''} ${hasEvent ? 'has-event' : ''}" data-date="${d}">${d}</div>`;
    }

    calendarGrid.innerHTML = html;
    calendarGrid.querySelectorAll('.calendar-day:not(.other-month)').forEach(day => {
      day.addEventListener('click', function() {
        calendarGrid.querySelectorAll('.calendar-day').forEach(d => d.classList.remove('selected'));
        this.classList.add('selected');
      });
    });
  }

  // ---- Study planner tabs ----
  document.querySelectorAll('[data-tab]').forEach(tab => {
    tab.addEventListener('click', function() {
      const group = this.dataset.tabGroup;
      document.querySelectorAll(`[data-tab][data-tab-group="${group}"]`).forEach(t => t.classList.remove('active'));
      document.querySelectorAll(`[data-tab-content][data-tab-group="${group}"]`).forEach(c => c.style.display = 'none');
      this.classList.add('active');
      const target = document.getElementById(this.dataset.tab);
      if (target) { target.style.display = 'block'; target.style.animation = 'fadeIn 0.3s ease'; }
    });
  });

  // ---- Generate Quiz ----
  const generateQuizBtn = document.getElementById('generate-quiz-btn');
  if (generateQuizBtn && !window.location.pathname.includes('quiz-center') && !window.location.pathname.includes('notes-assistant')) {
    generateQuizBtn.addEventListener('click', function() {
      this.textContent = 'Generating...';
      this.disabled = true;
      setTimeout(() => {
        this.textContent = 'Generate Quiz';
        this.disabled = false;
        const quizArea = document.getElementById('quiz-area');
        if (quizArea) {
          quizArea.style.display = 'block';
          quizArea.style.animation = 'fadeInUp 0.5s ease';
          quizArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        showToast('Quiz generated successfully!', 'success');
      }, 1800);
    });
  }

  // ---- Notes AI actions ----
  if (!window.location.pathname.includes('notes-assistant')) {
    document.querySelectorAll('[data-notes-action]').forEach(btn => {
      btn.addEventListener('click', function() {
        const action = this.dataset.notesAction;
        const labels = {
          summary: 'Generating AI summary...',
          flashcards: 'Creating flashcards...',
          quiz: 'Building quiz questions...',
          mindmap: 'Mapping key concepts...'
        };
        showToast(labels[action] || 'Processing...', 'info');
      });
    });
  }

  // ---- Profile settings tabs ----
  document.querySelectorAll('.settings-tab').forEach(tab => {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.settings-panel').forEach(p => p.style.display = 'none');
      this.classList.add('active');
      const panel = document.getElementById(`settings-${this.dataset.panel}`);
      if (panel) panel.style.display = 'block';
    });
  });

  // ---- Animate perf bars on load ----
  setTimeout(() => {
    document.querySelectorAll('.perf-bar-fill[data-width]').forEach(bar => {
      bar.style.width = bar.dataset.width;
    });
  }, 600);

  // Streak cells randomize
  document.querySelectorAll('.streak-cell[data-random]').forEach(cell => {
    const levels = ['', 'level-1', 'level-2', 'level-3', 'level-4'];
    const weights = [2, 2, 3, 2, 1];
    let total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let level = '';
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { level = levels[i]; break; }
    }
    cell.className = `streak-cell ${level}`;
  });

  // Helper to escape HTML characters
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ── Dynamic Dashboard and Analytics Integration ──────────────
  async function loadDashboardData() {
    if (typeof window.EduVerseAPI === 'undefined') return;

    try {
      // Fetch APIs in parallel with individual error boundaries
      const [analyticsRes, progressRes, recommendationsRes, tasksRes] = await Promise.all([
        window.EduVerseAPI.getAnalytics().catch(err => { console.warn('[Dashboard] Analytics load failed:', err); return null; }),
        window.EduVerseAPI.getProgress().catch(err => { console.warn('[Dashboard] Progress load failed:', err); return null; }),
        window.EduVerseAPI.getRecommendations().catch(err => { console.warn('[Dashboard] Recommendations load failed:', err); return null; }),
        window.EduVerseAPI.getTasks().catch(err => { console.warn('[Dashboard] Tasks load failed:', err); return null; })
      ]);

      // Fallback user display details
      const user = analyticsRes?.data?.user;
      const displayName = user?.displayName || localStorage.getItem('userName') || 'Learner';
      const userGoal = user?.profile?.goal || localStorage.getItem('userGoal') || 'Ready to learn something amazing today?';

      // Update welcome banner (if present)
      const welcomeUserLabel = document.getElementById('welcome-user-label');
      if (welcomeUserLabel) {
        welcomeUserLabel.textContent = `Good evening, ${displayName} 👋`;
      }

      const welcomeUserGoal = document.getElementById('welcome-user-goal');
      if (welcomeUserGoal) {
        welcomeUserGoal.textContent = userGoal.startsWith('Ready') ? userGoal : `Goal: ${userGoal}`;
      }

      const welcomeStreakBadge = document.getElementById('welcome-streak-badge');
      if (welcomeStreakBadge) {
        const streakVal = user?.streak || 0;
        welcomeStreakBadge.innerHTML = `<span class="glow-dot" style="width:6px;height:6px"></span> ${streakVal} Day Streak 🔥`;
      }

      // Populate tasks completion rate and remaining counts from backend
      const tasksData = analyticsRes?.data?.tasks;
      const welcomeGoalBadge = document.getElementById('welcome-goal-badge');
      if (welcomeGoalBadge) {
        welcomeGoalBadge.textContent = `${tasksData?.completionRate || 0}% Goal`;
      }

      const welcomeTasksBadge = document.getElementById('welcome-tasks-remaining');
      if (welcomeTasksBadge) {
        welcomeTasksBadge.textContent = `${tasksData?.pending || 0} Tasks Remaining`;
      }

      // Update stats cards
      const statStreak = document.getElementById('dashboard-stat-streak');
      if (statStreak) {
        const streakVal = user?.streak || 0;
        statStreak.textContent = streakVal > 0 ? `${streakVal} Days` : '0 Days';
      }

      const statHours = document.getElementById('dashboard-stat-hours');
      const statGoals = document.getElementById('dashboard-stat-goals');
      if (statGoals) {
        statGoals.textContent = (tasksData?.completed > 0) ? `${tasksData.completed} / ${tasksData.total}` : 'No goals completed';
      }

      const quizzesData = analyticsRes?.data?.quizzes;
      const statAccuracy = document.getElementById('dashboard-stat-accuracy');
      if (statAccuracy) {
        statAccuracy.textContent = (quizzesData?.total > 0) ? `${quizzesData.avgScore || 0}%` : 'No quizzes taken yet';
      }

      // Populate dashboard tasks list
      const dbTasksList = document.getElementById('dashboard-tasks-list');
      let allTasks = [];
      if (dbTasksList && tasksRes && tasksRes.success && tasksRes.data) {
        allTasks = tasksRes.data;

        // Calculate study hours from tasks list
        let totalPlannedHours = 0;
        let completedHours = 0;
        allTasks.forEach(t => {
          const h = parseFloat(t.estimatedHours) || 1.0;
          totalPlannedHours += h;
          if (t.status === 'completed') {
            completedHours += h;
          }
        });

        // Render hours on welcome banner
        const welcomeHoursStudied = document.getElementById('dashboard-hours-studied');
        const welcomeHoursLabel = document.getElementById('dashboard-hours-label');
        const welcomeHoursProgress = document.getElementById('dashboard-hours-progress');

        const goalHours = totalPlannedHours > 0 ? totalPlannedHours : 3.0;
        if (welcomeHoursStudied) welcomeHoursStudied.textContent = `${completedHours.toFixed(1)} hrs`;
        if (welcomeHoursLabel) welcomeHoursLabel.textContent = `of ${goalHours.toFixed(1)} hrs studied`;
        if (welcomeHoursProgress) {
          const pct = goalHours > 0 ? Math.min(Math.round((completedHours / goalHours) * 100), 100) : 0;
          welcomeHoursProgress.style.width = `${pct}%`;
        }

        // Show active study hours on stat card
        if (statHours) {
          statHours.textContent = completedHours > 0 ? `${completedHours.toFixed(1)} hrs` : '0 hrs';
        }

        const tasks = allTasks.slice(0, 5);
        if (tasks.length === 0) {
          dbTasksList.innerHTML = `
            <div style="text-align:center;padding:24px 12px;color:var(--muted);font-size:12px">
              <div>No tasks today</div>
              <a href="study-planner.html" class="btn btn-primary btn-sm" style="display:inline-flex;margin-top:12px"><span>Go to Planner</span></a>
            </div>
          `;
        } else {
          dbTasksList.innerHTML = tasks.map(t => `
            <div class="task-item">
              <div class="task-checkbox ${t.status === 'completed' ? 'checked' : ''}" style="pointer-events:none">
                ${t.status === 'completed' ? '<svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>' : ''}
              </div>
              <div class="task-text ${t.status === 'completed' ? 'done' : ''}">${escapeHTML(t.title)}</div>
              <span class="task-meta badge ${t.status === 'completed' ? 'badge-primary' : 'badge-warning'}" style="font-size:10px">${t.status}</span>
            </div>
          `).join('') + `<div style="margin-top:16px"><a href="study-planner.html" class="btn btn-outline btn-sm w-full" style="justify-content:center">+ Add Task</a></div>`;
        }
      }

      // Populate dashboard roadmaps list (if present) from /api/analytics/progress
      const dbRoadmapsList = document.getElementById('dashboard-roadmaps-list');
      let roadmaps = [];
      if (dbRoadmapsList) {
        if (progressRes && progressRes.success && progressRes.data && progressRes.data.roadmapProgress) {
          roadmaps = progressRes.data.roadmapProgress.slice(0, 3);
        }

        if (roadmaps.length === 0) {
          dbRoadmapsList.innerHTML = `
            <div style="text-align:center;padding:24px 12px;color:var(--muted);font-size:12px">
              <div>No active roadmap yet</div>
              <a href="learning-roadmap.html" class="btn btn-primary btn-sm" style="display:inline-flex;margin-top:12px"><span>Build Roadmap</span></a>
            </div>
          `;
        } else {
          dbRoadmapsList.innerHTML = roadmaps.map(r => {
            const progressVal = r.progress || 0;
            // Determine icon based on subject
            let icon = '🧭';
            const titleLower = r.title.toLowerCase();
            if (titleLower.includes('math') || titleLower.includes('calculus')) icon = '📐';
            else if (titleLower.includes('chem')) icon = '⚗️';
            else if (titleLower.includes('code') || titleLower.includes('computer') || titleLower.includes('data structure')) icon = '💻';

            return `
              <div style="display:flex;gap:14px;align-items:center;padding:14px;background:var(--bg-2);border-radius:var(--radius);border:1px solid var(--border)">
                <div style="width:44px;height:44px;border-radius:var(--radius);background:rgba(59,130,246,0.1);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">${icon}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:14px;font-weight:600;margin-bottom:4px">${escapeHTML(r.title)}</div>
                  <div class="progress-bar" style="margin-bottom:4px">
                     <div class="progress-fill" style="width:${progressVal}%"></div>
                  </div>
                  <div style="font-size:12px;color:var(--muted)">${progressVal}% complete</div>
                </div>
                <a href="learning-roadmap.html" class="btn btn-primary btn-sm"><span>Resume</span></a>
              </div>
            `;
          }).join('');
        }
      }

      // Populate dashboard recent activity list (if present)
      const recentActivityList = document.getElementById('recent-activity-list');
      if (recentActivityList && data.quizzes && data.quizzes.history) {
        const history = data.quizzes.history.slice(0, 4);
        if (history.length === 0) {
          recentActivityList.innerHTML = `
            <div style="text-align:center;padding:24px 12px;color:var(--muted);font-size:12px">
              No recent activity.
            </div>
          `;
        } else {
          recentActivityList.innerHTML = history.map(h => {
            const dateStr = new Date(h.date).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
            return `
              <div class="activity-item">
                <div class="activity-dot" style="background:var(--primary)"></div>
                <div class="activity-content">
                  <div class="activity-text">Completed quiz with <strong>${h.score}%</strong> score</div>
                  <div class="activity-time">${dateStr}</div>
                </div>
              </div>
            `;
          }).join('');
        }
      }

      // Populate AI Recommendations
      const dbRecsList = document.getElementById('dashboard-recommendations-list');
      if (dbRecsList) {
        let recsHtml = '';

        if (recommendationsRes && recommendationsRes.success && recommendationsRes.data) {
          const recData = recommendationsRes.data;

          // 1. Weak Topics / Revision recommendation
          if (recData.weakTopics && recData.weakTopics.length > 0) {
            const wt = recData.weakTopics[0];
            recsHtml += `
              <div style="display:flex;gap:12px;padding:14px;border-radius:var(--radius);background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15)">
                <span style="font-size:20px">⚠️</span>
                <div>
                  <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:#fff">Review Needed: ${escapeHTML(wt.topic)}</div>
                  <div style="font-size:13px;color:var(--muted-light)">You scored an average of ${wt.avgScore}% in ${escapeHTML(wt.subject)} on this topic. Practice a quiz to improve.</div>
                  <a href="quiz-center.html" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--primary);margin-top:8px;font-weight:600">Start Practice Quiz →</a>
                </div>
              </div>
            `;
          }

          // 2. Next Steps Roadmap module recommendation
          if (recData.nextSteps && recData.nextSteps.length > 0) {
            const step = recData.nextSteps[0];
            recsHtml += `
              <div style="display:flex;gap:12px;padding:14px;border-radius:var(--radius);background:var(--primary-glow);border:1px solid rgba(124,255,79,0.15)">
                <span style="font-size:20px">🧭</span>
                <div>
                  <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:#fff">Next Roadmap Phase: ${escapeHTML(step.moduleName)}</div>
                  <div style="font-size:13px;color:var(--muted-light)">Week ${step.week} of your learning path: "${escapeHTML(step.roadmapTitle)}".</div>
                  <a href="learning-roadmap.html?id=${step.roadmapId}" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--primary);margin-top:8px;font-weight:600">Resume learning →</a>
                </div>
              </div>
            `;
          }

          // 3. Recommended Video
          if (recData.videos && recData.videos.length > 0) {
            const vid = recData.videos[0];
            recsHtml += `
              <div style="display:flex;gap:12px;padding:14px;border-radius:var(--radius);background:var(--bg-2);border:1px solid var(--border)">
                <span style="font-size:20px">🎥</span>
                <div>
                  <div style="font-size:14px;font-weight:600;margin-bottom:4px;color:#fff">Suggested Video: ${escapeHTML(vid.title)}</div>
                  <div style="font-size:13px;color:var(--muted-light)">${escapeHTML(vid.description)}</div>
                  <a href="${vid.url}" target="_blank" style="display:inline-flex;align-items:center;gap:4px;font-size:12px;color:var(--primary);margin-top:8px;font-weight:600">Watch Lesson →</a>
                </div>
              </div>
            `;
          }
        }

        if (!recsHtml) {
          dbRecsList.innerHTML = `
            <div style="text-align:center;padding:24px 12px;color:var(--muted);font-size:12px">
              <div>No recommendations yet.</div>
              <div style="margin-top:6px;font-size:11px;color:var(--muted-light)">Add tasks, start a roadmap, or complete a quiz to receive personalized AI recommendations.</div>
            </div>
          `;
        } else {
          dbRecsList.innerHTML = recsHtml;
        }
      }

    } catch (error) {
      console.error('[Dashboard] loadDashboardData failed:', error);
    }
  }

  // Load dashboard data on startup
  loadDashboardData();
});
