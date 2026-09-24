import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_PATH = join(__dirname, '..', 'data', 'elan.db');

/**
 * Base SQLite via le module natif node:sqlite (Node 22+).
 * Aucune dépendance native à compiler.
 */
export const db = new DatabaseSync(DB_PATH);

/**
 * Petit adaptateur pour offrir une API proche de better-sqlite3 :
 *   db.prepare(sql).get(...) / .all(...) / .run(...)
 * node:sqlite fournit déjà prepare/get/all/run, on ajoute juste
 * une méthode exec() compatible.
 */
if (typeof db.exec !== 'function') {
  db.exec = (sql) => db.exec(sql);
}

/**
 * Schéma ÉLAN — 6 tables (cf. §25 du cahier des charges)
 * users, profiles, resources, journeys, tasks, activities
 * + mvp_test (journal de test, §36)
 */
export function initSchema() {
  db.exec(`
    -- ============================================================
    -- TABLE users (§25)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS users (
      user_id       TEXT PRIMARY KEY,
      name          TEXT,
      channel       TEXT DEFAULT 'web',
      created_at    TEXT DEFAULT (datetime('now')),
      updated_at    TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TABLE profiles (§8, §25) — profil dynamique
    -- ============================================================
    CREATE TABLE IF NOT EXISTS profiles (
      user_id             TEXT PRIMARY KEY,
      main_goal           TEXT,
      goal_category       TEXT,
      main_blocker        TEXT,
      current_status      TEXT,
      learning_preference TEXT,
      preferred_pace      TEXT,
      mentor_archetype    TEXT,
      available_time      TEXT,
      current_resource    TEXT,
      current_action      TEXT,
      streak              INTEGER DEFAULT 0,
      best_streak         INTEGER DEFAULT 0,
      last_activity       TEXT,
      onboarding_step     TEXT DEFAULT 'goal',
      onboarding_done     INTEGER DEFAULT 0,
      created_at          TEXT DEFAULT (datetime('now')),
      updated_at          TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TABLE resources (§10, §25)
    -- ============================================================
    CREATE TABLE IF NOT EXISTS resources (
      id          TEXT PRIMARY KEY,
      title       TEXT NOT NULL,
      type        TEXT,
      author      TEXT,
      category    TEXT,
      level       TEXT,
      language    TEXT DEFAULT 'fr',
      cost        TEXT DEFAULT 'gratuit',
      url         TEXT,
      duration    TEXT,
      context     TEXT,
      objective   TEXT,
      blocker     TEXT,
      status      TEXT DEFAULT 'a_verifier',
      source      TEXT,
      created_at  TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TABLE journeys (§25) — parcours suivi
    -- ============================================================
    CREATE TABLE IF NOT EXISTS journeys (
      journey_id   TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      resource_id  TEXT,
      title        TEXT,
      status       TEXT DEFAULT 'ACTIVE',
      started_at   TEXT DEFAULT (datetime('now')),
      completed_at TEXT
    );

    -- ============================================================
    -- TABLE tasks (§14, §25) — micro-actions
    -- ============================================================
    CREATE TABLE IF NOT EXISTS tasks (
      task_id      TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL,
      resource_id  TEXT,
      title        TEXT NOT NULL,
      description  TEXT,
      status       TEXT DEFAULT 'TODO',
      priority     INTEGER DEFAULT 1,
      due_date     TEXT,
      completed_at TEXT,
      created_at   TEXT DEFAULT (datetime('now')),
      source       TEXT
    );

    -- ============================================================
    -- TABLE activities (§26, §25) — mémoire opérationnelle
    -- ============================================================
    CREATE TABLE IF NOT EXISTS activities (
      activity_id TEXT PRIMARY KEY,
      user_id     TEXT NOT NULL,
      type        TEXT NOT NULL,
      message     TEXT,
      context     TEXT,
      timestamp   TEXT DEFAULT (datetime('now'))
    );

    -- ============================================================
    -- TABLE mvp_test (§36) — journal de test
    -- ============================================================
    CREATE TABLE IF NOT EXISTS mvp_test (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT DEFAULT (datetime('now')),
      fonctionnalite TEXT,
      friction      TEXT,
      gravite       TEXT,
      description   TEXT,
      solution      TEXT,
      statut        TEXT DEFAULT 'ouvert'
    );

    -- Index utiles
    CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id, status);
    CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_journeys_user ON journeys(user_id, status);
  `);
}

export default db;
