// GBÈ — logique client (MVP, vanilla JS, offline-first)
//
// Principe : TOUT fonctionne hors-ligne.
//  - Le profil et le fil sont gardés dans localStorage.
//  - Publier = ajouter localement + mettre dans une file d'attente (outbox).
//  - Dès qu'il y a du réseau, on vide l'outbox vers le serveur et on récupère
//    les nouveautés des autres.
// Le relais direct téléphone-à-téléphone (Bluetooth mesh) sera la phase 2 native.

const LS_PROFILE = 'gbe_profile';
const LS_FEED = 'gbe_feed';
const LS_OUTBOX = 'gbe_outbox';
const LS_SINCE = 'gbe_since';

const TYPE_LABELS = {
  inondation: '🌊 Inondation',
  incendie: '🔥 Incendie',
  secours: '🚑 Secours',
  securite: '🛡️ Sécurité',
  info: '💬 Info',
  ok: '✅ Je vais bien',
};

// ---------- Petits utilitaires de stockage ----------
const load = (k, fallback) => {
  try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
  catch { return fallback; }
};
const save = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
};

const uid = () =>
  (crypto.randomUUID ? crypto.randomUUID()
    : 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2));

// ---------- État ----------
let profile = load(LS_PROFILE, null);
let feed = load(LS_FEED, []);        // [{id, type, text, author, zone, createdAt, pending}]
let outbox = load(LS_OUTBOX, []);    // [id, id, ...] en attente d'envoi
let selectedType = 'info';

// ---------- Éléments ----------
const $ = (sel) => document.querySelector(sel);
const feedList = $('#feed-list');
const feedEmpty = $('#feed-empty');
const netBanner = $('#net-banner');
const zoneTag = $('#zone-tag');

// ---------- Rendu ----------
function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderFeed() {
  const sorted = [...feed].sort((a, b) => b.createdAt - a.createdAt);
  feedEmpty.hidden = sorted.length > 0;
  feedList.innerHTML = sorted.map((p) => `
    <li class="post t-${p.type} ${p.pending ? 'pending' : ''}">
      <div class="post-top">
        <span class="badge">${TYPE_LABELS[p.type] || p.type}</span>
        <span class="post-meta">${timeAgo(p.createdAt)}${p.pending ? ' · <span class="pending-tag">en attente</span>' : ''}</span>
      </div>
      <div>
        <span class="post-author">${escapeHtml(p.author)}</span>
        ${p.zone ? `<span class="post-zone"> · ${escapeHtml(p.zone)}</span>` : ''}
      </div>
      ${p.text ? `<p class="post-text">${escapeHtml(p.text)}</p>` : ''}
    </li>
  `).join('');
}

function setZoneTag() {
  zoneTag.textContent = profile ? `📍 ${profile.zone} · ${profile.author}` : '';
}

// ---------- Bandeau réseau ----------
function setBanner(state, msg) {
  if (!state) { netBanner.hidden = true; return; }
  netBanner.hidden = false;
  netBanner.className = `net-banner ${state}`;
  netBanner.textContent = msg;
}

function reflectNet() {
  if (!navigator.onLine) {
    setBanner('offline', '📴 Hors-ligne — tes alertes seront envoyées dès le retour du réseau');
  } else if (outbox.length) {
    setBanner('syncing', `🔄 Synchronisation de ${outbox.length} alerte(s)…`);
  } else {
    setBanner('online', '🟢 Connecté');
    setTimeout(() => { if (navigator.onLine && !outbox.length) setBanner(null); }, 2500);
  }
}

// ---------- Synchronisation ----------
let syncing = false;
async function sync() {
  if (syncing || !navigator.onLine) { reflectNet(); return; }
  syncing = true;
  reflectNet();
  try {
    // 1) Envoyer la file d'attente
    if (outbox.length) {
      const pending = feed.filter((p) => outbox.includes(p.id))
        .map(({ pending, ...rest }) => rest);
      if (pending.length) {
        const res = await fetch('/api/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(pending),
        });
        if (res.ok) {
          outbox = [];
          save(LS_OUTBOX, outbox);
          feed = feed.map((p) => ({ ...p, pending: false }));
          save(LS_FEED, feed);
        }
      } else {
        outbox = [];
        save(LS_OUTBOX, outbox);
      }
    }

    // 2) Récupérer les nouveautés des autres
    const since = load(LS_SINCE, 0);
    const res = await fetch(`/api/feed?since=${since}`);
    if (res.ok) {
      const data = await res.json();
      const known = new Set(feed.map((p) => p.id));
      let maxTs = since;
      for (const it of data.items || []) {
        maxTs = Math.max(maxTs, it.createdAt);
        if (!known.has(it.id)) {
          feed.push({ ...it, pending: false });
          known.add(it.id);
        }
      }
      save(LS_SINCE, data.now || maxTs);
      save(LS_FEED, feed);
      renderFeed();
    }
  } catch {
    // réseau capricieux : on réessaiera au prochain événement
  } finally {
    syncing = false;
    reflectNet();
  }
}

// ---------- Publier ----------
function publish(type, text) {
  if (!profile) { openOnboarding(); return; }
  const cleanText = (text || '').trim();
  if (type === 'info' && !cleanText) {
    $('#msg').focus();
    return;
  }
  const item = {
    id: uid(),
    type,
    text: cleanText,
    author: profile.author,
    zone: profile.zone,
    createdAt: Date.now(),
    pending: true,
  };
  feed.push(item);
  outbox.push(item.id);
  save(LS_FEED, feed);
  save(LS_OUTBOX, outbox);
  renderFeed();
  $('#msg').value = '';
  sync();
}

// ---------- Profil / onboarding ----------
function openOnboarding() {
  const dlg = $('#onboarding');
  dlg.showModal();
}
$('#onboarding-form').addEventListener('submit', () => {
  const author = $('#ob-pseudo').value.trim() || 'Anonyme';
  const zone = $('#ob-zone').value.trim();
  profile = { author, zone };
  save(LS_PROFILE, profile);
  setZoneTag();
});

$('#profile-btn').addEventListener('click', () => {
  if (!profile) return openOnboarding();
  $('#pf-pseudo').value = profile.author;
  $('#pf-zone').value = profile.zone;
  $('#profile-dialog').showModal();
});
$('#profile-form').addEventListener('submit', (e) => {
  if (e.submitter && e.submitter.value === 'cancel') return;
  profile = {
    author: $('#pf-pseudo').value.trim() || 'Anonyme',
    zone: $('#pf-zone').value.trim(),
  };
  save(LS_PROFILE, profile);
  setZoneTag();
});

// ---------- Chips de type ----------
document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    document.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
    chip.classList.add('active');
    selectedType = chip.dataset.type;
    if (selectedType === 'ok') publish('ok', 'Je vais bien 💚');
  });
});

// ---------- Actions ----------
$('#send-btn').addEventListener('click', () => publish(selectedType, $('#msg').value));
$('#sos-btn').addEventListener('click', () => publish('secours', $('#msg').value || 'SOS — besoin de secours immédiat'));
$('#refresh-btn').addEventListener('click', sync);

// ---------- Événements réseau ----------
window.addEventListener('online', sync);
window.addEventListener('offline', reflectNet);

// Rafraîchir les horodatages toutes les 30 s
setInterval(renderFeed, 30_000);
// Re-synchroniser périodiquement si en ligne
setInterval(() => { if (navigator.onLine) sync(); }, 20_000);

// ---------- Démarrage ----------
document.querySelector('.chip[data-type="info"]').classList.add('active');
setZoneTag();
renderFeed();
reflectNet();
if (!profile) openOnboarding();
sync();

// Service worker (mode hors-ligne)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
