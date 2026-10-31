# 📱 Mettre GBÈ sur le Play Store (sans réécrire l'appli)

On transforme la PWA en **application Android** grâce à une **TWA** (Trusted Web
Activity) : une vraie appli Android qui affiche ta PWA en plein écran, sans barre
de navigateur. C'est la voie officielle Google, et la plus rapide.

> Il faut d'abord avoir une **URL publique HTTPS** (voir `DEPLOY.md`).

---

## Étape par étape avec PWABuilder (le plus simple)

1. Va sur **https://www.pwabuilder.com**.
2. Colle ton **URL publique** (ex. `https://gbe-xxxx.onrender.com`) → *Start*.
3. PWABuilder analyse la PWA (manifest, service worker, icônes). Corrige ce
   qu'il signale (le `manifest.webmanifest` et `sw.js` de ce dépôt sont déjà
   prêts).
4. Clique **Package For Stores → Android → Google Play**.
5. Télécharge le paquet : tu obtiens
   - un fichier **`.aab`** (à envoyer au Play Store),
   - une clé de signature **`signing.keystore`** + le mot de passe
     (⚠️ garde-les précieusement, c'est l'identité de ton appli pour toujours),
   - un fichier **`assetlinks.json`**.

## Vérification du domaine (obligatoire)

Pour que l'appli s'ouvre en plein écran (sans barre d'adresse), Android doit
vérifier que l'appli et le site t'appartiennent.

- PWABuilder te donne le bon `assetlinks.json` (avec l'empreinte SHA-256 de ta
  clé). Remplace le gabarit **`gbe/public/.well-known/assetlinks.json`** par
  celui-là, redéploie, et vérifie qu'il répond à
  `https://TON-URL/.well-known/assetlinks.json`.
- `server.js` sert déjà le dossier `.well-known/` automatiquement.

## Compte Play Console

- **25 $ une seule fois** (compte développeur Google Play).
- Dans la Play Console : *Créer une application* → remplis la fiche (voir la
  liste d'éléments à préparer ci-dessous) → *Production* → envoie le `.aab`.
- Première revue Google : quelques jours en général.

---

## Éléments à préparer pour la fiche (je peux t'aider à les rédiger)

- **Nom** : GBÈ (ou le nom final que tu choisis).
- **Description courte** (80 car.) et **longue** (4000 car.).
- **Icône** 512×512 (à partir de l'emblème — voir `brand/`).
- **Image de présentation** 1024×500.
- **Captures d'écran** du téléphone (au moins 2).
- **Politique de confidentialité** (URL) — importante vu l'anonymat et l'audio ;
  je peux t'en rédiger une.
- **Catégorie** : Social / Outils / Actualités.
- **Déclaration de confidentialité des données** (Google demande ce que l'appli
  collecte — ici : très peu, pas de compte, pas de GPS).

---

## Points d'attention (honnêtes)

- Une appli qui touche aux **urgences** et aux **signalements de violences** :
  Google peut demander des précisions. Rédige clairement qu'il ne s'agit **pas**
  d'un service de secours officiel et oriente vers les numéros d'urgence réels.
- **Anonymat + audio** : la politique de confidentialité doit être nette.
- Le `.keystore` de signature : si tu le perds, tu ne pourras plus mettre à jour
  l'appli. Sauvegarde-le.

---

## iOS (plus tard)

Les TWA sont Android uniquement. Pour iPhone, l'installation **PWA via Safari
« Sur l'écran d'accueil »** marche déjà ; l'App Store demandera un emballage
différent (Capacitor/WKWebView). On verra en phase 2.
