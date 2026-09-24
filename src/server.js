import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { initSchema, db } from './db.js';
import { seed } from './seed.js';
import {
  getOrCreateUser,
  getProfile,
  startOnboarding,
  handleMessage,
  getHome,
  getStats,
  getBadges,
  recommend,
  startCapsule,
  buildReminder,
  startWeeklyReview,
  adaptJourney,
  logActivity,
} from './engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static(join(__dirname, '..', 'public')));

// Initialisation
initSchema();
seed();

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

// Créer / récupérer un utilisateur + démarrer l'onboarding
app.post('/api/session', (req, res) => {
  const { userId, name } = req.body || {};
  const id = userId || `aron`;
  getOrCreateUser(id, name || 'Aron');
  const profile = getProfile(id);

  if (!profile.onboarding_done) {
    const onboarding = startOnboarding(id);
    return res.json({ userId: id, onboarding, home: null });
  }
  return res.json({ userId: id, onboarding: null, home: getHome(id) });
});

// Envoyer un message
app.post('/api/message', (req, res) => {
  const { userId, text, state } = req.body || {};
  if (!userId || !text) return res.status(400).json({ error: 'userId et text requis' });
  getOrCreateUser(userId);

  const result = handleMessage(userId, text, state || {});
  logActivity(userId, 'CHAT', `User: ${text}`);

  res.json({
    ...result,
    home: getHome(userId),
  });
});

// Écran principal
app.get('/api/home/:userId', (req, res) => {
  getOrCreateUser(req.params.userId);
  res.json(getHome(req.params.userId));
});

// Profil complet (admin / debug)
app.get('/api/profile/:userId', (req, res) => {
  const profile = getProfile(req.params.userId);
  if (!profile) return res.status(404).json({ error: 'Profil introuvable' });
  res.json({ profile, stats: getStats(req.params.userId), badges: getBadges(req.params.userId) });
});

// Actions directes
app.post('/api/recommend', (req, res) => {
  const { userId } = req.body || {};
  res.json(recommend(userId));
});

app.post('/api/capsule', (req, res) => {
  const { userId } = req.body || {};
  res.json(startCapsule(userId));
});

app.post('/api/reminder', (req, res) => {
  const { userId } = req.body || {};
  res.json(buildReminder(userId));
});

app.post('/api/weekly-review', (req, res) => {
  const { userId } = req.body || {};
  res.json(startWeeklyReview(userId));
});

app.post('/api/adapt', (req, res) => {
  const { userId } = req.body || {};
  res.json(adaptJourney(userId));
});

// ---------------------------------------------------------------------------
// Tableau de suivi administrateur (§32)
// ---------------------------------------------------------------------------
app.get('/api/admin/overview', (req, res) => {
  const users = db.prepare('SELECT * FROM users').all();
  const profiles = db.prepare('SELECT * FROM profiles').all();
  const tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC LIMIT 50').all();
  const activities = db.prepare('SELECT * FROM activities ORDER BY timestamp DESC LIMIT 50').all();
  const resources = db.prepare('SELECT COUNT(*) c FROM resources').get().c;
  const mvpTest = db.prepare('SELECT * FROM mvp_test ORDER BY date DESC LIMIT 50').all();

  // KPI (§33)
  const totalUsers = users.length;
  const onboarded = profiles.filter((p) => p.onboarding_done).length;
  const withFirstAction = profiles.filter((p) => p.current_action).length;
  const tasksCreated = db.prepare('SELECT COUNT(*) c FROM tasks').get().c;
  const tasksDone = db.prepare(`SELECT COUNT(*) c FROM tasks WHERE status='DONE'`).get().c;

  res.json({
    kpi: {
      activation: totalUsers ? Math.round((onboarded / totalUsers) * 100) : 0,
      premiereAction: totalUsers ? Math.round((withFirstAction / totalUsers) * 100) : 0,
      tauxAction: tasksCreated ? Math.round((tasksDone / tasksCreated) * 100) : 0,
      totalUsers,
      onboarded,
      tasksCreated,
      tasksDone,
    },
    users,
    profiles,
    tasks,
    activities,
    resources,
    mvpTest,
  });
});

// Journal de test (§36)
app.post('/api/admin/mvp-test', (req, res) => {
  const { fonctionnalite, friction, gravite, description, solution } = req.body || {};
  db.prepare(
    `INSERT INTO mvp_test (fonctionnalite, friction, gravite, description, solution)
     VALUES (?, ?, ?, ?, ?)`
  ).run(fonctionnalite, friction, gravite, description, solution);
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n🔥 ÉLAN MVP démarré sur http://localhost:${PORT}\n`);
});
