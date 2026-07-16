/* ============================================================
   EDUVERSE AI — STUDY PLANNER FRONTEND LOGIC
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const tasksContainer  = document.getElementById('today-tasks-container');
  const dateLabel       = document.getElementById('current-date-label');
  const remainingBadge  = document.getElementById('tasks-remaining-badge');
  const addTaskBtn      = document.getElementById('add-task-btn');

  // Set today's date dynamically in the label
  if (dateLabel) {
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    dateLabel.textContent = new Date().toLocaleDateString('en-US', options);
  }

  // ── Render Tasks ───────────────────────────────────────────
  async function loadTasks() {
    if (!tasksContainer) return;
    
    // Show loading state
    tasksContainer.innerHTML = `
      <div style="text-align:center;padding:32px 0;color:var(--muted)">
        <span class="glow-dot" style="width:8px;height:8px;display:inline-block;margin-right:8px"></span>
        Loading your study tasks...
      </div>
    `;

    try {
      if (typeof window.EduVerseAPI === 'undefined') {
        throw new Error('EduVerseAPI is not loaded');
      }

      const [res, profileRes] = await Promise.all([
        window.EduVerseAPI.getTasks(),
        window.EduVerseAPI.getProfile().catch(() => null)
      ]);

      if (!res || !res.success || !res.data) {
        throw new Error(res.message || 'Malformed API response');
      }

      const tasks = res.data;
      tasksContainer.innerHTML = '';

      // Today's Progress & Pacing Calculations
      const totalCount = tasks.length;
      const completedCount = tasks.filter(t => t.status === 'completed').length;
      
      let completedHours = 0;
      tasks.forEach(t => {
        if (t.status === 'completed') {
          completedHours += parseFloat(t.estimatedHours) || 1.0;
        }
      });

      // Study Goal from Profile
      let dailyGoalHours = 3.0;
      if (profileRes && profileRes.success && profileRes.data && profileRes.data.profile) {
        const studyTimePref = profileRes.data.profile.studyTime || 'moderate';
        if (studyTimePref === 'light') dailyGoalHours = 1.5;
        else if (studyTimePref === 'moderate') dailyGoalHours = 3.0;
        else if (studyTimePref === 'intense') dailyGoalHours = 5.0;
      }

      // Today's Progress Bind
      const tasksText = document.getElementById('progress-tasks-text');
      const tasksFill = document.getElementById('progress-tasks-fill');
      const hoursText = document.getElementById('progress-hours-text');
      const hoursFill = document.getElementById('progress-hours-fill');

      if (tasksText) tasksText.textContent = `${completedCount} / ${totalCount}`;
      if (tasksFill) {
        const pct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
        tasksFill.style.width = `${pct}%`;
      }
      if (hoursText) hoursText.textContent = `${completedHours.toFixed(1)}h / ${dailyGoalHours}h goal`;
      if (hoursFill) {
        const pct = Math.min((completedHours / dailyGoalHours) * 100, 100);
        hoursFill.style.width = `${pct}%`;
      }

      // AI Pacing card updates
      const pacingCard = document.getElementById('pacing-card-wrapper');
      const pacingTitle = document.getElementById('pacing-title');
      const pacingDesc = document.getElementById('pacing-desc');

      if (pacingTitle && pacingDesc) {
        if (totalCount === 0) {
          pacingTitle.textContent = 'Welcome to your Planner 📅';
          pacingDesc.textContent = 'Add tasks to map out your study schedule. The AI Agent will analyze your schedule pacing here.';
          if (pacingCard) pacingCard.style.background = 'var(--bg-2)';
        } else if (completedCount === totalCount) {
          pacingTitle.textContent = 'All caught up! 🎉';
          pacingDesc.textContent = 'Awesome job! You have completed all planned tasks for today. Rest up or start tomorrow\'s tasks.';
          if (pacingCard) pacingCard.style.background = 'var(--primary-glow)';
        } else {
          pacingTitle.textContent = 'Today\'s Pacing is Great 👍';
          pacingDesc.textContent = `You have completed ${completedCount} of your ${totalCount} tasks. Keep a steady pace to prevent study fatigue.`;
          if (pacingCard) pacingCard.style.background = 'var(--primary-glow)';
        }
      }

      // Weekly Goal Subject Breakdown Bind
      const weeklyGoalBadge = document.getElementById('weekly-goal-badge');
      const weeklySubjectList = document.getElementById('weekly-subject-list');

      if (weeklyGoalBadge) {
        const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
        weeklyGoalBadge.textContent = `${pct}% done`;
      }

      if (weeklySubjectList) {
        if (totalCount === 0) {
          weeklySubjectList.innerHTML = `
            <div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">
              No weekly subjects tracked yet.
            </div>
          `;
        } else {
          // Group tasks by subject
          const subjectMap = {};
          tasks.forEach(t => {
            const subj = t.subject || 'General';
            if (!subjectMap[subj]) {
              subjectMap[subj] = { total: 0, completed: 0 };
            }
            subjectMap[subj].total++;
            if (t.status === 'completed') {
              subjectMap[subj].completed++;
            }
          });

          weeklySubjectList.innerHTML = Object.keys(subjectMap).map(subj => {
            const stats = subjectMap[subj];
            const pct = Math.round((stats.completed / stats.total) * 100);
            return `
              <div class="perf-bar">
                <div class="perf-bar-label">${subj}</div>
                <div class="perf-bar-track">
                  <div class="perf-bar-fill" style="width:${pct}%"></div>
                </div>
                <div class="perf-bar-value">${pct}%</div>
              </div>
            `;
          }).join('');
        }
      }

      if (tasks.length === 0) {
        tasksContainer.innerHTML = `
          <div style="text-align:center;padding:48px 16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--muted)">
            <div style="font-size:24px;margin-bottom:8px">📅</div>
            <div style="font-weight:600;color:#fff;margin-bottom:4px">No tasks planned yet</div>
            <div style="font-size:12px">Click "+ Add Task" above to map out your study schedule.</div>
          </div>
        `;
        if (remainingBadge) {
          remainingBadge.textContent = '0 remaining';
        }
        return;
      }

      // Count remaining/pending tasks
      const pendingCount = tasks.filter(t => t.status !== 'completed').length;
      if (remainingBadge) {
        remainingBadge.textContent = `${pendingCount} remaining`;
        remainingBadge.className = pendingCount === 0 ? 'badge badge-emerald' : 'badge badge-primary';
      }

      // Render each task slot
      tasks.forEach(task => {
        const div = document.createElement('div');
        
        // Colors & labels based on priority/status
        let borderLeftColor = 'var(--border-light)';
        let statusBadgeClass = 'badge-gray';
        let statusText = 'Pending';

        if (task.status === 'completed') {
          borderLeftColor = 'var(--emerald)';
          statusBadgeClass = 'badge-emerald';
          statusText = 'Done ✓';
        } else if (task.status === 'in_progress') {
          borderLeftColor = '#F59E0B'; // Amber
          statusBadgeClass = 'badge-warning';
          statusText = 'In Progress';
        } else if (task.priority === 'high') {
          borderLeftColor = 'var(--primary)';
          statusBadgeClass = 'badge-primary';
          statusText = 'High Priority';
        }

        // Determine icon based on subject
        let subjectIcon = '📚';
        const subj = (task.subject || '').toLowerCase();
        if (subj.includes('math')) subjectIcon = '📐';
        else if (subj.includes('chem')) subjectIcon = '⚗️';
        else if (subj.includes('phys')) subjectIcon = '🔬';
        else if (subj.includes('code') || subj.includes('computer')) subjectIcon = '💻';

        div.style.cssText = `
          display:flex;
          gap:12px;
          padding:16px;
          background:var(--card);
          border:1px solid ${task.status === 'completed' ? 'var(--border)' : 'rgba(255,255,255,0.05)'};
          border-radius:var(--radius-lg);
          border-left:3px solid ${borderLeftColor};
          transition: transform 0.2s ease, opacity 0.2s ease;
          opacity: ${task.status === 'completed' ? 0.7 : 1};
        `;

        div.innerHTML = `
          <div style="flex-shrink:0;padding-top:2px;cursor:pointer" class="task-check-toggle" data-id="${task.id}" data-status="${task.status}">
            <div style="width:18px;height:18px;border-radius:4px;border:2px solid ${task.status === 'completed' ? 'var(--primary)' : 'var(--muted)'};display:flex;align-items:center;justify-content:center;background:${task.status === 'completed' ? 'var(--primary)' : 'transparent'}">
              ${task.status === 'completed' ? '<span style="color:#000;font-size:11px;font-weight:900">✓</span>' : ''}
            </div>
          </div>
          <div style="flex:1">
            <div style="font-size:14px;font-weight:600;margin-bottom:3px;text-decoration:${task.status === 'completed' ? 'line-through' : 'none'};color:${task.status === 'completed' ? 'var(--muted)' : '#fff'}">
              ${task.title}
            </div>
            <div style="font-size:12px;color:var(--muted-light);display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center">
              <span>⏱ ${task.estimatedHours || 1}h</span>
              <span>${subjectIcon} ${task.subject}</span>
              <span class="badge ${statusBadgeClass}" style="font-size:10px;padding:1px 6px">${statusText}</span>
              ${task.dueDate ? `<span style="font-size:11px">📅 Due: ${new Date(task.dueDate).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>` : ''}
            </div>
            ${task.description ? `<div style="margin-top:6px;font-size:12px;color:var(--muted)">${task.description}</div>` : ''}
          </div>
          <div style="display:flex;gap:4px;align-self:center">
            <button class="topbar-btn btn-delete-task" data-id="${task.id}" style="padding:6px;border:none;background:transparent;color:var(--danger);opacity:0.6;cursor:pointer" data-tooltip="Delete Task">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        `;

        tasksContainer.appendChild(div);
      });

      // Attach Event Listeners for completion toggling
      document.querySelectorAll('.task-check-toggle').forEach(el => {
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const taskId = el.dataset.id;
          const currentStatus = el.dataset.status;
          const newStatus = currentStatus === 'completed' ? 'pending' : 'completed';
          
          try {
            await window.EduVerseAPI.updateTask(taskId, { status: newStatus });
            showToast(newStatus === 'completed' ? 'Task completed! Keep it up!' : 'Task set to pending', 'success');
            loadTasks();
          } catch (err) {
            showToast('Failed to update task', 'error');
          }
        });
      });

      // Attach Event Listeners for deletion
      document.querySelectorAll('.btn-delete-task').forEach(el => {
        el.addEventListener('click', async (e) => {
          e.stopPropagation();
          const taskId = el.dataset.id;
          if (!confirm('Are you sure you want to delete this task?')) return;

          try {
            await window.EduVerseAPI.deleteTask(taskId);
            showToast('Task deleted successfully', 'success');
            loadTasks();
          } catch (err) {
            showToast('Failed to delete task', 'error');
          }
        });
      });

    } catch (error) {
      console.error('[Planner] loadTasks failed:', error);
      tasksContainer.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--danger)">
          ⚠️ Failed to fetch study planner tasks. Please check your connection.
        </div>
      `;
    }
  }

  // Initial load
  loadTasks();

  // ── Add Task Modal ──────────────────────────────────────────
  if (addTaskBtn) {
    addTaskBtn.addEventListener('click', showAddTaskModal);
  }

  function showAddTaskModal() {
    // Check if modal already exists
    if (document.getElementById('add-task-modal')) return;

    // Create Modal Element
    const modal = document.createElement('div');
    modal.id = 'add-task-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10000;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    const todayString = new Date().toISOString().split('T')[0];

    modal.innerHTML = `
      <div style="
        background: #141414;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 460px;
        padding: 24px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        transform: translateY(20px);
        transition: transform 0.3s ease;
      " id="add-task-modal-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="font-size:16px;font-weight:700;margin:0">Create Study Task</h3>
          <button id="modal-close-btn" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px">×</button>
        </div>

        <form id="add-task-form" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Task Title *</label>
            <input type="text" name="title" required placeholder="e.g. Morning Revision — Integration" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Subject *</label>
              <select name="subject" required style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Computer Science">Computer Science</option>
                <option value="General Studies">General Studies</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Priority</label>
              <select name="priority" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
                <option value="low">Low</option>
                <option value="medium" selected>Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Duration (Hours)</label>
              <input type="number" step="0.5" name="estimatedHours" min="0.5" value="1.0" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
            </div>
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Due Date</label>
              <input type="date" name="dueDate" value="${todayString}" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
            </div>
          </div>

          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Description (Optional)</label>
            <textarea name="description" rows="2" placeholder="e.g. Complete chapter 3 problems" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px;resize:none"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" style="margin-top:8px;padding:12px;font-weight:700">Save Task</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    // Force a reflow for transition
    modal.offsetHeight;
    modal.style.opacity = '1';
    
    const modalContent = modal.querySelector('#add-task-modal-content');
    if (modalContent) modalContent.style.transform = 'translateY(0)';

    // Close Modal Logic
    const closeModal = () => {
      modal.style.opacity = '0';
      if (modalContent) modalContent.style.transform = 'translateY(20px)';
      setTimeout(() => modal.remove(), 300);
    };

    const closeBtn = modal.querySelector('#modal-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    // Form Submit
    const taskForm = modal.querySelector('#add-task-form');
    if (taskForm) {
      taskForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = taskForm.querySelector('button[type="submit"]');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;gap:6px"><span style="width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block"></span> Saving...</span>`;
        }

        const formData = new FormData(e.target);
        const payload = {
          title: formData.get('title'),
          subject: formData.get('subject'),
          priority: formData.get('priority'),
          estimatedHours: parseFloat(formData.get('estimatedHours')) || 1.0,
          dueDate: formData.get('dueDate') || todayString,
          description: formData.get('description'),
          status: 'pending'
        };

        try {
          await window.EduVerseAPI.createTask(payload);
          showToast('✓ Study task created successfully!', 'success');
          closeModal();
          loadTasks();
        } catch (err) {
          showToast(err.message || 'Failed to create task', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Task';
          }
        }
      });
    }
  }
});
