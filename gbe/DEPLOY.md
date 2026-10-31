# 🚀 Héberger GBÈ gratuitement (version web publique)

Objectif : mettre le serveur-relais `server.js` en ligne sur une **URL publique
HTTPS gratuite**, pour que n'importe qui au Bénin puisse ouvrir l'appli et publier
dans le fil (contrairement à la version démo hébergée sur claude.ai, où seuls
toi et les personnes invitées peuvent écrire).

> GBÈ n'a **aucune dépendance** et écrit dans un simple fichier JSON, donc il
> tourne sur n'importe quel hébergeur Node gratuit.

---

## Option A — Render (recommandé, simple)

1. Pousse ce dépôt sur GitHub (déjà fait : branche `ccr-96189ab0-dbfm9s`).
2. Va sur **https://render.com** → *New* → *Web Service* → connecte le dépôt.
3. Renseigne :
   - **Root Directory** : `gbe`
   - **Build Command** : *(laisser vide)*
   - **Start Command** : `node server.js`
   - **Instance Type** : Free
4. Render fournit une URL du type `https://gbe-xxxx.onrender.com`.
   C'est ton **URL publique**. 🎉

> Le fichier `render.yaml` (à la racine de `gbe/`) décrit déjà ce service :
> sur Render tu peux faire *New → Blueprint* et pointer sur ce dépôt, il lit
> la config tout seul.

⚠️ **Limite du plan gratuit Render** : le service « s'endort » après ~15 min
sans trafic et le disque est éphémère (le `data/feed.json` peut être remis à
zéro à chaque redéploiement). Pour un vrai lancement, prévois un petit disque
persistant (payant) ou une base externe — voir plus bas.

---

## Option B — Railway

1. **https://railway.app** → *New Project* → *Deploy from GitHub repo*.
2. Variables : aucune obligatoire (le port est lu depuis `process.env.PORT`).
3. Réglage : *Root Directory* = `gbe`, *Start Command* = `node server.js`.
4. Génère un domaine public dans *Settings → Networking → Generate Domain*.

---

## Option C — Fly.io (plus technique, mais disque persistant gratuit)

Convient si tu veux que le fil **ne se vide pas**. Demande l'installation de
`flyctl`. Je peux te préparer le `Dockerfile` + `fly.toml` quand tu choisis
cette voie.

---

## Garder le fil en mémoire (important)

Le stockage actuel = `data/feed.json` sur le disque de l'hébergeur. Sur les plans
gratuits « sans disque », il repart à zéro aux redéploiements. Trois chemins :

1. **Disque persistant** chez l'hébergeur (quelques dollars/mois).
2. **Base externe gratuite** (ex. Supabase / Neon Postgres, ou Upstash Redis).
   Je peux brancher ça dans `server.js` quand tu veux.
3. **Accepter le reset** pour la phase de test (le plus simple pour valider
   l'idée sans payer).

---

## Après la mise en ligne

- Teste l'URL sur ton téléphone.
- Vérifie que `https://TON-URL/manifest.webmanifest` et
  `https://TON-URL/sw.js` répondent (nécessaire pour l'installation PWA).
- Note cette URL : elle sert pour le **Play Store** (voir `PLAYSTORE.md`).
