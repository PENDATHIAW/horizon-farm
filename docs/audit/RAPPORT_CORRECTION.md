# Rapport de correction (Phase 2)

Branche `claude/go-a21ueq`. Rapport historique remis à jour après l'exécution
complète des lots, l'application Supabase et les validations finales.

Exigences préservées : **Transformation (Élevage)** et **Risques dérivés
(Centre décisionnel)** restent accessibles et couverts par les tests de navigation.

## Vue d'ensemble

| Lot | Objet | Statut |
|---|---|---|
| B | Rejeu hors ligne idempotent (problème n° 2) | **FAIT** |
| A | farm_id + RLS par ferme + script de vérification | **FAIT** (99/99, 0 anomalie, test réel sans fuite) |
| C | Composants uniques + catalogue KPI généralisés | **FAIT** |
| D | Structure cible des onglets | **FAIT** |
| E | Langage et i18n | **FAIT** |
| F | Nettoyage de dette | **FAIT** |
| G | Tests et rapport final | **FAIT** |

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
- Non-régression finale : 235/235 fichiers unitaires, dont `elevageV2.test.js`.

### Retraits au nom de la pertinence
**Aucun.** Ce lot n'enlève aucune fonctionnalité ; il fiabilise le rejeu.

---

## Lot A · farm_id + RLS par ferme — FAIT

### Livrables
- **Migration** `supabase/migrations/20260713120000_farm_id_rls_all_business_tables.sql` :
  bloc PL/pgSQL répétable qui rattache l'historique à une ferme valide, impose
  `farm_id UUID NOT NULL`, la FK restrictive, les index, les privilèges SQL,
  la suppression logique et quatre politiques RLS strictes sur 99 tables.
- **Script de vérification lecture seule** `supabase/verify_farm_id_rls.sql` :
  n'écrit rien et liste toute table métier qui perdrait un invariant. Il renvoie
  zéro ligne sur le projet distant.

### Frontière « tables métier »
Le script et la migration partagent la même liste. Tables volontairement
**exclues** (farm-agnostiques ou techniques) : `farms, companies,
user_farm_access, profiles, module_role_permissions, system_settings,
audit_logs, security_events, offline_queue, push_subscriptions, deleted_records,
api_webhooks, automation_settings, market_prices, market_price_sources,
market_calendar_events`. Si vous estimez qu'une de ces tables doit être
farm-scopée (ou l'inverse), dites-le et j'ajuste les deux fichiers.

### Preuve exécutée
1. Migration appliquée au projet confirmé `HORIZON FARM`.
2. `npm run db:migrate:verify` : zéro anomalie.
3. `npm run db:migrate:matrix` : 99 présentes, 0 absente, 0 anomalie.
4. `npm run db:migrate:isolation` : 86 assertions, 8 rôles, 2 fermes, 0 fuite.
5. Nettoyage : 0 ferme, 0 compte Auth et 0 événement temporaire restant.

### Isolation stricte obtenue
Toutes les politiques historiques des 99 tables sont retirées avant la création
des gardes par ferme et par rôle. La RLS est forcée, les lignes supprimées sont
masquées, les écritures hors ferme sont refusées et le financeur ne voit que les
publications partagées, publiées et immuables.

### Retraits au nom de la pertinence
**Aucun** dans ce lot.

---

## Lot E (suite) · Charte de langage generalisee a tout src/ — FAIT

Poursuite du lot E apres la reprise en solo (Codex a l'arret). Trois avancees,
chacune verifiee (lint, build, suite unitaire 239/239) et verrouillee par un
cliquet.

### E.1 · Fiche lot avicole migree
- Nouveau dictionnaire `src/i18n/fr/avicoleLot.js` ; `AvicoleLotDetailsModal.jsx`
  entierement bascule sur `t()` (entete, onglets, situation, ponte, poids,
  decision, finances, avertissements, toasts).
- Corrections charte au passage : « Action IA » devient « Action recommandee » ;
  tirets longs de repli corriges dans la fiche et dans `SalePricingSummaryCard`,
  `salePricingEngine`, `salePricePresentation`.
- Chemin ajoute au cliquet `CHEMINS_MIGRES` + garde-fou de rendu
  `tests/unit/avicoleLotDetailsRender.test.js`.

### E.2 · Mot « IA » supprime de tout l'ecran
- Le terme « IA » etait present dans 26 fichiers (libelles, titres, toasts) des
  modules Vision, Commercial, Cultures, Avicole, Documents et de plusieurs
  services. Remplacement par les termes approuves (Analyse, Suggestions,
  Recommandations, Action recommandee, Traitement).
- Valeurs d'affichage (`status`, `domain`, `value`) verifiees sans comparaison
  logique sur « IA » avant remplacement.
- Cliquet global `tests/unit/motIaAbsent.test.js` : verrouille tout `src/`.

### E.3 · Tiret long supprime de tout l'ecran
- Le tiret long etait present dans 339 fichiers. Codemod mecanique remplacant
  « — » par « - » (1687 occurrences).
- Exclusions justifiees : `src/i18n/charte.js` (definit le caractere detecte) ;
  `services/investorForums/mergeInvestorForumProfile.js` (delimiteur de parsing
  sur texte colle, jamais affiche).
- Correctif cible : classe de caracteres `[^,\n—-]` de `invoiceOcrParser`
  ramenee a `[^,\n-]` pour eviter une plage involontaire ; deux assertions de
  tests realignees sur le nouveau caractere de repli.
- Cliquet global `tests/unit/tiretLongAbsent.test.js` : verrouille tout `src/`.

### Retraits au nom de la pertinence
**Aucun.** Ces trois avancees ne retirent aucune fonctionnalite ; elles
alignent le langage affiche sur la charte et le verrouillent contre toute
regression.
