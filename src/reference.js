/**
 * Données de référence ÉLAN
 * Archétypes (§18), blocages (§7), questions d'onboarding (§7),
 * badges (§20), catégories d'objectifs (§6).
 */

// §6 — Réponses rapides de l'écran d'entrée
export const QUICK_GOALS = [
  { key: 'projet', label: '🚀 Lancer mon projet', category: 'entrepreneuriat' },
  { key: 'domaine', label: '📚 Devenir meilleur dans mon domaine', category: 'competence' },
  { key: 'discipline', label: '🎯 Devenir plus discipliné', category: 'discipline' },
  { key: 'opportunites', label: '💼 Trouver de meilleures opportunités', category: 'carriere' },
  { key: 'autre', label: '✍️ Autre', category: 'autre' },
];

// §7 — Blocages possibles
export const BLOCKERS = [
  { key: 'temps', label: 'Manque de temps' },
  { key: 'methode', label: 'Manque de méthode' },
  { key: 'procrastination', label: 'Procrastination' },
  { key: 'abandon', label: 'Abandon' },
  { key: 'trop_idees', label: "Trop d'idées" },
  { key: 'ressources', label: 'Manque de ressources' },
  { key: 'confiance', label: 'Manque de confiance' },
  { key: 'savoir_quoi', label: 'Ne sait pas quoi apprendre' },
];

// §7 — Situations
export const STATUSES = [
  { key: 'etudiant', label: 'Étudiant' },
  { key: 'salarie', label: 'Salarié' },
  { key: 'entrepreneur', label: 'Entrepreneur' },
  { key: 'chercheur_emploi', label: "Chercheur d'emploi" },
  { key: 'independant', label: 'Indépendant' },
  { key: 'reconversion', label: 'En reconversion' },
];

// §7 — Préférences d'apprentissage
export const LEARNING_PREFERENCES = [
  { key: 'lecture', label: 'Lecture' },
  { key: 'video', label: 'Vidéo' },
  { key: 'audio', label: 'Audio' },
  { key: 'pratique', label: 'Pratique' },
  { key: 'combinaison', label: 'Combinaison' },
];

// §7 / §18 — Archétypes (modèles de référence)
export const ARCHETYPES = [
  { key: 'batisseur', label: '🏗️ Le Bâtisseur', desc: 'Construit pas à pas, patiemment.' },
  { key: 'strategge', label: '♟️ Le Stratège', desc: 'Planifie, anticipe, choisit.' },
  { key: 'visionnaire', label: '🔭 Le Visionnaire', desc: 'Voit loin, donne du sens.' },
  { key: 'executant', label: '⚡ L\'Exécutant', desc: 'Passe vite à l\'action.' },
];

// §18 — Figures de référence (narratif)
export const MENTOR_FIGURES = [
  'Le Bâtisseur',
  'Le Stratège',
  'Le Visionnaire',
  'Le Pionnier',
  'Le Résilient',
  'L\'Innovateur',
];

// §20 — Badges du MVP
export const BADGES = [
  { key: 'audace', label: "L'Audace de commencer", desc: 'Première action terminée.', condition: (s) => s.tasksDone >= 1 },
  { key: 'regularite', label: 'La Régularité', desc: '3 jours consécutifs.', condition: (s) => s.streak >= 3 },
  { key: 'batisseur', label: 'Le Bâtisseur', desc: '7 jours de progression.', condition: (s) => s.streak >= 7 },
  { key: 'passage_action', label: "Le Passage à l'action", desc: '5 micro-actions réalisées.', condition: (s) => s.tasksDone >= 5 },
];

// §7 — Questions d'onboarding (3 à 5 interactions max)
export const ONBOARDING_STEPS = [
  {
    step: 'goal',
    field: 'main_goal',
    question:
      "Si tu pouvais accomplir une seule chose dans les prochains mois, laquelle serait la plus importante pour toi ?",
    quickReplies: QUICK_GOALS.map((g) => g.label),
  },
  {
    step: 'blocker',
    field: 'main_blocker',
    question: "Qu'est-ce qui t'a le plus bloqué jusqu'ici ?",
    quickReplies: BLOCKERS.map((b) => b.label),
  },
  {
    step: 'status',
    field: 'current_status',
    question: "Aujourd'hui, tu es plutôt dans quelle situation ?",
    quickReplies: STATUSES.map((s) => s.label),
  },
  {
    step: 'preference',
    field: 'learning_preference',
    question: "Tu apprends mieux comment ?",
    quickReplies: LEARNING_PREFERENCES.map((p) => p.label),
  },
  {
    step: 'archetype',
    field: 'mentor_archetype',
    question: 'Pour avancer, tu te reconnais davantage dans quel type de parcours ?',
    quickReplies: ARCHETYPES.map((a) => a.label),
  },
];

// §21 — Questions du bilan hebdomadaire
export const WEEKLY_REVIEW_QUESTIONS = [
  "Qu'est-ce que tu as réussi cette semaine ?",
  "Qu'est-ce qui t'a bloqué ?",
  "Qu'est-ce qui t'a semblé trop difficile ?",
  "Qu'est-ce que tu veux améliorer la semaine prochaine ?",
];

// §16 — Actions de rappel
export const REMINDER_ACTIONS = ['Commencer', 'Reporter', "Pas aujourd'hui"];
