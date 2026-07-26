'use strict';

const LANGUAGES = {
  ru: {
    name: 'Russian',
    flag: '🇷🇺',
    accent: '#6366f1',
    accentHover: '#4f46e5',
    accentBg: 'rgba(99, 102, 241, 0.12)',
    accentBgLight: 'rgba(99, 102, 241, 0.08)',
    words: WORDS_RU,
    alphabetRef: ALPHABET_REF_RU,
    streakCollection: 'streaks_ru',
    refTitle: 'Cyrillic Alphabet Transliteration Guide',
    refBtnLabel: 'Аа',
  },
  el: {
    name: 'Greek',
    flag: '🇬🇷',
    accent: '#3b82f6',
    accentHover: '#2563eb',
    accentBg: 'rgba(59, 130, 246, 0.12)',
    accentBgLight: 'rgba(59, 130, 246, 0.08)',
    words: WORDS_EL,
    alphabetRef: ALPHABET_REF_EL,
    streakCollection: 'streaks_el',
    refTitle: 'Greek Alphabet Transliteration Guide',
    refBtnLabel: 'Αα',
  },
  ko: {
    name: 'Korean',
    flag: '🇰🇷',
    accent: '#10b981',
    accentHover: '#059669',
    accentBg: 'rgba(16, 185, 129, 0.12)',
    accentBgLight: 'rgba(16, 185, 129, 0.08)',
    words: WORDS_KO,
    alphabetRef: ALPHABET_REF_KO,
    streakCollection: 'streaks_ko',
    refTitle: 'Korean Hangul Guide',
    refBtnLabel: '한글',
  },
  ja: {
    name: 'Japanese',
    flag: '🇯🇵',
    accent: '#f43f5e',
    accentHover: '#e11d48',
    accentBg: 'rgba(244, 63, 94, 0.12)',
    accentBgLight: 'rgba(244, 63, 94, 0.08)',
    words: WORDS_JA,
    alphabetRef: ALPHABET_REF_JA,
    streakCollection: 'streaks_ja',
    refTitle: 'Japanese Hiragana Guide',
    refBtnLabel: 'かな',
  },
};

let currentLang = 'ru';
let allWords = [];
let queue = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;
let hintVisible = false;
let activeCategories = new Set();
let answered = false;
let letterMode = false;

const $ = id => document.getElementById(id);

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function normalize(str) {
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

function isCorrect(input, word) {
  const n = normalize(input);
  if (n === normalize(word.transliteration)) return true;
  return word.alternates.some(a => n === normalize(a));
}

function initCategoryFilters() {
  const container = document.getElementById('wordlist-categories');
  container.addEventListener('click', e => {
    const btn = e.target.closest('.cat-btn');
    if (!btn) return;
    const cat = btn.dataset.cat;
    if (activeCategories.has(cat)) {
      if (activeCategories.size === 1) return;
      activeCategories.delete(cat);
      btn.classList.remove('active');
    } else {
      activeCategories.add(cat);
      btn.classList.add('active');
    }
    updateWordListUI();
  });
}

function buildCategoryFilters() {
  const lang = LANGUAGES[currentLang];
  const categories = [...new Set(lang.words.map(w => w.category))].sort();
  const container = document.getElementById('wordlist-categories');
  container.innerHTML = '';

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'cat-btn active';
    btn.textContent = cat;
    btn.dataset.cat = cat;
    container.appendChild(btn);
  });

  activeCategories = new Set(categories);
}

function updateWordListUI() {
  const lang = LANGUAGES[currentLang];
  const count = lang.words.filter(w => activeCategories.has(w.category)).length;
  document.getElementById('wordlist-count').textContent = `${count} words`;
}

let _categoriesOnOpen = null;

function openWordList() {
  _categoriesOnOpen = new Set(activeCategories);
  updateWordListUI();
  document.getElementById('wordlist-modal').classList.add('visible');
  document.body.style.overflow = 'hidden';
}

function closeWordList() {
  document.getElementById('wordlist-modal').classList.remove('visible');
  document.body.style.overflow = '';
  const changed = _categoriesOnOpen &&
    (_categoriesOnOpen.size !== activeCategories.size ||
     [...activeCategories].some(c => !_categoriesOnOpen.has(c)));
  if (changed) startGame();
  _categoriesOnOpen = null;
}

function selectAllCategories() {
  const lang = LANGUAGES[currentLang];
  activeCategories = new Set([...new Set(lang.words.map(w => w.category))]);
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.add('active'));
  updateWordListUI();
}

function buildAlphabetRef() {
  const lang = LANGUAGES[currentLang];
  const grid = document.querySelector('.ref-grid');
  const title = document.querySelector('.ref-panel h3');
  grid.innerHTML = '';
  title.textContent = lang.refTitle;
  lang.alphabetRef.forEach(([script, lat]) => {
    const item = document.createElement('div');
    item.className = 'ref-item';
    item.innerHTML = `<span class="ref-cyr">${script}</span><span class="ref-lat">= ${lat}</span>`;
    grid.appendChild(item);
  });
}

function applyLanguageTheme(lang) {
  const config = LANGUAGES[lang];
  const root = document.documentElement;
  root.style.setProperty('--accent', config.accent);
  root.style.setProperty('--accent-hover', config.accentHover);
  root.style.setProperty('--accent-bg', config.accentBg);
  root.style.setProperty('--accent-bg-light', config.accentBgLight);
}

function switchLanguage(lang) {
  if (lang === currentLang) return;
  currentLang = lang;

  const config = LANGUAGES[lang];
  applyLanguageTheme(lang);

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  document.querySelector('.title').innerHTML =
    `${config.name} <span>→</span> Latin Trainer`;

  const refPanel = document.querySelector('.ref-panel');
  if (refPanel.classList.contains('visible')) {
    refPanel.classList.remove('visible');
    $('ref-toggle-btn').textContent = `${config.refBtnLabel} Alphabet`;
  } else {
    $('ref-toggle-btn').textContent = `${config.refBtnLabel} Alphabet`;
  }

  buildAlphabetRef();
  buildCategoryFilters();
  startGame();
}

function updateStats() {
  $('score').textContent = score;
  $('total-answered').textContent = currentIndex + (answered ? 1 : 0);
  $('streak').textContent = streak;
}

function showWord() {
  answered = false;
  hintVisible = false;

  const word = queue[currentIndex];
  $('category-badge').textContent = word.category;
  $('word-label').textContent = letterMode ? 'Transliterate this letter' : 'Transliterate this word';
  $('russian-word').textContent = word.word;
  $('answer-input').value = '';
  $('answer-input').disabled = false;
  $('submit-btn').disabled = false;
  $('result').classList.add('hidden');
  $('hint-text').classList.add('hidden');
  $('hint-text').textContent = '';
  $('hint-btn').textContent = 'Show hint';

  const pct = (currentIndex / queue.length) * 100;
  $('progress').style.width = pct + '%';

  updateStats();
  $('answer-input').focus();
}

function submitAnswer() {
  if (answered) { nextWord(); return; }
  const input = $('answer-input').value.trim();
  if (!input) return;

  answered = true;
  const word = queue[currentIndex];
  const correct = isCorrect(input, word);

  $('answer-input').disabled = true;
  $('submit-btn').disabled = true;
  $('result').classList.remove('hidden');

  if (correct) {
    score++;
    streak++;
    if (streak > maxStreak) maxStreak = streak;
    $('result-status').textContent = '✓ Correct!';
    $('result-status').className = 'result-status correct';
    $('result-details').innerHTML = `<span class="correct-answer">"${word.transliteration}"</span>`;
  } else {
    streak = 0;
    if (maxStreak > 0 && !letterMode) saveStreak(maxStreak, currentLang);
    $('result-status').textContent = '✗ Not quite';
    $('result-status').className = 'result-status incorrect';
    $('result-details').innerHTML =
      `Your answer: "${input}" &nbsp;·&nbsp; Correct: <span class="correct-answer">"${word.transliteration}"</span>`;
  }

  const meaningLabel = letterMode ? 'Sound' : 'English';
  $('english-meaning').innerHTML =
    `<span class="label">${meaningLabel}</span><span class="value">${word.english}</span>`;

  updateStats();
}

function nextWord() {
  currentIndex++;
  if (currentIndex >= queue.length) {
    showEndScreen();
  } else {
    showWord();
  }
}

async function showEndScreen() {
  $('game-card').style.display = 'none';
  $('hint-area').style.display = 'none';
  $('end-screen').classList.remove('hidden');

  const total = queue.length;
  const pct = Math.round((score / total) * 100);

  $('final-score').textContent = `${score} / ${total}`;
  $('final-pct').textContent = `${pct}% correct`;
  $('final-streak').textContent = `Best streak: ${maxStreak}`;

  let msg;
  if (pct === 100) msg = 'Perfect score! Flawless work.';
  else if (pct >= 90) msg = 'Excellent! Nearly perfect.';
  else if (pct >= 75) msg = 'Great job! Keep it up.';
  else if (pct >= 55) msg = 'Good effort. Practice makes perfect.';
  else msg = 'Keep at it — you will improve!';
  $('final-msg').textContent = msg;

  const saveEl = $('save-status');
  if (letterMode) {
    saveEl.textContent = 'Letter practice mode — streaks not counted.';
    saveEl.className = 'save-status';
  } else if (currentUser) {
    saveEl.textContent = 'Saving…';
    saveEl.className = 'save-status saving';
    const result = await saveStreak(maxStreak, currentLang);
    if (result === 'new-record') {
      saveEl.textContent = `🏆 New personal best: ${maxStreak} streak!`;
      saveEl.className = 'save-status saved';
    } else if (result === 'no-change') {
      saveEl.textContent = `✓ Streak saved (best: ${maxStreak})`;
      saveEl.className = 'save-status saved';
    } else if (result === 'skipped') {
      saveEl.textContent = '';
    } else {
      saveEl.textContent = '✗ Could not save streak.';
      saveEl.className = 'save-status save-error';
    }
  } else if (!letterMode) {
    saveEl.innerHTML = '<button class="save-signin-btn" onclick="signIn()">Sign in to save your streak</button>';
    saveEl.className = 'save-status';
  }
}

function buildLetterQueue() {
  const lang = LANGUAGES[currentLang];
  return shuffle(
    lang.alphabetRef
      .filter(([, lat]) => !lat.includes('–'))
      .map(([script, lat]) => {
        const parts = lat.split('/').map(p => p.trim());
        return {
          word: script,
          transliteration: parts[0],
          alternates: parts.slice(1),
          english: lat,
          category: 'Letter',
        };
      })
      .filter(e => e.transliteration)
  );
}

function toggleLetterMode() {
  letterMode = !letterMode;
  const btn = $('letter-mode-btn');
  btn.classList.toggle('active', letterMode);
  $('wordlist-btn').disabled = letterMode;
  startGame();
}

function startGame() {
  const lang = LANGUAGES[currentLang];
  if (letterMode) {
    queue = buildLetterQueue();
  } else {
    const filtered = lang.words.filter(w => activeCategories.has(w.category));
    queue = shuffle(filtered);
  }
  currentIndex = 0;
  score = 0;
  streak = 0;
  maxStreak = 0;
  answered = false;

  $('game-card').style.display = '';
  $('hint-area').style.display = letterMode ? 'none' : '';
  $('end-screen').classList.add('hidden');
  $('progress').style.width = '0%';

  showWord();
}

function toggleHint() {
  if (answered) return;
  const word = queue[currentIndex];
  const hintEl = $('hint-text');

  if (hintVisible) {
    hintEl.classList.add('hidden');
    $('hint-btn').textContent = 'Show hint';
    hintVisible = false;
  } else {
    const t = word.transliteration;
    hintEl.textContent = t[0].toUpperCase() + ' _ '.repeat(t.length - 1).trim();
    hintEl.classList.remove('hidden');
    $('hint-btn').textContent = 'Hide hint';
    hintVisible = true;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyLanguageTheme(currentLang);
  initCategoryFilters();
  buildCategoryFilters();
  buildAlphabetRef();

  $('submit-btn').addEventListener('click', () => {
    if (answered) nextWord();
    else submitAnswer();
  });

  $('next-btn').addEventListener('click', nextWord);
  $('restart-btn').addEventListener('click', startGame);
  $('hint-btn').addEventListener('click', toggleHint);

  $('ref-toggle-btn').addEventListener('click', () => {
    const panel = document.querySelector('.ref-panel');
    const btn = $('ref-toggle-btn');
    const config = LANGUAGES[currentLang];
    const visible = panel.classList.toggle('visible');
    btn.textContent = visible ? `✕ Alphabet` : `${config.refBtnLabel} Alphabet`;
  });

  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => switchLanguage(btn.dataset.lang));
  });

  $('letter-mode-btn').addEventListener('click', toggleLetterMode);

  $('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (!answered) submitAnswer();
      else nextWord();
    }
  });

  startGame();
});
