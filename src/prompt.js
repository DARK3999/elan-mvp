/**
 * Prompt système ÉLAN (§28 du cahier des charges)
 * Instruction centrale de l'agent.
 */
export const ELAN_SYSTEM_PROMPT = `Tu es ÉLAN.

Tu es un compagnon intelligent de progression personnelle
et professionnelle.

Ta mission est d'aider l'utilisateur à transformer ses intentions
en actions concrètes et durables.

Règles :

1. Ne surcharge jamais l'utilisateur.
2. Donne une priorité à la fois.
3. Pose des questions courtes.
4. Apprends progressivement à connaître l'utilisateur.
5. Ne fais pas de diagnostic psychologique.
6. Ne culpabilise jamais l'utilisateur.
7. Transforme les apprentissages en actions.
8. Privilégie les micro-actions réalisables.
9. Tiens compte du contexte et des ressources de l'utilisateur.
10. Lorsque plusieurs options existent, aide l'utilisateur à choisir
    plutôt que de lui donner une liste interminable.
11. Ne prétends jamais qu'une information est vérifiée si elle ne l'est pas.
12. Conserve un ton humain, direct, chaleureux et encourageant.`;

/**
 * Construit le contexte complet envoyé au LLM (§24).
 * Le modèle doit recevoir : profil, objectif, historique récent,
 * tâche actuelle, ressource actuelle, règles ÉLAN.
 */
export function buildContext({ profile, recentActivities, currentTask, currentResource }) {
  const lines = [];

  lines.push('=== PROFIL UTILISATEUR ===');
  if (profile) {
    lines.push(`Nom : ${profile.name || 'inconnu'}`);
    lines.push(`Objectif principal : ${profile.main_goal || 'non défini'}`);
    lines.push(`Catégorie d'objectif : ${profile.goal_category || 'non définie'}`);
    lines.push(`Blocage principal : ${profile.main_blocker || 'non identifié'}`);
    lines.push(`Situation : ${profile.current_status || 'non renseignée'}`);
    lines.push(`Préférence d'apprentissage : ${profile.learning_preference || 'non renseignée'}`);
    lines.push(`Rythme préféré : ${profile.preferred_pace || 'non renseigné'}`);
    lines.push(`Archétype : ${profile.mentor_archetype || 'non défini'}`);
    lines.push(`Temps disponible : ${profile.available_time || 'non renseigné'}`);
    lines.push(`Streak actuel : ${profile.streak || 0} jour(s)`);
  } else {
    lines.push('Aucun profil disponible.');
  }

  lines.push('');
  lines.push('=== TÂCHE ACTUELLE ===');
  lines.push(currentTask ? `${currentTask.title} [${currentTask.status}]` : 'Aucune tâche active.');

  lines.push('');
  lines.push('=== RESSOURCE ACTUELLE ===');
  lines.push(currentResource ? `${currentResource.title} (${currentResource.type})` : 'Aucune ressource active.');

  lines.push('');
  lines.push('=== HISTORIQUE RÉCENT ===');
  if (recentActivities && recentActivities.length) {
    for (const a of recentActivities.slice(-10)) {
      lines.push(`[${a.timestamp}] ${a.type}: ${a.message || ''}`);
    }
  } else {
    lines.push('Aucun historique.');
  }

  return lines.join('\n');
}
