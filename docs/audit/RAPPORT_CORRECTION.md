# Rapport de correction (Phase 2)

Branche `claude/go-a21ueq`. Ordre convenu : problème n° 2 (rejeu hors ligne)
avant le lot A, puis lots C→G. Après chaque lot : statut FAIT / PARTIEL / BLOQUÉ
et liste des retraits au nom de la pertinence (à valider un par un).

Onglets à ne jamais toucher : **Transformation (Élevage)** et **Risques dérivé
(Centre décisionnel)** — inchangés.

## Vue d'ensemble

| Lot | Objet | Statut |
|---|---|---|
| B | Rejeu hors ligne idempotent (problème n° 2) | **FAIT** |
| A | farm_id + RLS par ferme + script de vérification | **BLOQUÉ** (migration + script écrits ; attend résultat vide confirmé) |
| C | Composants uniques + catalogue KPI généralisés | à venir |
| D | Structure cible des onglets | à venir |
| E | Langage et i18n | à venir |
| F | Nettoyage de dette | à venir |
| G | Tests et rapport final | à venir |

---

## Lot B · Rejeu hors ligne idempotent — FAIT

### Problème corrigé
`AppContext.syncOfflineQueue` rejouait la file hors ligne en CRUD brut
(`service.create/update/remove`) **sans réémettre les événements métier** :
au retour du réseau, les effets inter-modules (mouvement de stock, écriture
finance, alerte) étaient perdus, et l'idempotence par `issue_key` n'était pas
exploitée. Un rejeu pouvait donc laisser un état incohérent.

### Correction
- Extraction des constructeurs d'événements dans un module pur et testable :
  `src/services/businessEventBuilders.js` (`buildCreateEvents`, `buildUpdateEvents`
  déplacés verbatim depuis AppContext) et `src/services/businessEventDedup.js`
  (`findDuplicateBusinessEvent`, pur, sans dépendance Supabase). `businessEventsService`
  réexporte `findDuplicateBusinessEvent` (API publique inchangée).
- Nouveau module `src/services/offlineReplayEvents.js` : `withStableIssueKey`
  (clé déterministe identique à celle de `createBusinessEvent`), `buildReplayEvents`,
  `selectionnerNouveauxEvenements` (déduplication) et `dedupeFileHorsLigne`
  (déduplication de la file par module+action+id).
- `AppContext` :
  - `emitBusinessEvents` est désormais **idempotent** : il écarte les événements
    déjà connus (via un `businessEventsRef` sur `dataMap.business_events`) et
    passe `existingEvents` à `createBusinessEvent`.
  - `syncOfflineQueue` **réémet les événements** de chaque création/mise à jour
    rejouée (même voie idempotente que l'écriture en ligne) et **déduplique la
    file** avant rejeu. Le rejeu multiple ne produit donc qu'un seul effet.

### Preuve
- `tests/unit/offlineReplayIdempotency.test.js` (7 tests, 0 échec) : rejoue une
  **vente**, une **réception** et une **distribution** deux fois chacune et vérifie
  qu'un seul effet (business_event) est créé ; vérifie aussi le rejeu de la file
  entière deux fois (un seul effet par opération) et la déduplication de la file.
- Non-régression : `test:unit:idempotency` (13/0), `test:unit:anti-duplication`
  (9/0), render smoke (0 échec), module smoke (39/0), `workflowImpactJournal` OK,
  commercial/achats-stock (0 échec). `npm run build` OK, eslint 0 erreur.
- Échec préexistant sans rapport : `elevageV2.test.js` « agrégat résumé ponte »
  (dépendant de la date du jour, échoue déjà sur l'arbre committé).

### Retraits au nom de la pertinence
**Aucun.** Ce lot n'enlève aucune fonctionnalité ; il fiabilise le rejeu.

---

## Lot A · farm_id + RLS par ferme — BLOQUÉ (livrables écrits, attente de vérification)

### Livrables
- **Migration** `supabase/migrations/20260713120000_farm_id_rls_all_business_tables.sql` :
  bloc PL/pgSQL idempotent qui, pour chaque table métier existante, ajoute
  `farm_id` (nullable), rattache les lignes existantes à la ferme Horizon Farm
  par défaut (créée si absente), crée l'index, active la RLS et pose des
  politiques de lecture/écriture par ferme (`can_read_farm` / `can_write_farm`).
  ~100 tables métier couvertes ; `to_regclass` saute proprement les tables
  absentes de l'environnement.
- **Script de vérification lecture seule** `supabase/verify_farm_id_rls.sql` :
  n'écrit rien, liste toute table métier sans `farm_id` ou sans RLS active, avec
  la colonne `probleme`. **Doit renvoyer zéro ligne** une fois la migration
  appliquée.

### Frontière « tables métier »
Le script et la migration partagent la même liste. Tables volontairement
**exclues** (farm-agnostiques ou techniques) : `farms, companies,
user_farm_access, profiles, module_role_permissions, system_settings,
audit_logs, security_events, offline_queue, push_subscriptions, deleted_records,
api_webhooks, automation_settings, market_prices, market_price_sources,
market_calendar_events`. Si vous estimez qu'une de ces tables doit être
farm-scopée (ou l'inverse), dites-le et j'ajuste les deux fichiers.

### Ce que j'attends de vous
1. Exécuter `supabase/verify_farm_id_rls.sql` **avant** la migration (état actuel).
2. Appliquer `supabase/migrations/20260713120000_farm_id_rls_all_business_tables.sql`.
3. Ré-exécuter le script de vérification et me renvoyer son résultat.
4. Je corrige la migration tant que le script ne renvoie pas **zéro ligne**.

**Statut : BLOQUÉ.** Le lot A ne sera marqué FAIT que lorsque vous m'aurez
confirmé un résultat vide du script. Les migrations ne sont ni appliquées ni
prouvées depuis cet environnement (aucun accès Supabase).

### Réserve d'isolation
La migration active la RLS et ajoute des politiques par ferme. Les politiques
génériques existantes (`can_read_erp` / `can_write_erp`) restent en place et se
combinent en OU : l'isolation stricte exigera, dans un second temps testé sur
l'instance, de retirer les politiques génériques au profit des seules politiques
par ferme, et de passer `farm_id` en NOT NULL une fois le backfill validé.

### Retraits au nom de la pertinence
**Aucun** dans ce lot.
