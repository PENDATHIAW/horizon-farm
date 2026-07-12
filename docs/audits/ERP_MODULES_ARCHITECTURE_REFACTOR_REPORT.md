# Rapport refonte architecture modules ERP

Date : 2026-07-12  
Branche de travail : `cursor/erp-modules-architecture-refactor-20260712`  
Branche de sauvegarde : `backup/erp-modules-architecture-before-refactor-20260712`

## Résumé

Cette passe consolide l'architecture des modules ERP autour de trois identifiants canoniques :

- `centre_decisionnel` remplace l'ancien module actif `centre_ia`.
- `equipe` remplace l'ancien module actif `rh`.
- `gestion_systeme` absorbe les routes historiques `sync`, `sync_activity` et `audit_logs`.

Les anciens identifiants restent ouvrables uniquement comme alias de compatibilité. Ils ne sont plus exposés dans la navigation active, les sections ferme, ni l'ordre d'audit global.

## Changements principaux

- Registre central module mis à jour dans `src/config/modules.config.js`.
- Entry points consolidés dans `src/config/moduleEntryPoints.js`.
- Sidebar, navigation conversationnelle, Hey Horizon, commandes vocales, refresh clusters, audits vision et deep-links métiers alignés sur les identifiants canoniques.
- `SyncActivityCenter` n'est plus un entry point applicatif ; les routes sync/audit chargent `GestionSystemeV2`.
- Les permissions conservent les clés legacy pour les rôles existants, mais les modules actifs sont `centre_decisionnel`, `equipe`, `gestion_systeme`.
- Les onglets Objectifs ont été réalignés entre `horizonVision.config` et le module rendu.
- Les libellés visibles BOVINIA/Tallow ont été neutralisés en phases futures de valorisation ; les clés techniques internes restent pour compatibilité de données.

## Garde-fous ajoutés

Nouveau test : `tests/unit/moduleArchitectureRefactor.test.js`.

Il vérifie :

- absence de `centre_ia`, `rh`, `sync_activity` dans la navigation active ;
- aliases legacy vers les modules canoniques ;
- fusion de `sync_activity` dans `GestionSystemeV2` ;
- entry point et onglets présents pour chaque module actif ;
- refresh legacy redirigé vers les clusters canoniques.

## Validation modules

Tests passés :

- `tests/unit/moduleArchitectureRefactor.test.js` : 5/5
- `tests/unit/moduleEntryPoints.test.js` : 7/7
- `tests/unit/moduleStabilityRegression.test.js` : 14/14
- `tests/unit/moduleRenderCrashScan.test.js` : 9/9
- `tests/unit/moduleTabsStability.test.js` : 356/356
- `tests/e2e/simulated-business-workflows.spec.js` : 70/70

Ces tests couvrent les rendus critiques, les onglets, les modules canoniques, les alias directs et les principaux workflows métier simulés.

## Validation métier

Validations passées :

- `tests/unit/demoFinanceurDryRun.test.js` : 5/5
- `tests/unit/financementsWorkflows.test.js` : 10/10
- `tests/unit/greenpreneursLayer.test.js` : 10/10
- `tests/unit/futureValorisationNonOperational.test.js` : 1/1
- `npx eslint --quiet --rule 'no-dupe-keys:error' ...fichiers modifiés` : OK
- `npm run build` : OK

Le build affiche uniquement des avertissements existants de taille de chunks et d'import dynamique inefficace ; aucun échec de compilation.

## Supabase

La migration Supabase Financements avait été appliquée avant cette passe d'architecture :

- tables `funding_*` et `funder_*` présentes ;
- RLS activé ;
- policies présentes ;
- endpoints REST validés en HTTP 200.

Le token d'accès n'est pas stocké dans le dépôt.

## BOVINIA/Tallow

État après nettoyage :

- aucun `src/modules/BoviniaModule.jsx` ;
- aucun `src/modules/TallowModule.jsx` ;
- aucune action centre `gp-tallow-*` ;
- aucun libellé opérationnel visible dans les surfaces applicatives modifiées ;
- seules les clés techniques historiques `phase2_tallow_go` et `phase3_bovinia` restent pour compatibilité interne.

## Limites assumées

Cette passe ne fusionne pas automatiquement la branche d'architecture dans `main`. La demande initiale imposait de ne pas merger tant que tous les critères larges ne sont pas prouvés. Les validations ci-dessus prouvent l'accessibilité module, les alias, les rendus, le build et les workflows simulés, mais ne remplacent pas un audit humain complet de chaque import/composant mort de toute la PR.
