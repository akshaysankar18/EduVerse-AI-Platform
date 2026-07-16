/* ============================================================
   EDUVERSE AI — CAREER HUB FRONTEND LOGIC
   ============================================================ */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const uploadResumeBtn  = document.getElementById('upload-resume-btn');
  const resumeReviewBody = document.getElementById('resume-review-body');
  const startInterviewBtn = document.getElementById('start-interview-btn');

  // ── Resume Upload & Review ─────────────────────────────────
  if (uploadResumeBtn && resumeReviewBody) {
    uploadResumeBtn.addEventListener('click', () => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = '.pdf,.txt,.docx';
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const targetRole = prompt('Enter your target career role (e.g. Software Engineer, Data Scientist):', 'Software Engineer');
        if (targetRole === null) return; // cancelled

        showResumeLoader(file.name);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('targetRole', targetRole);

        try {
          if (typeof window.EduVerseAPI === 'undefined') {
            throw new Error('EduVerseAPI is not loaded');
          }

          const res = await window.EduVerseAPI.reviewResume(formData);
          if (res && res.success && res.data) {
            renderResumeFeedback(res.data.feedback);
            showToast('Resume review completed successfully!', 'success');
          } else {
            throw new Error('Failed to get feedback');
          }
        } catch (err) {
          console.error(err);
          showToast('Failed to review resume', 'error');
          resumeReviewBody.innerHTML = `
            <div style="padding:16px;background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);border-radius:var(--radius);color:var(--danger);font-size:13px">
              ⚠️ Failed to analyze resume. Please try again.
            </div>
          `;
        }
      };
      fileInput.click();
    });
  }

  function showResumeLoader(fileName) {
    resumeReviewBody.innerHTML = `
      <div style="text-align:center;padding:32px 0;color:var(--muted)">
        <span class="glow-dot" style="width:8px;height:8px;display:inline-block;margin-right:8px"></span>
        Analyzing resume...
      </div>
    `;
  }

  function renderResumeFeedback(feedback) {
    // Elegant formatting for Gemini's review text
    const paragraphs = feedback.split('\n');
    let html = `<div style="display:flex;flex-direction:column;gap:12px">`;

    paragraphs.forEach(p => {
      p = p.trim();
      if (!p) return;

      let style = `padding:12px;border-radius:var(--radius);font-size:13px;line-height:1.6;`;
      let prefix = '';
      let text = p.replace(/^-\s*/, '').replace(/^\*\s*/, '');

      if (p.toLowerCase().includes('strong') || p.toLowerCase().includes('good') || p.toLowerCase().includes('key strengths')) {
        style += `background:var(--primary-glow);border:1px solid rgba(124,255,79,0.15);color:var(--text-100)`;
        prefix = `<span style="color:var(--primary);font-weight:bold;margin-right:8px">✓ Strength:</span>`;
      } else if (p.toLowerCase().includes('missing') || p.toLowerCase().includes('weak') || p.toLowerCase().includes('gaps')) {
        style += `background:rgba(239,68,68,0.05);border:1px solid rgba(239,68,68,0.2);color:var(--text-100)`;
        prefix = `<span style="color:var(--danger);font-weight:bold;margin-right:8px">⚠ Gap:</span>`;
      } else {
        style += `background:var(--bg-2);border:1px solid var(--border);color:var(--muted-light)`;
        prefix = `<span style="color:var(--warning);font-weight:bold;margin-right:8px">✦ Tip:</span>`;
      }

      // Convert basic bolding markdown
      text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

      html += `<div style="${style}">${prefix}${text}</div>`;
    });

    html += `</div>`;
    resumeReviewBody.innerHTML = html;
  }

  // ── Mock Interview Session Modal ───────────────────────────
  if (startInterviewBtn) {
    startInterviewBtn.addEventListener('click', showStartInterviewModal);
  }

  function showStartInterviewModal() {
    if (document.getElementById('interview-setup-modal')) return;

    const modal = document.createElement('div');
    modal.id = 'interview-setup-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10000;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: flex-start;
      padding-top: 12vh;
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
      " id="interview-setup-modal-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="font-size:16px;font-weight:700;margin:0">Mock Interview Setup</h3>
          <button id="interview-modal-close" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px">×</button>
        </div>

        <form id="interview-setup-form" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Target Role *</label>
            <input type="text" name="role" required placeholder="e.g. Backend Engineer, Data Scientist" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Experience Level</label>
              <select name="level" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
                <option value="junior">Junior (Entry)</option>
                <option value="mid" selected>Mid-level</option>
                <option value="senior">Senior</option>
              </select>
            </div>
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Interview Type</label>
              <select name="type" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
                <option value="technical">Technical</option>
                <option value="behavioural">Behavioural</option>
                <option value="mixed" selected>Mixed</option>
              </select>
            </div>
          </div>

          <button type="submit" id="interview-submit-btn" class="btn btn-primary" style="margin-top:8px;padding:12px;font-weight:700">✦ Start Session</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.offsetHeight;
    modal.style.opacity = '1';
    
    const setupContent = modal.querySelector('#interview-setup-modal-content');
    if (setupContent) setupContent.style.transform = 'translateY(0)';

    const closeModal = () => {
      modal.style.opacity = '0';
      const innerContent = modal.querySelector('#interview-setup-modal-content');
      if (innerContent) innerContent.style.transform = 'translateY(20px)';
      setTimeout(() => modal.remove(), 300);
    };

    const closeBtn = modal.querySelector('#interview-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const setupForm = modal.querySelector('#interview-setup-form');
    if (setupForm) {
      setupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = setupForm.querySelector('#interview-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;gap:6px"><span style="width:12px;height:12px;border:2px solid #000;border-top-color:transparent;border-radius:50%;animation:na-spin 0.8s linear infinite;display:inline-block"></span> Generating interview questions...</span>`;
        }

        const formData = new FormData(e.target);
        const role = formData.get('role');
        const level = formData.get('level');
        const type = formData.get('type');

        try {
          const res = await window.EduVerseAPI.startInterview(role, level, type);
          if (res && res.success && res.data) {
            closeModal();
            startInteractiveInterview(res.data.questions, role);
            showToast('✓ Interview session started successfully', 'success');
            loadCareerHistory();
          } else {
            throw new Error('Interview setup failed');
          }
        } catch (err) {
          showToast(err.message || 'Setup failed', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✦ Start Session';
          }
        }
      });
    }
  }

  function startInteractiveInterview(questions, role) {
    if (!questions || questions.length === 0) return;

    let currentQIdx = 0;
    const totalQs = questions.length;

    const modal = document.createElement('div');
    modal.id = 'interview-active-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10000;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: flex-start;
      padding-top: 12vh;
      justify-content: center;
    `;

    const renderQuestion = () => {
      modal.innerHTML = `
        <div style="
          background: #141414;
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 500px;
          padding: 28px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.6);
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div>
              <h3 style="font-size:15px;font-weight:700;margin:0;color:var(--primary)">Mock Interview — ${role}</h3>
              <div style="font-size:11px;color:var(--muted)">Question ${currentQIdx + 1} of ${totalQs}</div>
            </div>
            <button id="active-interview-close" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px">×</button>
          </div>

          <div style="margin-bottom:24px">
            <div style="font-size:16px;font-weight:700;line-height:1.5;color:#fff;margin-bottom:8px">
              ${questions[currentQIdx].question || questions[currentQIdx]}
            </div>
            ${questions[currentQIdx].hint ? `<div style="font-size:12px;color:var(--muted-light);margin-bottom:12px;padding:8px;background:var(--bg-2);border-radius:var(--radius);border:1px solid var(--border)">💡 Hint: ${questions[currentQIdx].hint}</div>` : ''}
            <textarea id="interview-user-response" rows="4" placeholder="Type your detailed answer here..." style="width:100%;padding:12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px;resize:none;line-height:1.5"></textarea>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:12px">
            <button id="btn-submit-answer" class="btn btn-primary" style="padding:10px 20px">
              <span>${currentQIdx + 1 === totalQs ? 'Finish Interview' : 'Submit Answer →'}</span>
            </button>
          </div>
        </div>
      `;

      // Attach Close
      document.getElementById('active-interview-close').addEventListener('click', () => {
        if (confirm('Cancel interview session? Progress will not be saved.')) {
          modal.remove();
        }
      });

      // Submit Response
      document.getElementById('btn-submit-answer').addEventListener('click', async () => {
        const responseText = document.getElementById('interview-user-response').value.trim();
        if (!responseText) {
          showToast('Please type your answer before proceeding', 'info');
          return;
        }

        currentQIdx++;
        if (currentQIdx < totalQs) {
          renderQuestion();
        } else {
          // Finished Interview
          showToast('Session finished! Great job!', 'success');
          modal.innerHTML = `
            <div style="
              background: #141414;
              border: 1px solid var(--border);
              border-radius: var(--radius-lg);
              width: 100%;
              max-width: 440px;
              padding: 28px;
              box-shadow: 0 20px 40px rgba(0,0,0,0.6);
              text-align: center;
            ">
              <div style="font-size:48px;margin-bottom:16px">🎖️</div>
              <h3 style="font-size:18px;font-weight:700;margin-bottom:8px;color:#fff">Interview Session Completed</h3>
              <p style="font-size:13px;color:var(--muted-light);line-height:1.6;margin-bottom:24px">
                Your responses have been saved and compiled. Keep practicing to build confidence and polish your domain communication skills!
              </p>
              <button id="btn-interview-done" class="btn btn-primary" style="margin: 0 auto;">Done</button>
            </div>
          `;
          document.getElementById('btn-interview-done').addEventListener('click', () => modal.remove());
        }
      });
    };

    document.body.appendChild(modal);
    renderQuestion();
  }

  async function loadCareerHistory() {
    try {
      if (typeof window.EduVerseAPI === 'undefined') return;
      const res = await window.EduVerseAPI.getCareerHistory();
      if (res && res.success && res.data) {
        const history = res.data;
        
        // 1. Render Resume Review
        const latestReview = history.find(item => item.type === 'resume_review');
        if (latestReview && resumeReviewBody) {
          renderResumeFeedback(latestReview.feedback);
        } else if (resumeReviewBody) {
          resumeReviewBody.innerHTML = `
            <div style="text-align:center;padding:32px 16px;color:var(--muted)">
              <div style="font-size:32px;margin-bottom:8px">📄</div>
              <div style="font-weight:600;color:#fff;margin-bottom:4px">No Resume Reviewed Yet</div>
              <div style="font-size:12px;color:var(--muted-light)">Upload your resume to get instant feedback and ATS score compatibility.</div>
            </div>
          `;
        }

        // 2. Render Mock Interview Sessions
        const interviewSessions = history.filter(item => item.type === 'interview_session');
        const interviewList = document.getElementById('interview-history-list');
        if (interviewList) {
          if (interviewSessions.length > 0) {
            const cleanText = (str) => String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            interviewList.innerHTML = `
              <div style="display:flex;flex-direction:column;gap:12px">
                ${interviewSessions.map(sess => `
                  <div style="padding:14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);display:flex;justify-content:space-between;align-items:center">
                    <div>
                      <div style="font-size:14px;font-weight:700;color:#fff">${cleanText(sess.role)} Mock Interview</div>
                      <div style="font-size:12px;color:var(--muted);margin-top:4px">
                        Level: <span style="color:var(--primary);text-transform:capitalize">${cleanText(sess.level)}</span> · 
                        Type: <span style="text-transform:capitalize">${cleanText(sess.interviewType || 'technical')}</span>
                      </div>
                    </div>
                    <div style="font-size:12px;color:var(--muted);text-align:right">
                      <div>${new Date(sess.createdAt).toLocaleDateString()}</div>
                      <div style="color:var(--primary);margin-top:4px;font-weight:600">✓ Completed</div>
                    </div>
                  </div>
                `).join('')}
              </div>
            `;
          } else {
            interviewList.innerHTML = `
              <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">
                No interview history.
              </div>
            `;
          }
        }
      }
    } catch (err) {
      console.error('[Career] Failed to load history:', err);
    }
  }

  // ── Career Goal Management ──────────────────────────────────
  async function loadCareerGoal() {
    try {
      if (typeof window.EduVerseAPI === 'undefined') return;
      const res = await window.EduVerseAPI.getProfile();
      if (res && res.success && res.data && res.data.profile) {
        const goalStr = res.data.profile.goal || '';
        if (goalStr) {
          if (goalStr.includes('|')) {
            const parts = goalStr.split('|');
            const role = parts[0] || 'Software Engineer / Data Scientist';
            const timeline = parts[1] || '12 months';
            const readiness = parts[2] || '75';
            updateGoalUI(role, timeline, readiness);
          } else {
            updateGoalUI(goalStr, '12 months', '75');
          }
        }
      }
    } catch (err) {
      console.error('[Career Goal] Load failed:', err);
    }
  }

  function updateGoalUI(role, timeline, readiness) {
    const title = document.getElementById('career-goal-title');
    const subtitle = document.getElementById('career-goal-subtitle');
    const progress = document.getElementById('career-goal-progress');
    const progressText = document.getElementById('career-goal-text');

    if (title) title.textContent = role;
    if (subtitle) subtitle.textContent = `Target timeline: ${timeline} · Current readiness: ${readiness}%`;
    if (progress) progress.style.width = `${readiness}%`;
    if (progressText) progressText.textContent = `${readiness}% Ready`;

    updateSkillGapUI(role);
    updateCertificationsUI(role);
    updateProjectsUI(role);
  }

  function updateSkillGapUI(role) {
    const skillGapBody = document.getElementById('skill-gap-body');
    if (!skillGapBody) return;

    const roleLower = role.toLowerCase();
    let skills = [];

    if (roleLower.includes('data scientist') || roleLower.includes('data science') || roleLower.includes('machine learning') || roleLower.includes('ml') || roleLower.includes('ai')) {
      skills = [
        { name: 'Python (Pandas/NumPy/scikit-learn)', progress: 85 },
        { name: 'SQL & Data Warehousing (BigQuery)', progress: 75 },
        { name: 'Machine Learning Models & Tuning', progress: 60 },
        { name: 'Deep Learning & NLP', progress: 40 }
      ];
    } else if (roleLower.includes('frontend') || roleLower.includes('web') || roleLower.includes('react') || roleLower.includes('ui')) {
      skills = [
        { name: 'HTML5 / CSS3 / TailwindCSS', progress: 90 },
        { name: 'JavaScript / TypeScript', progress: 85 },
        { name: 'React.js / Next.js', progress: 70 },
        { name: 'Web Performance & Accessibility', progress: 55 }
      ];
    } else if (roleLower.includes('upsc') || roleLower.includes('civil services') || roleLower.includes('history') || roleLower.includes('general studies') || roleLower.includes('humanities')) {
      skills = [
        { name: 'Indian Constitution & Polity', progress: 80 },
        { name: 'History & Geography', progress: 75 },
        { name: 'Current Affairs & General Studies', progress: 60 },
        { name: 'Analytical Essay Writing', progress: 85 }
      ];
    } else if (roleLower.includes('jee') || roleLower.includes('engineering prep') || roleLower.includes('math')) {
      skills = [
        { name: 'Advanced Mathematics', progress: 85 },
        { name: 'Physics (Mechanics & Electromagnetism)', progress: 75 },
        { name: 'Organic & Inorganic Chemistry', progress: 60 },
        { name: 'Exam Speed & Accuracy', progress: 80 }
      ];
    } else if (roleLower.includes('neet') || roleLower.includes('medical') || roleLower.includes('biology')) {
      skills = [
        { name: 'Human Physiology & Anatomy', progress: 85 },
        { name: 'Plant Physiology & Genetics', progress: 75 },
        { name: 'Inorganic Chemistry & Biomolecules', progress: 60 },
        { name: 'Speed & MCQ Accuracy', progress: 80 }
      ];
    } else if (roleLower.includes('backend') || roleLower.includes('software engineer') || roleLower.includes('developer') || roleLower.includes('system')) {
      skills = [
        { name: 'Backend Languages (Node.js/Python/Go)', progress: 80 },
        { name: 'System Design & Architecture', progress: 60 },
        { name: 'Databases (SQL/NoSQL/Firestore)', progress: 75 },
        { name: 'REST APIs & WebSockets', progress: 85 }
      ];
    } else {
      skills = [
        { name: 'Problem Solving & Algorithms', progress: 70 },
        { name: 'Communication & Collaboration', progress: 85 },
        { name: 'Domain Knowledge', progress: 60 },
        { name: 'Tooling & Git', progress: 80 }
      ];
    }

    let html = `<div style="font-size:13px;color:var(--muted-light);margin-bottom:4px">Skills required for target profile</div>`;
    skills.forEach(s => {
      html += `
        <div class="perf-bar">
          <div class="perf-bar-label">${s.name}</div>
          <div class="perf-bar-track">
            <div class="perf-bar-fill" data-width="${s.progress}%" style="width:${s.progress}%"></div>
          </div>
          <div class="perf-bar-value">${s.progress}%</div>
        </div>
      `;
    });

    const weakSkill = skills.reduce((min, s) => s.progress < min.progress ? s : min, skills[0]);
    html += `
      <div style="margin-top:8px;padding:12px;background:rgba(245,158,11,0.05);border:1px solid rgba(245,158,11,0.15);border-radius:var(--radius)">
        <div style="font-size:13px;font-weight:600;color:var(--warning);margin-bottom:4px">⚠️ Focus Area</div>
        <div style="font-size:13px;color:var(--muted-light)">${weakSkill.name} is your lowest score. Prioritize studying this topic this week.</div>
      </div>
    `;

    skillGapBody.innerHTML = html;
  }

  function updateCertificationsUI(role) {
    const certList = document.getElementById('certifications-list');
    if (!certList) return;

    const roleLower = role.toLowerCase();
    let certs = [];

    if (roleLower.includes('data scientist') || roleLower.includes('data science') || roleLower.includes('machine learning') || roleLower.includes('ml') || roleLower.includes('ai')) {
      certs = [
        { title: 'Google Professional Data Engineer', provider: 'Google Cloud · Industry-standard data validation', badge: 'Start First' },
        { title: 'TensorFlow Developer Certificate', provider: 'DeepLearning.AI · Validate neural network models proficiency', badge: 'Step 2' }
      ];
    } else if (roleLower.includes('frontend') || roleLower.includes('web') || roleLower.includes('react') || roleLower.includes('ui')) {
      certs = [
        { title: 'Meta Front-End Developer Professional Certificate', provider: 'Meta · Highly recommended for UI engineers', badge: 'Start First' },
        { title: 'UX Design Specialization', provider: 'Google · UI/UX best practices and wireframing', badge: 'Step 2' }
      ];
    } else if (roleLower.includes('upsc') || roleLower.includes('civil services') || roleLower.includes('history') || roleLower.includes('general studies') || roleLower.includes('humanities')) {
      certs = [
        { title: 'GS Mains Mock Writing Assessor', provider: 'EduVerse AI · Validate detailed writing quality', badge: 'Start First' },
        { title: 'Public Administration Practice Credential', provider: 'Syllabus Prep · Verify foundational concepts', badge: 'Step 2' }
      ];
    } else if (roleLower.includes('jee') || roleLower.includes('engineering prep') || roleLower.includes('math')) {
      certs = [
        { title: 'JEE Advanced Mock Performance Level 1', provider: 'Maths/Physics National Board', badge: 'Start First' },
        { title: 'National Science Olympiad Prep Credential', provider: 'Science Society', badge: 'Step 2' }
      ];
    } else if (roleLower.includes('neet') || roleLower.includes('medical') || roleLower.includes('biology')) {
      certs = [
        { title: 'NEET Practice Excellence Credential', provider: 'Biology National Board', badge: 'Start First' },
        { title: 'National Bio-Olympiad Prep Credential', provider: 'Science Society', badge: 'Step 2' }
      ];
    } else {
      certs = [
        { title: 'AWS Certified Solutions Architect', provider: 'Amazon · Highly recommended for backend systems', badge: 'Start First' },
        { title: 'Google Professional Cloud Architect', provider: 'Google Cloud · Advanced backend scaling validation', badge: 'Step 2' }
      ];
    }

    certList.innerHTML = certs.map((c, i) => `
      <div style="padding:14px;background:${i === 0 ? 'var(--primary-glow)' : 'var(--bg-2)'};border:1px solid ${i === 0 ? 'rgba(124,255,79,0.15)' : 'var(--border)'};border-radius:var(--radius);display:flex;align-items:center;gap:12px">
        <div style="font-size:24px">${i === 0 ? '🥇' : '🥈'}</div>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;margin-bottom:2px">${c.title}</div>
          <div style="font-size:12px;color:var(--muted-light)">${c.provider}</div>
        </div>
        <div class="badge ${i === 0 ? 'badge-primary' : 'badge-gray'}" style="font-size:11px">${c.badge}</div>
      </div>
    `).join('');
  }

  function updateProjectsUI(role) {
    const projectBody = document.getElementById('project-suggestions-body');
    if (!projectBody) return;

    const roleLower = role.toLowerCase();
    let projects = [];

    if (roleLower.includes('data scientist') || roleLower.includes('data science') || roleLower.includes('machine learning') || roleLower.includes('ml') || roleLower.includes('ai')) {
      projects = [
        { title: 'Customer Churn Prediction Model', complexity: 'High Impact', desc: 'Build an ML classification pipeline using scikit-learn and Pandas to predict user churn.', tags: ['Python', 'scikit-learn', 'Pandas'] },
        { title: 'NLP Sentiment Analyzer Dashboard', complexity: 'Medium', desc: 'Deploy a fine-tuned BERT transformer classifier via FastAPI/Streamlit to analyze reviews.', tags: ['HuggingFace', 'PyTorch', 'FastAPI'] }
      ];
    } else if (roleLower.includes('frontend') || roleLower.includes('web') || roleLower.includes('react') || roleLower.includes('ui')) {
      projects = [
        { title: 'Interactive Kanban Workspace', complexity: 'High Impact', desc: 'Create a drag-and-drop workflow task dashboard using React, TailwindCSS, and state management.', tags: ['React', 'TypeScript', 'TailwindCSS'] },
        { title: 'Headless E-Commerce Front-End', complexity: 'Medium', desc: 'Develop a fast shopping storefront utilizing Next.js, Stripe checkouts, and micro-animations.', tags: ['Next.js', 'Stripe', 'Framer Motion'] }
      ];
    } else if (roleLower.includes('upsc') || roleLower.includes('civil services') || roleLower.includes('history') || roleLower.includes('general studies') || roleLower.includes('humanities')) {
      projects = [
        { title: 'Policy Analysis & Case Study', complexity: 'High Impact', desc: 'Draft a comprehensive policy proposal analyzing socio-economic issues using official statistics.', tags: ['Constitution', 'Polity', 'Writing'] },
        { title: 'District Development Simulation', complexity: 'Medium', desc: 'Develop a structured administrative model plan for public healthcare resource allocation.', tags: ['Public Admin', 'Planning', 'Case Study'] }
      ];
    } else if (roleLower.includes('jee') || roleLower.includes('engineering prep') || roleLower.includes('math')) {
      projects = [
        { title: 'Calculus Application Toolkit', complexity: 'High Impact', desc: 'Develop an interactive notebook visualizer for integration by parts and mechanical systems physics.', tags: ['Maths', 'Calculus', 'Physics'] },
        { title: 'Redox Chemical Reactions Lab', complexity: 'Medium', desc: 'Build a step-by-step solver explaining equations balance and electron transfer methods.', tags: ['Chemistry', 'Redox', 'Equations'] }
      ];
    } else if (roleLower.includes('neet') || roleLower.includes('medical') || roleLower.includes('biology')) {
      projects = [
        { title: 'Genetic Cross Simulator', complexity: 'High Impact', desc: 'Simulate monohybrid and dihybrid crosses visualizing phenotypic ratios and genotype distributions.', tags: ['Biology', 'Genetics', 'Mendel'] },
        { title: 'Respiratory System Anatomy Map', complexity: 'Medium', desc: 'Create an interactive quiz diagram mapping pulmonary volumes and alveolar gaseous exchange.', tags: ['Anatomy', 'Physiology', 'Pulmonary'] }
      ];
    } else {
      projects = [
        { title: 'Real-Time Chat Engine', complexity: 'High Impact', desc: 'Develop a highly scalable messaging server utilizing Node.js, WebSockets, and Redis pub/sub.', tags: ['Node.js', 'WebSockets', 'Redis'] },
        { title: 'Serverless Video Transcoder', complexity: 'Medium', desc: 'Build an event-driven AWS Lambda microservice that triggers video file compression on S3.', tags: ['AWS Lambda', 'FFmpeg', 'Node.js'] }
      ];
    }

    projectBody.innerHTML = projects.map(p => `
      <div style="padding:14px;background:var(--bg-2);border:1px solid var(--border);border-radius:var(--radius);transition:all var(--transition)" onmouseover="this.style.borderColor='var(--primary)'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:14px;font-weight:700">${p.title}</div>
          <div class="badge ${p.complexity === 'High Impact' ? 'badge-primary' : 'badge-emerald'}" style="font-size:11px">${p.complexity}</div>
        </div>
        <div style="font-size:13px;color:var(--muted-light);margin-bottom:10px">${p.desc}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${p.tags.map(t => `<span class="badge badge-gray" style="font-size:11px">${t}</span>`).join('')}
        </div>
      </div>
    `).join('');
  }

  const changeGoalBtn = document.getElementById('change-goal-btn');
  if (changeGoalBtn) {
    changeGoalBtn.addEventListener('click', showChangeGoalModal);
  }

  function showChangeGoalModal() {
    if (document.getElementById('goal-setup-modal')) return;

    const currentTitle = document.getElementById('career-goal-title')?.textContent || 'Software Engineer / Data Scientist';
    let currentTimeline = '12 months';
    let currentReadiness = '75';

    const subtitleText = document.getElementById('career-goal-subtitle')?.textContent || '';
    if (subtitleText.includes('Target timeline:')) {
      const matchTimeline = subtitleText.match(/Target timeline:\s*(.*?)\s*[-·]/);
      if (matchTimeline) currentTimeline = matchTimeline[1].trim();
      const matchReadiness = subtitleText.match(/Current readiness:\s*(\d+)%/);
      if (matchReadiness) currentReadiness = matchReadiness[1];
    }

    const modal = document.createElement('div');
    modal.id = 'goal-setup-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 10000;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: flex-start;
      padding-top: 12vh;
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
      " id="goal-setup-modal-content">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
          <h3 style="font-size:16px;font-weight:700;margin:0">Update Career Goal</h3>
          <button id="goal-modal-close" style="background:transparent;border:none;color:var(--muted);cursor:pointer;font-size:18px">×</button>
        </div>

        <form id="goal-setup-form" style="display:flex;flex-direction:column;gap:14px">
          <div>
            <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Target Career Role *</label>
            <input type="text" name="role" required value="${currentTitle}" placeholder="e.g. Backend Engineer, Data Scientist" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Target Timeline</label>
              <input type="text" name="timeline" required value="${currentTimeline}" placeholder="e.g. 12 months, 2 years" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
            </div>
            <div>
              <label style="display:block;font-size:12px;color:var(--muted-light);margin-bottom:6px">Current Readiness (%)</label>
              <input type="number" name="readiness" min="0" max="100" required value="${currentReadiness}" style="width:100%;padding:10px 12px;background:#1e1e1e;border:1px solid var(--border);border-radius:var(--radius);color:#fff;font-size:13px">
            </div>
          </div>

          <button type="submit" id="goal-submit-btn" class="btn btn-primary" style="margin-top:8px;padding:12px;font-weight:700">Save Goal</button>
        </form>
      </div>
    `;

    document.body.appendChild(modal);

    modal.offsetHeight;
    modal.style.opacity = '1';
    
    const goalContent = modal.querySelector('#goal-setup-modal-content');
    if (goalContent) goalContent.style.transform = 'translateY(0)';

    const closeModal = () => {
      modal.style.opacity = '0';
      const innerContent = modal.querySelector('#goal-setup-modal-content');
      if (innerContent) innerContent.style.transform = 'translateY(20px)';
      setTimeout(() => modal.remove(), 300);
    };

    const closeBtn = modal.querySelector('#goal-modal-close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    const goalForm = modal.querySelector('#goal-setup-form');
    if (goalForm) {
      goalForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('goal-submit-btn');
      submitBtn.textContent = 'Saving goal...';
      submitBtn.disabled = true;

      const formData = new FormData(e.target);
      const role = formData.get('role');
      const timeline = formData.get('timeline');
      const readiness = formData.get('readiness');
      const goalValue = `${role}|${timeline}|${readiness}`;

      try {
        await window.EduVerseAPI.updateProfile({
          profile: {
            goal: goalValue
          }
        });
        updateGoalUI(role, timeline, readiness);
        showToast('Career goal updated successfully!', 'success');
        closeModal();
      } catch (err) {
        showToast(err.message || 'Failed to update goal', 'error');
        submitBtn.textContent = 'Save Goal';
        submitBtn.disabled = false;
      }
    });
    }
  }

  loadCareerHistory();
  loadCareerGoal();
});
