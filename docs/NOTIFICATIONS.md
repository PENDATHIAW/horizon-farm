# Notifications Horizon Farm

Ce document décrit comment fonctionnent les notifications et ce qu'il reste à
configurer pour recevoir les alertes **même quand l'application est fermée**.

## Les deux niveaux

| Niveau | Quand ça marche | Config requise |
| --- | --- | --- |
| **Dans l'app (local)** | L'app est ouverte, permission accordée | Aucune — clic sur « Activer les notifications » |
| **Arrière-plan (push)** | App fermée / téléphone en veille | Clés VAPID + service worker |

Un seul bouton « **Activer les notifications** » gère les deux : il demande la
permission (local, immédiat) puis, si le serveur push est configuré, abonne
l'appareil en arrière-plan de façon silencieuse. Il n'y a plus de « mode
avancé » à choisir.

## Catégories et pertinence

Seules les alertes **urgence** et **critique** déclenchent une notification par
défaut (réglable dans `getNotificationSettings` : `urgency`, `critical`,
`warning`, `info`). Les alertes `warning`/`info` restent visibles dans le
Centre Alertes mais ne « sonnent » pas, pour éviter la fatigue de notifications.

Chaque notification est **liée à son module** : au clic, l'app ouvre le module
concerné (stock, clients, avicole, santé, cultures, smartfarm, équipements…) et
cible l'entité et l'action recommandée (voir `resolveActionTarget` dans
`lib/server/push/latest-alert.js` et `applyNavigationTarget` dans
`AppNotificationManager.jsx`).

## Logique d'envoi (arrière-plan)

1. Cron Vercel `0 7 * * *` → `/api/push/dispatch-alerts`
2. `dispatch-alerts` lance `/api/push/check-alerts`, qui écarte les alertes déjà
   envoyées et réserve chaque alerte avant l'envoi
3. Le message est préparé avec son module cible et son lien
4. L'envoi est effectué vers les appareils inscrits
5. Le **service worker** (`public/sw.js`, gestionnaire `push`) affiche la
   notification ; au clic (`notificationclick`) il ouvre/réveille l'app sur le
   bon module.

> Le gestionnaire `push`/`notificationclick` du service worker est
> indispensable : sans lui, le navigateur reçoit le message mais n'affiche
> rien. (C'était la cause de « je ne reçois aucune notification ».)

## Configuration à faire (une seule fois)

Ces valeurs sont des **secrets** : elles se règlent dans les variables
d'environnement Vercel, jamais dans le dépôt.

### 1. Générer une paire de clés VAPID

```bash
npx web-push generate-vapid-keys
```

### 2. Renseigner les variables d'environnement Vercel

| Variable | Portée | Rôle |
| --- | --- | --- |
| `VITE_VAPID_PUBLIC_KEY` | Client (build) | Abonnement navigateur |
| `VAPID_PUBLIC_KEY` | Serveur | Envoi web-push |
| `VAPID_PRIVATE_KEY` | Serveur | Envoi web-push (secret) |
| `VAPID_SUBJECT` | Serveur | `mailto:...` (optionnel) |
| `SUPABASE_URL` / `VITE_SUPABASE_URL` | Serveur | Lecture subscriptions |
| `SUPABASE_SERVICE_ROLE_KEY` | Serveur | Lecture subscriptions (secret) |
| `CRON_SECRET` | Serveur | Protège les envois automatiques (obligatoire) |

`VITE_VAPID_PUBLIC_KEY` et `VAPID_PUBLIC_KEY` doivent contenir **la même**
clé publique.

### 3. Table `push_subscriptions`

Les abonnements des appareils sont stockés dans la table Supabase
`push_subscriptions` (colonnes `user_id, label, channels, endpoint,
subscription, active`). Sans `SUPABASE_SERVICE_ROLE_KEY`, l'inscription et
l'envoi sont refusés afin d'éviter une fausse confirmation.

## État sans configuration

- Notifications **dans l'app** : fonctionnelles (permission navigateur).
- Notifications **arrière-plan** : `pushSetupStatus()` renvoie
  `ready:false, reason:'missing_vapid_public_key'` et l'abonnement est ignoré
  silencieusement. Aucun envoi n'est annoncé comme réussi tant que les clés ne
  sont pas renseignées.
