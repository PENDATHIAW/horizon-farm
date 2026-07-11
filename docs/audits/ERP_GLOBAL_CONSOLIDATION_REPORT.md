# ERP Global Consolidation Report - PR #167

Date d'audit : 2026-07-11  
Branche : `cursor/agri-feeds-step1-ac42`  
Depot : `PENDATHIAW/horizon-farm`  
HEAD de reprise audite : `80c5fffe90944aadf6cd0f97657d4c75a8735b13`
HEAD final pousse : voir `git rev-parse HEAD` apres push de la branche PR #167
Branche de sauvegarde protegee : `backup/agri-feeds-before-main-merge-20260711`

## 1. HEAD audite

Le travail a repris sur le HEAD attendu `80c5fffe90944aadf6cd0f97657d4c75a8735b13`. La branche de sauvegarde `backup/agri-feeds-before-main-merge-20260711` n'a pas ete modifiee, supprimee, force-pushee, ni rebasee.

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
| `broiler_lot_start` | creation lot avicole / elevage | `buildBroilerLotStartWorkflow` branche sur `AvicoleV10.wrappedCreate` | effectif initial + occupation batiment | sortie achat poussins | non direct | planning sanitaire + pesees | alerte donnees manquantes/blocage batiment | non direct | KPI lot + objectifs + capacite | `partialEventsCompletion`, E2E modules | COMPLET |
| `mortality_record` | panel mortalite elevage | `commitElevageMortality` | baisse effectif | perte valorisee | non direct | action sanitaire | alerte mortalite | non direct | mortalite/actifs | `elevageV2`, E2E | COMPLET |
| `health_treatment` | `SanteV6/SanteV8`, panels elevage | `commitElevageHealth`, `commitHealthWorkflow` | conso medicament si lie | cout sante | non direct | rappel soin | alerte soin/retard | preuve optionnelle | suivi sanitaire | E2E sante, tests terrain | COMPLET |
| `biosecurity_cleaning` | Sante/biosecurite | `commitBiosecurityWorkflow`, `buildManureCollectionWorkflow` | fumier/coproduit organique | cout ou economie indirecte | non direct | suivi nettoyage | risque biosecurite | preuve optionnelle | circular economy | `biosecurityManureWorkflow` | COMPLET |
| `egg_production` | panels production oeufs | `commitElevageEggProduction` | entree oeufs/emballages | cout indirect | disponibilite vente | suivi ponte | alerte ponte possible | non direct | ponte/tablettes | `elevageV1/V2`, `achatsStockV3`, E2E | COMPLET |
| `egg_sale` | Commercial/Ventes | `commitSaleWorkflow`, `runNewSaleSideEffects` | sortie stock oeufs | recette/creance/paiement | commande/client | livraison/relance | impaye | facture | marge/CA | E2E vente oeufs/stock | COMPLET |
| `broiler_sale` | Commercial/Ventes lot chair | `commitSaleWorkflow`, side effects vente | sortie source lot | recette/creance | commande/client | livraison/relance | impaye | facture | marge lot | E2E vente lot | COMPLET |
| `bovine_weighing` | panel pesee elevage | `commitElevageWeighing` | non applicable | cout alimentaire cumule + cout/kg gagne | non direct | tache GMQ faible | alerte retard pesee + gain insuffisant | non direct | poids, GMQ, sortie estimee, marge | `partialEventsCompletion`, `elevageBroilerScenario` | COMPLET |
| `bovine_sale` | Commercial/Ventes animal | `commitSaleWorkflow`, side effects vente | sortie animal actif | recette/creance | commande/client | livraison/relance | impaye | facture | marge animal | E2E vente animal | COMPLET |
| `crop_campaign_start` | Cultures, fiche campagne | `buildCropCampaignStartWorkflow` branche sur `CulturesRecoveredModule.onCreate` | reservation/sortie intrants | transaction cout initial | non direct | irrigation + suivi demarrage | alerte donnees manquantes/blocage parcelle | non direct | marge, rendement, calendrier | `partialEventsCompletion`, `culturesWorkflow` | COMPLET |
| `irrigation_event` | Cultures/Smart Farm eau | `buildIrrigationEventWorkflow` branche sur `CulturesRecoveredModule.onUpdate` | historique eau | transaction cout irrigation | non direct | tache anomalie/sans culture | alerte eau anormale/sans culture | non direct | volume, cout, source Smart Farm | `partialEventsCompletion`, E2E modules | COMPLET |
| `organic_transfer` | Cultures, matiere organique | `buildOrganicTransferWorkflow` branche sur `CulturesRecoveredModule.onUpdate` | sortie stock organique bloquee si insuffisant/contamine | economie intrants | non direct | tache epandage/validation | alerte blocage/incomplet | preuve circularite | circular economy, economie engrais | `partialEventsCompletion`, `biosecurityManureWorkflow` | COMPLET |
| `crop_harvest` | Cultures recolte | `buildCultureHarvestWorkflow`, `commitHarvestWorkflow` | entree recolte | valeur/produit | opportunite vente | suivi recolte | anomalie stock possible | non direct | rendement/marge | `culturesWorkflow`, E2E recolte | COMPLET |
| `crop_sale` | Commercial/Ventes stock culture | `commitSaleWorkflow`, side effects vente | sortie stock culture | recette/creance | commande/client | livraison/relance | impaye | facture | marge culture | E2E vente stock | COMPLET |
| `client_payment` | Commercial encaissement | `recordSalePayment` | non applicable | paiement/solde | statut client | relance cloturee | impaye resolu | recu/preuve possible | cash/creances | E2E encaissement | COMPLET |
| `supplier_payment` | Fournisseurs/Achats stock | `buildSupplierPaymentWorkflow` | non applicable | dette soldee | non direct | relance fournisseur | retard paiement | preuve paiement | dettes/cash | E2E paiement fournisseur | COMPLET |
| `equipment_purchase` | Equipements, formulaire ajout | `buildEquipmentPurchaseWorkflow` branche sur `Equipements` | actif equipement | sortie investissement | non direct | maintenance planifiee | alerte facture manquante | preuve achat | amortissement + BP reel | `partialEventsCompletion`, `equipmentSmartFarmBridge` | COMPLET |
| `equipment_maintenance` | Equipements/RH maintenance | `buildEquipmentBreakdownFollowUp`, `buildEquipmentRepairWorkflow` | non applicable | cout reparation | non direct | tache maintenance | alerte panne | preuve reparation | dispo equipement | E2E maintenance | COMPLET |
| `task_lifecycle` | Activite & Suivi / Taches | task workflows, `commitAlertActionWorkflow` | non applicable | selon source | selon source | creation/cloture | creation/cloture | non direct | journal activite | E2E taches/alertes | COMPLET |
| `support_document` | Documents/preuves | `commitDocumentLink` | non applicable | preuve liee | preuve facture | tache preuve resolue | alerte preuve resolue | document source | conformite | `documentsWorkflow`, E2E docs | COMPLET |
| `monthly_financier_report` | Rapports automatiques mensuels | `buildMonthlyFinancierReportWorkflow` branche sur `RapportsAutoBridge.generate` | synthese stock | synthese finance/funding | synthese ventes/creances | tache validation humaine | alertes/preuves manquantes dans synthese | document rapport | rapport financeur mensuel + audit log | `partialEventsCompletion`, `financeurReport` | COMPLET |
| `funding_usage` | Investissements, concretisation ligne/charge BP | `buildFundingUsageWorkflow` branche sur finaliseurs BP | selon achat lie | transaction financement + source mise a jour | non direct | suivi BP via ligne | alerte preuve/categorie/ecart budget | preuve financeur liee | report entry financeur | `partialEventsCompletion`, `bpLineConcretization` | COMPLET |
| `growth_objective` | Objectifs & Croissance, suivi BP | `buildGrowthObjectiveWorkflow` branche sur `ObjectifsDecisionModule` | besoins/disponible stock | besoins/disponible cash | objectifs vente | tache objectif non atteint | alerte soutenabilite | non direct | progression + simulation officielle | `partialEventsCompletion`, `objectifsFormsAudit` | COMPLET |
| `smartfarm_signal` | Smart Farm | `buildSmartFarmDeviceFollowUp` | non direct | impact indirect | non direct | action terrain | alerte capteur | non direct | telemetrie | E2E Smart Farm | COMPLET |

Synthese : 26 `COMPLET`, 0 `PARTIEL`, 0 `CONFIGURATION UNIQUEMENT`, 0 `NON BRANCHE`.

## 9. Validation formulaires, impacts, alertes, reporting, workflows

- Formulaire alimentation : reduit et auto-rempli sans creation de formulaire parallele.
- Avicole/elevage : creation lot chair enrichie sans nouveau formulaire ; blocage batiment occupe, cout achat, taches vaccin/pesee, transaction, alerte, evenement et dispatch BP.
- Pesee bovine : GMQ, retard pesee, gain insuffisant, cout alimentaire cumule, cout/kg gagne, date sortie estimee et marge previsionnelle.
- Cultures : creation campagne branchee sur formulaire existant ; blocage parcelle active, reservation intrants, transaction budget, taches et reporting.
- Irrigation : mise a jour culture existante ; historique eau, cout irrigation, transaction, alerte/tache anomalie et lien Smart Farm.
- Transfert organique : sortie stock organique, fertilisation parcelle, preuve circularite, economie intrants ; blocage sanitaire et quantite superieure au stock.
- Equipements : formulaire ajout branche sur achat equipement ; finance, document, maintenance, alerte preuve manquante, amortissement et BP.
- Investissements : concretisation ligne/charge BP enrichie par usage financement, source financeur, report entry, alerte preuve/ecart et event `funding_usage`.
- Rapports : bouton mensuel existant genere un rapport financeur avec document, tache validation, audit log et event `monthly_financier_report`.
- Objectifs : progression officielle calculee depuis les donnees modules, taches/alertes/evenements dedoublonnes et panneau de simulation.

## 10. Resultats exacts des validations

| Commande | Resultat |
| --- | --- |
| `npm install` | OK, up to date, audit npm signale 6 vulnerabilites existantes |
| `npm run test:unit:agri-feeds` | OK, Step1 11, Step2 10, Step3 7, Step4 11, Step5 8, Step6 4, readiness 10, render smoke 8 |
| `npx vite-node tests/unit/partialEventsCompletion.test.js` | OK, 9/9 tests pour les 9 evenements finalises |
| `npx vite-node tests/unit/bpLineConcretization.test.js` | OK, 9 tests passed |
| `npx vite-node tests/unit/financeurReport.test.js` | OK, 1 test passed |
| `npx vite-node tests/unit/equipmentSmartFarmBridge.test.js` | OK, 3 tests passed |
| `npx vite-node tests/unit/objectifsFormsAudit.test.js` | OK, 1 test passed |
| `npx vite-node tests/unit/culturesWorkflow.test.js` | OK, 8 tests passed |
| `npx vite-node tests/unit/elevageBroilerScenario.test.js` | OK, 8 tests passed |
| `npm run build` | OK, built in 4.74s, warnings chunks/imports dynamiques historiques |
| `npx eslint <fichiers modifies + sideEffectIds>` | OK, aucune sortie |
| `git diff --check` | OK |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/module-accessibility.spec.js -g "ouvre chaque module principal"` | OK, 1 test passed, tous modules principaux sans ErrorBoundary |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/module-accessibility.spec.js -g "Commercial / Clients"` | OK, 1 test passed |
| `PLAYWRIGHT_SKIP_WEBSERVER=1 npx playwright test tests/e2e/module-accessibility.spec.js -g "ouvre les onglets critiques"` | Interrompu manuellement apres blocage sans verdict exploitable ; aucun resultat pass/fail utilisable |
| `node --test tests/unit/culturesWorkflow.test.js` | KO Node pur : import extensionless existant ; le meme test passe via `vite-node` |

## 11. Limites restantes

- Le parcours Playwright global des onglets critiques s'est bloque sans verdict ; les modules principaux et Commercial/Clients sont valides.
- `npm install` signale 6 vulnerabilites npm a traiter hors de cette passe.
- Le build conserve les warnings historiques : gros chunks, imports dynamiques inefficaces, `/chat-farm-bg.jpg` resolu au runtime.
- Les mentions BOVINIA/Tallow restantes dans `src` sont diagnostics/readiness/texte non operationnel : aucun `BoviniaModule.jsx`, aucun `TallowModule.jsx`, aucune action centre `gp-tallow-*`.
- Plusieurs modules versionnes historiques restent dans `src/modules`. Leur suppression necessite une PR dediee route par route.

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

- Corrections metier cibles : faites, 26/26 evenements `COMPLET`.
- AGRI FEEDS lazy loading : fait.
- AGRI FEEDS RLS hardening : fait, migration a appliquer.
- BOVINIA/Tallow operationnels : supprimes/neutralises, seules mentions futures/documentaires/readiness restent.
- E2E modules principaux : vert.
- Build : vert.
- Lint fichiers modifies : vert.
- Tests unitaires cibles : verts.

Conclusion merge : push PR autorise apres commit local. Squash merge a faire uniquement apres verification des checks GitHub/Vercel de la PR #167.
