/* ============================================================
   EDUVERSE AI — PROFILE CONTROLLER JS
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const profileName      = document.getElementById('profile-name');
  const profileEmailRole = document.getElementById('profile-email-role');
  const profileStreak    = document.getElementById('profile-streak-badge');
  const profileLevel     = document.getElementById('profile-level-badge');
  const profileHours     = document.getElementById('profile-hours');
  const profileGoals     = document.getElementById('profile-goals');
  const profileCerts     = document.getElementById('profile-certs');

  const settingsNameInput  = document.getElementById('settings-name-input');
  const settingsEmailInput = document.getElementById('settings-email-input');
  const settingsGoalSelect = document.getElementById('settings-goal-select');
  const settingsLevelSelect = document.getElementById('settings-level-select');
  const saveSettingsBtn    = document.getElementById('btn-save-profile-settings');

  // Helper to escape HTML characters
  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  // ── Load Profile details ──────────────────────────────────
  async function loadUserProfile() {
    try {
      if (typeof window.EduVerseAPI === 'undefined') return;

      const [profRes, analyticsRes, tasksRes, attemptsRes, notesRes, mentorRes] = await Promise.all([
        window.EduVerseAPI.getProfile(),
        window.EduVerseAPI.getAnalytics(),
        window.EduVerseAPI.getTasks(),
        window.EduVerseAPI.getAttempts(),
        window.EduVerseAPI.getNotes().catch(() => ({ success: true, data: [] })),
        window.EduVerseAPI.getMentorHistory().catch(() => ({ success: true, data: [] }))
      ]);

      if (profRes && profRes.success && profRes.data) {
        const user = profRes.data;

        // Render profile card
        if (profileName) profileName.textContent = user.displayName || 'EduVerse Learner';
        if (profileEmailRole) {
          const roleText = (user.role || 'student').charAt(0).toUpperCase() + (user.role || 'student').slice(1);
          profileEmailRole.textContent = `${user.email} · ${roleText}`;
        }

        // Render stats badges
        const streak = user.stats?.streak || 0;
        const xp = user.stats?.xp || 0;
        const computedLevel = Math.floor(xp / 100) + 1;

        if (profileStreak) profileStreak.innerHTML = `🔥 ${streak} Day Streak`;
        if (profileLevel) profileLevel.innerHTML = `🏆 Level ${computedLevel}`;

        // Populate Form Fields
        if (settingsNameInput) settingsNameInput.value = user.displayName || '';
        if (settingsEmailInput) settingsEmailInput.value = user.email || '';
        if (settingsGoalSelect && user.profile?.goal) {
          settingsGoalSelect.value = user.profile.goal;
        }
        if (settingsLevelSelect && user.profile?.learningStyle) {
          settingsLevelSelect.value = user.profile.learningStyle;
        }

        // ── Badges & Achievements Dynamic Binding
        const achievementsList = document.getElementById('profile-achievements-list');
        if (achievementsList) {
          const notesCount = (notesRes && notesRes.success && notesRes.data) ? notesRes.data.length : 0;
          const attemptsCount = (attemptsRes && attemptsRes.success && attemptsRes.data) ? attemptsRes.data.length : 0;
          const mentorCount = (mentorRes && mentorRes.success && mentorRes.data) ? mentorRes.data.length : 0;

          const achievements = [
            {
              icon: '🔥',
              title: 'Streak Master',
              desc: 'Active study streak maintained',
              status: streak > 0 ? `${streak} Days Active` : 'Inactive',
              earned: streak > 0
            },
            {
              icon: '🏆',
              title: 'Quiz Champion',
              desc: 'Scored 90%+ on 5 quizzes',
              status: attemptsCount >= 5 ? 'Earned' : `Progress: ${attemptsCount} / 5`,
              earned: attemptsCount >= 5
            },
            {
              icon: '🧠',
              title: 'AI Power User',
              desc: 'Use the AI Mentor for study guidance',
              status: mentorCount >= 5 ? 'Earned' : `Progress: ${mentorCount} / 5`,
              earned: mentorCount >= 5
            },
            {
              icon: '📚',
              title: 'Bookworm',
              desc: 'Upload at least 3 study guides / notes',
              status: notesCount >= 3 ? 'Earned' : `Progress: ${notesCount} / 3`,
              earned: notesCount >= 3
            }
          ];

          achievementsList.innerHTML = achievements.map(ach => {
            const bg = ach.earned ? 'var(--primary-glow)' : 'var(--bg-2)';
            const border = ach.earned ? '1px solid rgba(124,255,79,0.15)' : '1px solid var(--border)';
            const dateColor = ach.earned ? 'var(--primary)' : 'var(--muted)';
            return `
              <div class="achievement-card" style="padding:10px 14px;background:${bg};border:${border};border-radius:var(--radius);display:flex;align-items:center;gap:12px;margin-bottom:8px">
                <div class="achievement-icon" style="font-size:20px">${ach.icon}</div>
                <div style="flex:1">
                  <div class="achievement-title" style="font-size:13px;font-weight:600;color:#fff">${ach.title}</div>
                  <div class="achievement-desc" style="font-size:12px;color:var(--muted-light)">${ach.desc}</div>
                </div>
                <div class="achievement-date" style="font-size:11px;color:${dateColor};font-weight:600">${ach.status}</div>
              </div>
            `;
          }).join('');
        }
      }

      // Populate analytics-based profile stats
      let completedHours = 0;
      if (tasksRes && tasksRes.success && tasksRes.data) {
        tasksRes.data.forEach(t => {
          if (t.status === 'completed') {
            completedHours += parseFloat(t.estimatedHours) || 1.0;
          }
        });
      }
      if (attemptsRes && attemptsRes.success && attemptsRes.data) {
        attemptsRes.data.forEach(att => {
          completedHours += (att.timeTaken || 0) / 3600;
        });
      }

      if (profileHours) {
        profileHours.textContent = completedHours > 0 ? `${completedHours.toFixed(1)} hrs` : '0 hrs';
      }

      if (analyticsRes && analyticsRes.success && analyticsRes.data) {
        const analytics = analyticsRes.data;
        if (profileGoals && analytics.tasks) {
          profileGoals.textContent = analytics.tasks.completed || '0';
        }
        if (profileCerts && analytics.roadmaps) {
          profileCerts.textContent = analytics.roadmaps.total || '0';
        }
      }

      // ── Certificates Dynamic Binding
      const certificatesList = document.getElementById('profile-certificates-list');
      if (certificatesList) {
        let roadmaps = [];
        try {
          const roadmapsRes = await window.EduVerseAPI.getRoadmaps();
          if (roadmapsRes && roadmapsRes.success && roadmapsRes.data) {
            roadmaps = roadmapsRes.data;
          }
        } catch (e) {
          console.warn('Failed to fetch roadmaps for certificates:', e);
        }

        const completedRoadmaps = roadmaps.filter(r => (r.progress || 0) >= 100 || r.status === 'completed');

        if (completedRoadmaps.length === 0) {
          certificatesList.innerHTML = `
            <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius)">
              No certificates earned yet. Complete 100% of a learning roadmap to generate your certificate!
            </div>
          `;
        } else {
          certificatesList.innerHTML = completedRoadmaps.map(r => {
            const dateStr = new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleDateString(undefined, {month: 'short', day: 'numeric', year: 'numeric'});
            return `
              <div style="background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);padding:14px;display:flex;align-items:center;gap:14px;margin-bottom:8px">
                <div style="font-size:28px">🏅</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:13px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff">${escapeHTML(r.title)} Certification</div>
                  <div style="font-size:11px;color:var(--muted-light)">Completed 100% · Issued ${dateStr}</div>
                </div>
                <button class="btn btn-outline btn-sm btn-download-cert" data-title="${escapeHTML(r.title)}" style="flex-shrink:0">Download</button>
              </div>
            `;
          }).join('');

          // Attach click listeners to download certificate
          document.querySelectorAll('.btn-download-cert').forEach(btn => {
            btn.addEventListener('click', function() {
              const title = this.getAttribute('data-title');
              showToast(`Downloading Certificate for ${title}...`, 'success');
              setTimeout(() => {
                alert(`EduVerse Certification for ${title}\n\nThis certifies that the learner has successfully completed 100% of the ${title} study course.`);
              }, 600);
            });
          });
        }
      }

    } catch (error) {
      console.error('[Profile] loadUserProfile failed:', error);
    }
  }

  loadUserProfile();

  // ── Save profile settings ──────────────────────────────────
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', async (e) => {
      e.preventDefault();

      const name = settingsNameInput ? settingsNameInput.value.trim() : '';
      const goal = settingsGoalSelect ? settingsGoalSelect.value : '';
      const level = settingsLevelSelect ? settingsLevelSelect.value : '';

      if (!name) {
        showToast('Name cannot be empty', 'error');
        return;
      }

      const updates = {
        displayName: name,
        profile: {
          goal: goal,
          learningStyle: level
        }
      };

      saveSettingsBtn.disabled = true;
      saveSettingsBtn.querySelector('span').textContent = 'Saving Changes...';

      try {
        await window.EduVerseAPI.updateProfile(updates);
        showToast('Profile settings updated successfully!', 'success');
        loadUserProfile();
      } catch (err) {
        console.error(err);
        showToast('Failed to update profile settings', 'error');
      } finally {
        saveSettingsBtn.disabled = false;
        saveSettingsBtn.querySelector('span').textContent = 'Save Changes';
      }
    });
  }
});
