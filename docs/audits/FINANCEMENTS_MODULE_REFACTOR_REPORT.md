# Rapport refonte module FINANCEMENTS

Date : 2026-07-11  
Branche : `cursor/agri-feeds-step1-ac42`

## Synthèse

L'ancien point d'entrée `Investisseurs & Forums` a été renommé et restructuré en un module unique `financements`.

- Module visible : `financements` / **Financements**.
- Anciens chemins conservés uniquement en alias : `impact_business`, `investisseurs_forums`, `financeurs` → `financements`.
- Fichier chargé : `src/modules/FinancementsModule.jsx`.
- Aucun module parallèle n'a été ajouté.

## Périmètre livré

### 1. Cockpit interne

Onglets livrés :

1. Tableau de bord
2. Opportunités
3. Contacts
4. Dossiers & pièces
5. Fonds & justificatifs

Règles métier :

- Les opportunités `forum` / `salon` sont normalisées en type `evenement`.
- Les contacts ne réexposent pas les champs de scoring commercial (`potential_amount`, probabilité, intérêt).
- Les dossiers calculent un taux de complétude sur pièces requises / pièces prêtes.
- Les conventions suivent montant accordé, montant reçu, montant affecté, solde, seuil 80%.
- Les rapports sont figés par hash de snapshot avant publication.

### 2. Espace Financeurs

Sections livrées :

1. Vue d'ensemble
2. Rapports
3. Journal du projet
4. Documents partagés

Séparation stricte :

- Lecture seule côté financeur.
- Données filtrées sur `published` + `shared/public`.
- Redaction des clés internes (`notes`, `raw_data`, `transactions`, `clients`, `fournisseurs`, `salary`, etc.).
- Permissions `read/download` seulement.

## Sources officielles réutilisées

Le module ne duplique pas les moteurs CA, encaissements, créances, stock ou marge.

- CA / encaissé / créances : `buildConsolidatedCommercialKpis`.
- Profil financeur : `buildInvestorForumProfile`, source retournée `financements`.
- Données Finance : lignes Finance existantes + snapshot Hey Horizon Core.
- Documents et rapports : tables existantes `documents` / `rapports` + nouvelles tables `funding_*`.
- BP / besoin de financement : `HORIZON_FARM_OFFICIAL_BP` et `business_plans`.

## Tables et migration

Migration ajoutée :

- `supabase/migrations/20260711210000_financements_refactor.sql`

Tables créées :

- `funding_opportunities`
- `funding_contacts`
- `funding_applications`
- `funding_document_library`
- `funding_agreements`
- `funding_expense_allocations`
- `funding_reports`
- `funding_project_journal`
- `funder_accounts`
- `funder_access_logs`

Migration de compatibilité :

- `investor_forum_contacts` → `funding_contacts`
- `investor_forum_documents` → `funding_document_library`
- `investor_forum_exports` → `funding_reports`
- `investor_forum_profiles` → `funding_applications`

RLS :

- Interne : lecture/écriture selon `owner_user_id` + `can_write_erp()` / `can_admin_erp()`.
- Financeur : lecture uniquement des rapports/documents/journal publiés et partagés, via `funder_accounts`.
- Logs financeur : insertion limitée aux actions `read` / `download`.

## Alertes livrées

Les 6 familles suivies :

1. `deadline_without_owner`
2. `missing_required_document`
3. `agreement_without_allocation`
4. `spend_above_80`
5. `report_snapshot_outdated`
6. `funder_access_anomaly`

## Navigation et accessibilité

Fichiers structurants mis à jour :

- `src/config/modules.config.js`
- `src/config/moduleEntryPoints.js`
- `src/App.jsx`
- `src/layouts/AppLayout.jsx`
- `src/utils/commercialNavigation.js`
- `src/services/assistantFarmNavigation.js`
- Raccourcis Finance / Objectifs / Centre décisionnel / Dashboard

Résultat :

- `NAV_MODULE_ORDER` contient `financements`.
- `impact_business` et `investisseurs_forums` ne sont plus visibles en navigation principale.
- Les anciens liens profonds tombent sur `financements`.
- Le render crash scan et le render stability passent pour `financements`.

## Nettoyage forum et BOVINIA/Tallow

- Les références opérationnelles `forum` / `salon` sont converties en type opportunité `evenement`.
- Les libellés visibles `Investisseurs & Forums` ont été remplacés par `Financements` dans le code applicatif.
- Les seuls `investisseurs_forums` restants dans `src` sont les alias de compatibilité.
- Le dataset de mode exemple Financements exclut `BOVINIA` / `Tallow`.
- Les mentions BOVINIA/Tallow restantes dans le dépôt concernent les diagnostics futurs Greenpreneurs déjà non opérationnels et couverts par `tests/unit/futureValorisationNonOperational.test.js`.

## Tests exécutés

Passés :

- `npm run build`
- `npm run lint -- --quiet`
- `git diff --check`
- `npm run test:unit:financements`
- `npx vite-node tests/unit/moduleEntryPoints.test.js`
- `npx vite-node tests/unit/leadershipModulesNavigation.test.js`
- `npx vite-node tests/unit/assistantFarmNavigation.test.js`
- `npx vite-node tests/unit/centreObjectifsWorkflow.test.js`
- `npx vite-node tests/unit/demoFinanceurDryRun.test.js`
- `npx vite-node tests/unit/moduleRenderCrashScan.test.js`
- `npx vite-node tests/unit/moduleStabilityRegression.test.js`
- `npx vite-node tests/unit/kpiCoherenceAudit.test.js`

Non exécuté :

- Migration distante Supabase : non appliquée depuis Codex, faute de credentials DB/API dans l'environnement local.
- Playwright complet : non relancé pour éviter de modifier davantage les artefacts existants `tests/results.json` et `playwright-report/`.

## Limitations connues

- Le service CRUD est branché sur les nouvelles tables, mais les données réelles nécessitent l'application de la migration Supabase.
- Les anciens exports/fonctions techniques gardent des noms internes `InvestorForum*` pour compatibilité de tests et d'imports, mais les labels et sources métier sortent en `Financements` / `financements`.
- Les composants legacy `src/components/investorForums/*` restent disponibles mais ne sont plus le point d'entrée du module actif.

## Prêt à merger ?

Statut fonctionnel local : prêt côté code, build, lint, tests unitaires et rendu modules.  
Condition avant merge production : appliquer `20260711210000_financements_refactor.sql` sur Supabase et vérifier l'accès réel des comptes financeurs.
