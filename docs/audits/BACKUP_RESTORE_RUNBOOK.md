# Runbook · Sauvegarde et restauration (HF-P0-006)

Objectif : garantir qu'aucune donnée n'est perdue et que la **restauration est
testée**, aux deux niveaux où vivent les données de Horizon Farm.

## 1. Données synchronisées — serveur (Supabase / Postgres)

Source de vérité de toutes les données métier une fois synchronisées.

### Sauvegarde

- **Sauvegardes automatiques Supabase** : activées sur le projet (rétention
  quotidienne selon le plan). Point de restauration dans le temps (PITR) selon
  l'offre.
- **Export manuel reproductible** : `pg_dump` de la base via les identifiants du
  projet (jamais commitées). Conserver l'export hors du navigateur (stockage
  chiffré). À planifier avant toute migration de schéma sensible.

### Restauration (drill à exécuter périodiquement)

1. Restaurer l'export/PITR **dans un projet Supabase de test**, jamais
   directement en production.
2. Rejouer les migrations manquantes : `npm run db:migrate:status` puis
   `npm run db:migrate`.
3. Vérifier l'intégrité de la sécurité par ferme :
   - `npm run db:migrate:verify` doit renvoyer **zéro anomalie** ;
   - `npm run db:migrate:matrix` doit lister **99 tables conformes** ;
   - `npm run db:migrate:isolation` doit conclure **0 fuite** entre fermes.
   (voir `docs/audits/RLS_TEST_MATRIX_RUNBOOK.md`.)
4. Contrôler quelques volumes clés (animaux, ventes, transactions) contre le
   dernier rapport connu avant de basculer.

Un drill réussi = les trois contrôles RLS au vert **sur la base restaurée** et
les volumes cohérents. Reporter la date du dernier drill dans ce fichier.

| Date du drill | Base restaurée | RLS vérifiée | Résultat |
|---|---|---|---|
| _à compléter_ | projet de test | verify/matrix/isolation | _à compléter_ |

## 2. Travail non synchronisé — appareil (navigateur)

Tant qu'une saisie n'est pas synchronisée, elle ne vit que dans le stockage
local (`horizon_*`) : file hors ligne, formulaires en attente, journaux. Un
nettoyage du navigateur ou un changement d'appareil la perd.

### Sauvegarde et restauration testées

- **Écran** : Gestion système → Synchronisation → « Sauvegarde locale ».
  - *Télécharger une sauvegarde* : exporte tout l'état `horizon_*` dans un
    fichier JSON versionné (`horizon-farm-sauvegarde-*.json`).
  - *Restaurer depuis un fichier* : réimporte l'instantané (fusion par défaut) ;
    un instantané invalide ou d'une autre version est **refusé sans rien
    écraser** (échec fermé).
- **Service pur** : `src/services/localBackupService.js`
  (`exportLocalBackup`, `importLocalBackup`, `summarizeBackup`, `parseBackup`).
- **Test automatisé** : `tests/unit/localBackupService.test.js` prouve
  l'aller-retour (export → restauration → état identique), la fusion, le
  remplacement, le résumé et le refus fail-closed. Rejoué à chaque
  `node scripts/run-unit-tests.mjs`.

### Bon réflexe opérateur

Avant de changer de téléphone, de vider le cache ou en cas de file de
synchronisation qui stagne (signalée par « Santé du système »), télécharger une
sauvegarde locale, puis synchroniser dès que le réseau revient.

## Portée

Le niveau 1 (serveur) protège les données partagées et fait foi ; le niveau 2
(appareil) protège le travail encore local. Les deux sont nécessaires : la
sécurité d'accès (RLS, HF-P0-004/005) ne remplace pas la sauvegarde, et la
sauvegarde ne remplace pas la restauration **testée** décrite ici.
