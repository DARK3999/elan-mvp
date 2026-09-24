# 🔥 ÉLAN

> **Transformer l'inspiration en action.**

ÉLAN est un **compagnon intelligent de croissance personnelle et professionnelle** destiné en priorité à la jeunesse africaine.

Son rôle n'est pas de donner davantage d'informations à l'utilisateur, mais de l'aider à :

**Comprendre → Choisir → Apprendre → Appliquer → Suivre → Progresser.**

---

## 🎯 Le problème

Une personne lit un livre, suit une formation ou assiste à un événement inspirant. Elle prend de bonnes résolutions, mais quelques jours ou semaines plus tard, ces résolutions disparaissent.

ÉLAN transforme le savoir en comportement et le comportement en progression durable.

---

## 🧭 Principes produit

1. **Zéro formulaire interminable** — le profil se construit par conversation.
2. **Une chose à la fois** — jamais de surcharge de recommandations.
3. **Le savoir doit produire une action** — chaque contenu mène à une action.
4. **Progression plutôt que perfection** — avancer lentement vaut mieux qu'abandonner.
5. **L'IA accompagne, elle ne commande pas** — l'utilisateur décide.
6. **Le contexte africain compte** — niveau, moyens, ressources réelles.
7. **Construire avant d'optimiser** — outils gratuits ou peu coûteux.

---

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Initialiser la base + les 20 ressources qualifiées
npm run seed

# 3. Lancer le serveur
npm start
```

Puis ouvrir **http://localhost:3000**

> Prérequis : **Node.js 22+** (utilise le module natif `node:sqlite`, aucune compilation native requise).

---

## 🏗️ Architecture

```
UTILISATEUR
     ↓
Interface conversationnelle (web, mobile-first)
     ↓
Moteur ÉLAN (src/engine.js)
     ↓
SQLite (node:sqlite)
     ↓
┌───────────────┬───────────────┐
│ users         │ resources     │
│ profiles      │ journeys      │
│ tasks         │ activities    │
└───────────────┴───────────────┘
```

### Stack

| Couche | Technologie |
|--------|-------------|
| Interface | HTML / CSS / JS vanilla (mobile-first) |
| Serveur | Node.js + Express |
| Base | SQLite via `node:sqlite` (natif) |
| IA | Moteur à règles (LLM branchable via `src/prompt.js`) |

---

## 📁 Structure du projet

```
elan-mvp/
├── src/
│   ├── db.js          # Schéma des 6 tables + mvp_test
│   ├── engine.js      # Cœur : onboarding, reco, tâches, streak, bilan, adaptation
│   ├── reference.js   # Archétypes, blocages, badges, questions
│   ├── prompt.js      # Prompt système ÉLAN (§28) + construction de contexte
│   ├── seed.js        # 20 ressources qualifiées
│   └── server.js      # API Express + tableau admin
├── public/
│   ├── index.html     # Écran principal + chat
│   ├── style.css      # Design chaleureux, mobile-first
│   └── app.js         # Client conversationnel
├── data/              # Base SQLite (générée)
└── package.json
```

---

## ✅ Fonctionnalités du MVP

| Code | Fonctionnalité | Statut |
|------|----------------|--------|
| F01 | Onboarding conversationnel | ✅ |
| F02 | Profil utilisateur dynamique | ✅ |
| F03 | Détection de l'objectif principal | ✅ |
| F04 | Identification du blocage | ✅ |
| F05 | Rythme et préférences | ✅ |
| F06 | Recommandation d'une ressource | ✅ |
| F07 | Découpage en capsules | ✅ |
| F08 | Transformation en micro-action | ✅ |
| F09 | Gestion des tâches | ✅ |
| F10 | Rappels | ✅ |
| F11 | Streak / progression | ✅ |
| F12 | Bilan hebdomadaire | ✅ |
| F13 | Adaptation du parcours | ✅ |
| F14 | Grands Modèles / archétypes | ✅ |
| F15 | Tableau de suivi administrateur | ✅ |

---

## 🔄 Parcours cible

```
ÉLAN → 👋 Conversation → 🎯 Objectif → 🧩 Blocage
     → 👤 Profil dynamique → 🧭 Une recommandation
     → 📚 Capsule → 💡 Question d'ancrage → 🎯 Micro-action
     → 🔔 Rappel → ✅ Action → 🔥 Streak
     → 📊 Bilan hebdomadaire → 🧠 Adaptation IA → 🔁 Nouvelle boucle
```

---

## 🔌 API

| Méthode | Route | Description |
|---------|-------|-------------|
| POST | `/api/session` | Créer/récupérer un utilisateur + démarrer l'onboarding |
| POST | `/api/message` | Envoyer un message à ÉLAN |
| GET | `/api/home/:userId` | Écran principal |
| GET | `/api/profile/:userId` | Profil complet + stats + badges |
| POST | `/api/recommend` | Obtenir une recommandation |
| POST | `/api/capsule` | Ouvrir une capsule |
| POST | `/api/reminder` | Générer un rappel |
| POST | `/api/weekly-review` | Démarrer le bilan |
| POST | `/api/adapt` | Déclencher l'adaptation |
| GET | `/api/admin/overview` | Tableau de bord admin + KPI |
| POST | `/api/admin/mvp-test` | Journal de test |

---

## 🧠 Brancher un LLM (optionnel)

Le moteur fonctionne **sans clé API** grâce à un système de règles. Pour brancher un LLM :

1. Le prompt système est prêt dans `src/prompt.js` (`ELAN_SYSTEM_PROMPT`).
2. La fonction `buildContext()` assemble profil + historique + tâche + ressource.
3. Il suffit d'appeler votre API (OpenAI, Anthropic, etc.) avec ce contexte.

---

## 📊 KPI suivis (§33)

- **Activation** — % d'utilisateurs terminant l'onboarding
- **Première action** — % réalisant leur première micro-action
- **Taux d'action** — micro-actions terminées / créées
- **Rétention** — retour après 7 jours

---

## 🗺️ Roadmap

- **Phase 0** — Installation, base, tables ✅
- **Phase 1** — Onboarding ✅
- **Phase 2** — Recommandation ✅
- **Phase 3** — Ancrage + micro-action ✅
- **Phase 4** — Rappel, tâche, streak ✅
- **Phase 5** — Bilan, adaptation ✅

---

## 📜 Licence

MIT — © 2026 Aron Prince J. Vodounon

---

**ÉLAN — Transformer l'inspiration en action.**
