/* ============================================
   EDUVERSE AI — GLOBAL JAVASCRIPT
   ============================================ */

// ---- Intersection Observer for Scroll Animations ----
const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

function initScrollAnimations() {
  document.querySelectorAll('[data-animate]').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(24px)';
    el.style.transition = `opacity 0.6s ease ${el.dataset.delay || '0s'}, transform 0.6s ease ${el.dataset.delay || '0s'}`;
    observer.observe(el);
  });
}

// ---- Navbar scroll state ----
function initNavbar() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  const update = () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  };
  window.addEventListener('scroll', update, { passive: true });
  update();
}

// ---- Progress bar animation ----
function animateProgressBars() {
  const bars = document.querySelectorAll('.progress-fill[data-width]');
  bars.forEach(bar => {
    const width = bar.dataset.width;
    setTimeout(() => { bar.style.width = width; }, 300);
  });
}

// ---- Checkbox toggle ----
function initCheckboxes() {
  document.querySelectorAll('.task-checkbox').forEach(cb => {
    cb.addEventListener('click', function() {
      this.classList.toggle('checked');
      const taskText = this.nextElementSibling;
      if (taskText) taskText.classList.toggle('done');
      if (this.classList.contains('checked')) {
        this.innerHTML = `<svg width="10" height="8" viewBox="0 0 10 8" fill="none">
          <path d="M1 4L3.5 6.5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
      } else {
        this.innerHTML = '';
      }
    });
  });
}

// ---- Ripple effect ----
function addRipple(el) {
  el.addEventListener('click', function(e) {
    const rect = this.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    ripple.style.cssText = `
      position:absolute; width:${size}px; height:${size}px;
      background:rgba(255,255,255,0.1); border-radius:50%;
      transform:translate(-50%,-50%) scale(0);
      left:${e.clientX-rect.left}px; top:${e.clientY-rect.top}px;
      animation:ripple 0.6s ease forwards; pointer-events:none;
    `;
    if (!ripple.parentElement) {
      const style = document.createElement('style');
      style.textContent = '@keyframes ripple{to{transform:translate(-50%,-50%) scale(4);opacity:0}}';
      document.head.appendChild(style);
    }
    this.style.position = 'relative';
    this.style.overflow = 'hidden';
    this.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  });
}

// ---- Toast notification ----
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  const colors = { success: '#7CFF4F', error: '#EF4444', info: '#3B82F6' };
  toast.style.cssText = `
    position:fixed; bottom:24px; right:24px; z-index:9999;
    background:#141414; border:1px solid #1E1E1E;
    border-left:3px solid ${colors[type]};
    border-radius:12px; padding:14px 20px;
    font-size:14px; color:#fff;
    box-shadow:0 8px 32px rgba(0,0,0,0.5);
    animation:fadeInUp 0.3s ease forwards;
    max-width:320px;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease reverse forwards';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ---- Auto-resize textarea ----
function initAutoResize() {
  document.querySelectorAll('textarea[data-autoresize]').forEach(ta => {
    ta.addEventListener('input', function() {
      this.style.height = 'auto';
      this.style.height = Math.min(this.scrollHeight, 200) + 'px';
    });
  });
}

// ---- Sidebar active state ----
function setActiveSidebarItem() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item').forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage) {
      item.classList.add('active');
    }
  });
}

// ---- Smooth counter animation ----
function animateCounter(el, target, duration = 2000) {
  const start = performance.now();
  const startVal = 0;
  const update = (time) => {
    const elapsed = time - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = Math.round(startVal + (target - startVal) * eased).toLocaleString();
    if (progress < 1) requestAnimationFrame(update);
  };
  requestAnimationFrame(update);
}

// ---- Init all ----
document.addEventListener('DOMContentLoaded', () => {
  // Passive Auth Session Validation (whitelisted list of protected pages to prevent Netlify pretty-URL redirect loops)
  const protectedPages = [
    'dashboard',
    'ai-mentor',
    'notes-assistant',
    'quiz-center',
    'learning-roadmap',
    'learning-resources',
    'career-hub',
    'analytics',
    'profile'
  ];
  const isAuthPage = protectedPages.some(page => window.location.pathname.includes(page));
  if (isAuthPage) {
    const email = localStorage.getItem('userEmail');
    const token = localStorage.getItem('token');
    if (!email && !token) {
      window.location.replace('onboarding.html?mode=login');
      return;
    }
  }

  initScrollAnimations();
  initNavbar();
  initCheckboxes();
  initAutoResize();
  setActiveSidebarItem();

  setTimeout(animateProgressBars, 500);

  // Animate counters
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count);
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          animateCounter(el, target);
          obs.disconnect();
        }
      });
    });
    obs.observe(el);
  });

  // Add ripple to primary buttons
  document.querySelectorAll('.btn-primary').forEach(addRipple);

  // ---- Dynamic User Profile Updates ----
  async function updateGlobalUserData() {
    if (typeof window.EduVerseAPI === 'undefined') return;
    if (!isAuthPage) return;
    try {
      const res = await window.EduVerseAPI.getProfile();
      if (res && res.success && res.data) {
        const user = res.data;
        const displayName = user.displayName || 'Learner';
        const email = user.email || 'learner@eduverse.ai';
        const role = user.role || 'student';
        const firstLetter = displayName.charAt(0).toUpperCase();

        // Update sidebar and avatar elements
        document.querySelectorAll('.sidebar-user-name').forEach(el => el.textContent = displayName);
        document.querySelectorAll('.sidebar-avatar, .topbar-avatar').forEach(el => el.textContent = firstLetter);

        const learnerTypeMap = {
          school: 'School Student',
          college: 'College Student',
          aspirant: 'Competitive Aspirant',
          jobseeker: 'Job Seeker',
          professional: 'Professional',
          lifelong: 'Lifelong Learner'
        };
        const rawType = user.profile?.learnerType || role;
        const roleStr = learnerTypeMap[rawType] || (rawType.charAt(0).toUpperCase() + rawType.slice(1));
        document.querySelectorAll('.sidebar-user-role').forEach(el => el.textContent = roleStr);

        // Welcome Greeting
        const welcomeLabel = document.getElementById('welcome-user-label');
        if (welcomeLabel) welcomeLabel.textContent = `Good evening, ${displayName} 👋`;

        // AI Mentor Welcome Greeting
        const mentorWelcome = document.querySelector('.chat-welcome-title');
        if (mentorWelcome) mentorWelcome.textContent = `Hi ${displayName}, I'm your AI Mentor`;

        // Profile Page card details
        const profName = document.getElementById('profile-name');
        const profEmailRole = document.getElementById('profile-email-role');
        if (profName) profName.textContent = displayName;
        if (profEmailRole) profEmailRole.textContent = `${email} · ${roleStr}`;
      }
    } catch (err) {
      console.error('[Global] Failed to load user profile info:', err);
    }
  }
  updateGlobalUserData();

  // ---- Dynamic Notifications Panel ----
  let notifications = [];

  function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
      tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
  }

  async function loadNotifications() {
    if (typeof window.EduVerseAPI === 'undefined') return;
    try {
      const res = await window.EduVerseAPI.getNotifications();
      if (res && res.success && res.data) {
        notifications = res.data;
        updateNotifDots();
      }
    } catch (e) {
      console.warn('Failed to load notifications:', e);
    }
  }

  function updateNotifDots() {
    const unreadCount = notifications.filter(n => !n.read).length;
    document.querySelectorAll('[data-tooltip="Notifications"]').forEach(btn => {
      let dot = btn.querySelector('.notif-dot');
      if (unreadCount > 0) {
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'notif-dot';
          btn.appendChild(dot);
        }
        dot.style.display = 'block';
      } else if (dot) {
        dot.style.display = 'none';
      }
    });
  }

  if (isAuthPage) {
    loadNotifications();
    setInterval(loadNotifications, 30000); // Check for notifications every 30s
  }

  document.querySelectorAll('[data-tooltip="Notifications"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Close other dropdowns/modals
      closeAllDropdowns();

      let dropdown = document.getElementById('notifications-dropdown');
      if (dropdown) {
        dropdown.remove();
        return;
      }

      dropdown = document.createElement('div');
      dropdown.id = 'notifications-dropdown';
      dropdown.style.cssText = `
        position: absolute;
        top: 50px;
        right: 0;
        width: 320px;
        background: rgba(20, 20, 20, 0.95);
        backdrop-filter: blur(16px);
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        z-index: 99999;
        display: flex;
        flex-direction: column;
        max-height: 400px;
        animation: fadeInUp 0.2s ease;
      `;

      const typeIcons = {
        roadmap_generated: '🗺️',
        quiz_completed: '🏆',
        notes_uploaded: '📚',
        flashcards_generated: '⚡',
        mindmap_generated: '🧠',
        goal_achieved: '🌟',
        daily_reminder: '⏰',
        weekly_report: '📊'
      };

      const itemsHtml = notifications.length === 0
        ? `<div style="padding:32px;text-align:center;color:var(--muted);font-size:13px">No notifications yet.</div>`
        : notifications.map(n => {
            const icon = typeIcons[n.type] || '🔔';
            const bgGlow = n.read ? 'transparent' : 'rgba(124, 255, 79, 0.03)';
            const borderLeft = n.read ? '3px solid transparent' : '3px solid var(--primary)';
            return `
              <div class="notif-item" data-id="${n.id}" style="padding:12px 16px;border-bottom:1px solid rgba(255,255,255,0.03);background:${bgGlow};border-left:${borderLeft};display:flex;gap:12px;cursor:pointer;transition:background 0.2s">
                <div style="font-size:18px;margin-top:2px">${icon}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:700;color:#fff;margin-bottom:2px">${escapeHTML(n.title)}</div>
                  <div style="font-size:11px;color:var(--muted-light);line-height:1.4;margin-bottom:4px">${escapeHTML(n.message)}</div>
                  <div style="font-size:9px;color:var(--muted)">${new Date(n.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})} at ${new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                </div>
              </div>
            `;
          }).join('');

      dropdown.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border)">
          <span style="font-size:13px;font-weight:700;color:#fff">Notifications</span>
          ${notifications.filter(n => !n.read).length > 0 ? `<button id="btn-mark-all-read" style="background:transparent;border:none;color:var(--primary);font-size:11px;font-weight:600;cursor:pointer">Mark all read</button>` : ''}
        </div>
        <div style="overflow-y:auto;flex:1" id="notif-items-list">
          ${itemsHtml}
        </div>
      `;

      btn.parentElement.appendChild(dropdown);

      // Bind Mark All Read
      const markAllBtn = dropdown.querySelector('#btn-mark-all-read');
      if (markAllBtn) {
        markAllBtn.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          try {
            await window.EduVerseAPI.markAllNotificationsRead();
            notifications = notifications.map(n => ({ ...n, read: true }));
            updateNotifDots();
            dropdown.remove();
            showToast('All notifications marked as read', 'success');
          } catch (err) {
            console.error(err);
          }
        });
      }

      // Bind Individual item click to mark read
      dropdown.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', async (evt) => {
          evt.stopPropagation();
          const id = item.dataset.id;
          try {
            await window.EduVerseAPI.markNotificationRead(id);
            notifications = notifications.map(n => n.id === id ? { ...n, read: true } : n);
            updateNotifDots();
            dropdown.remove();
          } catch (err) {
            console.error(err);
          }
        });
      });
    });
  });

  // Global close helper for dropdowns
  function closeAllDropdowns() {
    const dropdown = document.getElementById('notifications-dropdown');
    if (dropdown) dropdown.remove();
    const searchModal = document.getElementById('global-search-modal');
    if (searchModal) searchModal.remove();
  }

  document.addEventListener('click', () => {
    closeAllDropdowns();
  });

  // ---- Handle settings button redirect ----
  document.querySelectorAll('[data-tooltip="Settings"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      window.location.href = 'profile.html';
    });
  });

  // ---- Global search overlay modal ----
  function showSearchModal() {
    closeAllDropdowns();

    let modal = document.getElementById('global-search-modal');
    if (modal) return;

    modal = document.createElement('div');
    modal.id = 'global-search-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.75);
      backdrop-filter: blur(12px);
      z-index: 100000;
      display: flex;
      justify-content: center;
      padding-top: 100px;
    `;

    modal.innerHTML = `
      <div style="
        background: #141414;
        border: 1px solid var(--border);
        border-radius: var(--radius-lg);
        width: 100%;
        max-width: 600px;
        height: fit-content;
        max-height: 500px;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 50px rgba(0,0,0,0.8);
      " id="search-modal-content">
        <div style="display:flex;align-items:center;padding:16px;border-bottom:1px solid var(--border);gap:12px">
          <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="var(--muted)" stroke-width="1.5">
            <circle cx="6" cy="6" r="4"/><path d="M9.5 9.5l2.5 2.5" stroke-linecap="round"/>
          </svg>
          <input type="text" id="modal-search-input" placeholder="Search roadmaps, notes, quizzes, planner..." style="
            flex: 1;
            background: transparent;
            border: none;
            color: #fff;
            font-size: 15px;
            outline: none;
          " autocomplete="off">
          <button id="modal-search-close" style="background:transparent;border:none;color:var(--muted);font-size:18px;cursor:pointer">×</button>
        </div>
        <div style="flex:1;overflow-y:auto;padding:16px;" id="modal-search-results">
          <div style="text-align:center;padding:32px;color:var(--muted);font-size:13px">Type to search the EduVerse ecosystem...</div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    const input = modal.querySelector('#modal-search-input');
    input.focus();

    modal.querySelector('#modal-search-close').addEventListener('click', () => {
      modal.remove();
    });

    modal.addEventListener('click', (evt) => {
      if (evt.target === modal) modal.remove();
    });

    // Debounced search logic
    let debounceTimer;
    input.addEventListener('input', (evt) => {
      clearTimeout(debounceTimer);
      const val = evt.target.value.trim();
      if (!val) {
        modal.querySelector('#modal-search-results').innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px">Type to search the EduVerse ecosystem...</div>`;
        return;
      }

      modal.querySelector('#modal-search-results').innerHTML = `
        <div style="text-align:center;padding:32px;color:var(--muted);font-size:13px">
          <span style="display:inline-block;width:12px;height:12px;border:2px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;margin-right:8px"></span>
          Searching...
        </div>
      `;

      debounceTimer = setTimeout(async () => {
        try {
          const res = await window.EduVerseAPI.searchAll(val);
          if (res && res.success && res.data) {
            renderSearchResults(res.data, modal.querySelector('#modal-search-results'));
          }
        } catch (e) {
          modal.querySelector('#modal-search-results').innerHTML = `<div style="text-align:center;padding:32px;color:var(--danger);font-size:13px">Error performing search. Please try again.</div>`;
        }
      }, 300);
    });
  }

  function renderSearchResults(data, container) {
    const categories = [
      { key: 'roadmaps', title: 'Roadmaps 🗺️', url: (id) => `learning-roadmap.html?id=${id}` },
      { key: 'notes', title: 'Study Notes 📚', url: (id) => `notes-assistant.html?id=${id}` },
      { key: 'quizzes', title: 'Quizzes 🏆', url: (id) => `quiz-center.html?id=${id}` },
      { key: 'planner', title: 'Planner Tasks 📅', url: () => 'study-planner.html' },
      { key: 'career', title: 'Career Prep 💼', url: () => 'career-hub.html' }
    ];

    let hasResults = false;
    let html = '';

    categories.forEach(cat => {
      const items = data[cat.key] || [];
      if (items.length > 0) {
        hasResults = true;
        html += `
          <div style="margin-bottom:18px">
            <div style="font-size:11px;font-weight:700;color:var(--primary);text-transform:uppercase;letter-spacing:1px;margin-bottom:8px">${cat.title}</div>
            <div style="display:flex;flex-direction:column;gap:6px">
        `;

        items.forEach(item => {
          const title = item.title || item.role || 'Untitled';
          const subtitle = item.subject || item.type || '';
          html += `
            <div class="search-result-item" onclick="window.location.href='${cat.url(item.id)}'" style="
              padding: 10px 14px;
              background: var(--bg-2);
              border: 1px solid var(--border);
              border-radius: var(--radius);
              cursor: pointer;
              display: flex;
              justify-content: space-between;
              align-items: center;
              transition: all 0.2s;
            " onmouseover="this.style.borderColor='var(--primary)';this.style.background='var(--primary-glow)'" onmouseout="this.style.borderColor='var(--border)';this.style.background='var(--bg-2)'">
              <div>
                <div style="font-size:13px;font-weight:600;color:#fff">${escapeHTML(title)}</div>
                ${subtitle ? `<div style="font-size:11px;color:var(--muted-light);margin-top:2px">${escapeHTML(subtitle)}</div>` : ''}
              </div>
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="var(--muted)">
                <path d="M5 3l4 4-4 4" stroke-linecap="round"/>
              </svg>
            </div>
          `;
        });

        html += `
            </div>
          </div>
        `;
      }
    });

    if (!hasResults) {
      container.innerHTML = `<div style="text-align:center;padding:32px;color:var(--muted);font-size:13px">No matches found for your query.</div>`;
    } else {
      container.innerHTML = html;
    }
  }

  // Bind topbar input click to open search overlay
  const searchInput = document.getElementById('global-search');
  if (searchInput) {
    // Make readonly to prevent direct keyboard typing before modal is open
    searchInput.readOnly = true;
    searchInput.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showSearchModal();
    });
  }

  // Keyboard shortcut ⌘K / Ctrl+K / /
  document.addEventListener('keydown', (e) => {
    // Avoid triggering when user is already typing in an input/textarea
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') {
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      showSearchModal();
    } else if (e.key === '/') {
      e.preventDefault();
      showSearchModal();
    }
  });
});

// ---- PAGE TRANSITIONS (dashboard pages) ----
(function() {
  // Inject overlay if not present
  if (!document.getElementById('page-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'page-overlay';
    overlay.className = 'page-transition-overlay';
    document.body.appendChild(overlay);
  }

  document.addEventListener('click', function(e) {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto') || href.startsWith('http') || link.target === '_blank') return;
    const overlay = document.getElementById('page-overlay');
    if (!overlay) return;
    e.preventDefault();
    overlay.style.opacity = '1';
    overlay.style.pointerEvents = 'all';
    setTimeout(() => { window.location.href = href; }, 340);
  });
})();

// ---- QUIZ OPTION CLICK HANDLER ----
document.addEventListener('click', function(e) {
  const option = e.target.closest('.quiz-option');
  if (!option) return;
  const container = option.closest('#quiz-options');
  if (!container) return;
  const isCorrect = option.dataset.correct === 'true';
  // Mark all
  container.querySelectorAll('.quiz-option').forEach(o => {
    o.style.pointerEvents = 'none';
    if (o.dataset.correct === 'true') o.classList.add('correct');
  });
  if (!isCorrect) option.classList.add('wrong');
  // Show explanation
  const expl = document.getElementById('quiz-explanation');
  if (expl) { expl.style.display = 'block'; expl.style.animation = 'fadeInUp 0.4s ease'; }
});

// ---- PERFORMANCE BAR ANIMATION ----
(function() {
  const bars = document.querySelectorAll('.perf-bar-fill[data-width]');
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        setTimeout(() => { e.target.style.width = e.target.dataset.width; }, 150);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.3 });
})();


// ---- Clean LaTeX & basic Markdown helper ----
window.cleanLatexAndMarkdown = function(text) {
  if (!text) return '';

  // 1. Convert basic markdown headers (##, ###) to bold headers
  let clean = text
    .replace(/###\s+(.*?)(?:\n|$)/g, '<strong>$1</strong>\n')
    .replace(/##\s+(.*?)(?:\n|$)/g, '<strong>$1</strong>\n');

  // 2. Convert asterisks (double and single)
  clean = clean
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');

  // 2.5 Convert markdown links [text](url) to HTML anchor tags
  clean = clean.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" style="color:var(--primary);text-decoration:underline">$1</a>');

  // 3. Clean up LaTeX symbols and Greek characters
  clean = clean
    .replace(/\\alpha/g, 'α')
    .replace(/\\beta/g, 'β')
    .replace(/\\gamma/g, 'γ')
    .replace(/\\delta/g, 'δ')
    .replace(/\\Delta/g, 'Δ')
    .replace(/\\theta/g, 'θ')
    .replace(/\\pi/g, 'π')
    .replace(/\\sigma/g, 'σ')
    .replace(/\\lambda/g, 'λ')
    .replace(/\\mu/g, 'μ')
    .replace(/\\to/g, '→')
    .replace(/\\rightarrow/g, '→')
    .replace(/\\in/g, '∈')
    .replace(/\\le(?![a-z])/g, '≤')
    .replace(/\\leq/g, '≤')
    .replace(/\\ge(?![a-z])/g, '≥')
    .replace(/\\geq/g, '≥')
    .replace(/\\neq/g, '≠')
    .replace(/\$/g, ''); // Remove all $ math delimiters

  // 4. Convert newlines to HTML line breaks
  clean = clean.replace(/\n/g, '<br>');

  // 5. Convert lists (* or -) to nice bullet points
  clean = clean.replace(/(^|<br>)\s*[\*\-]\s+/g, '$1• ');

  return clean;
};

