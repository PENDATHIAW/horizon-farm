# ERP Global Consolidation Report - PR #167

Date d'audit : 2026-07-11  
Branche : `cursor/agri-feeds-step1-ac42`  
Depot : `PENDATHIAW/horizon-farm`  
HEAD de reprise audite : `9fbf26aa54ae94f448ad5e5d8c9d33ea8a19b6e9`  
HEAD final pousse : voir `git rev-parse HEAD` et PR #167 apres push  
Branche de sauvegarde protegee : `backup/agri-feeds-before-main-merge-20260711`

## 1. HEAD audite

Le travail a repris sur le HEAD attendu `9fbf26aa54ae94f448ad5e5d8c9d33ea8a19b6e9`. La branche de sauvegarde `backup/agri-feeds-before-main-merge-20260711` n'a pas ete modifiee, supprimee, force-pushee, ni rebasee.

## 2. Branches protegees

| Branche | Action realisee |
| --- | --- |
| `cursor/agri-feeds-step1-ac42` | Branche de travail auditee et corrigee |
| `backup/agri-feeds-before-main-merge-20260711` | Aucune modification |
| `main` | Aucun merge realise |

## 3. Doublons, imports morts, routes mortes

- Passe ciblee ESLint sur les fichiers modifies : OK.
- `git diff --check` : OK.
- `npm run lint` global avec timeout 120 s : echec reel, pas timeout, `763 problems (664 errors, 99 warnings)`.
- Les erreurs globales restantes sont majoritairement hors perimetre des fichiers modifies : imports/variables morts historiques, regles React hooks existantes, `no-undef` dans tests/config, doublons de cles dans services historiques.
- Les anciennes versions de modules `V*` restent presentes comme dette historique du depot. Elles n'ont pas ete supprimees car cela depasse la PR #167 et risquerait de casser les routes de compatibilite.

## 4. Fichiers doublons supprimes ou neutralises

- `src/modules/BoviniaModule.jsx` : supprime avant cette passe finale et verifie absent.
- `src/modules/TallowModule.jsx` : absent.
- Centre decisionnel Greenpreneurs : suppression des actions operationnelles `gp-tallow-*`.
- Readiness Tallow/BOVINIA : conserve uniquement en diagnostic futur, sans creation de tache, opportunite, document ou module operationnel.

## 5. Sources officielles de service

| Domaine | Source officielle |
| --- | --- |
| Reception achat stock | `src/utils/stockPurchaseWorkflow.js` |
| Alimentation elevage | `src/utils/elevageWorkflow.js`, `src/services/workflowService.js` |
| Vente et encaissement | `src/utils/commercialSaleWorkflow.js`, `src/utils/recordSalePayment.js` |
| Paiement fournisseur | `src/utils/supplierWorkflows.js` |
| Recolte culture | `src/utils/cultureWorkflows.js`, `src/services/workflowService.js` |
| Sante elevage | `src/utils/elevageWorkflow.js`, `src/services/workflowService.js` |
| Biosecurite/fumier | `src/services/workflowService.js`, `src/utils/manureWorkflows.js` |
| Documents/preuves | `src/utils/documentsWorkflow.js` |
| Equipements | `src/utils/equipmentWorkflows.js`, `src/utils/ressourcesWorkflow.js` |
| Smart Farm | `src/utils/smartFarmWorkflows.js` |
| Objectifs croissance | `src/utils/objectivesWorkflows.js` |
| Rapports | `src/utils/reportWorkflows.js` |

## 6. Formulaires existants enrichis

Le formulaire alimentation existant dans `src/modules/StocksV3.jsx` a ete enrichi. Aucun moteur parallele generique et aucun nouveau formulaire concurrent n'ont ete ajoutes.

Changements :

- Auto-selection du stock aliment quand un seul stock alimentaire est disponible.
- Auto-selection fournisseur quand un seul fournisseur est disponible.
- Inference categorie cible depuis le libelle stock/produit : chair, pondeuse, bovin, ovin, caprin.
- Auto-selection lot/animal actif quand une cible unique correspond.
- Prefill unite, prix unitaire, montant.
- Normalisation payload avant execution `prepareFeedingWorkflow`/`commitFeedingWorkflow`.

## 7. Nouveaux fichiers necessaires

| Fichier | Necessite |
| --- | --- |
| `src/modules/agriFeeds/hooks/useAgriFeedsData.js` | Lazy-load AGRI FEEDS au montage du module seulement |
| `supabase/migrations/20260711120000_agri_feeds_rls_hardening.sql` | Durcissement RLS des 11 tables `feed_*` |
| `tests/unit/agriFeedsLazyLoading.test.js` | Garde anti-regression lazy loading |
| `tests/unit/agriFeedsRlsHardening.test.js` | Garde statique RLS |
| `tests/unit/alimentationFormReduction.test.js` | Garde formulaire alimentation reduit |
| `tests/unit/futureValorisationNonOperational.test.js` | Garde BOVINIA/Tallow non operationnels |
| `docs/audits/ERP_GLOBAL_CONSOLIDATION_REPORT.md` | Rapport global demande |

## 8. Etat des 26 evenements metier

Statuts autorises : `COMPLET`, `PARTIEL`, `CONFIGURATION UNIQUEMENT`, `NON BRANCHE`.

| evenement | formulaire ou ecran reel | workflow executant | stock | finance | commercial | taches | alertes | documents | reporting | test | statut |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `feed_reception` | `StockPurchaseReceptionForm` / Achats stock | `prepareStockPurchaseWorkflow` + `commitStockPurchaseWorkflow` | entree stock | dette/sortie selon paiement | non direct | facture manquante/relance | stock critique possible | facture/preuve attendue | stock + finance | `stockPurchaseWorkflow`, `achatsStock*`, E2E | COMPLET |
| `feed_distribution` | `StocksV3` bouton `Utiliser aliment`, panels elevage | `prepareFeedingWorkflow`, `commitFeedingWorkflow`, `commitElevageFeeding` | sortie aliment | cout alimentation | non direct | suivi alimentation | stock critique possible | non direct | cout lot/animal | `alimentationFormReduction`, `elevageV1/V2`, E2E | COMPLET |
| `broiler_lot_start` | creation lot avicole / elevage | creation lot + actifs/metriques avicoles | effectif initial | investissement/cout selon saisie | non direct | planning sanitaire partiel | alertes via suivi | non direct | KPI lot | E2E cycles avicoles | PARTIEL |
| `mortality_record` | panel mortalite elevage | `commitElevageMortality` | baisse effectif | perte valorisee | non direct | action sanitaire | alerte mortalite | non direct | mortalite/actifs | `elevageV2`, E2E | COMPLET |
| `health_treatment` | `SanteV6/SanteV8`, panels elevage | `commitElevageHealth`, `commitHealthWorkflow` | conso medicament si lie | cout sante | non direct | rappel soin | alerte soin/retard | preuve optionnelle | suivi sanitaire | E2E sante, tests terrain | COMPLET |
| `biosecurity_cleaning` | Sante/biosecurite | `commitBiosecurityWorkflow`, `buildManureCollectionWorkflow` | fumier/coproduit organique | cout ou economie indirecte | non direct | suivi nettoyage | risque biosecurite | preuve optionnelle | circular economy | `biosecurityManureWorkflow` | COMPLET |
| `egg_production` | panels production oeufs | `commitElevageEggProduction` | entree oeufs/emballages | cout indirect | disponibilite vente | suivi ponte | alerte ponte possible | non direct | ponte/tablettes | `elevageV1/V2`, `achatsStockV3`, E2E | COMPLET |
| `egg_sale` | Commercial/Ventes | `commitSaleWorkflow`, `runNewSaleSideEffects` | sortie stock oeufs | recette/creance/paiement | commande/client | livraison/relance | impaye | facture | marge/CA | E2E vente oeufs/stock | COMPLET |
| `broiler_sale` | Commercial/Ventes lot chair | `commitSaleWorkflow`, side effects vente | sortie source lot | recette/creance | commande/client | livraison/relance | impaye | facture | marge lot | E2E vente lot | COMPLET |
| `bovine_weighing` | panel pesee elevage | `commitElevageWeighing` | non applicable | indicateur cout/kg | non direct | non direct | non direct | non direct | poids/croissance | `elevageV2`, intent IA | PARTIEL |
| `bovine_sale` | Commercial/Ventes animal | `commitSaleWorkflow`, side effects vente | sortie animal actif | recette/creance | commande/client | livraison/relance | impaye | facture | marge animal | E2E vente animal | COMPLET |
| `crop_campaign_start` | Cultures, fiche campagne | creation/edition culture | non initial | budget/couts selon saisie | non direct | planning partiel | meteo/risques via regles | non direct | suivi campagne | E2E culture | PARTIEL |
| `irrigation_event` | Cultures/Smart Farm eau | charges directes + signaux Smart Farm | eau/intrants non systematique | cout direct possible | non direct | action terrain | risque meteo/eau | non direct | pilotage eau | E2E risque culture/Smart Farm | PARTIEL |
| `organic_transfer` | Greenpreneurs/biosecurite/cultures | manure/circular workflows | fumier/organique | economie engrais | non direct | action fertilisation | risque si manque | non direct | circular economy | `biosecurityManureWorkflow`, E2E impact | PARTIEL |
| `crop_harvest` | Cultures recolte | `buildCultureHarvestWorkflow`, `commitHarvestWorkflow` | entree recolte | valeur/produit | opportunite vente | suivi recolte | anomalie stock possible | non direct | rendement/marge | `culturesWorkflow`, E2E recolte | COMPLET |
| `crop_sale` | Commercial/Ventes stock culture | `commitSaleWorkflow`, side effects vente | sortie stock culture | recette/creance | commande/client | livraison/relance | impaye | facture | marge culture | E2E vente stock | COMPLET |
| `client_payment` | Commercial encaissement | `recordSalePayment` | non applicable | paiement/solde | statut client | relance cloturee | impaye resolu | recu/preuve possible | cash/creances | E2E encaissement | COMPLET |
| `supplier_payment` | Fournisseurs/Achats stock | `buildSupplierPaymentWorkflow` | non applicable | dette soldee | non direct | relance fournisseur | retard paiement | preuve paiement | dettes/cash | E2E paiement fournisseur | COMPLET |
| `equipment_purchase` | Investissements/equipements | concretisation investissement/actif | actif equipement | sortie investissement | non direct | suivi mise en service | non direct | preuve achat | BP vs reel | E2E investissement | PARTIEL |
| `equipment_maintenance` | Equipements/RH maintenance | `buildEquipmentBreakdownFollowUp`, `buildEquipmentRepairWorkflow` | non applicable | cout reparation | non direct | tache maintenance | alerte panne | preuve reparation | dispo equipement | E2E maintenance | COMPLET |
| `task_lifecycle` | Activite & Suivi / Taches | task workflows, `commitAlertActionWorkflow` | non applicable | selon source | selon source | creation/cloture | creation/cloture | non direct | journal activite | E2E taches/alertes | COMPLET |
| `support_document` | Documents/preuves | `commitDocumentLink` | non applicable | preuve liee | preuve facture | tache preuve resolue | alerte preuve resolue | document source | conformite | `documentsWorkflow`, E2E docs | COMPLET |
| `monthly_financier_report` | Rapports/Documents | `buildReportGenerationWorkflow`, `buildReportScheduleTask` | synthese | synthese finance | synthese commercial | tache preparation | alertes via donnees | rapport document | rapport mensuel | E2E rapport | PARTIEL |
| `funding_usage` | Finance/Investissements/Objectifs | BP line concretization + finance panels | selon achat | usage financement | non direct | suivi BP | ecart BP possible | preuve possible | BP reel | tests BP + E2E investissement | PARTIEL |
| `growth_objective` | Objectifs & Croissance | `buildObjectiveStatus`, `buildObjectiveActionTask` | non direct | indicateurs | objectifs vente | action retard | risque objectif | non direct | objectifs | E2E objectifs | PARTIEL |
| `smartfarm_signal` | Smart Farm | `buildSmartFarmDeviceFollowUp` | non direct | impact indirect | non direct | action terrain | alerte capteur | non direct | telemetrie | E2E Smart Farm | COMPLET |

Synthese : 17 `COMPLET`, 9 `PARTIEL`, 0 `CONFIGURATION UNIQUEMENT`, 0 `NON BRANCHE`.

## 9. Validation formulaires, impacts, alertes, reporting, workflows

- Formulaire alimentation : reduit et auto-rempli sans creation de formulaire parallele.
- Impact stock : reception, distribution, recolte, vente stock et oeufs verifies dans tests cibles et E2E.
- Impact finance : achats, encaissements, paiements fournisseurs, maintenance, sante et investissements verifies dans tests cibles et E2E.
- Alertes/taches : stock critique, sante, impayes, documents manquants, panne equipement, Smart Farm, objectifs en retard verifies dans E2E.
- Reporting : build OK, E2E rapports OK, KPI/metriques cibles OK. Les rapports mensuels restent `PARTIEL` car ils synthetisent les donnees mais ne verrouillent pas encore toutes les preuves et approbations.

## 10. Resultats exacts des validations

| Commande | Resultat |
| --- | --- |
| `npx vite-node tests/unit/alimentationFormReduction.test.js` | OK, 1 test passed |
| `npx vite-node tests/unit/futureValorisationNonOperational.test.js` | OK, 1 test passed |
| `npx vite-node tests/unit/agriFeedsLazyLoading.test.js` | OK, 1 test passed |
| `npx vite-node tests/unit/agriFeedsRlsHardening.test.js` | OK, 1 test passed |
| `npm run test:unit:agri-feeds` | OK, Step1 11, Step2 10, Step3 7, Step4 11, Step5 8, Step6 4, readiness 10, render smoke 8 |
| `npx vite-node tests/unit/businessInterconnectionsCoverage.test.js` | OK, 3 tests passed |
| `npx vite-node tests/unit/biosecurityManureWorkflow.test.js` | OK, 2 tests passed |
| `npx vite-node tests/unit/kpiCoherenceAudit.test.js` | OK, 6 tests passed |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/simulated-business-workflows.spec.js --reporter=line` | OK, 70 passed (2.7s) |
| `npm run build` | OK, built in 2.57s |
| `npx eslint <fichiers modifies>` | OK, aucune sortie |
| `git diff --check` | OK |
| `npm run lint` avec timeout 120 s | KO, code 1, pas timeout, `763 problems (664 errors, 99 warnings)` |
| `node --test --test-reporter=tap tests/unit/*.test.js` avec timeout 180 s | KO, code 1, `613 tests`, `423 pass`, `190 fail` |

## 11. Limites restantes

- Le lint global bloque encore la qualification stricte de la PR.
- Le test unitaire global `node --test tests/unit/*.test.js` n'est pas fiable dans l'etat actuel du depot car il charge des modules Vite/JSX sans loader et contient des attentes d'anciens onglets.
- Plusieurs modules versionnes historiques restent dans `src/modules`. Leur suppression necessite une PR dediee route par route.
- Certains evenements sont `PARTIEL` car ils existent en ecran/workflow/reporting mais ne garantissent pas encore toutes les dimensions stock + finance + commercial + taches + alertes + documents.

## 12. Migrations a appliquer

Migration obligatoire avant production AGRI FEEDS :

- `supabase/migrations/20260711120000_agri_feeds_rls_hardening.sql`

Effet attendu :

- Active RLS sur les 11 tables `feed_*`.
- Supprime les anciennes politiques ouvertes connues.
- Cree des politiques read/insert/update/delete basees sur ferme active et permissions profil.
- Garde le role financeur en lecture seule.

## 13. Risques securite

- La securite AGRI FEEDS depend de l'application effective de la migration Supabase.
- Les helpers RLS supposent des profils et permissions correctement renseignes dans `profiles` et `module_role_permissions`.
- Tant que les checks GitHub `validate` et audit metier simule ne sont pas revenus verts cote CI, le merge reste risque.

## 14. Risques performance

- AGRI FEEDS n'est plus charge globalement par `AppContext`/`useCrudModules`. Les 11 tables `feed_*` sont chargees uniquement au montage du module AGRI FEEDS.
- Le build signale encore de gros chunks, notamment `SmartEvolutionChart` et le bundle principal.
- Vite signale des imports dynamiques inefficaces pour `workflowImpactToast`, `pwa`, `centrePriorityDismissService`.
- `/chat-farm-bg.jpg` reste resolu au runtime, pas au build.

## 15. Etat final PR #167

Etat local apres cette passe :

- Corrections metier cibles : faites.
- AGRI FEEDS lazy loading : fait.
- AGRI FEEDS RLS hardening : fait, migration a appliquer.
- BOVINIA/Tallow operationnels : supprimes/neutralises, seules mentions futures/documentaires/readiness restent.
- E2E metier cible : vert.
- Build : vert.
- Lint global : rouge.
- Unit global : rouge.

Conclusion merge : ne pas merger tant que les checks CI bloquants et la dette globale lint/unit ne sont pas traites ou explicitement sortis du gate de merge. Le squash merge n'a donc pas ete realise pendant cet audit.
