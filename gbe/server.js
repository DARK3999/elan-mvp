// GBÈ — serveur de relais (MVP).
// Quand une connexion internet existe, ce serveur est le point de synchro :
// les téléphones y déposent et y récupèrent alertes, messages et vocaux.
// (Le relais hors-ligne téléphone-à-téléphone par Bluetooth = phase native.)
//
// Zéro dépendance : uniquement les modules natifs de Node.
// Stockage : fichier JSON (data/feed.json) + fichiers audio (data/audio/).

import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join, normalize, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const PUBLIC_DIR = join(__dirname, 'public');
const DATA_DIR = join(__dirname, 'data');
const AUDIO_DIR = join(DATA_DIR, 'audio');
const DB_FILE = join(DATA_DIR, 'feed.json');
const PORT = process.env.PORT || 3100;

const TYPES = new Set(['inondation', 'incendie', 'secours', 'securite', 'violence', 'denonciation', 'info', 'ok']);
const MAX_TEXT = 600;
const MAX_FEED = 2000;
const MAX_AUDIO = 8 * 1024 * 1024; // 8 Mo
const AUDIO_EXT = { 'audio/webm': 'webm', 'audio/ogg': 'ogg', 'audio/mp4': 'm4a', 'audio/aac': 'aac', 'audio/mpeg': 'mp3', 'audio/wav': 'wav', 'audio/x-m4a': 'm4a' };

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon',
  '.webm': 'audio/webm', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.mp3': 'audio/mpeg', '.wav': 'audio/wav',
};

async function ensureData() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(AUDIO_DIR)) await mkdir(AUDIO_DIR, { recursive: true });
  if (!existsSync(DB_FILE)) await writeFile(DB_FILE, '[]', 'utf-8');
}
async function loadFeed() { try { return JSON.parse(await readFile(DB_FILE, 'utf-8')); } catch { return []; } }
async function saveFeed(feed) { await writeFile(DB_FILE, JSON.stringify(feed.slice(-MAX_FEED)), 'utf-8'); }

function sanitize(item) {
  if (!item || typeof item !== 'object') return null;
  const type = TYPES.has(item.type) ? item.type : 'info';
  const text = String(item.text ?? '').slice(0, MAX_TEXT).trim();
  const author = String(item.author ?? 'Anonyme').slice(0, 40).trim() || 'Anonyme';
  const zone = String(item.zone ?? '').slice(0, 60).trim();
  const commune = String(item.commune ?? '').slice(0, 60).trim();
  // audioUrl : on n'accepte qu'un chemin local /audio/<fichier> (anti-injection)
  let audioUrl = '';
  if (typeof item.audioUrl === 'string' && /^\/audio\/[A-Za-z0-9._-]+$/.test(item.audioUrl)) audioUrl = item.audioUrl;
  if (!text && !audioUrl && type !== 'secours' && type !== 'ok') return null;
  const createdAt = Number.isFinite(item.createdAt) ? item.createdAt : Date.now();
  const id = typeof item.id === 'string' && item.id.length <= 64 ? item.id : randomUUID();
  const out = { id, type, text, author, zone, commune, createdAt };
  if (audioUrl) out.audioUrl = audioUrl;
  return out;
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}
function sendJson(res, code, obj) { cors(res); res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); }

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const parts = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > limit) { reject(new Error('trop gros')); req.destroy(); } else parts.push(c); });
    req.on('end', () => resolve(Buffer.concat(parts)));
    req.on('error', reject);
  });
}

async function handleApi(req, res, url) {
  if (req.method === 'GET' && url.pathname === '/api/feed') {
    const since = Number(url.searchParams.get('since') || 0);
    const feed = await loadFeed();
    const items = feed.filter((it) => it.createdAt > since).sort((a, b) => b.createdAt - a.createdAt).slice(0, 500);
    return sendJson(res, 200, { ok: true, now: Date.now(), items });
  }
  if (req.method === 'POST' && url.pathname === '/api/post') {
    let payload;
    try { payload = JSON.parse((await readBody(req, 1_000_000)).toString('utf-8')); } catch { return sendJson(res, 400, { ok: false, error: 'json invalide' }); }
    const incoming = Array.isArray(payload) ? payload : [payload];
    const clean = incoming.map(sanitize).filter(Boolean);
    if (!clean.length) return sendJson(res, 422, { ok: false, error: 'aucun élément valide' });
    const feed = await loadFeed();
    const known = new Set(feed.map((it) => it.id));
    const added = [];
    for (const it of clean) if (!known.has(it.id)) { feed.push(it); known.add(it.id); added.push(it.id); }
    if (added.length) await saveFeed(feed);
    return sendJson(res, 200, { ok: true, added });
  }
  if (req.method === 'POST' && url.pathname === '/api/audio') {
    const ct = (req.headers['content-type'] || '').split(';')[0].trim();
    const ext = AUDIO_EXT[ct];
    if (!ext) return sendJson(res, 415, { ok: false, error: 'format audio non accepté' });
    let buf;
    try { buf = await readBody(req, MAX_AUDIO); } catch { return sendJson(res, 413, { ok: false, error: 'audio trop long' }); }
    if (!buf.length) return sendJson(res, 422, { ok: false, error: 'audio vide' });
    const id = randomUUID();
    const name = id + '.' + ext;
    await writeFile(join(AUDIO_DIR, name), buf);
    return sendJson(res, 200, { ok: true, id, url: '/audio/' + name });
  }
  return sendJson(res, 404, { ok: false, error: 'route inconnue' });
}

async function serveAudio(req, res, url) {
  const name = basename(decodeURIComponent(url.pathname)); // empêche la traversée
  if (!/^[A-Za-z0-9._-]+$/.test(name)) { res.writeHead(400); return res.end('mauvais nom'); }
  try {
    const content = await readFile(join(AUDIO_DIR, name));
    res.writeHead(200, { 'Content-Type': MIME[extname(name)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000' });
    res.end(content);
  } catch { res.writeHead(404); res.end('introuvable'); }
}

async function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname);
  if (rel === '/') rel = '/index.html';
  const safe = normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) { res.writeHead(403); return res.end('interdit'); }
  try {
    const content = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': MIME[extname(filePath)] || 'application/octet-stream' });
    res.end(content);
  } catch {
    try { const html = await readFile(join(PUBLIC_DIR, 'index.html')); res.writeHead(200, { 'Content-Type': MIME['.html'] }); res.end(html); }
    catch { res.writeHead(404); res.end('introuvable'); }
  }
}

await ensureData();
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }
  try {
    if (url.pathname.startsWith('/api/')) return await handleApi(req, res, url);
    if (url.pathname.startsWith('/audio/')) return await serveAudio(req, res, url);
    return await serveStatic(req, res, url);
  } catch { sendJson(res, 500, { ok: false, error: 'erreur serveur' }); }
});
server.listen(PORT, () => { console.log(`\n🟢 GBÈ relais prêt → http://localhost:${PORT}\n`); });
