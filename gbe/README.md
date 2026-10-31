# 🛟 GBÈ

> **Garder la voix connectée.** Réseau d'urgence solidaire — Made in Bénin 🇧🇯

GBÈ est une application d'**urgence et d'entraide** pensée pour les jeunes et les
habitants des zones à risque (inondations, incendies, coupures de réseau). Elle
permet de **lancer des alertes** et de **faire passer l'information** — et elle
reste **utilisable hors-ligne**.

*(« gbè » : en fon, la voix / la vie.)*

---

## ⚠️ Ce que fait le MVP (et ce qu'il ne fait pas encore)

**Ce MVP est une PWA (application web installable).**

✅ Fonctionne **hors-ligne** : l'app s'ouvre sans connexion, tu peux composer
   des alertes, elles sont **gardées** et **envoyées automatiquement** dès que le
   réseau revient.
✅ **Alertes typées** (inondation, incendie, secours, sécurité, info, « je vais bien »).
✅ **Bouton SOS** immédiat.
✅ **Fil communautaire** partagé via un serveur-relais quand il y a internet.
✅ **Installable** sur l'écran d'accueil (Android/iOS), zéro store.

🔜 **Phase 2 (native) — le vrai relais sans internet.** Le mode « téléphone qui
   relaie le message d'un autre téléphone **sans aucune connexion** » (comme
   Bitchat) repose sur le **Bluetooth maillé (mesh)**. Ce n'est **pas** faisable
   dans un simple navigateur : il faudra une **application mobile native**
   (React Native / Flutter / Kotlin+Swift). Ce dépôt web prépare toute la couche
   « contenu + social + synchronisation » ; la couche transport mesh viendra
   ensuite.

> En clair : aujourd'hui, GBÈ marche hors-ligne **pour toi** (tes publications
> sont mises en file et synchronisées). Le relais **entre téléphones** sans
> internet est l'étape suivante, native.

---

## 🚀 Démarrage

```bash
cd gbe
npm start
```

Puis ouvrir **http://localhost:3100**

> Prérequis : **Node.js 18+**. **Aucune dépendance** à installer — uniquement les
> modules natifs de Node. Léger et auto-hébergeable à bas coût.

Pour tester le hors-ligne : ouvrir l'app, puis couper le réseau (ou onglet
« Offline » des DevTools) → l'app continue de s'ouvrir et garde tes publications.

---

## 🏗️ Architecture

```
TÉLÉPHONE (PWA)
  ├─ Service worker  → coquille en cache = ouverture hors-ligne
  ├─ localStorage    → profil, fil, file d'attente (outbox)
  └─ app.js          → publier (local d'abord) + sync quand réseau
        ↓ (quand internet dispo)
  SERVEUR-RELAIS (server.js, Node natif)
        └─ data/feed.json   → fil partagé
```

| Couche | Technologie |
|--------|-------------|
| App | PWA — HTML / CSS / JS vanilla, mobile-first |
| Hors-ligne | Service worker + localStorage + file d'attente |
| Serveur | Node.js natif (`node:http`), **0 dépendance** |
| Stockage | Fichier JSON (`data/feed.json`) |

---

## 📁 Structure

```
gbe/
├── server.js                 # Relais : statique + API (/api/feed, /api/post)
├── public/
│   ├── index.html            # Écran unique (composer + SOS + fil)
│   ├── style.css             # Design aux couleurs du Bénin, mobile-first
│   ├── app.js                # Offline-first : publier, file d'attente, sync
│   ├── sw.js                 # Service worker (cache de la coquille)
│   ├── manifest.webmanifest  # PWA installable
│   └── icon.svg              # Icône
├── data/                     # feed.json (généré, gitignoré)
└── package.json
```

---

## 🔌 API

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/api/feed?since=<ms>` | Alertes plus récentes que `since` |
| POST | `/api/post` | Déposer une (ou plusieurs) alerte(s) — dédoublonnage par `id` |

Un élément :
```json
{ "id": "uuid", "type": "inondation", "text": "...", "author": "Aron", "zone": "Cotonou · Fidjrossè", "createdAt": 1730000000000 }
```
Types : `inondation`, `incendie`, `secours`, `securite`, `info`, `ok`.

---

## 🗺️ Roadmap

- **Phase 1 — MVP PWA** ✅ *(ici)* : offline-first, alertes, SOS, fil, sync.
- **Phase 2 — Mobile native + mesh Bluetooth** : relais téléphone-à-téléphone
  sans internet (le cœur « type Bitchat »).
- **Phase 3** : carte des zones à risque, groupes par quartier, alertes vérifiées
  (pompiers / mairie / croix-rouge), chiffrement de bout en bout.

---

## 📜 Licence

MIT — © 2026 Aron Prince J. Vodounon

---

**GBÈ — Garder la voix connectée.**
