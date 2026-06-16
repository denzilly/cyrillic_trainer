'use strict';

const ALPHABET_REF = [
  ['А а', 'a'],  ['Б б', 'b'],   ['В в', 'v'],   ['Г г', 'g'],
  ['Д д', 'd'],  ['Е е', 'ye/e'],['Ё ё', 'yo'],  ['Ж ж', 'zh'],
  ['З з', 'z'],  ['И и', 'i'],   ['Й й', 'y'],   ['К к', 'k'],
  ['Л л', 'l'],  ['М м', 'm'],   ['Н н', 'n'],   ['О о', 'o'],
  ['П п', 'p'],  ['Р р', 'r'],   ['С с', 's'],   ['Т т', 't'],
  ['У у', 'u'],  ['Ф ф', 'f'],   ['Х х', 'kh'],  ['Ц ц', 'ts'],
  ['Ч ч', 'ch'], ['Ш ш', 'sh'],  ['Щ щ', 'shch'],['Ъ ъ', '(–)'],
  ['Ы ы', 'y'],  ['Ь ь', '(–)'], ['Э э', 'e'],   ['Ю ю', 'yu'],
  ['Я я', 'ya'],
];

let allWords = [];
let queue = [];
let currentIndex = 0;
let score = 0;
let streak = 0;
let maxStreak = 0;
let hintVisible = false;
let activeCategories = new Set();
let answered = false;

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

function buildCategoryFilters() {
  const categories = [...new Set(WORDS.map(w => w.category))].sort();
  const group = document.querySelector('.filter-group');

  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn active';
  allBtn.textContent = 'All';
  allBtn.dataset.cat = '__all__';
  group.appendChild(allBtn);

  categories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.textContent = cat;
    btn.dataset.cat = cat;
    group.appendChild(btn);
  });

  activeCategories = new Set(categories);

  group.addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    const cat = btn.dataset.cat;

    if (cat === '__all__') {
      if (activeCategories.size === categories.length) {
        // deselect all → keep all active (can't have nothing)
        return;
      }
      activeCategories = new Set(categories);
      group.querySelectorAll('.filter-btn').forEach(b => b.classList.add('active'));
    } else {
      const allBtnEl = group.querySelector('[data-cat="__all__"]');
      if (activeCategories.has(cat)) {
        activeCategories.delete(cat);
        btn.classList.remove('active');
        allBtnEl.classList.remove('active');
      } else {
        activeCategories.add(cat);
        btn.classList.add('active');
        if (activeCategories.size === categories.length) {
          allBtnEl.classList.add('active');
        }
      }
      if (activeCategories.size === 0) {
        activeCategories.add(cat);
        btn.classList.add('active');
      }
    }

    startGame();
  });
}

function buildAlphabetRef() {
  const grid = document.querySelector('.ref-grid');
  ALPHABET_REF.forEach(([cyr, lat]) => {
    const item = document.createElement('div');
    item.className = 'ref-item';
    item.innerHTML = `<span class="ref-cyr">${cyr}</span><span class="ref-lat">= ${lat}</span>`;
    grid.appendChild(item);
  });
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
  $('russian-word').textContent = word.russian;
  $('answer-input').value = '';
  $('answer-input').disabled = false;
  $('submit-btn').disabled = false;
  $('result').classList.add('hidden');
  $('hint-text').classList.add('hidden');
  $('hint-text').textContent = '';
  $('hint-btn').textContent = 'Show hint';

  const pct = (currentIndex / queue.length) * 100;
  $('progress').style.width = pct + '%';
  $('word-count').textContent = `Word ${currentIndex + 1} of ${queue.length}`;

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
    $('result-status').textContent = '✗ Not quite';
    $('result-status').className = 'result-status incorrect';
    $('result-details').innerHTML =
      `Your answer: "${input}" &nbsp;·&nbsp; Correct: <span class="correct-answer">"${word.transliteration}"</span>`;
  }

  $('english-meaning').innerHTML =
    `<span class="label">English</span><span class="value">${word.english}</span>`;

  updateStats();
  $('next-btn').focus();
}

function nextWord() {
  currentIndex++;
  if (currentIndex >= queue.length) {
    showEndScreen();
  } else {
    showWord();
  }
}

function showEndScreen() {
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
}

function startGame() {
  const filtered = WORDS.filter(w => activeCategories.has(w.category));
  queue = shuffle(filtered);
  currentIndex = 0;
  score = 0;
  streak = 0;
  maxStreak = 0;
  answered = false;

  $('game-card').style.display = '';
  $('hint-area').style.display = '';
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
    const visible = panel.classList.toggle('visible');
    btn.textContent = visible ? 'Hide alphabet' : 'Alphabet reference';
  });

  $('answer-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      if (!answered) submitAnswer();
      else nextWord();
    }
  });

  startGame();
});
