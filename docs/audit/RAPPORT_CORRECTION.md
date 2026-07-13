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
| A | farm_id + RLS par ferme + script de vérification | **BLOQUÉ** (attend exécution du script par l'utilisateur) |
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

## Lot A · farm_id + RLS par ferme — BLOQUÉ (en préparation)

Migrations et script de vérification en lecture seule à écrire ; le lot restera
BLOQUÉ tant que l'utilisateur n'aura pas confirmé un résultat vide du script
(aucune table métier sans farm_id ni RLS). Détail ajouté à la livraison du lot.
