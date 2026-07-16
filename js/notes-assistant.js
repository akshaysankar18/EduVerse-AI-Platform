/* ============================================================
   EDUVERSE AI — NOTES ASSISTANT FRONTEND LOGIC (v2)
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  // ── DOM References ────────────────────────────────────────
  const uploadZone         = document.getElementById('upload-zone');
  const uploadIdleUI       = document.getElementById('upload-idle');
  const uploadProgressUI   = document.getElementById('upload-progress-ui');
  const uploadBarFill      = document.getElementById('upload-bar-fill');
  const uploadStatusText   = document.getElementById('upload-status-text');
  const uploadPctText      = document.getElementById('upload-pct-text');
  const chooseFileBtn      = document.getElementById('choose-file-btn');
  const savedNotesList     = document.getElementById('saved-notes-list');
  const activeNoteTitle    = document.getElementById('active-note-title');
  const activeNoteMeta     = document.getElementById('active-note-meta');
  const noteDisplayTitle   = document.getElementById('note-display-title');
  const noteDisplayContent = document.getElementById('note-display-content');
  const generateNotesBtn   = document.getElementById('generate-notes-btn');
  const qnaTextarea        = document.querySelector('#npanel-qa textarea');
  const qnaSendBtn         = document.querySelector('#npanel-qa .chat-send-btn');
  const qnaAnswerBox       = document.getElementById('note-answer');

  // AI Action buttons
  const btnSummarize  = document.getElementById('btn-summarize');
  const btnFlashcards = document.getElementById('btn-flashcards');
  const btnQuiz       = document.getElementById('btn-quiz');
  const btnMindmap    = document.getElementById('btn-mindmap');

  let activeNote       = null;
  let isUploading      = false;
  let currentFlashcards = [];
  let currentCardIndex = 0;

  // ── AI Button helpers ─────────────────────────────────────
  const allAIBtns = () => [btnSummarize, btnFlashcards, btnQuiz, btnMindmap, generateNotesBtn];

  function disableAIButtons(reason = '') {
    allAIBtns().forEach(b => {
      if (b) { b.disabled = true; b.setAttribute('data-ai-btn', '1'); }
    });
    if (chooseFileBtn) chooseFileBtn.disabled = true;
  }

  function enableAIButtons() {
    allAIBtns().forEach(b => {
      if (b) { b.disabled = false; }
    });
    if (chooseFileBtn) chooseFileBtn.disabled = false;
  }

  // ── Upload Zone Progress ──────────────────────────────────
  function showUploadProgress() {
    if (uploadIdleUI)    uploadIdleUI.style.display    = 'none';
    if (uploadProgressUI) uploadProgressUI.style.display = 'block';
    setUploadProgress(0);
    if (uploadStatusText) uploadStatusText.textContent = 'Uploading...';
  }

  function setUploadProgress(pct) {
    if (uploadBarFill)  uploadBarFill.style.width = `${pct}%`;
    if (uploadPctText)  uploadPctText.textContent = `${Math.round(pct)}%`;
  }

  function showUploadComplete() {
    setUploadProgress(100);
    if (uploadStatusText) {
      uploadStatusText.textContent = 'Upload complete.';
      uploadStatusText.style.color = 'var(--primary)';
    }
    const zone = document.getElementById('upload-zone');
    if (zone) zone.style.borderColor = 'var(--primary)';
  }

  function resetUploadZone() {
    if (uploadIdleUI)    uploadIdleUI.style.display    = 'block';
    if (uploadProgressUI) {
      uploadProgressUI.style.display = 'none';
    }
    if (uploadStatusText) {
      uploadStatusText.textContent = 'Uploading...';
      uploadStatusText.style.color = '';
    }
    const zone = document.getElementById('upload-zone');
    if (zone) zone.style.borderColor = '';
  }

  // ── Summary Loading Animation ─────────────────────────────
  const SUMMARY_STEPS = [
    'Reading document...',
    'Extracting text...',
    'Analysing content...',
    'Generating summary...',
  ];

  function showSummaryLoading() {
    const body = document.getElementById('summary-panel-body');
    if (!body) return;

    body.innerHTML = `
      <div class="na-loading-wrap">
        <div class="na-spinner"></div>
        <div style="font-size:15px;font-weight:600;color:var(--text)" id="na-loading-headline">Reading document...</div>
        <div class="na-loading-steps" id="na-loading-steps">
          ${SUMMARY_STEPS.map((s, i) => `
            <div class="na-loading-step${i === 0 ? ' active' : ''}" id="na-step-${i}">
              <span class="na-step-dot"></span>
              <span>${s}</span>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Cycle through steps
    let step = 0;
    const interval = setInterval(() => {
      // Mark previous done
      const prev = document.getElementById(`na-step-${step}`);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }

      step++;
      if (step >= SUMMARY_STEPS.length) {
        clearInterval(interval);
        return;
      }

      const curr = document.getElementById(`na-step-${step}`);
      if (curr) curr.classList.add('active');

      const headline = document.getElementById('na-loading-headline');
      if (headline) headline.textContent = SUMMARY_STEPS[step];
    }, 1400);

    // Store interval id on body for cleanup
    body._loadingInterval = interval;
    return interval;
  }

  function clearSummaryLoading(interval) {
    if (interval) clearInterval(interval);
  }

  // ── Render Note Summary ───────────────────────────────────
  function renderNoteSummary(note) {
    const body = document.getElementById('summary-panel-body');
    if (!body) return;

    // Parse basic markdown for display
    const safeHTML = (text) => {
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return typeof window.cleanLatexAndMarkdown === 'function'
        ? window.cleanLatexAndMarkdown(escaped)
        : escaped
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n/g, '<br>');
    };

    body.innerHTML = `
      <div>
        <div style="font-size:16px;font-weight:700;margin-bottom:10px">${safeHTML(note.title)}</div>
        <div style="font-size:14px;color:var(--text-80);line-height:1.8">${safeHTML(note.summary || note.content.slice(0, 500))}</div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
        <div style="padding:16px;background:var(--primary-glow);border:1px solid rgba(124,255,79,0.15);border-radius:var(--radius)">
          <div style="font-size:22px;margin-bottom:8px">📄</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:6px">Subject</div>
          <div style="font-size:12px;color:var(--muted-light)">${note.subject || 'General Studies'}</div>
        </div>
        <div style="padding:16px;background:var(--emerald-glow);border:1px solid rgba(16,185,129,0.15);border-radius:var(--radius)">
          <div style="font-size:22px;margin-bottom:8px">🤖</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:6px">Source</div>
          <div style="font-size:12px;color:var(--muted-light)">${note.sourceType === 'ai_generated' ? 'AI Generated' : 'Uploaded File'}</div>
        </div>
        <div style="padding:16px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.15);border-radius:var(--radius)">
          <div style="font-size:22px;margin-bottom:8px">🏷️</div>
          <div style="font-size:13px;font-weight:700;margin-bottom:6px">Tags</div>
          <div style="font-size:12px;color:var(--muted-light)">${(note.tags || []).join(', ') || 'None'}</div>
        </div>
      </div>

      <div style="padding:16px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius)">
        <div style="font-size:13px;font-weight:600;color:var(--warning);margin-bottom:6px">💡 Full Content Preview</div>
        <div style="font-size:13px;color:var(--text-80);line-height:1.8;max-height:200px;overflow-y:auto">${safeHTML(note.content.slice(0, 1200))}${note.content.length > 1200 ? '…' : ''}</div>
      </div>
    `;
  }

  // ── Select and Display Note ───────────────────────────────
  function selectNote(note) {
    activeNote = note;

    if (activeNoteTitle) activeNoteTitle.textContent = note.title;
    if (activeNoteMeta) {
      activeNoteMeta.textContent = `${note.sourceType === 'ai_generated' ? 'AI Generated Study Notes' : 'Uploaded File Summary'} · ${note.subject}`;
    }

    const placeholder = document.getElementById('notes-placeholder');
    const content = document.getElementById('notes-content');
    if (placeholder) placeholder.style.display = 'none';
    if (content) content.style.display = 'block';

    // Show summary immediately
    switchNotesTab('summary');
    renderNoteSummary(note);

    // Reset Q&A
    if (qnaAnswerBox) qnaAnswerBox.style.display = 'none';
    if (qnaTextarea)  qnaTextarea.value = '';

    // Reset flashcard and mindmap panels
    resetFlashcardPanel();
    resetMindmapPanel();
  }

  function resetActiveNoteView() {
    if (activeNoteTitle) activeNoteTitle.textContent = 'No document selected';
    if (activeNoteMeta)  activeNoteMeta.textContent = 'Select or generate notes to get started';
    if (qnaAnswerBox)    qnaAnswerBox.style.display = 'none';

    const placeholder = document.getElementById('notes-placeholder');
    const content = document.getElementById('notes-content');
    if (placeholder) placeholder.style.display = 'flex';
    if (content) content.style.display = 'none';
  }

  function resetFlashcardPanel() {
    const fc = document.getElementById('flashcards-container');
    if (fc) {
      fc.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">
        Click <strong style="color:var(--primary)">🃏 Flashcards</strong> in the header to generate cards from this document.
      </div>`;
    }
    const badge = document.getElementById('flashcard-badge');
    if (badge) badge.textContent = '0 cards';
    currentFlashcards = [];
    currentCardIndex = 0;
  }

  function resetMindmapPanel() {
    const mm = document.getElementById('mindmap-container');
    if (mm) {
      mm.innerHTML = `<div style="text-align:center;padding:40px;color:var(--muted);font-size:13px">
        Click <strong style="color:var(--primary)">🗺️ Mind Map</strong> in the header to visualise this document.
      </div>`;
    }
  }

  // ── Fetch & Render Notes List ─────────────────────────────
  async function loadNotesList() {
    if (!savedNotesList) return;

    try {
      if (typeof window.EduVerseAPI === 'undefined') throw new Error('EduVerseAPI is not loaded');

      const res = await window.EduVerseAPI.getNotes();
      if (!res || !res.success || !res.data) throw new Error(res.message || 'Malformed API response');

      const notes = res.data;
      savedNotesList.innerHTML = '';

      if (notes.length === 0) {
        savedNotesList.innerHTML = `
          <div style="text-align:center;padding:24px 8px;color:var(--muted);font-size:12px">
            No notes uploaded. Upload a document to start studying.
          </div>
        `;
        return;
      }

      notes.forEach(note => {
        const div = document.createElement('div');
        const isSelected = activeNote && activeNote.id === note.id;

        div.style.cssText = `
          display:flex; align-items:center; gap:10px; padding:10px;
          border-radius:var(--radius); cursor:pointer;
          background:${isSelected ? 'var(--primary-glow)' : 'transparent'};
          border:1px solid ${isSelected ? 'rgba(124,255,79,0.15)' : 'transparent'};
          transition: background 0.15s;
        `;

        div.innerHTML = `
          <span style="font-size:18px">📋</span>
          <div style="flex:1;min-width:0" class="note-item-select" data-id="${note.id}">
            <div style="font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:${isSelected ? 'var(--primary)' : '#fff'}">
              ${note.title}
            </div>
            <div style="font-size:11px;color:var(--muted)">
              ${note.sourceType === 'ai_generated' ? '🤖 AI Generated' : '📎 Uploaded'} · ${new Date(note.createdAt).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}
            </div>
          </div>
          <button class="btn-delete-note" data-id="${note.id}" style="padding:4px;border:none;background:transparent;color:var(--danger);opacity:0.5;cursor:pointer">
            🗑️
          </button>
        `;

        div.querySelector('.note-item-select').addEventListener('click', () => {
          selectNote(note);
          loadNotesList();
        });

        div.querySelector('.btn-delete-note').addEventListener('click', async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete "${note.title}"?`)) return;
          try {
            await window.EduVerseAPI.deleteNote(note.id);
            showToast('Note deleted', 'success');
            if (activeNote && activeNote.id === note.id) {
              activeNote = null;
              resetActiveNoteView();
            }
            loadNotesList();
          } catch {
            showToast('Failed to delete note', 'error');
          }
        });

        savedNotesList.appendChild(div);
      });
    } catch (error) {
      console.error('[Notes] loadNotesList failed:', error);
      savedNotesList.innerHTML = `
        <div style="text-align:center;padding:12px;color:var(--danger);font-size:12px">
          ⚠️ Failed to fetch saved notes.
        </div>
      `;
    }
  }

  // ── Q&A Action ────────────────────────────────────────────
  if (qnaSendBtn && qnaTextarea) {
    qnaSendBtn.addEventListener('click', askQuestionAboutDocument);
    qnaTextarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); askQuestionAboutDocument(); }
    });
  }

  async function askQuestionAboutDocument() {
    if (!activeNote) {
      showToast('Please select a document first', 'info');
      return;
    }
    const question = qnaTextarea ? qnaTextarea.value.trim() : '';
    if (!question) return;

    if (qnaAnswerBox) {
      qnaAnswerBox.style.display = 'block';
      qnaAnswerBox.innerHTML = `
        <div style="font-size:14px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:10px">
          <div class="na-spinner" style="width:18px;height:18px;border-width:2px"></div>
          AI is thinking...
        </div>
      `;
    }

    try {
      // Use the dedicated /questions endpoint (falls back to mentorChat if unavailable)
      let answerText;
      if (typeof window.EduVerseAPI.askNoteQuestion === 'function') {
        const res = await window.EduVerseAPI.askNoteQuestion(activeNote.id, question);
        if (!res || !res.success || !res.data) throw new Error('Malformed API response');
        answerText = res.data.answer;
      } else {
        const res = await window.EduVerseAPI.sendMentorMessage(
          question, [],
          `Answer the user's question using only this study document:\n\n${activeNote.content}`,
        );
        if (!res || !res.success || !res.data) throw new Error('Malformed API response');
        answerText = res.data.reply;
      }

      if (qnaAnswerBox) {
        qnaAnswerBox.innerHTML = `
          <div style="font-size:14px;font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:8px">
            <span style="color:var(--primary)">✦</span> AI Answer
          </div>
          <div style="font-size:14px;color:var(--text-80);line-height:1.8">${answerText.replace(/\n/g, '<br>')}</div>
        `;
      }
    } catch (err) {
      console.error('[Q&A]', err);
      if (qnaAnswerBox) {
        qnaAnswerBox.innerHTML = `<div style="font-size:14px;color:var(--danger)">⚠️ Failed to get answer from AI. Please try again.</div>`;
      }
    }
  }

  // ── Summarize Button ──────────────────────────────────────
  if (btnSummarize) {
    btnSummarize.addEventListener('click', () => {
      if (!activeNote) {
        showToast('Please select or upload a document first.', 'info');
        return;
      }
      switchNotesTab('summary');
      const interval = showSummaryLoading();
      // The summary is already in the note object, so we just display it after a short animation
      setTimeout(() => {
        clearSummaryLoading(interval);
        renderNoteSummary(activeNote);
      }, SUMMARY_STEPS.length * 1400 + 200);
    });
  }

  // ── Flashcards Button ─────────────────────────────────────
  if (btnFlashcards) {
    btnFlashcards.addEventListener('click', async () => {
      if (!activeNote) {
        showToast('Please select or upload a document first.', 'info');
        return;
      }
      switchNotesTab('flashcards');
      await loadFlashcardsForNote(activeNote.id);
    });
  }

  async function loadFlashcardsForNote(noteId) {
    const loading    = document.getElementById('flashcards-loading');
    const container  = document.getElementById('flashcards-container');
    const badge      = document.getElementById('flashcard-badge');

    if (loading)   loading.style.display   = 'flex';
    if (container) container.innerHTML     = '';

    disableAIButtons();

    try {
      const res = await window.EduVerseAPI.getFlashcards(noteId);
      if (!res || !res.success || !res.data) throw new Error('Malformed response');

      const cards = res.data;
      currentFlashcards = cards;
      currentCardIndex  = 0;

      if (badge) badge.textContent = `${cards.length} cards`;

      renderFlashcardSlider(container, cards);
    } catch (err) {
      console.error('[Flashcards]', err);
      if (container) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--danger);font-size:13px">
            ⚠️ Failed to generate flashcards. ${err.message || ''}<br>
            <button onclick="document.getElementById('btn-flashcards').click()" class="btn btn-outline btn-sm" style="margin-top:16px">Try Again</button>
          </div>
        `;
      }
      showToast('Failed to generate flashcards', 'error');
    } finally {
      if (loading) loading.style.display = 'none';
      enableAIButtons();
    }
  }

  function renderFlashcardSlider(container, cards) {
    if (!container || !cards.length) return;

    const render = (idx, flipped) => {
      const card = cards[idx];
      container.innerHTML = `
        <div class="flashcard-viewport" id="fc-viewport">
          <div class="flashcard-inner${flipped ? ' flipped' : ''}" id="fc-inner">
            <div class="flashcard-face flashcard-front">
              <div style="font-size:11px;color:var(--primary);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px">
                Card ${idx + 1} of ${cards.length} — Click to flip
              </div>
              <div style="font-size:17px;font-weight:700;line-height:1.5">${escapeHTML(card.question)}</div>
              <div style="margin-top:16px;font-size:11px;color:var(--muted)">Tap to reveal answer</div>
            </div>
            <div class="flashcard-face flashcard-back">
              <div style="font-size:11px;color:var(--primary);font-weight:700;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:16px">
                Answer — Card ${idx + 1} of ${cards.length}
              </div>
              <div style="font-size:15px;color:var(--text-80);line-height:1.6">${escapeHTML(card.answer)}</div>
            </div>
          </div>
        </div>
        <div class="flashcard-nav">
          <button id="fc-prev" ${idx === 0 ? 'disabled' : ''}>← Previous</button>
          <span class="flashcard-count">Card ${idx + 1} / ${cards.length}</span>
          <button id="fc-next" ${idx === cards.length - 1 ? 'disabled' : ''}>Next →</button>
        </div>
      `;

      // Flip on card click
      const inner = container.querySelector('#fc-inner');
      let isFlipped = !!flipped;
      inner.addEventListener('click', () => {
        isFlipped = !isFlipped;
        inner.classList.toggle('flipped', isFlipped);
      });

      // Navigation
      const prev = container.querySelector('#fc-prev');
      const next = container.querySelector('#fc-next');

      if (prev) prev.addEventListener('click', () => {
        if (currentCardIndex > 0) {
          currentCardIndex--;
          render(currentCardIndex, false);
        }
      });

      if (next) next.addEventListener('click', () => {
        if (currentCardIndex < cards.length - 1) {
          currentCardIndex++;
          render(currentCardIndex, false);
        }
      });
    };

    render(currentCardIndex, false);
  }

  // ── Quiz Button ───────────────────────────────────────────
  if (btnQuiz) {
    btnQuiz.addEventListener('click', async () => {
      if (!activeNote) {
        showToast('Please select or upload a document first.', 'info');
        return;
      }

      const originalHTML = btnQuiz.innerHTML;
      btnQuiz.innerHTML = `<span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border:2px solid var(--primary);border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block"></span> Generating…</span>`;
      disableAIButtons();

      try {
        const res = await window.EduVerseAPI.generateQuizFromNote(activeNote.id);
        if (!res || !res.success || !res.data) throw new Error('Quiz generation failed');
        const quizId = res.data.id;
        showToast('Quiz generated! Launching…', 'success');
        setTimeout(() => {
          window.location.href = `quiz-center.html?quizId=${quizId}`;
        }, 800);
      } catch (err) {
        console.error('[Quiz]', err);
        showToast(`Failed to generate quiz: ${err.message || 'Unknown error'}`, 'error');
        btnQuiz.innerHTML = originalHTML;
        enableAIButtons();
      }
    });
  }

  // ── Mind Map Button ───────────────────────────────────────
  if (btnMindmap) {
    btnMindmap.addEventListener('click', async () => {
      if (!activeNote) {
        showToast('Please select or upload a document first.', 'info');
        return;
      }
      switchNotesTab('mindmap');
      await loadMindmapForNote(activeNote.id);
    });
  }

  async function loadMindmapForNote(noteId) {
    const loading   = document.getElementById('mindmap-loading');
    const container = document.getElementById('mindmap-container');

    if (loading)   loading.style.display   = 'flex';
    if (container) container.innerHTML     = '';

    disableAIButtons();

    try {
      const res = await window.EduVerseAPI.generateMindmap(noteId);
      if (!res || !res.success || !res.data) throw new Error('Malformed response');

      const tree = res.data;
      if (container) {
        container.innerHTML = '';
        container.appendChild(buildMindmapTree(tree, 0));
      }
    } catch (err) {
      console.error('[Mindmap]', err);
      if (container) {
        container.innerHTML = `
          <div style="text-align:center;padding:40px;color:var(--danger);font-size:13px">
            ⚠️ Failed to generate mind map. ${err.message || ''}<br>
            <button onclick="document.getElementById('btn-mindmap').click()" class="btn btn-outline btn-sm" style="margin-top:16px">Try Again</button>
          </div>
        `;
      }
      showToast('Failed to generate mind map', 'error');
    } finally {
      if (loading) loading.style.display = 'none';
      enableAIButtons();
    }
  }

  function buildMindmapTree(node, depth) {
    const wrapper = document.createElement('div');
    wrapper.className = 'mindmap-node';

    const hasChildren = node.children && node.children.length > 0;
    const labelClass = depth === 0 ? 'root' : depth === 1 ? 'level-1' : 'level-2';

    const label = document.createElement('div');
    label.className = `mindmap-node-label ${labelClass}`;
    label.innerHTML = `
      <span class="mindmap-toggle-icon">${hasChildren ? '▼' : '•'}</span>
      <span>${escapeHTML(node.name)}</span>
    `;
    wrapper.appendChild(label);

    if (hasChildren) {
      const children = document.createElement('div');
      children.className = 'mindmap-children';

      node.children.forEach(child => {
        children.appendChild(buildMindmapTree(child, depth + 1));
      });

      wrapper.appendChild(children);

      // Toggle expand/collapse
      const toggleIcon = label.querySelector('.mindmap-toggle-icon');
      label.addEventListener('click', () => {
        const collapsed = children.classList.toggle('collapsed');
        if (toggleIcon) toggleIcon.textContent = collapsed ? '▶' : '▼';
      });
    }

    return wrapper;
  }

  // ── Generate AI Notes Modal ───────────────────────────────
  if (generateNotesBtn) {
    generateNotesBtn.addEventListener('click', showGenerateNotesModal);
  }

  function showGenerateNotesModal() {
    if (document.getElementById('gen-notes-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'gen-notes-modal';
    modal.style.cssText = `
      position:fixed; top:0; left:0; right:0; bottom:0; z-index:10000;
      background:rgba(0,0,0,0.7); backdrop-filter:blur(12px);
      display:flex; align-items:center; justify-content:center;
      opacity:0; transition:opacity 0.3s ease;
    `;

    modal.innerHTML = `
      <div style="
        background:#141414; border:1px solid var(--border); border-radius:var(--radius-lg);
        width:100%; max-width:440px; padding:24px;
        box-shadow:0 20px 40px rgba(0,0,0,0.6);
        transform:translateY(20px); transition:transform 0.3s ease;
      " id="gen-notes-modal-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="font-size:16px;font-weight:700;margin:0">Generate Study Notes</h3>
          <button id="gen-modal-close" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px">×</button>
        </div>

        <form id="gen-notes-form" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Topic *</label>
            <input type="text" name="topic" required placeholder="e.g. Photosynthesis, Second Law, Big O"
              style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
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
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Level</label>
              <select name="level" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
                <option value="beginner">Beginner</option>
                <option value="intermediate" selected>Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>

          <button type="submit" id="gen-submit-btn" class="btn btn-primary" style="margin-top:8px;padding:12px;font-weight:700"><span>✦ Generate with Gemini</span></button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);
    modal.offsetHeight;
    modal.style.opacity = '1';
    document.getElementById('gen-notes-modal-content').style.transform = 'translateY(0)';

    const closeModal = () => {
      modal.style.opacity = '0';
      document.getElementById('gen-notes-modal-content').style.transform = 'translateY(20px)';
      setTimeout(() => modal.remove(), 300);
    };

    document.getElementById('gen-modal-close').addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    document.getElementById('gen-notes-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('gen-submit-btn');
      const span = submitBtn.querySelector('span');
      if (span) span.textContent = 'Generating study guide...';
      submitBtn.disabled = true;

      const formData = new FormData(e.target);
      try {
        const res = await window.EduVerseAPI.generateNotes(
          formData.get('topic'),
          formData.get('subject'),
          formData.get('level')
        );
        showToast('Study notes successfully generated!', 'success');
        closeModal();
        await loadNotesList();
        if (res && res.data) {
          selectNote(res.data);
          loadNotesList();
        }
      } catch (err) {
        showToast(err.message || 'Generation failed', 'error');
        if (span) span.textContent = '✦ Generate with Gemini';
        submitBtn.disabled = false;
      }
    });
  }

  // ── Drag & Drop / File Select Upload ─────────────────────
  if (uploadZone) {
    if (chooseFileBtn) {
      chooseFileBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!isUploading) triggerFileSelect();
      });
    }
    uploadZone.addEventListener('click', () => { if (!isUploading) triggerFileSelect(); });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!isUploading) uploadZone.classList.add('dragover');
    });
    uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragover'));
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');
      if (!isUploading) {
        const file = e.dataTransfer.files[0];
        if (file) handleFileUpload(file);
      }
    });
  }

  function triggerFileSelect() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.txt,.docx';
    fileInput.onchange = (e) => {
      if (e.target.files[0]) handleFileUpload(e.target.files[0]);
    };
    fileInput.click();
  }

  async function handleFileUpload(file) {
    if (!file || isUploading) return;
    isUploading = true;

    // Show progress UI immediately
    showUploadProgress();
    disableAIButtons();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', file.name.replace(/\.[^.]+$/, ''));

    // Auto-detect subject from filename
    const nameLower = file.name.toLowerCase();
    let subject = 'General Studies';
    if (nameLower.includes('math'))                          subject = 'Mathematics';
    else if (nameLower.includes('phys'))                     subject = 'Physics';
    else if (nameLower.includes('chem'))                     subject = 'Chemistry';
    else if (nameLower.includes('code') || nameLower.includes('computer')) subject = 'Computer Science';
    formData.append('subject', subject);

    try {
      // Use XHR for real upload progress
      const uploadedNote = await uploadWithProgress(formData);
      showUploadComplete();

      // Short pause so user can see "Upload complete."
      await new Promise(r => setTimeout(r, 800));
      resetUploadZone();
      showToast('Document uploaded and summarised! ✓', 'success');

      await loadNotesList();
      if (uploadedNote) {
        selectNote(uploadedNote);
        loadNotesList();
      }
    } catch (err) {
      console.error('[Upload]', err);
      resetUploadZone();
      showToast(`Upload failed: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      isUploading = false;
      enableAIButtons();
    }
  }

  function uploadWithProgress(formData) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const uploadUrl = (window.API_BASE_URL || 'http://127.0.0.1:5000/api') + '/notes/upload';
      xhr.open('POST', uploadUrl);

      // Inject custom session headers in dev mode
      const email = localStorage.getItem('userEmail');
      const name = localStorage.getItem('userName');
      if (email) xhr.setRequestHeader('X-User-Email', email);
      if (name) xhr.setRequestHeader('X-User-Name', name);

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          // Progress goes from 0 → 80% during upload; 80 → 100 during AI processing
          const pct = Math.round((e.loaded / e.total) * 80);
          setUploadProgress(pct);
          if (uploadStatusText) uploadStatusText.textContent = `Uploading... ${pct}%`;
        }
      });

      xhr.upload.addEventListener('load', () => {
        // Upload done, now AI is processing
        setUploadProgress(85);
        if (uploadStatusText) uploadStatusText.textContent = 'Analysing with AI...';

        // Animate from 85 → 98 to signal processing
        let p = 85;
        const tick = setInterval(() => {
          p = Math.min(p + 1, 98);
          setUploadProgress(p);
          if (p >= 98) clearInterval(tick);
        }, 200);
        xhr._analysisTick = tick;
      });

      xhr.addEventListener('load', () => {
        if (xhr._analysisTick) clearInterval(xhr._analysisTick);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            resolve(data.data || null);
          } catch {
            resolve(null);
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.message || `Upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        if (xhr._analysisTick) clearInterval(xhr._analysisTick);
        reject(new Error('Network error during upload'));
      });

      xhr.send(formData);
    });
  }

  // ── Utility: HTML Escape ──────────────────────────────────
  function escapeHTML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ── Initial Load ──────────────────────────────────────────
  resetActiveNoteView();
  
  async function initLoad() {
    await loadNotesList();
    const params = new URLSearchParams(window.location.search);
    const noteId = params.get('id');
    if (noteId && typeof window.EduVerseAPI !== 'undefined') {
      try {
        const res = await window.EduVerseAPI.getNote(noteId);
        if (res && res.success && res.data) {
          selectNote(res.data);
          loadNotesList();
        }
      } catch (e) {
        console.error('Failed to load note from URL parameter:', e);
      }
    }
  }
  
  initLoad();
});
