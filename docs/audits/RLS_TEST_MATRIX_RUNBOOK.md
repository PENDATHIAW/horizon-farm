# Runbook · Matrice de tests RLS (HF-P0-005)

Objectif : rendre la sécurité par ferme (farm_id + Row Level Security Supabase)
**testée et reproductible**, du schéma jusqu'au comportement réel par rôle.

## Les trois niveaux de contrôle

| Niveau | Commande | Ce qu'il prouve | Rejouable en CI |
|---|---|---|---|
| Structure (statique) | `npm run db:migrate:matrix` | Les 99 tables métier ont `farm_id` UUID NOT NULL, index, clé étrangère vers `farms`, RLS activée et forcée, droits `authenticated`, les 4 politiques (lecture/insertion/modification/suppression) et les 3 colonnes de suppression logique. | Non (projet Supabase réel) |
| Zéro anomalie | `npm run db:migrate:verify` | Le vérificateur SQL renvoie **zéro ligne** : aucune table hors critère. | Non (projet Supabase réel) |
| Comportement (par rôle) | `npm run db:migrate:isolation` | Sur 2 fermes temporaires et les 8 rôles officiels : lecture/écriture accordées ou refusées, cloisonnement inter-fermes, suppression logique masquée, financeur en lecture seule du seul rapport publié. Nettoyage complet en fin de test. | Non (projet Supabase réel) |
| Cohérence de la matrice | `npx vite-node tests/unit/rlsTestMatrixCoverage.test.js` | La matrice de tests couvre les 8 rôles, ne cible que des tables cloisonnées, garde le financeur en lecture seule ; registre applicatif = migration = vérificateur. | **Oui** (suite unitaire) |

Les trois premiers niveaux nécessitent un accès au projet Supabase et ne
peuvent pas tourner dans la CI publique ; le quatrième, pur, tourne à chaque
exécution de `node scripts/run-unit-tests.mjs` et empêche la matrice de dériver.

## Prérequis (niveaux Supabase)

Variables d'environnement (jamais commitées) :

- `SUPABASE_ACCESS_TOKEN` — jeton d'accès Management API.
- `SUPABASE_PROJECT_REF` — référence du projet (défaut : projet confirmé).
- `SUPABASE_EXPECTED_PROJECT_NAME` — garde-fou : le script refuse d'agir si le
  nom du projet ne correspond pas (`Projet refuse`).

Le script `scripts/supabase-management.mjs` refuse toute migration hors
`supabase/migrations/` et vérifie l'identité du projet avant d'écrire.

## Source unique de la matrice comportementale

`scripts/rls/rlsRoleMatrix.mjs` déclare, pour les 8 rôles :

- `SMARTFARM_EXPECTATIONS` — lecture/écriture Smart Farm + accès à la 2e ferme.
- `DOMAIN_CHECKS` — échantillon `[table, lecture, écriture]` par rôle.
- `READ_ONLY_ROLES` — rôles sans écriture métier (financeur externe).

Le script d'isolation **et** le test CI importent ce même module : ils ne
peuvent pas diverger.

## Étendre la couverture

1. **Nouvelle table métier** : l'ajouter à `src/config/farmScopedTables.js`,
   au tableau `metier` de la migration `20260713120000_farm_id_rls_all_business_tables.sql`
   et au bloc `tables_metier` de `supabase/verify_farm_id_rls.sql`.
   Le test `rlsTestMatrixCoverage` (et `erpRolesAndFarmWrites`) échoue tant que
   les trois listes ne coïncident pas.
2. **Nouveau rôle** : l'ajouter à `src/config/erpRoles.js`, à la logique
   `current_erp_role` de la migration, puis renseigner son comportement attendu
   dans `SMARTFARM_EXPECTATIONS` et `DOMAIN_CHECKS`. Le test CI échoue tant que
   la matrice ne couvre pas exactement les rôles officiels.
3. Rejouer `npm run db:migrate:matrix` puis `npm run db:migrate:isolation` sur
   le projet, et reporter le résultat dans `docs/audits/SUPABASE_RLS_MATRIX.md`.

## Rappel de portée

Le RLS Supabase est la protection **finale** côté serveur. Le durcissement
client (HF-P0-004, `src/utils/moduleAccessPolicy.js`) est une défense en
profondeur : il n'autorise l'accès qu'au profil serveur actif, mais ne remplace
pas les politiques RLS validées par ce runbook.
