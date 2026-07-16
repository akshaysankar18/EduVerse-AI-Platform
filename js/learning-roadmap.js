/* ============================================================
   EDUVERSE AI — LEARNING ROADMAP FRONTEND LOGIC
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const generateBtn       = document.getElementById('generate-roadmap-btn');
  const activeHeaderCard  = document.getElementById('active-roadmap-header-card');
  const activeTitle       = document.getElementById('active-roadmap-title');
  const activeMeta        = document.getElementById('active-roadmap-meta');
  const activePercent     = document.getElementById('active-roadmap-percent');
  const activeProgressFill = document.getElementById('active-roadmap-progress-fill');
  const badgeContainer    = document.getElementById('roadmap-badge-container');
  const roadmapSteps      = document.getElementById('roadmap-steps');
  const otherRoadmapsList = document.getElementById('other-roadmaps-list');

  let activeRoadmap = null;

  // ── Load Roadmaps ──────────────────────────────────────────
  async function loadRoadmaps() {
    try {
      if (typeof window.EduVerseAPI === 'undefined') return;

      const res = await window.EduVerseAPI.getRoadmaps();
      if (!res || !res.success || !res.data) {
        throw new Error(res.message || 'Malformed API response');
      }

      const roadmaps = res.data;
      
      // Populate sidebar
      renderSidebarRoadmaps(roadmaps);

      if (roadmaps.length === 0) {
        resetRoadmapView();
        return;
      }

      // Default to the first (most recent) active roadmap if none selected
      if (!activeRoadmap) {
        activeRoadmap = roadmaps[0];
      } else {
        // Refresh active roadmap state from freshly loaded list
        const updated = roadmaps.find(r => r.id === activeRoadmap.id);
        if (updated) activeRoadmap = updated;
      }

      renderActiveRoadmap(activeRoadmap);
    } catch (err) {
      console.error('[Roadmap] loadRoadmaps failed:', err);
    }
  }

  async function initLoad() {
    const params = new URLSearchParams(window.location.search);
    const roadmapId = params.get('id');
    if (roadmapId && typeof window.EduVerseAPI !== 'undefined') {
      try {
        const res = await window.EduVerseAPI.getRoadmap(roadmapId);
        if (res && res.success && res.data) {
          activeRoadmap = res.data;
        }
      } catch (e) {
        console.error('Failed to load roadmap from URL parameter:', e);
      }
    }
    await loadRoadmaps();
  }

  initLoad();

  // ── Reset View ─────────────────────────────────────────────
  function resetRoadmapView() {
    if (activeTitle) activeTitle.textContent = 'No Active Roadmap';
    if (activeMeta) activeMeta.textContent = 'Click "Generate New Roadmap" above to design your AI learning path';
    if (activePercent) activePercent.textContent = '0%';
    if (activeProgressFill) activeProgressFill.style.width = '0%';
    if (badgeContainer) badgeContainer.innerHTML = '';
    if (roadmapSteps) {
      roadmapSteps.innerHTML = `
        <div style="text-align:center;padding:48px 16px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-lg);color:var(--muted)">
          <div style="font-size:32px;margin-bottom:12px">🗺️</div>
          <div style="font-weight:600;color:#fff;margin-bottom:4px">No Learning Path Generated</div>
          <div style="font-size:12px">Enter a subject and goal above. Gemini will construct a structured weekly plan for you.</div>
        </div>
      `;
    }
  }

  // ── Render Active Roadmap ──────────────────────────────────
  function renderActiveRoadmap(roadmap) {
    if (!roadmap) return;

    // Calculate progress
    const totalModules = roadmap.modules.length;
    const completedModules = roadmap.modules.filter(m => m.status === 'completed').length;
    const progressPercent = totalModules > 0 ? Math.round((completedModules / totalModules) * 100) : 0;

    // Update Header Card
    if (activeTitle) activeTitle.textContent = roadmap.title;
    if (activeMeta) {
      activeMeta.textContent = `${roadmap.totalWeeks} Weeks · ${totalModules} Phases · ${roadmap.level} Level`;
    }
    if (activePercent) activePercent.textContent = `${progressPercent}%`;
    if (activeProgressFill) activeProgressFill.style.width = `${progressPercent}%`;

    // Update Badge
    if (badgeContainer) {
      badgeContainer.innerHTML = `
        <div class="badge badge-primary">Phases: ${completedModules} / ${totalModules} Done</div>
      `;
    }

    // Render Steps
    if (roadmapSteps) {
      roadmapSteps.innerHTML = '';
      
      roadmap.modules.forEach((mod, idx) => {
        const div = document.createElement('div');
        div.className = 'roadmap-item';
        
        let dotClass = '';
        let badgeClass = 'badge-gray';
        let statusText = 'Locked';

        if (mod.status === 'completed') {
          dotClass = 'done';
          badgeClass = 'badge-primary';
          statusText = 'Completed ✓';
        } else if (mod.status === 'in_progress') {
          dotClass = 'active';
          badgeClass = 'badge-warning';
          statusText = 'In Progress';
        } else if (idx === 0 || (roadmap.modules[idx - 1] && roadmap.modules[idx - 1].status === 'completed')) {
          // Unlock the next step automatically
          dotClass = '';
          badgeClass = 'badge-gray';
          statusText = 'Upcoming';
        }

        div.innerHTML = `
          <div class="roadmap-dot ${dotClass}" style="cursor:pointer" data-idx="${idx}">
            ${mod.status === 'completed' ? '✓' : idx + 1}
          </div>
          <div class="roadmap-content" style="${idx === totalModules - 1 ? 'padding-bottom:0' : ''}">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
              <div class="roadmap-title" style="color:${mod.status === 'completed' ? 'var(--muted)' : '#fff'};text-decoration:${mod.status === 'completed' ? 'line-through' : 'none'}">
                ${mod.title}
              </div>
              <span class="badge ${badgeClass}" style="font-size:11px">${statusText}</span>
            </div>
            <div class="roadmap-desc" style="color:${mod.status === 'completed' ? 'var(--muted)' : 'var(--muted-light)'}">
              ${mod.description}
            </div>
            ${mod.status === 'in_progress' ? `
              <div style="display:flex;gap:8px;margin-top:12px">
                <a href="ai-mentor.html" class="btn btn-primary btn-sm"><span>Continue Learning</span></a>
                <a href="quiz-center.html" class="btn btn-outline btn-sm">Practice Quiz</a>
              </div>
            ` : ''}
          </div>
        `;

        // Checkbox/Dot click to toggle status
        div.querySelector('.roadmap-dot').addEventListener('click', async () => {
          let newStatus = 'completed';
          if (mod.status === 'completed') newStatus = 'in_progress';
          else if (mod.status === 'in_progress') newStatus = 'pending';
          else newStatus = 'in_progress';

          // Update local modules array copy
          const updatedModules = [...roadmap.modules];
          updatedModules[idx].status = newStatus;

          const newCompleted = updatedModules.filter(m => m.status === 'completed').length;
          const newProgress = Math.round((newCompleted / totalModules) * 100);

          try {
            await window.EduVerseAPI.updateRoadmap(roadmap.id, {
              modules: updatedModules,
              progress: newProgress
            });
            showToast(`Phase updated to ${newStatus.replace('_', ' ')}!`, 'success');
            loadRoadmaps();
          } catch (err) {
            showToast('Failed to update phase', 'error');
          }
        });

        roadmapSteps.appendChild(div);
      });
    }
  }

  // ── Render Sidebar Roadmaps ────────────────────────────────
  function renderSidebarRoadmaps(roadmaps) {
    if (!otherRoadmapsList) return;

    otherRoadmapsList.innerHTML = '';

    roadmaps.forEach(r => {
      // Don't duplicate active roadmap in the "Other" list if selected, or just list all with selected state
      const isSelected = activeRoadmap && activeRoadmap.id === r.id;

      const div = document.createElement('div');
      div.style.cssText = `
        padding:10px;
        background:var(--bg-2);
        border-radius:var(--radius);
        border:1px solid ${isSelected ? 'var(--primary)' : 'var(--border)'};
        cursor:pointer;
        transition:all var(--transition);
        display:flex;
        justify-content:space-between;
        align-items:center;
      `;

      div.innerHTML = `
        <div style="flex:1;min-width:0" class="other-roadmap-select">
          <div style="font-size:13px;font-weight:600;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${isSelected ? 'var(--primary)' : '#fff'}">
            🧭 ${r.title}
          </div>
          <div style="font-size:11px;color:var(--muted)">
            ${r.progress || 0}% completed · ${r.totalWeeks} weeks
          </div>
        </div>
        <button class="btn-delete-roadmap" style="padding:4px;border:none;background:transparent;color:var(--danger);opacity:0.5;cursor:pointer">
          🗑️
        </button>
      `;

      div.querySelector('.other-roadmap-select').addEventListener('click', () => {
        activeRoadmap = r;
        loadRoadmaps();
      });

      div.querySelector('.btn-delete-roadmap').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Are you sure you want to delete "${r.title}"?`)) return;
        try {
          await window.EduVerseAPI.deleteRoadmap(r.id);
          showToast('Roadmap deleted', 'success');
          if (activeRoadmap && activeRoadmap.id === r.id) {
            activeRoadmap = null;
          }
          loadRoadmaps();
        } catch (err) {
          showToast('Failed to delete roadmap', 'error');
        }
      });

      otherRoadmapsList.appendChild(div);
    });

    // Add Create button at bottom
    const addBtn = document.createElement('button');
    addBtn.className = 'btn btn-outline btn-sm w-full';
    addBtn.style.cssText = 'justify-content:center;margin-top:4px';
    addBtn.innerHTML = '+ Create Roadmap';
    addBtn.addEventListener('click', showGenerateRoadmapModal);
    otherRoadmapsList.appendChild(addBtn);
  }

  // ── Generate Modal ────────────────────────────────────────
  if (generateBtn) {
    generateBtn.addEventListener('click', showGenerateRoadmapModal);
  }

  function showGenerateRoadmapModal() {
    if (document.getElementById('gen-roadmap-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'gen-roadmap-modal';
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

    modal.innerHTML = `
      <div style="
        background: #141414;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 440px;
        padding: 24px;
        box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        transform: translateY(20px);
        transition: transform 0.3s ease;
      " id="gen-roadmap-modal-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="font-size:16px;font-weight:700;margin:0">Generate AI Roadmap</h3>
          <button id="roadmap-modal-close" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px">×</button>
        </div>

        <form id="gen-roadmap-form" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Goal *</label>
            <input type="text" name="goal" required placeholder="e.g. Master Linear Algebra, Pass AP Physics" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
          </div>

          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Subject *</label>
            <select name="subject" required style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
              <option value="Mathematics">Mathematics</option>
              <option value="Physics">Physics</option>
              <option value="Chemistry">Chemistry</option>
              <option value="Computer Science">Computer Science</option>
              <option value="Biology">Biology</option>
              <option value="Economics">Economics</option>
            </select>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Starting Level</label>
              <select name="level" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
                <option value="beginner">Beginner</option>
                <option value="intermediate" selected>Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Weeks (1-52)</label>
              <input type="number" name="weeks" min="2" max="52" value="8" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
            </div>
          </div>

          <button type="submit" id="roadmap-submit-btn" class="btn btn-primary" style="margin-top:8px;padding:12px;font-weight:700">✦ Build Learning Path</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.offsetHeight;
    modal.style.opacity = '1';
    
    const modalContent = modal.querySelector('#gen-roadmap-modal-content');
    if (modalContent) modalContent.style.transform = 'translateY(0)';

    const closeModal = () => {
      modal.style.opacity = '0';
      if (modalContent) modalContent.style.transform = 'translateY(20px)';
      setTimeout(() => modal.remove(), 300);
    };

    const closeBtn = modal.querySelector('#roadmap-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const roadmapForm = modal.querySelector('#gen-roadmap-form');
    if (roadmapForm) {
      roadmapForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = roadmapForm.querySelector('#roadmap-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;gap:6px"><span style="width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block"></span> Building path...</span>`;
        }

        const formData = new FormData(e.target);
        const goal = formData.get('goal');
        const subject = formData.get('subject');
        const level = formData.get('level');
        const weeks = parseInt(formData.get('weeks')) || 8;

        try {
          const res = await window.EduVerseAPI.createRoadmap(goal, subject, level, weeks);
          showToast('✓ Roadmap generated', 'success');
          closeModal();
          if (res && res.data) {
            activeRoadmap = res.data;
          }
          await loadRoadmaps();
        } catch (err) {
          showToast(err.message || 'Generation failed', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✦ Build Learning Path';
          }
        }
      });
    }
  }
});
