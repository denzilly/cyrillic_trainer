'use strict';

let _auth = null;
let _db = null;
let currentUser = null;

function initFirebase() {
  _auth = firebase.auth();
  _db = firebase.firestore();

  _auth.onAuthStateChanged(user => {
    currentUser = user;
    renderAuthUI(user);
  });

  document.getElementById('lb-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('lb-modal')) closeLeaderboard();
  });
}

function signIn() {
  const provider = new firebase.auth.GoogleAuthProvider();
  _auth.signInWithPopup(provider).catch(err => console.error('Sign-in error:', err));
}

function signOutUser() {
  _auth.signOut();
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
    document.getElementById('auth-name').textContent =
      (user.displayName || 'User').split(' ')[0];
  } else {
    signinBtn.style.display = 'flex';
    userWidget.style.display = 'none';
  }
}

async function saveScore(score, total, pct, maxStreak) {
  if (!currentUser) return 'not-signed-in';
  try {
    await _db.collection('scores').add({
      uid: currentUser.uid,
      displayName: currentUser.displayName || 'Anonymous',
      photoURL: currentUser.photoURL || null,
      score,
      total,
      pct,
      maxStreak,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });
    return 'saved';
  } catch (err) {
    console.error('Save score error:', err);
    return 'error';
  }
}

async function openLeaderboard() {
  document.getElementById('lb-modal').classList.add('visible');
  document.body.style.overflow = 'hidden';
  document.getElementById('lb-body').innerHTML = '<div class="lb-empty">Loading…</div>';
  document.getElementById('lb-personal').innerHTML = '';

  try {
    const snapshot = await _db.collection('scores')
      .orderBy('pct', 'desc')
      .limit(10)
      .get();
    const topScores = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    let myBest = null;
    if (currentUser) {
      const mySnap = await _db.collection('scores')
        .where('uid', '==', currentUser.uid)
        .get();
      if (!mySnap.empty) {
        const mine = mySnap.docs.map(d => d.data());
        myBest = mine.reduce((best, s) => s.pct > best.pct ? s : best, mine[0]);
      }
    }

    renderLeaderboardData(topScores, myBest);
  } catch (err) {
    console.error('Leaderboard error:', err);
    document.getElementById('lb-body').innerHTML =
      '<div class="lb-empty">Could not load scores — try again later.</div>';
  }
}

function closeLeaderboard() {
  document.getElementById('lb-modal').classList.remove('visible');
  document.body.style.overflow = '';
}

function renderLeaderboardData(scores, myBest) {
  const body = document.getElementById('lb-body');
  const personal = document.getElementById('lb-personal');
  const medals = ['🥇', '🥈', '🥉'];
  const myUid = currentUser ? currentUser.uid : null;

  if (scores.length === 0) {
    body.innerHTML = '<div class="lb-empty">No scores yet — be the first!</div>';
  } else {
    body.innerHTML = scores.map((s, i) => {
      const isMe = s.uid === myUid;
      const initials = (s.displayName || '?').split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();
      const rank = medals[i] || `${i + 1}`;
      return `
        <div class="lb-row${isMe ? ' lb-row-me' : ''}">
          <span class="lb-rank">${rank}</span>
          <span class="lb-avatar">${initials}</span>
          <span class="lb-name">${escHtml(s.displayName || 'Anonymous')}${isMe ? ' <span class="lb-you">(you)</span>' : ''}</span>
          <span class="lb-pct">${s.pct}%</span>
          <span class="lb-words">${s.score}/${s.total}</span>
        </div>`;
    }).join('');
  }

  if (myBest) {
    personal.innerHTML = `<div class="lb-personal-best">Your personal best: <strong>${myBest.pct}%</strong> — ${myBest.score}/${myBest.total} words</div>`;
  } else if (currentUser) {
    personal.innerHTML = '<div class="lb-personal-best">Complete a round to appear on the leaderboard!</div>';
  } else {
    personal.innerHTML = `<div class="lb-personal-best"><button class="lb-signin-prompt" onclick="signIn()">Sign in with Google to save your scores</button></div>`;
  }
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', initFirebase);
