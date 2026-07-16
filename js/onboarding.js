/* ============================================================
   EDUVERSE AI — ONBOARDING INTERACTION LOGIC
   ============================================================ */

'use strict';

// State container for onboarding settings
const onboardingState = {
  authType: 'signup', // signup or login
  learnerType: '',
  primaryGoal: '',
  skillLevel: '',
  studyTime: '',
  learningStyle: ''
};

// Step definition sequence
const stepIds = [
  'step-auth',
  'step-learner-type',
  'step-goals',
  'step-preferences',
  'step-loading'
];

let currentStepIndex = 0;

// Initialize onboarding
document.addEventListener('DOMContentLoaded', () => {
  // Check if we need to pre-select Login tab
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'login') {
    switchAuthTab('login');
  }

  // Set initial progress
  updateProgressBar();

  // Listen to input changes in the goal input
  const goalInput = document.getElementById('primary-goal-input');
  if (goalInput) {
    goalInput.addEventListener('input', (e) => {
      onboardingState.primaryGoal = e.target.value.trim();
      validateGoalsStep();
    });
  }
});

// Update the header progress indicators
function updateProgressBar() {
  const progressWrapper = document.querySelector('.step-progress-wrapper');
  if (!progressWrapper) return;

  const currentCard = document.querySelector('.onboarding-step-card.active');
  if (!currentCard) return;

  const currentStepId = currentCard.id;
  const index = stepIds.indexOf(currentStepId);

  if (index === 0 || index === stepIds.length - 1) {
    // Hide progress on auth and loading screens
    progressWrapper.style.display = 'none';
  } else {
    progressWrapper.style.display = 'flex';
    const numEl = document.getElementById('current-step-num');
    if (numEl) numEl.textContent = index;
    
    // Calculate percentage based on questionnaire steps (excluding Auth and Loading)
    // There are 3 questionnaire steps: 1, 2, 3
    const totalQuestionSteps = stepIds.length - 2;
    const progressPercent = (index / totalQuestionSteps) * 100;
    const barFill = document.getElementById('step-progress-bar');
    if (barFill) barFill.style.width = `${progressPercent}%`;
  }
}

// Switch between signup and login tabs
function switchAuthTab(type) {
  onboardingState.authType = type;
  
  const signupForm = document.getElementById('signup-form');
  const loginForm = document.getElementById('login-form');
  const tabs = document.querySelectorAll('.auth-tab-btn');

  tabs.forEach(tab => tab.classList.remove('active'));
  
  if (type === 'signup') {
    tabs[0].classList.add('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
  } else {
    tabs[1].classList.add('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
  }
}

// Handle login / signup submission
function handleAuthSubmit(event, type) {
  event.preventDefault();
  
  if (type === 'signup') {
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    localStorage.setItem('userName', name);
    localStorage.setItem('userEmail', email);
    
    showToast(`Welcome, ${name}! Setting up your secure workspace...`, 'success');
    
    // Transition to Step 2
    setTimeout(() => {
      nextStep();
    }, 1000);
  } else {
    const email = document.getElementById('login-email').value.trim();
    // Derive name from email as fallback
    const derivedName = email.split('@')[0];
    const formattedName = derivedName.charAt(0).toUpperCase() + derivedName.slice(1);
    localStorage.setItem('userEmail', email);
    localStorage.setItem('userName', formattedName);
    
    showToast(`Welcome back! Loading your profile...`, 'success');
    
    // Returning users go straight to Dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  }
}

// Handle social auth click
function continueSocial(provider) {
  showToast(`Authenticating with ${provider}...`, 'info');
  setTimeout(() => {
    showToast(`Successfully authenticated!`, 'success');
    
    // Transition to Step 2
    nextStep();
  }, 1200);
}

// Handle generic selection options
function selectOption(category, value, cardElement) {
  if (!cardElement) return;
  
  // Convert kebab-case to camelCase (e.g., 'skill-level' -> 'skillLevel')
  const camelCategory = category.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  onboardingState[camelCategory] = value;
  
  // Remove 'selected' class from siblings
  const parent = cardElement.parentElement;
  if (parent) {
    parent.querySelectorAll('.option-card, .level-card, .time-card, .option-card.compact').forEach(card => {
      card.classList.remove('selected');
    });
  }

  // Add 'selected' class to current
  cardElement.classList.add('selected');

  // Specific step validation
  if (category === 'learner-type') {
    const btn = document.getElementById('btn-learner-type-next');
    if (btn) btn.disabled = false;
  }
  if (category === 'skill-level') {
    validateGoalsStep();
  }
}

// Handle Goal Tag chip selection
function selectGoalTag(tagElement) {
  const goalInput = document.getElementById('primary-goal-input');
  const text = tagElement.textContent;
  
  // Toggle selection
  if (tagElement.classList.contains('selected')) {
    tagElement.classList.remove('selected');
    if (goalInput) goalInput.value = '';
    onboardingState.primaryGoal = '';
  } else {
    // Unselect all other tags
    tagElement.parentElement.querySelectorAll('.tag-chip').forEach(tag => {
      tag.classList.remove('selected');
    });
    
    tagElement.classList.add('selected');
    if (goalInput) goalInput.value = text;
    onboardingState.primaryGoal = text;
  }
  
  validateGoalsStep();
}

// Validate goals & skill level step to enable Next button
function validateGoalsStep() {
  const hasGoal = onboardingState.primaryGoal && onboardingState.primaryGoal.length > 0;
  const hasLevel = onboardingState.skillLevel && onboardingState.skillLevel.length > 0;
  
  const btn = document.getElementById('btn-goals-next');
  if (btn) {
    btn.disabled = !(hasGoal && hasLevel);
  }
}

// Step navigation based on active DOM card
function nextStep() {
  const currentCard = document.querySelector('.onboarding-step-card.active');
  if (!currentCard) return;

  const currentStepId = currentCard.id;
  const currentIndex = stepIds.indexOf(currentStepId);
  if (currentIndex === -1 || currentIndex >= stepIds.length - 1) return;

  const nextStepId = stepIds[currentIndex + 1];
  const nextCard = document.getElementById(nextStepId);
  if (!nextCard) return;

  // Transition animations
  currentCard.style.opacity = '0';
  currentCard.style.transform = 'translateY(-12px)';

  setTimeout(() => {
    currentCard.classList.remove('active');
    
    nextCard.classList.add('active');
    // Force a reflow to trigger transition
    nextCard.offsetHeight;
    nextCard.style.opacity = '1';
    nextCard.style.transform = 'translateY(0)';
    
    updateProgressBar();
  }, 300);
}

function prevStep() {
  const currentCard = document.querySelector('.onboarding-step-card.active');
  if (!currentCard) return;

  const currentStepId = currentCard.id;
  const currentIndex = stepIds.indexOf(currentStepId);
  if (currentIndex <= 0) return;

  const prevStepId = stepIds[currentIndex - 1];
  const prevCard = document.getElementById(prevStepId);
  if (!prevCard) return;

  currentCard.style.opacity = '0';
  currentCard.style.transform = 'translateY(12px)';

  setTimeout(() => {
    currentCard.classList.remove('active');
    
    prevCard.classList.add('active');
    prevCard.offsetHeight;
    prevCard.style.opacity = '1';
    prevCard.style.transform = 'translateY(0)';
    
    updateProgressBar();
  }, 300);
}

// Transition to Step 5 (Generation & Loading)
function startGenerationStep() {
  // Select baseline values if user skipped clicking
  if (!onboardingState.studyTime) onboardingState.studyTime = 'moderate';
  if (!onboardingState.learningStyle) onboardingState.learningStyle = 'visual';

  nextStep();
  runSimulatedSetup();
}

// Helper to parse subject from goal
function getSubjectFromGoal(goal) {
  const lowercase = goal.toLowerCase();
  if (lowercase.includes('react') || lowercase.includes('node') || lowercase.includes('javascript') || lowercase.includes('full-stack') || lowercase.includes('web')) {
    return 'JavaScript';
  } else if (lowercase.includes('python') || lowercase.includes('data science') || lowercase.includes('machine learning') || lowercase.includes('ai')) {
    return 'Data Science';
  } else if (lowercase.includes('upsc') || lowercase.includes('civil services') || lowercase.includes('history')) {
    return 'UPSC prep';
  } else if (lowercase.includes('chemistry') || lowercase.includes('science')) {
    return 'Chemistry';
  } else if (lowercase.includes('cloud') || lowercase.includes('aws')) {
    return 'Cloud Computing';
  }
  const words = goal.split(' ');
  return words.slice(0, 2).join(' ') || 'General Studies';
}

// Seed default planner tasks on the backend based on goal/subject
async function seedDefaultTasks(goal, subject) {
  if (typeof window.EduVerseAPI === 'undefined') return;
  const tasksToCreate = [
    {
      title: `Introduction to ${subject}`,
      description: `Read foundational concepts of ${subject} matching your goal: ${goal}`,
      subject: subject,
      priority: 'high',
      estimatedHours: 2,
      status: 'pending',
      tags: [subject.toLowerCase(), 'onboarding'],
      dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    },
    {
      title: `Set up environment for ${subject}`,
      description: `Configure tools and download materials needed to learn ${subject}`,
      subject: subject,
      priority: 'medium',
      estimatedHours: 1,
      status: 'pending',
      tags: [subject.toLowerCase(), 'setup'],
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]
    },
    {
      title: `First practice quiz on ${subject}`,
      description: `Generate a beginner quiz on ${subject} to test baseline knowledge`,
      subject: subject,
      priority: 'low',
      estimatedHours: 1,
      status: 'pending',
      tags: [subject.toLowerCase(), 'quiz'],
      dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0]
    }
  ];

  for (const task of tasksToCreate) {
    try {
      await window.EduVerseAPI.createTask(task);
    } catch (e) {
      console.warn('Failed to seed default task:', e);
    }
  }
}

// Execute real setup tasks with API integrations
function runSimulatedSetup() {
  const elProfile = document.getElementById('task-profile');
  const elMentor = document.getElementById('task-mentor');
  const elPlanner = document.getElementById('task-planner');
  const elRoadmap = document.getElementById('task-roadmap');
  const elQuizzes = document.getElementById('task-quizzes');

  const goal = onboardingState.primaryGoal || 'Master Web Development';
  const subject = getSubjectFromGoal(goal);
  const level = onboardingState.skillLevel || 'beginner';

  // Step 1: Save User Profile
  if (elProfile) elProfile.classList.add('active');
  
  const profileUpdates = {
    profile: {
      goal: goal,
      learningStyle: onboardingState.learningStyle || 'visual',
      learnerType: onboardingState.learnerType || 'college',
      skillLevel: level,
      studyTime: onboardingState.studyTime || 'moderate'
    }
  };

  Promise.resolve()
    .then(() => {
      if (typeof window.EduVerseAPI !== 'undefined') {
        return window.EduVerseAPI.updateProfile(profileUpdates);
      }
    })
    .then(() => {
      if (elProfile) {
        elProfile.classList.remove('active');
        elProfile.classList.add('done');
      }
      // Step 2: Initialize Mentor
      if (elMentor) elMentor.classList.add('active');
      return new Promise(resolve => setTimeout(resolve, 800));
    })
    .then(() => {
      if (elMentor) {
        elMentor.classList.remove('active');
        elMentor.classList.add('done');
      }
      // Step 3: Create Roadmap (Gemini call)
      if (elRoadmap) elRoadmap.classList.add('active');
      if (typeof window.EduVerseAPI !== 'undefined') {
        return window.EduVerseAPI.createRoadmap(goal, subject, level, 4);
      }
    })
    .then(() => {
      if (elRoadmap) {
        elRoadmap.classList.remove('active');
        elRoadmap.classList.add('done');
      }
      // Step 4: Seed Tasks
      if (elPlanner) elPlanner.classList.add('active');
      return seedDefaultTasks(goal, subject);
    })
    .then(() => {
      if (elPlanner) {
        elPlanner.classList.remove('active');
        elPlanner.classList.add('done');
      }
      // Step 5: Quizzes setup simulation
      if (elQuizzes) elQuizzes.classList.add('active');
      return new Promise(resolve => setTimeout(resolve, 800));
    })
    .then(() => {
      if (elQuizzes) {
        elQuizzes.classList.remove('active');
        elQuizzes.classList.add('done');
      }
      showToast('All AI Agents ready! Entering your Universe...', 'success');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1000);
    })
    .catch(err => {
      console.error('Onboarding setup failed:', err);
      showToast('Some agents failed to setup, entering dashboard...', 'error');
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1500);
    });
}

// Helper expose to global scope
window.switchAuthTab = switchAuthTab;
window.handleAuthSubmit = handleAuthSubmit;
window.continueSocial = continueSocial;
window.selectOption = selectOption;
window.selectGoalTag = selectGoalTag;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.startGenerationStep = startGenerationStep;
