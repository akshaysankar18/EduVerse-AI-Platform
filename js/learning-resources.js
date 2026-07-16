/* ============================================================
   EDUVERSE AI — LEARNING RESOURCES INTERACTION LOGIC
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM Elements ──────────────────────────────────────────
  const queryForm         = document.getElementById('resources-query-form');
  const topicInput        = document.getElementById('resource-topic');
  const subjectInput      = document.getElementById('resource-subject');
  const levelSelect       = document.getElementById('resource-level');
  const findBtn           = document.getElementById('btn-find-resources');
  
  const historyList       = document.getElementById('resources-history-list');
  const placeholderState  = document.getElementById('resources-placeholder');
  const loadingState      = document.getElementById('resources-loading');
  const loadingStepsList  = document.getElementById('loading-steps-list');
  const resultsContainer  = document.getElementById('resources-results-container');

  // Results tags & content
  const resultTopicTitle  = document.getElementById('result-topic-title');
  const resultSubjectTag  = document.getElementById('result-subject-tag');
  const resultLevelTag    = document.getElementById('result-level-tag');
  
  const notesTitle        = document.getElementById('notes-overview-title');
  const notesContent      = document.getElementById('notes-overview-content');
  const youtubeGrid       = document.getElementById('youtube-grid');
  const websitesGrid      = document.getElementById('websites-grid');
  const practiceGrid      = document.getElementById('practice-grid');
  const booksGrid         = document.getElementById('books-grid');
  const aiTipsList        = document.getElementById('ai-tips-list');

  // Loading steps
  const LOADING_STEPS = [
    'Analyzing search keywords...',
    'Fetching best YouTube videos...',
    'Identifying authoritative websites...',
    'Locating practice quiz banks...',
    'Reviewing recommended textbooks...',
    'Generating study tips & overview...'
  ];

  // Load history on page startup
  loadSearchHistory();

  // ── Form Submission ────────────────────────────────────────
  if (queryForm) {
    queryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const topic = topicInput.value.trim();
      const subject = subjectInput.value.trim();
      const level = levelSelect.value;

      if (!topic || !subject) return;

      // 1. Hide prior content and show loading
      if (placeholderState) placeholderState.style.display = 'none';
      if (resultsContainer) resultsContainer.style.display = 'none';
      if (loadingState) loadingState.style.display = 'block';

      // Disable inputs
      toggleInputs(true);

      // Start animated steps loading
      const stepInterval = runLoadingStepsAnimation();

      try {
        if (typeof window.EduVerseAPI === 'undefined') {
          throw new Error('EduVerse API client service is not loaded.');
        }

        // Call backend API
        const res = await window.EduVerseAPI.searchResources(topic, subject, level);
        
        clearInterval(stepInterval);
        
        if (res && res.success && res.data) {
          // Render results
          renderResourceResults(topic, subject, level, res.data);
          
          // Show results panel
          if (loadingState) loadingState.style.display = 'none';
          if (resultsContainer) {
            resultsContainer.style.display = 'block';
            resultsContainer.style.animation = 'fadeInUp 0.5s ease';
          }
          
          showToast('✓ Resource search completed', 'success');
          
          // Reload history list
          loadSearchHistory();
        } else {
          throw new Error(res.message || 'Failed to retrieve learning resources.');
        }
      } catch (err) {
        clearInterval(stepInterval);
        console.error('[Resources] Fetch failed:', err);
        showToast(err.message || 'Error communicating with server', 'error');
        
        if (loadingState) loadingState.style.display = 'none';
        if (placeholderState) placeholderState.style.display = 'block';
      } finally {
        toggleInputs(false);
      }
    });
  }

  // ── Tabs Switching ──────────────────────────────────────────
  const tabButtons = document.querySelectorAll('.res-tab');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      // Toggle active tab button
      tabButtons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');

      const target = this.dataset.target;
      const sections = document.querySelectorAll('.resource-section-wrapper');

      sections.forEach(sec => {
        const secType = sec.dataset.section;
        if (target === 'all') {
          sec.style.display = 'block';
        } else {
          if (secType === target) {
            sec.style.display = 'block';
          } else {
            sec.style.display = 'none';
          }
        }
      });
    });
  });

  // ── Helper functions ────────────────────────────────────────
  function toggleInputs(disabled) {
    topicInput.disabled = disabled;
    subjectInput.disabled = disabled;
    levelSelect.disabled = disabled;
    findBtn.disabled = disabled;
    if (findBtn) {
      if (disabled) {
        findBtn.innerHTML = `<span><span style="width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block;margin-right:6px"></span>Searching...</span>`;
      } else {
        findBtn.innerHTML = `<span>Find Resources</span>`;
      }
    }
  }

  function runLoadingStepsAnimation() {
    if (!loadingStepsList) return null;

    // Reset steps UI
    loadingStepsList.innerHTML = LOADING_STEPS.map((step, idx) => `
      <div class="loading-step-item" id="res-step-${idx}">
        <span class="step-indicator-circle"></span>
        <span>${step}</span>
      </div>
    `).join('');

    let currentStep = 0;
    const first = document.getElementById(`res-step-${currentStep}`);
    if (first) first.classList.add('active');

    const interval = setInterval(() => {
      const prev = document.getElementById(`res-step-${currentStep}`);
      if (prev) {
        prev.classList.remove('active');
        prev.classList.add('done');
      }

      currentStep++;
      if (currentStep >= LOADING_STEPS.length) {
        clearInterval(interval);
        return;
      }

      const curr = document.getElementById(`res-step-${currentStep}`);
      if (curr) curr.classList.add('active');
    }, 1500);

    return interval;
  }

  function renderResourceResults(topic, subject, level, data) {
    // 1. Headers
    if (resultTopicTitle) resultTopicTitle.textContent = topic;
    if (resultSubjectTag) resultSubjectTag.textContent = subject;
    if (resultLevelTag) resultLevelTag.textContent = level;

    // Helper to clean symbols
    const cleanText = (text) => {
      return typeof window.cleanLatexAndMarkdown === 'function'
        ? window.cleanLatexAndMarkdown(text)
        : text;
    };

    // Helper to render grids
    function renderGrid(grid, items, icon, actionText, emptyText) {
      if (!grid) return;
      if (items && items.length > 0) {
        grid.innerHTML = items.map(item => `
          <div class="resource-card">
            <div class="card-top">
              <div class="resource-card-icon">${icon}</div>
              <h4 class="resource-card-title">${cleanText(item.title)}</h4>
              ${item.channel ? `<span class="resource-card-author">Channel: ${cleanText(item.channel)}</span>` : ''}
              <p class="resource-card-desc">${cleanText(item.description)}</p>
            </div>
            ${item.url ? `
              <a href="${item.url}" target="_blank" class="card-link-btn">
                <span>${actionText}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3"/></svg>
              </a>
            ` : ''}
          </div>
        `).join('');
      } else {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; color:var(--muted); font-size:12px;">${emptyText}</div>`;
      }
    }

    // 2. Render grids for all 8 categories
    renderGrid(youtubeGrid, data.youtube, '📹', 'Watch on YouTube', 'No video recommendations found.');
    renderGrid(document.getElementById('documentation-grid'), data.documentation, '📄', 'View Documentation', 'No official documentation found.');
    renderGrid(websitesGrid, data.websites, '🌐', 'Visit Website', 'No authoritative websites found.');
    renderGrid(document.getElementById('tutorials-grid'), data.tutorials, '🏁', 'Read Tutorial', 'No beginner tutorials found.');
    renderGrid(practiceGrid, data.practice, '⚡', 'Start Practice', 'No interactive practice tools found.');
    renderGrid(document.getElementById('github-grid'), data.github, '💻', 'View on GitHub', 'No relevant GitHub repositories found.');
    renderGrid(document.getElementById('pdfNotes-grid'), data.pdfNotes, '📚', 'View PDF Notes', 'No PDF cheat sheets or lecture slides found.');
    renderGrid(document.getElementById('researchPapers-grid'), data.researchPapers, '🔬', 'Read Research Paper', 'No scholarly articles or academic papers found.');

    // 3. AI Tips list
    if (aiTipsList) {
      if (data.tips && data.tips.length > 0) {
        aiTipsList.innerHTML = data.tips.map(tip => `
          <li>${cleanText(tip)}</li>
        `).join('');
      } else {
        aiTipsList.innerHTML = `<li style="list-style:none; color:var(--muted)">No study tips generated.</li>`;
      }
    }

    // Reset tabs selection to 'All'
    tabButtons.forEach(b => b.classList.remove('active'));
    tabButtons[0].classList.add('active');
    document.querySelectorAll('.resource-section-wrapper').forEach(sec => sec.style.display = 'block');
  }

  async function loadSearchHistory() {
    if (!historyList) return;

    try {
      if (typeof window.EduVerseAPI === 'undefined') return;
      const res = await window.EduVerseAPI.getResourcesHistory();
      
      if (res && res.success && res.data && res.data.length > 0) {
        historyList.innerHTML = res.data.map(item => {
          const dateStr = new Date(item.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
          return `
            <div class="history-item" data-id="${item.id}">
              <div class="history-item-topic">${item.topic}</div>
              <div class="history-item-meta">${item.subject} · ${item.level} · ${dateStr}</div>
            </div>
          `;
        }).join('');

        // Attach click listeners to reload history item
        historyList.querySelectorAll('.history-item').forEach(itemCard => {
          itemCard.addEventListener('click', () => {
            const historyId = itemCard.dataset.id;
            const historyObj = res.data.find(h => h.id === historyId);
            if (historyObj) {
              // Populate inputs
              topicInput.value = historyObj.topic;
              subjectInput.value = historyObj.subject;
              levelSelect.value = historyObj.level;

              // Render results
              renderResourceResults(historyObj.topic, historyObj.subject, historyObj.level, historyObj.resources);

              // Show results UI
              if (placeholderState) placeholderState.style.display = 'none';
              if (loadingState) loadingState.style.display = 'none';
              if (resultsContainer) {
                resultsContainer.style.display = 'block';
                resultsContainer.style.animation = 'fadeIn 0.3s ease';
              }
              showToast('Resources loaded from history!', 'info');
            }
          });
        });
      } else {
        historyList.innerHTML = `<div class="history-empty">No previous searches.</div>`;
      }
    } catch (err) {
      console.error('[Resources] Failed to load history:', err);
    }
  }
});
