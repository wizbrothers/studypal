// ==================== APP STATE ====================
let currentUser = null;
let studySets = [];
let currentStudySet = null;
let currentFlashcards = [];
let quizState = {
  cards: [],
  currentIndex: 0,
  correct: 0,
  answered: 0,
  showingAnswer: false,
  results: []
};

// ==================== LOCAL STORAGE ====================
function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
    sessionStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
}

function loadFromStorage(key) {
  try {
    let data = localStorage.getItem(key);
    if (!data) {
      data = sessionStorage.getItem(key);
    }
    return data ? JSON.parse(data) : null;
  } catch (e) {
    console.error('Error loading from storage:', e);
    return null;
  }
}

// ==================== PAGE NAVIGATION ====================
function showPage(pageId) {
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  document.getElementById('page-' + pageId).classList.add('active');
  window.scrollTo(0, 0);
  
  if (pageId === 'dashboard') {
    renderStudySets();
    renderProgressStats();
  }
}

// ==================== AUTH ====================
function toggleAuthTab(isLogin) {
  const loginBtn = document.getElementById('btn-login-tab');
  const signupBtn = document.getElementById('btn-signup-tab');
  const submitBtn = document.getElementById('auth-submit-btn');
  const switchText = document.getElementById('auth-switch-text');
  const switchBtnText = document.getElementById('auth-switch-btn');
  
  if (isLogin) {
    loginBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium bg-blue-500 text-white';
    signupBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
    submitBtn.textContent = 'Log In';
    switchText.textContent = "Don't have an account?";
    switchBtnText.textContent = 'Sign up';
  } else {
    signupBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium bg-blue-500 text-white';
    loginBtn.className = 'flex-1 py-2 px-4 rounded-lg font-medium bg-gray-100 text-gray-600 hover:bg-gray-200';
    submitBtn.textContent = 'Sign Up';
    switchText.textContent = 'Already have an account?';
    switchBtnText.textContent = 'Log in';
  }
}

document.getElementById('auth-form').addEventListener('submit', function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  const isLogin = document.getElementById('btn-login-tab').classList.contains('bg-blue-500');
  const errorDiv = document.getElementById('auth-error');
  
  if (!email || !password) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  if (password.length < 6) {
    errorDiv.textContent = 'Password must be at least 6 characters';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  let users = loadFromStorage('studypal_users') || {};
  
  if (isLogin) {
    if (users[email] && users[email].password === password) {
      currentUser = { email: email, name: email.split('@')[0] };
      saveToStorage('studypal_currentUser', currentUser);
      loadUserData();
      document.getElementById('user-name').textContent = currentUser.name;
      showPage('dashboard');
      errorDiv.classList.add('hidden');
    } else {
      errorDiv.textContent = 'Invalid email or password';
      errorDiv.classList.remove('hidden');
    }
  } else {
    if (users[email]) {
      errorDiv.textContent = 'An account with this email already exists';
      errorDiv.classList.remove('hidden');
    } else {
      users[email] = { password: password, studySets: [], progress: { totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0, quizHistory: [] } };
      saveToStorage('studypal_users', users);
      currentUser = { email: email, name: email.split('@')[0] };
      saveToStorage('studypal_currentUser', currentUser);
      studySets = [];
      document.getElementById('user-name').textContent = currentUser.name;
      showPage('dashboard');
      errorDiv.classList.add('hidden');
    }
  }
});

function handleLogout() {
  currentUser = null;
  studySets = [];
  localStorage.removeItem('studypal_currentUser');
  sessionStorage.removeItem('studypal_currentUser');
  document.getElementById('email').value = '';
  document.getElementById('password').value = '';
  showPage('auth');
}

function loadUserData() {
  if (!currentUser) return;
  const users = loadFromStorage('studypal_users') || {};
  if (users[currentUser.email]) {
    studySets = users[currentUser.email].studySets || [];
  }
}

function saveUserData() {
  if (!currentUser) return;
  const users = loadFromStorage('studypal_users') || {};
  if (!users[currentUser.email]) {
    users[currentUser.email] = { password: '', studySets: [], progress: { totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0, quizHistory: [] } };
  }
  users[currentUser.email].studySets = studySets;
  saveToStorage('studypal_users', users);
}

function getUserProgress() {
  if (!currentUser) return null;
  const users = loadFromStorage('studypal_users') || {};
  if (users[currentUser.email]) {
    return users[currentUser.email].progress || { totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0, quizHistory: [] };
  }
  return { totalQuizzes: 0, totalCorrect: 0, totalAnswered: 0, quizHistory: [] };
}

function saveUserProgress(progress) {
  if (!currentUser) return;
  const users = loadFromStorage('studypal_users') || {};
  if (!users[currentUser.email]) {
    users[currentUser.email] = { password: '', studySets: [], progress: progress };
  } else {
    users[currentUser.email].progress = progress;
  }
  saveToStorage('studypal_users', users);
}

// ==================== PROGRESS TRACKING ====================
function renderProgressStats() {
  const container = document.getElementById('progress-stats');
  if (!container) return;
  
  const progress = getUserProgress();
  if (!progress) return;
  
  const accuracy = progress.totalAnswered > 0 
    ? Math.round((progress.totalCorrect / progress.totalAnswered) * 100) 
    : 0;
  
  const totalCards = studySets.reduce((sum, set) => sum + set.flashcards.length, 0);
  
  container.innerHTML = `
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-blue-600">${studySets.length}</div>
        <div class="text-sm text-gray-600">Study Sets</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-green-600">${totalCards}</div>
        <div class="text-sm text-gray-600">Flashcards</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-purple-600">${progress.totalQuizzes}</div>
        <div class="text-sm text-gray-600">Quizzes Taken</div>
      </div>
      <div class="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div class="text-2xl font-bold text-orange-600">${accuracy}%</div>
        <div class="text-sm text-gray-600">Accuracy</div>
      </div>
    </div>
  `;
}

// ==================== STUDY SETS ====================
function renderStudySets() {
  const container = document.getElementById('study-sets-grid');
  const emptyState = document.getElementById('empty-state');
  
  if (studySets.length === 0) {
    container.classList.add('hidden');
    emptyState.classList.remove('hidden');
    return;
  }
  
  emptyState.classList.add('hidden');
  container.classList.remove('hidden');
  
  container.innerHTML = studySets.map((set, index) => {
    const mastery = calculateMastery(set);
    return `
    <div 
      onclick="openStudySet(${index})"
      class="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-all cursor-pointer group border border-gray-100"
    >
      <div class="flex items-start justify-between mb-3">
        <div class="flex-1">
          <h4 class="font-semibold text-gray-800 mb-1 group-hover:text-blue-600 transition-colors">
            ${escapeHtml(set.title)}
          </h4>
          <span class="inline-block px-3 py-1 ${getSubjectColor(set.subject)} text-xs font-medium rounded-full">
            ${escapeHtml(set.subject)}
          </span>
        </div>
        <button 
          onclick="event.stopPropagation(); deleteStudySet(${index})"
          class="text-gray-400 hover:text-red-500 transition-colors p-1"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
      <div class="flex items-center justify-between mt-4">
        <span class="text-sm text-gray-500">${set.flashcards.length} flashcard${set.flashcards.length !== 1 ? 's' : ''}</span>
        <div class="flex items-center gap-2">
          <div class="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div class="h-full bg-green-500 rounded-full" style="width: ${mastery}%"></div>
          </div>
          <span class="text-xs text-gray-500">${mastery}%</span>
        </div>
      </div>
    </div>
  `}).join('');
}

function calculateMastery(set) {
  if (!set.cardProgress || Object.keys(set.cardProgress).length === 0) return 0;
  
  const cards = set.flashcards;
  let masteredCount = 0;
  
  cards.forEach((card, index) => {
    const progress = set.cardProgress[index];
    if (progress && progress.correct >= 2) {
      masteredCount++;
    }
  });
  
  return Math.round((masteredCount / cards.length) * 100);
}

function getSubjectColor(subject) {
  const colors = {
    'English': 'bg-blue-100 text-blue-700',
    'Science': 'bg-green-100 text-green-700',
    'Math': 'bg-purple-100 text-purple-700',
    'History': 'bg-orange-100 text-orange-700',
    'Other': 'bg-gray-100 text-gray-700'
  };
  return colors[subject] || colors['Other'];
}

function deleteStudySet(index) {
  if (confirm('Are you sure you want to delete this study set?')) {
    studySets.splice(index, 1);
    saveUserData();
    renderStudySets();
    renderProgressStats();
  }
}

function openStudySet(index) {
  currentStudySet = studySets[index];
  currentStudySet.index = index;
  startQuiz();
}

// ==================== CREATE STUDY SET (AI-POWERED) ====================
document.getElementById('create-form').addEventListener('submit', function(e) {
  e.preventDefault();
  generateFlashcards();
});

async function generateFlashcards() {
  const title = document.getElementById('set-title').value.trim();
  const subject = document.getElementById('set-subject').value;
  const notes = document.getElementById('set-notes').value.trim();
  const errorDiv = document.getElementById('create-error');
  const btn = document.getElementById('generate-btn');
  
  if (!title || !notes) {
    errorDiv.textContent = 'Please fill in all fields';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span>🤖 AI is generating flashcards...</span>';
  errorDiv.classList.add('hidden');
  
  currentStudySet = { title, subject, flashcards: [], cardProgress: {} };
  
  try {
    const response = await fetch('/api/generate-flashcards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes, subject })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate flashcards');
    }
    
    const data = await response.json();
    
    if (data.flashcards && data.flashcards.length > 0) {
      currentFlashcards = data.flashcards;
    } else {
      currentFlashcards = extractFlashcardsFallback(notes);
    }
  } catch (error) {
    console.error('AI generation failed, using fallback:', error);
    currentFlashcards = extractFlashcardsFallback(notes);
  }
  
  if (currentFlashcards.length === 0) {
    currentFlashcards = [{ front: '', back: '' }];
  }
  
  renderFlashcardEditor();
  btn.disabled = false;
  btn.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
    </svg>
    <span>Generate Flashcards</span>
  `;
  showPage('create-review');
}

function extractFlashcardsFallback(text) {
  const flashcards = [];
  const lines = text.split(/[\n\r]+/).filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
    const dashMatch = line.match(/^([^-]+)\s*-\s*(.+)$/);
    
    if (colonMatch && colonMatch[1].length < 100) {
      flashcards.push({ front: colonMatch[1].trim(), back: colonMatch[2].trim() });
    } else if (dashMatch && dashMatch[1].length < 100) {
      flashcards.push({ front: dashMatch[1].trim(), back: dashMatch[2].trim() });
    }
  }
  
  return flashcards.slice(0, 15);
}

function renderFlashcardEditor() {
  const container = document.getElementById('flashcards-list');
  
  container.innerHTML = currentFlashcards.map((card, index) => `
    <div class="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
      <div class="flex items-start justify-between mb-3">
        <span class="text-sm font-medium text-gray-500">Card ${index + 1}</span>
        <button 
          type="button"
          onclick="deleteCard(${index})"
          class="text-gray-400 hover:text-red-500 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Front (Question/Term)</label>
          <input 
            type="text" 
            value="${escapeHtml(card.front)}"
            onchange="updateCard(${index}, 'front', this.value)"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
        </div>
        <div>
          <label class="block text-xs font-medium text-gray-600 mb-1">Back (Answer/Definition)</label>
          <input 
            type="text" 
            value="${escapeHtml(card.back)}"
            onchange="updateCard(${index}, 'back', this.value)"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          >
        </div>
      </div>
    </div>
  `).join('');
}

function updateCard(index, field, value) {
  currentFlashcards[index][field] = value;
}

function deleteCard(index) {
  currentFlashcards.splice(index, 1);
  renderFlashcardEditor();
}

function addManualCard() {
  currentFlashcards.push({ front: '', back: '' });
  renderFlashcardEditor();
  const container = document.getElementById('flashcards-list');
  container.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
}

function saveStudySet() {
  const errorDiv = document.getElementById('review-error');
  const btn = document.getElementById('save-btn');
  
  const validCards = currentFlashcards.filter(card => card.front.trim() && card.back.trim());
  
  if (validCards.length === 0) {
    errorDiv.textContent = 'Please add at least one complete flashcard (both front and back)';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span>Saving...</span>';
  
  setTimeout(() => {
    const newSet = {
      id: Date.now(),
      title: currentStudySet.title,
      subject: currentStudySet.subject,
      flashcards: validCards,
      cardProgress: {},
      createdAt: new Date().toISOString()
    };
    
    studySets.unshift(newSet);
    saveUserData();
    
    document.getElementById('set-title').value = '';
    document.getElementById('set-notes').value = '';
    currentStudySet = null;
    currentFlashcards = [];
    
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path>
      </svg>
      <span>Save Study Set</span>
    `;
    
    errorDiv.classList.add('hidden');
    showPage('dashboard');
  }, 500);
}

// ==================== QUIZ MODE ====================
function startQuiz() {
  if (!currentStudySet || !currentStudySet.flashcards.length) {
    alert('No flashcards in this study set');
    return;
  }
  
  quizState = {
    cards: [...currentStudySet.flashcards],
    currentIndex: 0,
    correct: 0,
    answered: 0,
    showingAnswer: false,
    results: []
  };
  
  document.getElementById('quiz-title').textContent = currentStudySet.title;
  document.getElementById('quiz-complete').classList.add('hidden');
  document.getElementById('quiz-card-container').classList.remove('hidden');
  
  updateQuizUI();
  showPage('quiz');
}

function updateQuizUI() {
  const { cards, currentIndex, correct, answered } = quizState;
  
  document.getElementById('quiz-progress').textContent = `Card ${currentIndex + 1} of ${cards.length}`;
  document.getElementById('quiz-score').textContent = `Score: ${correct} / ${answered}`;
  document.getElementById('quiz-progress-bar').style.width = `${((currentIndex + 1) / cards.length) * 100}%`;
  
  const card = cards[currentIndex];
  document.getElementById('quiz-card-content').textContent = card.front;
  document.getElementById('quiz-card-label').textContent = 'QUESTION';
  document.getElementById('quiz-card-hint').textContent = 'Click to reveal answer';
  document.getElementById('quiz-card').className = 'p-8 sm:p-12 min-h-[400px] flex flex-col items-center justify-center cursor-pointer bg-white hover:bg-gray-50 transition-all';
  document.getElementById('quiz-buttons').classList.add('hidden');
  
  quizState.showingAnswer = false;
}

function flipCard() {
  if (quizState.showingAnswer) return;
  
  const card = quizState.cards[quizState.currentIndex];
  document.getElementById('quiz-card-content').textContent = card.back;
  document.getElementById('quiz-card-label').textContent = 'ANSWER';
  document.getElementById('quiz-card-hint').textContent = 'How did you do?';
  document.getElementById('quiz-card').className = 'p-8 sm:p-12 min-h-[400px] flex flex-col items-center justify-center cursor-pointer bg-gradient-to-br from-green-50 to-blue-50 transition-all';
  document.getElementById('quiz-buttons').classList.remove('hidden');
  
  quizState.showingAnswer = true;
}

function markCard(correct) {
  const cardIndex = currentStudySet.flashcards.findIndex(
    c => c.front === quizState.cards[quizState.currentIndex].front
  );
  
  if (cardIndex !== -1) {
    if (!currentStudySet.cardProgress) {
      currentStudySet.cardProgress = {};
    }
    if (!currentStudySet.cardProgress[cardIndex]) {
      currentStudySet.cardProgress[cardIndex] = { correct: 0, incorrect: 0 };
    }
    if (correct) {
      currentStudySet.cardProgress[cardIndex].correct++;
    } else {
      currentStudySet.cardProgress[cardIndex].incorrect++;
    }
  }
  
  quizState.results.push({
    card: quizState.cards[quizState.currentIndex],
    correct: correct
  });
  
  quizState.answered++;
  if (correct) quizState.correct++;
  
  if (quizState.currentIndex < quizState.cards.length - 1) {
    quizState.currentIndex++;
    updateQuizUI();
  } else {
    showQuizComplete();
  }
}

function showQuizComplete() {
  const { correct, answered, results } = quizState;
  
  // Update study set in storage
  if (currentStudySet.index !== undefined) {
    studySets[currentStudySet.index] = currentStudySet;
    saveUserData();
  }
  
  // Update user progress
  const progress = getUserProgress();
  progress.totalQuizzes++;
  progress.totalCorrect += correct;
  progress.totalAnswered += answered;
  progress.quizHistory.push({
    date: new Date().toISOString(),
    setTitle: currentStudySet.title,
    correct: correct,
    total: answered
  });
  if (progress.quizHistory.length > 50) {
    progress.quizHistory = progress.quizHistory.slice(-50);
  }
  saveUserProgress(progress);
  
  document.getElementById('quiz-card-container').classList.add('hidden');
  document.getElementById('quiz-complete').classList.remove('hidden');
  document.getElementById('quiz-final-score').textContent = `${correct} / ${answered}`;
  
  let message = '';
  if (correct === answered) {
    message = '🎉 Perfect score! You know this material well!';
  } else if (correct >= answered * 0.8) {
    message = '🌟 Excellent work! Almost perfect!';
  } else if (correct > answered / 2) {
    message = '👍 Great job! Keep practicing the ones you missed.';
  } else {
    message = '💪 Good effort! Review the material and try again.';
  }
  document.getElementById('quiz-message').textContent = message;
  
  const missed = results.filter(r => !r.correct);
  const missedContainer = document.getElementById('missed-cards-container');
  const missedList = document.getElementById('missed-cards-list');
  const retryBtn = document.getElementById('retry-missed-btn');
  
  if (missed.length > 0) {
    missedContainer.classList.remove('hidden');
    retryBtn.classList.remove('hidden');
    missedList.innerHTML = missed.map(m => 
      `<li class="truncate">• ${escapeHtml(m.card.front)}</li>`
    ).join('');
  } else {
    missedContainer.classList.add('hidden');
    retryBtn.classList.add('hidden');
  }
}

function retryMissed() {
  const missed = quizState.results.filter(r => !r.correct).map(r => r.card);
  
  quizState = {
    cards: missed,
    currentIndex: 0,
    correct: 0,
    answered: 0,
    showingAnswer: false,
    results: []
  };
  
  document.getElementById('quiz-complete').classList.add('hidden');
  document.getElementById('quiz-card-container').classList.remove('hidden');
  updateQuizUI();
}

function restartQuiz() {
  startQuiz();
}

function exitQuiz() {
  currentStudySet = null;
  showPage('dashboard');
}

// ==================== SUMMARIZER (AI-POWERED) ====================
async function generateSummary() {
  const input = document.getElementById('summarizer-input').value.trim();
  const output = document.getElementById('summary-output');
  const errorDiv = document.getElementById('summarizer-error');
  const btn = document.getElementById('summarize-btn');
  const copyBtn = document.getElementById('copy-summary-btn');
  const styleSelect = document.getElementById('summary-style');
  const style = styleSelect ? styleSelect.value : 'bullets';
  
  if (!input) {
    errorDiv.textContent = 'Please paste some text to summarize';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span>🤖 AI is summarizing...</span>';
  errorDiv.classList.add('hidden');
  
  try {
    const response = await fetch('/api/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: input, style })
    });
    
    if (!response.ok) {
      throw new Error('Failed to generate summary');
    }
    
    const data = await response.json();
    
    output.innerHTML = `
      <div class="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-lg p-6 min-h-[400px]">
        <div class="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">${escapeHtml(data.summary)}</div>
      </div>
    `;
    
    copyBtn.classList.remove('hidden');
  } catch (error) {
    console.error('AI summarization failed:', error);
    errorDiv.textContent = 'Failed to generate summary. Please try again.';
    errorDiv.classList.remove('hidden');
  }
  
  btn.disabled = false;
  btn.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
    </svg>
    <span>Summarize</span>
  `;
}

function copySummary() {
  const output = document.getElementById('summary-output');
  const text = output.textContent || output.innerText;
  const btnText = document.getElementById('copy-btn-text');
  
  navigator.clipboard.writeText(text).then(() => {
    btnText.textContent = 'Copied!';
    setTimeout(() => {
      btnText.textContent = 'Copy';
    }, 2000);
  });
}

// ==================== AI TUTOR ====================
async function askTutor() {
  const input = document.getElementById('tutor-input').value.trim();
  const output = document.getElementById('tutor-output');
  const errorDiv = document.getElementById('tutor-error');
  const btn = document.getElementById('tutor-btn');
  const subjectSelect = document.getElementById('tutor-subject');
  const subject = subjectSelect ? subjectSelect.value : 'general';
  
  if (!input) {
    errorDiv.textContent = 'Please enter a question';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  btn.disabled = true;
  btn.innerHTML = '<span>🤖 AI is thinking...</span>';
  errorDiv.classList.add('hidden');
  
  try {
    const response = await fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: input, subject })
    });
    
    if (!response.ok) {
      throw new Error('Failed to get explanation');
    }
    
    const data = await response.json();
    
    output.innerHTML = `
      <div class="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div class="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">${escapeHtml(data.explanation)}</div>
      </div>
    `;
  } catch (error) {
    console.error('AI tutor failed:', error);
    errorDiv.textContent = 'Failed to get explanation. Please try again.';
    errorDiv.classList.remove('hidden');
  }
  
  btn.disabled = false;
  btn.innerHTML = `
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
    </svg>
    <span>Explain This</span>
  `;
}

// ==================== UTILITIES ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== INITIALIZATION ====================
function initApp() {
  const savedUser = loadFromStorage('studypal_currentUser');
  if (savedUser && savedUser.email) {
    currentUser = savedUser;
    loadUserData();
    document.getElementById('user-name').textContent = currentUser.name || 'Student';
    showPage('dashboard');
  } else {
    showPage('auth');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
