import { db } from './db.js';
import {
  ONBOARDING_STEPS,
  BLOCKERS,
  STATUSES,
  LEARNING_PREFERENCES,
  ARCHETYPES,
  QUICK_GOALS,
  BADGES,
  WEEKLY_REVIEW_QUESTIONS,
} from './reference.js';

// ---------------------------------------------------------------------------
// Utilitaires
// ---------------------------------------------------------------------------
export function uid(prefix = 'id') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function now() {
  return new Date().toISOString();
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a, b) {
  const d1 = new Date(a + 'T00:00:00Z');
  const d2 = new Date(b + 'T00:00:00Z');
  return Math.round((d2 - d1) / 86400000);
}

// ---------------------------------------------------------------------------
// Journalisation d'activité (§26)
// ---------------------------------------------------------------------------
export function logActivity(userId, type, message, context = null) {
  db.prepare(
    `INSERT INTO activities (activity_id, user_id, type, message, context, timestamp)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(uid('act'), userId, type, message, context ? JSON.stringify(context) : null, now());
}

// ---------------------------------------------------------------------------
// Utilisateurs & profils
// ---------------------------------------------------------------------------
export function getOrCreateUser(userId, name = null) {
  let user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (user_id, name) VALUES (?, ?)').run(userId, name);
    db.prepare('INSERT INTO profiles (user_id) VALUES (?)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId);
  }
  return user;
}

export function getProfile(userId) {
  return db.prepare('SELECT * FROM profiles WHERE user_id = ?').get(userId);
}

export function updateProfile(userId, fields) {
  const keys = Object.keys(fields);
  if (!keys.length) return;
  const setClause = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k]);
  db.prepare(
    `UPDATE profiles SET ${setClause}, updated_at = ? WHERE user_id = ?`
  ).run(...values, now(), userId);
}

// ---------------------------------------------------------------------------
// Normalisation des réponses libres vers les clés de référence
// ---------------------------------------------------------------------------
function normalize(input, list) {
  if (!input) return null;
  const s = input.toLowerCase();
  for (const item of list) {
    if (s.includes(item.key) || item.label.toLowerCase().includes(s) || s.includes(item.label.toLowerCase().replace(/[^\w\sàâéèêëîïôùûç']/g, '').trim())) {
      return item.key;
    }
  }
  // correspondances souples par mots-clés
  const map = {
    temps: ['temps', 'occupé', 'pas le temps'],
    methode: ['méthode', 'methode', 'comment faire', 'organisation'],
    procrastination: ['procrastin', 'remets', 'repousse', 'flemme'],
    abandon: ['abandon', 'lâche', 'arrête', 'décourage'],
    trop_idees: ['trop d\'idées', 'trop d idees', 'dispers', 'éparpill'],
    ressources: ['ressources', 'argent', 'moyens', 'budget'],
    confiance: ['confiance', 'doute', 'peur', 'imposteur'],
    savoir_quoi: ['quoi apprendre', 'par où', 'perdu', 'sais pas'],
    etudiant: ['étudiant', 'etudiant', 'école', 'université', 'fac'],
    salarie: ['salarié', 'salarie', 'emploi', 'travail', 'boulot'],
    entrepreneur: ['entrepreneur', 'entreprise', 'business', 'projet'],
    chercheur_emploi: ['chercheur', 'chômage', 'chomage', 'sans emploi'],
    independant: ['indépendant', 'independant', 'freelance'],
    reconversion: ['reconversion', 'changer de voie'],
    lecture: ['lecture', 'lire', 'livre'],
    video: ['vidéo', 'video', 'youtube'],
    audio: ['audio', 'podcast', 'écouter'],
    pratique: ['pratique', 'faire', 'exercice'],
    combinaison: ['combinaison', 'mélange', 'mix'],
    batisseur: ['bâtisseur', 'batisseur', 'construire'],
    strategge: ['stratège', 'strategge', 'stratégie', 'planifier'],
    visionnaire: ['visionnaire', 'vision', 'voir loin'],
    executant: ['exécutant', 'executant', 'action', 'agir'],
  };
  for (const [key, words] of Object.entries(map)) {
    if (words.some((w) => s.includes(w))) return key;
  }
  return null;
}

function labelFor(key, list) {
  const item = list.find((i) => i.key === key);
  return item ? item.label : key;
}

// ---------------------------------------------------------------------------
// ONBOARDING CONVERSATIONNEL (§7, F01–F05)
// ---------------------------------------------------------------------------
export function startOnboarding(userId) {
  const profile = getProfile(userId);
  const step = ONBOARDING_STEPS.find((s) => s.step === profile.onboarding_step) || ONBOARDING_STEPS[0];
  logActivity(userId, 'ONBOARDING', `Début onboarding — étape ${step.step}`);
  return {
    messages: [
      {
        role: 'elan',
        text: 'Salut 👋\nBienvenue sur ÉLAN.\nSi on se reparle dans 6 mois et que tu as réussi à changer une seule grande chose dans ta vie, ce serait quoi ?',
      },
      { role: 'elan', text: step.question },
    ],
    quickReplies: step.quickReplies,
    step: step.step,
  };
}

/**
 * Traite une réponse d'onboarding et avance à l'étape suivante.
 * Retourne { messages, quickReplies, done }
 */
export function handleOnboarding(userId, answer) {
  const profile = getProfile(userId);
  const current = ONBOARDING_STEPS.find((s) => s.step === profile.onboarding_step) || ONBOARDING_STEPS[0];

  const messages = [];
  const fields = {};

  // Interprétation de la réponse selon l'étape
  switch (current.step) {
    case 'goal': {
      const quick = QUICK_GOALS.find((g) => answer.toLowerCase().includes(g.label.toLowerCase().replace(/[^\w\sàâéèêëîïôùûç']/g, '').trim()));
      fields.main_goal = answer;
      fields.goal_category = quick ? quick.category : 'autre';
      break;
    }
    case 'blocker': {
      const key = normalize(answer, BLOCKERS);
      fields.main_blocker = key || answer;
      break;
    }
    case 'status': {
      const key = normalize(answer, STATUSES);
      fields.current_status = key || answer;
      break;
    }
    case 'preference': {
      const key = normalize(answer, LEARNING_PREFERENCES);
      fields.learning_preference = key || answer;
      break;
    }
    case 'archetype': {
      const key = normalize(answer, ARCHETYPES);
      fields.mentor_archetype = key || answer;
      break;
    }
  }

  // Étape suivante
  const idx = ONBOARDING_STEPS.findIndex((s) => s.step === current.step);
  const next = ONBOARDING_STEPS[idx + 1];

  if (next) {
    fields.onboarding_step = next.step;
    updateProfile(userId, fields);
    logActivity(userId, 'PROFILE_UPDATED', `${current.field} = ${fields[current.field]}`, { step: current.step });
    messages.push({ role: 'elan', text: next.question });
    return { messages, quickReplies: next.quickReplies, done: false };
  }

  // Fin de l'onboarding
  fields.onboarding_step = 'done';
  fields.onboarding_done = 1;
  updateProfile(userId, fields);
  logActivity(userId, 'PROFILE_UPDATED', `${current.field} = ${fields[current.field]}`, { step: current.step });
  logActivity(userId, 'ONBOARDING', 'Onboarding terminé');

  const p = getProfile(userId);
  messages.push({
    role: 'elan',
    text: `Merci 🙏 J'ai une première idée de ton profil.\n\n🎯 Ton cap : ${p.main_goal}\n🧩 Ton blocage : ${labelFor(p.main_blocker, BLOCKERS)}\n👤 Ta situation : ${labelFor(p.current_status, STATUSES)}\n\nOn va travailler une seule chose à la fois. Je te propose maintenant une première orientation.`,
  });

  return { messages, quickReplies: ['Voir ma première orientation'], done: true };
}

// ---------------------------------------------------------------------------
// MOTEUR DE RECOMMANDATION (§9, F06) — UNE priorité, UNE ressource, UNE action
// ---------------------------------------------------------------------------
export function recommend(userId) {
  const profile = getProfile(userId);
  const category = profile.goal_category || 'autre';
  const blocker = profile.main_blocker || 'methode';

  // Recherche d'une ressource adaptée (objectif + blocage), sinon repli par catégorie
  let resource =
    db.prepare(
      `SELECT * FROM resources
       WHERE (objective = ? OR category = ?)
       ORDER BY (blocker = ?) DESC, RANDOM() LIMIT 1`
    ).get(category, category, blocker) ||
    db.prepare('SELECT * FROM resources ORDER BY RANDOM() LIMIT 1').get();

  if (!resource) {
    return {
      messages: [
        {
          role: 'elan',
          text: "Je n'ai pas encore de ressource qualifiée pour ton objectif. On va commencer par une action simple, sans contenu.",
        },
      ],
      quickReplies: ['Proposer une action'],
      resource: null,
    };
  }

  // Créer le parcours
  const journeyId = uid('jrn');
  db.prepare(
    `INSERT INTO journeys (journey_id, user_id, resource_id, title, status)
     VALUES (?, ?, ?, ?, 'ACTIVE')`
  ).run(journeyId, userId, resource.id, resource.title);

  updateProfile(userId, { current_resource: resource.id });
  logActivity(userId, 'RESOURCE_STARTED', `Ressource démarrée : ${resource.title}`, { resource_id: resource.id });

  const intro = buildRecommendationIntro(profile, resource);

  return {
    messages: [
      { role: 'elan', text: intro },
      {
        role: 'elan',
        text: `📚 Ressource recommandée : ${resource.title}\n⏱️ Durée : ${resource.duration || '5-15 min'}\n\nQuand tu es prêt, dis-moi « commencer » et je te donne la capsule.`,
      },
    ],
    quickReplies: ['Commencer', 'Une autre ressource'],
    resource,
    journeyId,
  };
}

function buildRecommendationIntro(profile, resource) {
  const blocker = profile.main_blocker;
  const lines = [];
  if (blocker === 'trop_idees') {
    lines.push("Ton problème actuel ne semble pas être le manque d'idées. C'est plutôt le passage de l'idée au premier test. On va donc travailler là-dessus.");
  } else if (blocker === 'procrastination' || blocker === 'abandon') {
    lines.push("Ce qui te bloque, ce n'est pas la motivation. C'est le démarrage. On va rendre le premier pas tout petit.");
  } else if (blocker === 'methode') {
    lines.push("Tu as l'envie, mais il te manque une méthode claire. On va structurer ça, étape par étape.");
  } else if (blocker === 'temps') {
    lines.push("Tu n'as pas beaucoup de temps. On va donc viser des actions de 5 minutes maximum.");
  } else {
    lines.push("Voici ce que je pense que tu devrais travailler maintenant.");
  }
  return lines.join(' ');
}

// ---------------------------------------------------------------------------
// CAPSULE + RITUEL D'ANCRAGE (§12, §15, F07–F08)
// ---------------------------------------------------------------------------
export function startCapsule(userId) {
  const profile = getProfile(userId);
  const resource = profile.current_resource
    ? db.prepare('SELECT * FROM resources WHERE id = ?').get(profile.current_resource)
    : null;

  if (!resource) {
    return { messages: [{ role: 'elan', text: "On n'a pas encore de ressource active. Dis-moi « orientation » pour en choisir une." }], quickReplies: ['Orientation'] };
  }

  logActivity(userId, 'RESOURCE_STARTED', `Capsule ouverte : ${resource.title}`, { resource_id: resource.id });

  return {
    messages: [
      {
        role: 'elan',
        text: `📚 Capsule — ${resource.title}\n\n${resource.context || 'Prends 5 minutes pour découvrir cette ressource.'}\n\n${resource.url ? `🔗 ${resource.url}\n\n` : ''}Quand tu as terminé, réponds « ok ».`,
      },
    ],
    quickReplies: ['Ok', 'Je n\'ai pas le temps'],
  };
}

/**
 * Rituel d'ancrage (§15) : transforme une réponse en micro-action.
 */
export function anchor(userId, answer) {
  const profile = getProfile(userId);
  const vague = isVague(answer);

  if (vague) {
    logActivity(userId, 'CHAT', `Réponse vague : ${answer}`);
    return {
      messages: [
        {
          role: 'elan',
          text: "D'accord. Transformons ça en quelque chose de concret. Qu'est-ce que tu pourrais réellement faire aujourd'hui ?",
        },
      ],
      quickReplies: [],
      created: false,
    };
  }

  const task = createTask(userId, {
    title: answer,
    description: `Micro-action issue de la capsule « ${profile.current_resource || ''} »`,
    source: 'anchor',
  });

  logActivity(userId, 'TASK_CREATED', `Micro-action créée : ${task.title}`, { task_id: task.task_id });

  return {
    messages: [
      {
        role: 'elan',
        text: `Parfait. Je te propose cette micro-action :\n\n🎯 « ${task.title} »\n\nTu peux l'accepter, la modifier, la reporter ou l'abandonner.`,
      },
    ],
    quickReplies: ['Accepter', 'Modifier', 'Reporter', 'Abandonner'],
    task,
    created: true,
  };
}

function isVague(answer) {
  const s = (answer || '').trim().toLowerCase();
  if (s.length < 8) return true;
  const vagueWords = ['je vais essayer', 'réfléchir', 'reflechir', 'peut-être', 'peut etre', 'plus tard', 'un jour', 'm\'améliorer', 'progresser', 'être meilleur'];
  return vagueWords.some((w) => s.includes(w));
}

// ---------------------------------------------------------------------------
// TÂCHES / MICRO-ACTIONS (§13, §14, F09)
// ---------------------------------------------------------------------------
export function createTask(userId, { title, description = null, resourceId = null, source = 'manual', dueDate = null }) {
  const taskId = uid('tsk');
  db.prepare(
    `INSERT INTO tasks (task_id, user_id, resource_id, title, description, status, priority, due_date, source)
     VALUES (?, ?, ?, ?, ?, 'TODO', 1, ?, ?)`
  ).run(taskId, userId, resourceId, title, dueDate || today(), description, source);
  updateProfile(userId, { current_action: title });
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
}

export function getActiveTask(userId) {
  return db.prepare(
    `SELECT * FROM tasks WHERE user_id = ? AND status IN ('TODO','IN_PROGRESS')
     ORDER BY created_at DESC LIMIT 1`
  ).get(userId);
}

export function completeTask(userId, taskId) {
  const task = db.prepare('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?').get(taskId, userId);
  if (!task) return null;
  db.prepare(`UPDATE tasks SET status = 'DONE', completed_at = ? WHERE task_id = ?`).run(now(), taskId);
  logActivity(userId, 'TASK_COMPLETED', `Tâche terminée : ${task.title}`, { task_id: taskId });
  updateStreak(userId);
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
}

export function skipTask(userId, taskId) {
  const task = db.prepare('SELECT * FROM tasks WHERE task_id = ? AND user_id = ?').get(taskId, userId);
  if (!task) return null;
  db.prepare(`UPDATE tasks SET status = 'SKIPPED' WHERE task_id = ?`).run(taskId);
  logActivity(userId, 'TASK_SKIPPED', `Tâche reportée : ${task.title}`, { task_id: taskId });
  return db.prepare('SELECT * FROM tasks WHERE task_id = ?').get(taskId);
}

export function cancelTask(userId, taskId) {
  db.prepare(`UPDATE tasks SET status = 'CANCELLED' WHERE task_id = ? AND user_id = ?`).run(taskId, userId);
  logActivity(userId, 'TASK_SKIPPED', `Tâche abandonnée`, { task_id: taskId });
}

// ---------------------------------------------------------------------------
// STREAK (§17, F11)
// ---------------------------------------------------------------------------
export function updateStreak(userId) {
  const profile = getProfile(userId);
  const t = today();
  const last = profile.last_activity ? profile.last_activity.slice(0, 10) : null;

  let streak = profile.streak || 0;
  if (!last) {
    streak = 1;
  } else {
    const diff = daysBetween(last, t);
    if (diff === 0) {
      // déjà actif aujourd'hui
    } else if (diff === 1) {
      streak += 1;
    } else {
      streak = 1; // reprise après une pause, sans culpabilisation
    }
  }

  const best = Math.max(streak, profile.best_streak || 0);
  updateProfile(userId, { streak, best_streak: best, last_activity: now() });
  return streak;
}

export function streakMessage(userId) {
  const profile = getProfile(userId);
  const t = today();
  const last = profile.last_activity ? profile.last_activity.slice(0, 10) : null;
  if (last && daysBetween(last, t) > 1) {
    return "Hier n'a pas marché. Ce n'est pas grave. On reprend aujourd'hui.";
  }
  return `🔥 ${profile.streak} jour(s) de régularité.`;
}

// ---------------------------------------------------------------------------
// RAPPELS (§16, F10)
// ---------------------------------------------------------------------------
export function buildReminder(userId) {
  const task = getActiveTask(userId);
  if (!task) {
    return {
      messages: [{ role: 'elan', text: "👋 On reprend ? Ton objectif est toujours là. Dis-moi « orientation » et on avance de 5 minutes." }],
      quickReplies: ['Orientation'],
    };
  }
  logActivity(userId, 'REMINDER', `Rappel envoyé pour : ${task.title}`, { task_id: task.task_id });
  return {
    messages: [
      {
        role: 'elan',
        text: `👋 Petit rappel : tu avais décidé de travailler sur « ${task.title} » aujourd'hui. On s'y met pendant 5 minutes ?`,
      },
    ],
    quickReplies: ['Commencer', 'Reporter', "Pas aujourd'hui"],
    task,
  };
}

// ---------------------------------------------------------------------------
// BILAN HEBDOMADAIRE (§21, F12)
// ---------------------------------------------------------------------------
export function startWeeklyReview(userId) {
  logActivity(userId, 'WEEKLY_REVIEW', 'Bilan hebdomadaire démarré');
  return {
    messages: [
      { role: 'elan', text: 'On fait le point ? Ça prend 2 minutes.' },
      { role: 'elan', text: `1️⃣ ${WEEKLY_REVIEW_QUESTIONS[0]}` },
    ],
    quickReplies: [],
    questionIndex: 0,
  };
}

export function handleWeeklyReview(userId, answer, questionIndex) {
  const nextIndex = questionIndex + 1;
  logActivity(userId, 'WEEKLY_REVIEW', `Q${questionIndex + 1}: ${answer}`);

  if (nextIndex < WEEKLY_REVIEW_QUESTIONS.length) {
    return {
      messages: [{ role: 'elan', text: `${nextIndex + 1}️⃣ ${WEEKLY_REVIEW_QUESTIONS[nextIndex]}` }],
      quickReplies: [],
      questionIndex: nextIndex,
      done: false,
    };
  }

  // Analyse + adaptation (§22)
  const adaptation = adaptJourney(userId);
  return {
    messages: [
      { role: 'elan', text: 'Merci pour ce bilan 🙏' },
      { role: 'elan', text: adaptation.message },
    ],
    quickReplies: ['Voir ma prochaine action'],
    questionIndex: nextIndex,
    done: true,
    adaptation,
  };
}

// ---------------------------------------------------------------------------
// MOTEUR D'ADAPTATION (§22, F13)
// ---------------------------------------------------------------------------
export function adaptJourney(userId) {
  const profile = getProfile(userId);
  const stats = getStats(userId);

  let message = '';
  let pace = profile.preferred_pace || 'normal';

  if (stats.tasksCreated > 0 && stats.tasksDone / stats.tasksCreated >= 0.7) {
    message = "Tu réalises régulièrement tes actions. On peut garder ce rythme, voire augmenter un peu la difficulté. 💪";
    pace = 'soutenu';
  } else if (stats.tasksSkipped >= 2) {
    message = "Tu reportes souvent. On va réduire la taille des actions pour rendre le démarrage plus facile.";
    pace = 'leger';
  } else if (stats.tasksDone === 0) {
    message = "On va commencer tout petit. Une seule action de 5 minutes, et c'est déjà une victoire.";
    pace = 'leger';
  } else {
    message = "On garde le cap. Une action à la fois, sans pression.";
  }

  updateProfile(userId, { preferred_pace: pace });
  logActivity(userId, 'PROFILE_UPDATED', `Adaptation : pace=${pace}`, { stats });
  return { message, pace, stats };
}

// ---------------------------------------------------------------------------
// STATISTIQUES & BADGES (§20, §33)
// ---------------------------------------------------------------------------
export function getStats(userId) {
  const tasksCreated = db.prepare('SELECT COUNT(*) c FROM tasks WHERE user_id = ?').get(userId).c;
  const tasksDone = db.prepare(`SELECT COUNT(*) c FROM tasks WHERE user_id = ? AND status = 'DONE'`).get(userId).c;
  const tasksSkipped = db.prepare(`SELECT COUNT(*) c FROM tasks WHERE user_id = ? AND status = 'SKIPPED'`).get(userId).c;
  const profile = getProfile(userId);
  return { tasksCreated, tasksDone, tasksSkipped, streak: profile.streak || 0 };
}

export function getBadges(userId) {
  const stats = getStats(userId);
  return BADGES.map((b) => ({ key: b.key, label: b.label, desc: b.desc, earned: b.condition(stats) }));
}

// ---------------------------------------------------------------------------
// ÉCRAN PRINCIPAL (§40)
// ---------------------------------------------------------------------------
export function getHome(userId) {
  const profile = getProfile(userId);
  const task = getActiveTask(userId);
  const stats = getStats(userId);
  const badges = getBadges(userId).filter((b) => b.earned);

  return {
    greeting: `Bonjour ${profile.name || 'toi'} 👋`,
    streak: profile.streak || 0,
    cap: profile.main_goal || 'À définir',
    mission: task ? task.title : null,
    taskId: task ? task.task_id : null,
    learningMinutes: stats.tasksDone * 5,
    actionsDone: stats.tasksDone,
    badges,
  };
}

// ---------------------------------------------------------------------------
// ROUTEUR DE MESSAGE PRINCIPAL
// ---------------------------------------------------------------------------
export function handleMessage(userId, text, state = {}) {
  const profile = getProfile(userId);
  const s = (text || '').trim().toLowerCase();

  // Bilan en cours
  if (state.mode === 'weekly_review') {
    return handleWeeklyReview(userId, text, state.questionIndex || 0);
  }

  // Onboarding en cours
  if (!profile.onboarding_done) {
    return handleOnboarding(userId, text);
  }

  // Commandes
  if (s.includes('orientation') || s.includes('recommand') || s.includes('ressource')) {
    return recommend(userId);
  }
  if (s.includes('commencer') || s.includes('capsule')) {
    return startCapsule(userId);
  }
  if (s.includes('bilan')) {
    return startWeeklyReview(userId);
  }
  if (s.includes('rappel')) {
    return buildReminder(userId);
  }
  if (s.includes('streak') || s.includes('progression')) {
    return { messages: [{ role: 'elan', text: streakMessage(userId) }], quickReplies: [] };
  }
  if (s.includes('ok') || s.includes('terminé') || s.includes('fini')) {
    return {
      messages: [
        {
          role: 'elan',
          text: "Bien joué ✅ Qu'est-ce que tu vas appliquer concrètement aujourd'hui ?",
        },
      ],
      quickReplies: [],
      mode: 'anchor',
    };
  }

  // Mode ancrage
  if (state.mode === 'anchor') {
    return anchor(userId, text);
  }

  // Réponse à une tâche active
  const task = getActiveTask(userId);
  if (task) {
    if (s.includes('accepter') || s.includes('fait') || s.includes('terminé') || s.includes('done')) {
      completeTask(userId, task.task_id);
      const streak = streakMessage(userId);
      return {
        messages: [
          { role: 'elan', text: `✅ Action terminée : « ${task.title} »` },
          { role: 'elan', text: streak },
        ],
        quickReplies: ['Orientation', 'Bilan'],
      };
    }
    if (s.includes('reporter') || s.includes('plus tard')) {
      skipTask(userId, task.task_id);
      return {
        messages: [{ role: 'elan', text: "Pas de souci. On la garde pour plus tard. On reprend quand tu veux." }],
        quickReplies: ['Orientation'],
      };
    }
    if (s.includes('abandonner') || s.includes('annuler')) {
      cancelTask(userId, task.task_id);
      return {
        messages: [{ role: 'elan', text: "D'accord, on abandonne celle-ci. Dis-moi « orientation » et on en choisit une autre." }],
        quickReplies: ['Orientation'],
      };
    }
  }

  // Réponse libre → ancrage par défaut
  return anchor(userId, text);
}
