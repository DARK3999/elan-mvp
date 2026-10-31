# 📡 Phase native — le relais sans internet (Bluetooth mesh)

C'est le cœur « type Bitchat » : des téléphones qui se **relaient les messages de
proche en proche, sans aucun internet ni opérateur**. Impossible dans un
navigateur → il faut une **application mobile native**. Ce document pose le plan ;
ce sera un chantier séparé de la version web, mené en parallèle.

---

## Pourquoi natif

- Le **Bluetooth Low Energy (BLE) en mode maillé** et le Wi-Fi Direct ne sont
  pas accessibles de façon fiable depuis un site web.
- Il faut tourner **en arrière-plan** et réveiller l'appli à la réception d'un
  message — réservé au natif.

## Choix technique recommandé

- **Framework : React Native** (ou Flutter). React Native permet de **réutiliser
  la logique** déjà écrite en JS (fil, types d'alerte, file d'attente, rendu).
- **Transport mesh** : une bibliothèque BLE mesh. Pistes à évaluer :
  - `react-native-ble-plx` (BLE brut, on construit le relais au-dessus),
  - les implémentations inspirées de **Bridgefy / Berkanan / le protocole de
    Bitchat** (mesh BLE open source).
- **Chiffrement de bout en bout** : indispensable (ex. libsignal / NaCl).
  Les signalements sensibles doivent rester illisibles pour les relais.

## Architecture cible (hybride, comme Bitchat)

```
            SANS INTERNET                        AVEC INTERNET
   ┌─────────────────────────────┐      ┌───────────────────────────┐
   Téléphone A ──BLE──▶ Téléphone B ...  │  Serveur-relais (server.js) │
   (chaque appareil relaie,              │  ou protocole décentralisé  │
    stocke-et-transmet)                  │  pour porter plus loin      │
   └─────────────────────────────┘      └───────────────────────────┘
```

- **Hors-ligne** : BLE mesh, « store-and-forward » (chaque téléphone garde et
  retransmet les messages qu'il croise).
- **En ligne** : bascule vers le serveur-relais (déjà construit) pour porter les
  messages au-delà de la portée Bluetooth.
- **TTL / dé-duplication** : chaque message a un identifiant unique et un nombre
  de sauts max, pour éviter les boucles (logique déjà amorcée côté web : id +
  dé-doublonnage).

## Ce qu'on réutilise de la version web

- Le **modèle de données** d'une alerte (type, texte, zone, audio, createdAt, id).
- La **file d'attente / synchronisation** (outbox → envoi dès qu'un canal existe).
- Le **serveur-relais** `server.js` comme pont internet.
- L'**interface** (à porter en composants React Native).

## Étapes

1. Projet React Native + écran unique repris de la PWA.
2. Branchement du serveur-relais (mode en ligne) — rapide, déjà prêt.
3. Module BLE mesh (mode hors-ligne) — le gros du travail, à prototyper sur 2–3
   téléphones.
4. Chiffrement de bout en bout.
5. Tests terrain (portée, batterie, densité d'appareils).
6. Emballage Android/iOS.

## Honnête sur l'effort

La partie BLE mesh + arrière-plan + batterie + tests terrain est **longue** et se
valide uniquement avec plusieurs téléphones réels. On avance dessus en parallèle
de la version web, mais c'est elle qui prendra le plus de temps.
