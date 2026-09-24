// ---------------------------------------------------------------------------
// ÉLAN — Client conversationnel
// ---------------------------------------------------------------------------
const USER_ID = 'aron';

const els = {
  messages: document.getElementById('messages'),
  quickReplies: document.getElementById('quickReplies'),
  input: document.getElementById('input'),
  composer: document.getElementById('composer'),
  sendBtn: document.getElementById('sendBtn'),
  chatScreen: document.getElementById('chatScreen'),
  homeScreen: document.getElementById('homeScreen'),
  homeBtn: document.getElementById('homeBtn'),
  startMissionBtn: document.getElementById('startMissionBtn'),
  homeGreeting: document.getElementById('homeGreeting'),
  homeStreak: document.getElementById('homeStreak'),
  homeCap: document.getElementById('homeCap'),
  homeMission: document.getElementById('homeMission'),
  homeMinutes: document.getElementById('homeMinutes'),
  homeActions: document.getElementById('homeActions'),
  homeBadges: document.getElementById('homeBadges'),
};

// État de conversation (mode ancrage, bilan, etc.)
let convState = {};

// ---------------------------------------------------------------------------
// Rendu
// ---------------------------------------------------------------------------
function addBubble(role, text) {
  const div = document.createElement('div');
  div.className = `bubble ${role}`;
  div.textContent = text;
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
  return div;
}

function showTyping() {
  const div = document.createElement('div');
  div.className = 'bubble typing';
  div.textContent = 'ÉLAN écrit…';
  div.id = 'typing';
  els.messages.appendChild(div);
  els.messages.scrollTop = els.messages.scrollHeight;
}

function hideTyping() {
  const t = document.getElementById('typing');
  if (t) t.remove();
}

function renderQuickReplies(replies) {
  els.quickReplies.innerHTML = '';
  if (!replies || !replies.length) return;
  for (const r of replies) {
    const btn = document.createElement('button');
    btn.className = 'quick';
    btn.textContent = r;
    btn.onclick = () => sendMessage(r);
    els.quickReplies.appendChild(btn);
  }
}

function renderHome(home) {
  if (!home) return;
  els.homeGreeting.textContent = home.greeting;
  els.homeStreak.textContent = `🔥 ${home.streak} jour${home.streak > 1 ? 's' : ''}`;
  els.homeCap.textContent = home.cap;
  els.homeMission.textContent = home.mission || "Aucune mission pour l'instant. Dis-moi « orientation ».";
  els.homeMinutes.textContent = `${home.learningMinutes} min`;
  els.homeActions.textContent = home.actionsDone;

  if (home.mission) {
    els.startMissionBtn.classList.remove('hidden');
  } else {
    els.startMissionBtn.classList.add('hidden');
  }

  els.homeBadges.innerHTML = '';
  for (const b of home.badges || []) {
    const span = document.createElement('span');
    span.className = 'badge';
    span.textContent = `🏅 ${b.label}`;
    els.homeBadges.appendChild(span);
  }
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------
function showChat() {
  els.homeScreen.classList.add('hidden');
  els.chatScreen.classList.remove('hidden');
}

function showHome() {
  els.chatScreen.classList.add('hidden');
  els.homeScreen.classList.remove('hidden');
  refreshHome();
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------
async function api(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function refreshHome() {
  const res = await fetch(`/api/home/${USER_ID}`);
  const home = await res.json();
  renderHome(home);
}

// ---------------------------------------------------------------------------
// Envoi de message
// ---------------------------------------------------------------------------
async function sendMessage(text) {
  if (!text || !text.trim()) return;
  showChat();
  addBubble('user', text);
  els.input.value = '';
  renderQuickReplies([]);
  showTyping();

  try {
    const data = await api('/api/message', { userId: USER_ID, text, state: convState });

    hideTyping();

    // Mise à jour de l'état de conversation
    convState = {};
    if (data.mode) convState.mode = data.mode;
    if (typeof data.questionIndex === 'number') {
      convState.mode = data.done ? {} : 'weekly_review';
      convState.questionIndex = data.questionIndex;
    }

    // Affichage des messages ÉLAN
    for (const m of data.messages || []) {
      addBubble('elan', m.text);
    }

    renderQuickReplies(data.quickReplies);
    renderHome(data.home);
  } catch (err) {
    hideTyping();
    addBubble('elan', "Oups, une erreur est survenue. Réessaie dans un instant.");
    console.error(err);
  }
}

// ---------------------------------------------------------------------------
// Démarrage
// ---------------------------------------------------------------------------
async function boot() {
  const data = await api('/api/session', { userId: USER_ID, name: 'Aron' });

  if (data.onboarding) {
    showChat();
    for (const m of data.onboarding.messages || []) {
      addBubble('elan', m.text);
    }
    renderQuickReplies(data.onboarding.quickReplies);
  } else {
    showHome();
    renderHome(data.home);
    addBubble('elan', 'Content de te revoir 👋 Dis-moi « orientation » pour continuer, ou « bilan » pour faire le point.');
    renderQuickReplies(['Orientation', 'Bilan', 'Rappel']);
  }
}

// ---------------------------------------------------------------------------
// Événements
// ---------------------------------------------------------------------------
els.composer.addEventListener('submit', (e) => {
  e.preventDefault();
  sendMessage(els.input.value);
});

els.homeBtn.addEventListener('click', showHome);

els.startMissionBtn.addEventListener('click', () => {
  showChat();
  sendMessage('Commencer');
});

boot();
