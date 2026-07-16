/* ============================================================
   EDUVERSE AI — QUIZ CENTER FRONTEND LOGIC
   ============================================================ */

'use strict';

// Shared config state
let selectedDifficulty = 'medium';
let selectedQCount     = 10;
let activeQuiz         = null;
let currentQuestionIdx = 0;
let userAnswers        = [];
let quizStartTime      = null;

// Expose difficulty & count setters to window for inline onclick triggers
window.setDifficulty = function(level, el) {
  selectedDifficulty = level;
  document.querySelectorAll('.difficulty-btn').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background = 'var(--bg-2)';
    b.style.color = 'var(--muted-light)';
  });
  el.style.borderColor = 'var(--primary)';
  el.style.background = 'var(--primary-glow)';
  el.style.color = 'var(--primary)';
};

window.setQCount = function(n, el) {
  selectedQCount = n;
  el.parentElement.querySelectorAll('button').forEach(b => {
    b.style.borderColor = 'var(--border)';
    b.style.background = 'var(--bg-2)';
    b.style.color = 'var(--muted-light)';
  });
  el.style.borderColor = 'var(--primary)';
  el.style.background = 'var(--primary-glow)';
  el.style.color = 'var(--primary)';
};

window.nextQuestion = function() {
  showToast('Please generate a quiz using the panel on the left first!', 'info');
};

window.askAboutThis = function() {
  const explanationEl = document.querySelector('#quiz-explanation div:nth-child(2)') || document.querySelector('#quiz-explanation');
  const explanationText = explanationEl ? explanationEl.textContent.trim() : 'the Second Law of Thermodynamics';
  const prompt = `Can you elaborate on this thermodynamics concept?\n\nExplanation: "${explanationText}"`;
  localStorage.setItem('pending_mentor_prompt', prompt);
  window.location.href = 'ai-mentor.html';
};

// ── Auto-start from Notes Assistant redirect ─────────────────
window._preloadedQuizId = new URLSearchParams(window.location.search).get('quizId') || null;

document.addEventListener('DOMContentLoaded', async () => {
  const generateQuizBtn  = document.getElementById('generate-quiz-btn');
  const quizSubjectSelect = document.getElementById('quiz-subject');
  const quizTopicInput   = document.getElementById('quiz-topic');
  const quizPlaceholder  = document.getElementById('quiz-placeholder');
  const quizArea         = document.getElementById('quiz-area');
  const pastScoresList   = document.getElementById('past-scores-list');

  // ── Load Attempts ──────────────────────────────────────────
  async function loadAttempts() {
    if (!pastScoresList) return;

    try {
      if (typeof window.EduVerseAPI === 'undefined') return;
      const res = await window.EduVerseAPI.getAttempts();
      if (res && res.success && res.data) {
        pastScoresList.innerHTML = '';
        const attempts = res.data;

        if (attempts.length === 0) {
          pastScoresList.innerHTML = `
            <div style="text-align:center;padding:12px;color:var(--muted);font-size:12px">
              No quiz attempts yet.
            </div>
          `;
          return;
        }

        attempts.slice(0, 5).forEach(att => {
          const div = document.createElement('div');
          div.style.cssText = `
            display:flex;
            justify-content:space-between;
            align-items:center;
            padding:10px;
            background:var(--bg-2);
            border-radius:var(--radius);
          `;

          // Format Date
          const dateStr = new Date(att.completedAt).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric'
          });

          // Determine score color
          let scoreColor = 'var(--warning)';
          if (att.score >= 80) scoreColor = 'var(--primary)';
          else if (att.score >= 60) scoreColor = 'var(--emerald)';

          div.innerHTML = `
            <div>
              <div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">
                ${att.quizTitle || 'Quiz'}
              </div>
              <div style="font-size:11px;color:var(--muted)">
                ${dateStr} · ${att.totalQuestions} questions
              </div>
            </div>
            <div style="font-size:16px;font-weight:800;color:${scoreColor}">
              ${att.score}%
            </div>
          `;
          pastScoresList.appendChild(div);
        });
      }
    } catch (error) {
      console.error('[Quiz] loadAttempts failed:', error);
    }
  }

  loadAttempts();

  // ── Auto-load quiz if redirected from Notes Assistant ─────
  if (window._preloadedQuizId) {
    const preloadId = window._preloadedQuizId;
    window._preloadedQuizId = null;

    // Show loading state immediately
    if (quizPlaceholder) {
      quizPlaceholder.innerHTML = `
        <div style="font-size:48px;margin-bottom:20px">⚡</div>
        <div style="font-size:20px;font-weight:700;margin-bottom:10px">Loading your Quiz…</div>
        <div style="display:flex;gap:6px;justify-content:center;margin-top:16px">
          <span style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:pulse-green 1s 0s infinite"></span>
          <span style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:pulse-green 1s 0.2s infinite"></span>
          <span style="width:8px;height:8px;border-radius:50%;background:var(--primary);animation:pulse-green 1s 0.4s infinite"></span>
        </div>
      `;
    }

    try {
      if (typeof window.EduVerseAPI === 'undefined') throw new Error('API not loaded');
      const res = await window.EduVerseAPI.getQuiz(preloadId);
      if (res && res.success && res.data) {
        activeQuiz = res.data;
        currentQuestionIdx = 0;
        userAnswers = [];
        quizStartTime = Date.now();

        if (quizPlaceholder) quizPlaceholder.style.display = 'none';
        if (quizArea) {
          quizArea.style.display = 'block';
          quizArea.style.animation = 'fadeInUp 0.5s ease';
        }
        showToast(`Quiz loaded from your notes! Good luck 🎯`, 'success');
        renderCurrentQuestion();
      } else {
        throw new Error('Failed to load quiz');
      }
    } catch (err) {
      console.error('[Quiz] Auto-load failed:', err);
      if (quizPlaceholder) {
        quizPlaceholder.innerHTML = `
          <div style="font-size:48px;margin-bottom:20px">⚡</div>
          <div style="font-size:20px;font-weight:700;margin-bottom:10px">Ready to Test Yourself?</div>
          <div style="font-size:14px;color:var(--danger);margin-bottom:8px">⚠️ Could not load the pre-generated quiz.</div>
          <div style="font-size:14px;color:var(--muted-light);max-width:320px">Configure your quiz options on the left and click Generate Quiz.</div>
        `;
      }
    }
  }

  // ── Generate Quiz ──────────────────────────────────────────
  if (generateQuizBtn) {
    generateQuizBtn.addEventListener('click', async () => {
      const topic = quizTopicInput ? quizTopicInput.value.trim() : '';
      const subject = quizSubjectSelect ? quizSubjectSelect.value : '';

      if (!topic || !subject) {
        showToast('Please fill in Topic and Subject', 'error');
        return;
      }

      const generateBtnSpan = generateQuizBtn.querySelector('span');
      if (generateBtnSpan) {
        generateQuizBtn.disabled = true;
        generateQuizBtn.innerHTML = `<span><span style="width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block;margin-right:6px"></span>Generating quiz...</span>`;
      }

      try {
        const res = await window.EduVerseAPI.generateQuiz(topic, subject, selectedDifficulty, selectedQCount);
        if (res && res.success && res.data) {
          activeQuiz = res.data;
          currentQuestionIdx = 0;
          userAnswers = [];
          quizStartTime = Date.now();

          if (quizPlaceholder) quizPlaceholder.style.display = 'none';
          if (quizArea) {
            quizArea.style.display = 'block';
            quizArea.style.animation = 'fadeInUp 0.5s ease';
          }
          showToast('Quiz generated! Good luck 🎯', 'success');
          renderCurrentQuestion();
        } else {
          throw new Error('Malformed quiz payload');
        }
      } catch (err) {
        console.error(err);
        showToast(err.message || 'Failed to generate quiz', 'error');
      } finally {
        if (generateQuizBtn) {
          generateQuizBtn.disabled = false;
          generateQuizBtn.innerHTML = `<span>✦ Generate Quiz</span>`;
        }
      }
    });
  }

  // ── Render Question ─────────────────────────────────────────
  function renderCurrentQuestion() {
    if (!activeQuiz || !activeQuiz.questions || !activeQuiz.questions[currentQuestionIdx]) return;

    const question = activeQuiz.questions[currentQuestionIdx];
    const totalQs = activeQuiz.questions.length;
    const progressPercent = ((currentQuestionIdx + 1) / totalQs) * 100;

    // Header info
    quizArea.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:18px;font-weight:800">${activeQuiz.title}</div>
          <div style="font-size:13px;color:var(--muted-light)">${activeQuiz.subject} · ${activeQuiz.difficulty}</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="font-size:14px;font-weight:600">Q ${currentQuestionIdx + 1} / ${totalQs}</div>
          <div style="width:120px;height:6px;background:var(--border);border-radius:var(--radius-full)">
            <div style="width:${progressPercent}%;height:100%;background:var(--primary);border-radius:var(--radius-full);transition:width 0.5s ease"></div>
          </div>
        </div>
      </div>

      <div class="content-card">
        <div class="content-card-body" style="padding:32px">
          <div style="font-size:12px;font-weight:600;color:var(--primary);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px">Question ${currentQuestionIdx + 1}</div>
          <div style="font-size:18px;font-weight:700;line-height:1.5;margin-bottom:28px">${window.cleanLatexAndMarkdown ? window.cleanLatexAndMarkdown(question.question) : question.question}</div>

          <div style="display:flex;flex-direction:column;gap:10px" id="quiz-options">
            ${question.options.map((opt, oIdx) => {
              const letters = ['A', 'B', 'C', 'D', 'E'];
              const cleanOpt = window.cleanLatexAndMarkdown ? window.cleanLatexAndMarkdown(opt) : opt;
              return `
                <div class="quiz-option" data-correct="${oIdx === question.correctIndex}" data-idx="${oIdx}">
                  <div class="quiz-option-letter">${letters[oIdx] || '•'}</div>
                  ${cleanOpt}
                </div>
              `;
            }).join('')}
          </div>

          <!-- Explanation Panel (hidden initially) -->
          <div id="quiz-explanation" style="display:none;margin-top:24px;padding:20px;background:var(--primary-glow);border:1px solid rgba(124,255,79,0.2);border-radius:var(--radius-lg)">
            <div style="font-size:13px;font-weight:700;color:var(--primary);margin-bottom:8px">✦ Explanation</div>
            <div style="font-size:14px;color:var(--text-80);line-height:1.7" id="quiz-explanation-text">${window.cleanLatexAndMarkdown ? window.cleanLatexAndMarkdown(question.explanation || 'No explanation provided.') : (question.explanation || 'No explanation provided.')}</div>
            <div style="margin-top:16px;display:flex;gap:10px">
              <button class="btn btn-outline btn-sm" id="btn-ask-elaborate">Ask AI to elaborate</button>
              <button class="btn btn-primary btn-sm" id="btn-next-question">
                <span>${currentQuestionIdx + 1 === totalQs ? 'Submit Quiz ✓' : 'Next Question →'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Hook up option selection click handler
    const optionDivs = document.querySelectorAll('.quiz-option');
    let optionSelected = false;

    optionDivs.forEach(optDiv => {
      optDiv.addEventListener('click', () => {
        if (optionSelected) return; // Prevent multiple clicks
        optionSelected = true;

        const selectedIdx = parseInt(optDiv.dataset.idx);
        userAnswers.push(selectedIdx);

        // Highlight selected, correct and incorrect
        optionDivs.forEach(div => {
          div.style.pointerEvents = 'none';
          const divIdx = parseInt(div.dataset.idx);
          if (divIdx === question.correctIndex) {
            div.classList.add('correct');
          } else if (divIdx === selectedIdx) {
            div.classList.add('wrong');
          }
        });

        if (selectedIdx === question.correctIndex) {
          showToast('Correct answer! 🎉', 'success');
        } else {
          showToast('Oops, incorrect.', 'error');
        }

        // Show Explanation
        const explanationPanel = document.getElementById('quiz-explanation');
        if (explanationPanel) {
          explanationPanel.style.display = 'block';
          explanationPanel.style.animation = 'fadeInUp 0.4s ease';
        }

        // Hook up elaborate button
        const elaborateBtn = document.getElementById('btn-ask-elaborate');
        if (elaborateBtn) {
          elaborateBtn.addEventListener('click', () => {
            const prompt = `Can you elaborate on this quiz question?\n\nQuestion: "${question.question}"\nExplanation: "${question.explanation || 'No explanation provided.'}"`;
            localStorage.setItem('pending_mentor_prompt', prompt);
            window.location.href = `ai-mentor.html`;
          });
        }

        // Hook up next/submit button
        const nextBtn = document.getElementById('btn-next-question');
        if (nextBtn) {
          nextBtn.addEventListener('click', () => {
            if (currentQuestionIdx + 1 === totalQs) {
              submitFinalAnswers();
            } else {
              currentQuestionIdx++;
              renderCurrentQuestion();
            }
          });
        }
      });
    });
  }

  // ── Submit Quiz ─────────────────────────────────────────────
  async function submitFinalAnswers() {
    if (!activeQuiz) return;
    
    // Disable next button if exists during submission
    const nextBtn = document.getElementById('btn-next-question');
    if (nextBtn) {
      nextBtn.disabled = true;
      nextBtn.innerHTML = `<span style="display:flex;align-items:center;gap:6px"><span style="width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block"></span> Submitting...</span>`;
    }

    const durationSeconds = Math.round((Date.now() - quizStartTime) / 1000);

    try {
      const res = await window.EduVerseAPI.submitQuiz(activeQuiz.id, userAnswers, durationSeconds);
      if (res && res.success && res.data) {
        showToast('✓ Quiz submitted successfully', 'success');
        const payload = res.data;
        
        // Render Score Board
        quizArea.innerHTML = `
          <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:48px 24px;background:var(--card);border:1px solid var(--border);border-radius:var(--radius-xl);text-align:center">
            <div style="font-size:64px;margin-bottom:16px">🏆</div>
            <h2 style="font-size:24px;font-weight:800;margin-bottom:8px;color:#fff">Quiz Completed!</h2>
            <div style="font-size:48px;font-weight:900;color:var(--primary);margin-bottom:12px">${payload.score}%</div>
            
            <div style="font-size:15px;color:var(--muted-light);margin-bottom:28px">
              You answered <strong>${payload.correctCount}</strong> out of <strong>${payload.totalQuestions}</strong> questions correctly.
            </div>

            <div style="display:flex;gap:12px">
              <button class="btn btn-outline" id="btn-restart-quiz">Back to Settings</button>
              <a href="dashboard.html" class="btn btn-primary"><span>Go to Dashboard</span></a>
            </div>
          </div>
        `;

        document.getElementById('btn-restart-quiz').addEventListener('click', () => {
          if (quizArea) quizArea.style.display = 'none';
          if (quizPlaceholder) quizPlaceholder.style.display = 'flex';
          activeQuiz = null;
        });

        // Refresh scores panel
        loadAttempts();
      } else {
        throw new Error('Submission failed');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to submit quiz', 'error');
      if (nextBtn) {
        nextBtn.disabled = false;
        nextBtn.textContent = 'Submit Quiz ✓';
      }
    }
  }
});
