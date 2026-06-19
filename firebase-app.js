'use strict';

let _auth = null;
let _db = null;
let currentUser = null;
let userNickname = null;

function initFirebase() {
  _auth = firebase.auth();
  _db = firebase.firestore();

  _auth.onAuthStateChanged(async user => {
    currentUser = user;
    if (user) {
      await loadNickname(user.uid);
    } else {
      userNickname = null;
      renderAuthUI(null);
    }
  });

  document.getElementById('lb-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('lb-modal')) closeLeaderboard();
  });

  document.getElementById('nickname-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitNickname();
  });
}

function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  _auth.signInWithPopup(provider).catch(err => console.error('Sign-in error:', err));
}

function signOutUser() {
  userNickname = null;
  _auth.signOut();
}

async function loadNickname(uid) {
  try {
    const doc = await _db.collection('users').doc(uid).get();
    if (doc.exists && doc.data().nickname) {
      userNickname = doc.data().nickname;
      renderAuthUI(currentUser);
    } else {
      showNicknameModal(false);
    }
  } catch (err) {
    console.error('Failed to load nickname:', err);
    showNicknameModal(false);
  }
}

function showNicknameModal(isChange) {
  const modal = document.getElementById('nickname-modal');
  const title = document.getElementById('nickname-modal-title');
  const input = document.getElementById('nickname-input');
  const err = document.getElementById('nickname-error');

  title.textContent = isChange ? 'Change your nickname' : 'Choose a nickname';
  input.value = isChange && userNickname ? userNickname : '';
  err.textContent = '';
  modal.classList.add('visible');
  document.body.style.overflow = 'hidden';
  input.focus();
}

function changeNickname() {
  showNicknameModal(true);
}

async function submitNickname() {
  const input = document.getElementById('nickname-input');
  const err = document.getElementById('nickname-error');
  const nickname = input.value.trim();

  if (nickname.length < 2) { err.textContent = 'Must be at least 2 characters.'; return; }
  if (nickname.length > 20) { err.textContent = 'Maximum 20 characters.'; return; }
  if (!/^[\w\s\-]+$/.test(nickname)) { err.textContent = 'Letters, numbers, spaces, _ and - only.'; return; }

  const btn = document.getElementById('nickname-submit-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  try {
    await _db.collection('users').doc(currentUser.uid).set({ nickname }, { merge: true });
    userNickname = nickname;
    document.getElementById('nickname-modal').classList.remove('visible');
    document.body.style.overflow = '';
    renderAuthUI(currentUser);
  } catch (err2) {
    console.error('Save nickname error:', err2);
    document.getElementById('nickname-error').textContent = 'Could not save — try again.';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Save';
  }
}

function renderAuthUI(user) {
  const signinBtn = document.getElementById('auth-signin-btn');
  const userWidget = document.getElementById('auth-user-widget');
  if (user) {
    signinBtn.style.display = 'none';
    userWidget.style.display = 'flex';
    const photo = document.getElementById('auth-photo');
    if (user.photoURL) { photo.src = user.photoURL; photo.style.display = 'block'; }
    else { photo.style.display = 'none'; }
    document.getElementById('auth-name').textContent = userNickname || '…';
  } else {
    signinBtn.style.display = 'flex';
    userWidget.style.display = 'none';
  }
}

// Returns 'not-signed-in' | 'skipped' | 'new-record' | 'no-change' | 'error'
async function saveStreak(streak, lang) {
  if (!currentUser) return 'not-signed-in';
  if (streak === 0) return 'skipped';
  const collection = `streaks_${lang || 'ru'}`;

  const ref = _db.collection(collection).doc(currentUser.uid);
  try {
    const doc = await ref.get();
    const prevBest = doc.exists ? (doc.data().bestStreak || 0) : 0;
    const isNewRecord = streak > prevBest;

    await ref.set({
      uid: currentUser.uid,
      nickname: userNickname || 'Anonymous',
      bestStreak: Math.max(streak, prevBest),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    return isNewRecord ? 'new-record' : 'no-change';
  } catch (err) {
    console.error('Save streak error:', err);
    return 'error';
  }
}

async function openLeaderboard(lang) {
  lang = lang || 'ru';
  const collection = `streaks_${lang}`;
  const langName = (typeof LANGUAGES !== 'undefined' && LANGUAGES[lang])
    ? LANGUAGES[lang].name : 'Global';

  document.getElementById('lb-modal').classList.add('visible');
  document.body.style.overflow = 'hidden';
  document.getElementById('lb-header-title').textContent = `🏆 ${langName} Leaderboard`;
  document.getElementById('lb-body').innerHTML = '<div class="lb-empty">Loading…</div>';
  document.getElementById('lb-personal').innerHTML = '';

  try {
    const snapshot = await _db.collection(collection)
      .orderBy('bestStreak', 'desc')
      .limit(10)
      .get();
    const topStreaks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let myBest = null;
    if (currentUser) {
      const myDoc = await _db.collection('streaks').doc(currentUser.uid).get();
      if (myDoc.exists) myBest = myDoc.data().bestStreak || 0;
    }

    renderLeaderboardData(topStreaks, myBest);
  } catch (err) {
    console.error('Leaderboard error:', err);
    document.getElementById('lb-body').innerHTML =
      '<div class="lb-empty">Could not load — try again later.</div>';
  }
}

function closeLeaderboard() {
  document.getElementById('lb-modal').classList.remove('visible');
  document.body.style.overflow = '';
}

function renderLeaderboardData(streaks, myBest) {
  const body = document.getElementById('lb-body');
  const personal = document.getElementById('lb-personal');
  const medals = ['🥇', '🥈', '🥉'];
  const myUid = currentUser ? currentUser.uid : null;

  if (streaks.length === 0) {
    body.innerHTML = '<div class="lb-empty">No streaks yet — be the first!</div>';
  } else {
    body.innerHTML = streaks.map((s, i) => {
      const isMe = s.uid === myUid;
      const name = s.nickname || 'Anonymous';
      const initials = name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
      const rank = medals[i] || `${i + 1}`;
      return `
        <div class="lb-row${isMe ? ' lb-row-me' : ''}">
          <span class="lb-rank">${rank}</span>
          <span class="lb-avatar">${initials}</span>
          <span class="lb-name">${escHtml(name)}${isMe ? ' <span class="lb-you">(you)</span>' : ''}</span>
          <span class="lb-streak">${s.bestStreak} 🔥</span>
        </div>`;
    }).join('');
  }

  if (myBest !== null) {
    personal.innerHTML = `<div class="lb-personal-best">Your best streak: <strong>${myBest} 🔥</strong></div>`;
  } else if (currentUser) {
    personal.innerHTML = '<div class="lb-personal-best">Complete a round to appear on the leaderboard!</div>';
  } else {
    personal.innerHTML = `<div class="lb-personal-best"><button class="lb-signin-prompt" onclick="signIn()">Sign in with Google to save your streaks</button></div>`;
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initFirebase);
