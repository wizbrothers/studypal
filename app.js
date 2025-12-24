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
  localStorage.setItem(key, JSON.stringify(data));
}

function loadFromStorage(key) {
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// ==================== PAGE NAVIGATION ====================
function showPage(pageId) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });
  // Show the selected page
  document.getElementById('page-' + pageId).classList.add('active');
  // Scroll to top
  window.scrollTo(0, 0);
  
  // Run page-specific initialization
  if (pageId === 'dashboard') {
    renderStudySets();
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
  
  // Simple validation
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
  
  // Get stored users
  let users = loadFromStorage('studypal_users') || {};
  
  if (isLogin) {
    // Login
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
    // Sign up
    if (users[email]) {
      errorDiv.textContent = 'An account with this email already exists';
      errorDiv.classList.remove('hidden');
    } else {
      users[email] = { password: password, studySets: [] };
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
    users[currentUser.email] = { password: '', studySets: [] };
  }
  users[currentUser.email].studySets = studySets;
  saveToStorage('studypal_users', users);
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
  
  container.innerHTML = studySets.map((set, index) => `
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
      <div class="text-sm text-gray-500 mt-4">
        ${set.flashcards.length} flashcard${set.flashcards.length !== 1 ? 's' : ''}
      </div>
    </div>
  `).join('');
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
  }
}

function openStudySet(index) {
  currentStudySet = studySets[index];
  startQuiz();
}

// ==================== CREATE STUDY SET ====================
document.getElementById('create-form').addEventListener('submit', function(e) {
  e.preventDefault();
  generateFlashcards();
});

function generateFlashcards() {
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
  
  // Show loading state
  btn.disabled = true;
  btn.innerHTML = '<span>Generating flashcards...</span>';
  errorDiv.classList.add('hidden');
  
  // Store the current set info
  currentStudySet = { title, subject, flashcards: [] };
  
  // Generate flashcards using simple AI-like extraction
  // In a real app, this would call an AI API
  setTimeout(() => {
    currentFlashcards = extractFlashcards(notes, subject);
    
    if (currentFlashcards.length === 0) {
      // Create at least one empty card
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
  }, 1000);
}

function extractFlashcards(text, subject) {
  const flashcards = [];
  
  // Split by common delimiters
  const lines = text.split(/[\n\r]+/).filter(line => line.trim());
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Check for "term: definition" or "term - definition" patterns
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
    const dashMatch = line.match(/^([^-]+)\s*-\s*(.+)$/);
    const equalsMatch = line.match(/^([^=]+)=\s*(.+)$/);
    
    if (colonMatch && colonMatch[1].length < 100) {
      flashcards.push({ front: colonMatch[1].trim(), back: colonMatch[2].trim() });
    } else if (dashMatch && dashMatch[1].length < 100) {
      flashcards.push({ front: dashMatch[1].trim(), back: dashMatch[2].trim() });
    } else if (equalsMatch && equalsMatch[1].length < 100) {
      flashcards.push({ front: equalsMatch[1].trim(), back: equalsMatch[2].trim() });
    } else if (line.length > 10 && line.length < 200) {
      // For standalone lines, use them as questions
      flashcards.push({ front: line, back: '' });
    }
  }
  
  // Limit to 20 cards
  return flashcards.slice(0, 20);
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
  // Scroll to bottom
  const container = document.getElementById('flashcards-list');
  container.lastElementChild?.scrollIntoView({ behavior: 'smooth' });
}

function saveStudySet() {
  const errorDiv = document.getElementById('review-error');
  const btn = document.getElementById('save-btn');
  
  // Filter out empty cards
  const validCards = currentFlashcards.filter(card => card.front.trim() && card.back.trim());
  
  if (validCards.length === 0) {
    errorDiv.textContent = 'Please add at least one complete flashcard (both front and back)';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  // Show loading
  btn.disabled = true;
  btn.innerHTML = '<span>Saving...</span>';
  
  setTimeout(() => {
    // Create the study set
    const newSet = {
      id: Date.now(),
      title: currentStudySet.title,
      subject: currentStudySet.subject,
      flashcards: validCards,
      createdAt: new Date().toISOString()
    };
    
    studySets.unshift(newSet);
    saveUserData();
    
    // Reset form
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
  
  document.getElementById('quiz-card-container').classList.add('hidden');
  document.getElementById('quiz-complete').classList.remove('hidden');
  document.getElementById('quiz-final-score').textContent = `${correct} / ${answered}`;
  
  // Set message
  let message = '';
  if (correct === answered) {
    message = 'Perfect score! You know this material well!';
  } else if (correct > answered / 2) {
    message = 'Great job! Keep practicing the ones you missed.';
  } else {
    message = 'Good effort! Review the material and try again.';
  }
  document.getElementById('quiz-message').textContent = message;
  
  // Show missed cards
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

// ==================== SUMMARIZER ====================
function generateSummary() {
  const input = document.getElementById('summarizer-input').value.trim();
  const output = document.getElementById('summary-output');
  const errorDiv = document.getElementById('summarizer-error');
  const btn = document.getElementById('summarize-btn');
  const copyBtn = document.getElementById('copy-summary-btn');
  
  if (!input) {
    errorDiv.textContent = 'Please paste some text to summarize';
    errorDiv.classList.remove('hidden');
    return;
  }
  
  // Show loading
  btn.disabled = true;
  btn.innerHTML = '<span>Generating summary...</span>';
  errorDiv.classList.add('hidden');
  
  setTimeout(() => {
    // Simple summarization (in real app, would call AI API)
    const summary = createSummary(input);
    
    output.innerHTML = `
      <div class="bg-gradient-to-br from-green-50 to-teal-50 border border-green-200 rounded-lg p-6 min-h-[400px]">
        <div class="prose prose-sm max-w-none text-gray-800 whitespace-pre-wrap">${escapeHtml(summary)}</div>
      </div>
    `;
    
    copyBtn.classList.remove('hidden');
    btn.disabled = false;
    btn.innerHTML = `
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"></path>
      </svg>
      <span>Summarize</span>
    `;
  }, 1500);
}

function createSummary(text) {
  // Simple extractive summarization
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  
  // Take first sentence and every 3rd sentence
  const keyPoints = [];
  
  if (sentences.length <= 3) {
    return sentences.join(' ').trim();
  }
  
  // First sentence (usually intro)
  keyPoints.push('• ' + sentences[0].trim());
  
  // Sample key sentences
  for (let i = 2; i < sentences.length - 1; i += 3) {
    if (keyPoints.length < 5) {
      keyPoints.push('• ' + sentences[i].trim());
    }
  }
  
  // Last sentence (usually conclusion)
  if (sentences.length > 3) {
    keyPoints.push('• ' + sentences[sentences.length - 1].trim());
  }
  
  return keyPoints.join('\n\n');
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

// ==================== UTILITIES ====================
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', function() {
  // Check if user is already logged in
  const savedUser = loadFromStorage('studypal_currentUser');
  if (savedUser) {
    currentUser = savedUser;
    loadUserData();
    document.getElementById('user-name').textContent = currentUser.name;
    showPage('dashboard');
  }
});
