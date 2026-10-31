// GBÈ — serveur de relais (MVP)
// Objectif : quand une connexion internet existe, ce serveur sert de point de
// synchronisation central — les téléphones y déposent et y récupèrent les
// alertes et messages. (Le relais hors-ligne téléphone-à-téléphone par
// Bluetooth mesh est une phase 2 NATIVE, hors de ce dépôt web.)
//
// Zéro dépendance : uniquement les modules natifs de Node (http, fs, crypto).
// Stockage : un simple fichier JSON (data/feed.json). Parfait pour un MVP
// auto-hébergeable à très bas coût.

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const DATA_DIR = join(__dirname, 'data');
const DB_FILE = join(DATA_DIR, 'feed.json');
const PORT = process.env.PORT || 3100;

// Types d'alerte reconnus (validation côté serveur)
const TYPES = new Set(['inondation', 'incendie', 'secours', 'securite', 'info', 'ok']);
const MAX_TEXT = 500;
const MAX_FEED = 2000; // on garde les 2000 derniers éléments

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// ---------- Persistance ----------
async function ensureData() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) await writeFile(DB_FILE, '[]', 'utf-8');
}

async function loadFeed() {
  try {
    return JSON.parse(await readFile(DB_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

async function saveFeed(feed) {
  const trimmed = feed.slice(-MAX_FEED);
  await writeFile(DB_FILE, JSON.stringify(trimmed), 'utf-8');
}

// ---------- Validation d'un élément ----------
function sanitize(item) {
  if (!item || typeof item !== 'object') return null;
  const type = TYPES.has(item.type) ? item.type : 'info';
  const text = String(item.text ?? '').slice(0, MAX_TEXT).trim();
  const author = String(item.author ?? 'Anonyme').slice(0, 40).trim() || 'Anonyme';
  const zone = String(item.zone ?? '').slice(0, 60).trim();
  if (!text && type === 'info') return null; // un simple message doit avoir du texte
  const createdAt = Number.isFinite(item.createdAt) ? item.createdAt : Date.now();
  const id = typeof item.id === 'string' && item.id.length <= 64 ? item.id : randomUUID();
  return { id, type, text, author, zone, createdAt };
}

// ---------- API ----------
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(body);
}

function readBody(req, limit = 1_000_000) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > limit) {
        reject(new Error('payload trop gros'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  // GET /api/feed?since=<ms>  → éléments plus récents que `since`
  if (req.method === 'GET' && url.pathname === '/api/feed') {
    const since = Number(url.searchParams.get('since') || 0);
    const feed = await loadFeed();
    const items = feed
      .filter((it) => it.createdAt > since)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 500);
    return sendJson(res, 200, { ok: true, now: Date.now(), items });
  }

  // POST /api/post  → dépose un (ou plusieurs) élément(s) ; dédoublonnage par id
  if (req.method === 'POST' && url.pathname === '/api/post') {
    let payload;
    try {
      payload = JSON.parse(await readBody(req));
    } catch {
      return sendJson(res, 400, { ok: false, error: 'json invalide' });
    }
    const incoming = Array.isArray(payload) ? payload : [payload];
    const clean = incoming.map(sanitize).filter(Boolean);
    if (!clean.length) return sendJson(res, 422, { ok: false, error: 'aucun élément valide' });

    const feed = await loadFeed();
    const known = new Set(feed.map((it) => it.id));
    const added = [];
    for (const it of clean) {
      if (!known.has(it.id)) {
        feed.push(it);
        known.add(it.id);
        added.push(it);
      }
    }
    if (added.length) await saveFeed(feed);
    return sendJson(res, 200, { ok: true, added: added.map((it) => it.id) });
  }

  return sendJson(res, 404, { ok: false, error: 'route inconnue' });
}

// ---------- Fichiers statiques (la PWA) ----------
async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  // anti path-traversal
  const safe = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('interdit');
  }
  try {
    const content = await readFile(filePath);
    const type = MIME[extname(filePath)] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(content);
  } catch {
    // SPA fallback léger : toute route inconnue renvoie l'app
    try {
      const content = await readFile(join(PUBLIC_DIR, 'index.html'));
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('introuvable');
    }
  }
}

// ---------- Démarrage ----------
await ensureData();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    return res.end();
  }
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    return await serveStatic(req, res, url);
  } catch (err) {
    sendJson(res, 500, { ok: false, error: 'erreur serveur' });
  }
});

server.listen(PORT, () => {
  console.log(`\n🟢 GBÈ relais prêt → http://localhost:${PORT}\n`);
});
