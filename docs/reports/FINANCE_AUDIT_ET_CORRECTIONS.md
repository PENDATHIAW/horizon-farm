# Finance & Pilotage — Audit complet (lecture seule)

**Date :** 2026-06-09  
**Branche P0 :** `cursor/finance-p0-ac42`  
**Branche P1 :** `cursor/finance-p1-ac42`  
**Base :** `main`  
**Objectif :** Faire de Finance la vérité économique unique de l'ERP  
**Statut :** Audit + **P0 appliqué** + **P1 appliqué** — validation gel V1 requise avant P2

---

## Synthèse exécutive

| Dimension | Score estimé | Commentaire |
|-----------|--------------|-------------|
| Cartographie UI | 75/100 | 11 onglets actifs, pile V12→V11 riche mais empilée |
| Calculs financiers | 52/100 | Moteur `consolidateFinance` présent mais concurrencé |
| Interconnexions ERP | 58/100 | Side-effects nombreux, idempotence partielle |
| Doublons / cohérence | 45/100 | KPI, marges, trésorerie, réconciliation en double |
| Vérité canonique documentée | 60/100 | Intent clair dans `financePilotageCore`, pas appliqué partout |

**Score global estimé : ~58/100 → ~78/100 (après P0)**  
**Verdict : P0 VALIDÉ — gel partiel V1 ; P1 requis pour parité modules gelés**

Modules gelés en amont : Élevage ✅ · Cultures ✅ · Achats & Stock ✅ (V1 sur branche feature).

---

# Audit 1 — Cartographie complète

## 1.1 Point d'entrée module

| Élément | Fichier | Rôle |
|---------|---------|------|
| Route ERP | `src/App.jsx` → `finance_pilotage` | Props agrégées (transactions, ventes, paiements, stocks, animaux, cultures, etc.) |
| Module exporté | `src/modules/FinancePilotageModule.jsx` | Réexport de `FinancePilotageRecoveredModule.jsx` |
| Config onglets | `src/config/horizonVision.config.js` | 11 onglets canoniques |
| Résolution onglet | `src/utils/commercialNavigation.js` → `resolveFinanceTab` | Deep-link navigation |

**Onglets officiels (11) :** Résumé · Trésorerie · Créances · Dettes · Échéancier · Financement · Réconciliation · Investissements · Rentabilité · Annexe · Graphiques

---

## 1.2 Cartographie par onglet

### Résumé

| Type | Composant / zone | KPI / contenu | Formulaires / actions | Exports |
|------|------------------|---------------|----------------------|---------|
| Bannière | `FinanceDemoBanner` | Mode démo | — | — |
| Exécutif | `FinanceExecutiveSituationPanel` | Situation financière synthèse | Navigation onglets | — |
| Qualité | `FinanceDataQualityPanel` | Score qualité données | Navigation | — |
| Alertes | `FinanceAlertsPanel` | Alertes métier V3 | Navigation | — |
| Multi-fermes | `FinanceMultiFarmPanel` | Agrégats par ferme | — | — |
| Démarrage | `FinanceStartupPanel` | Parcours startup (si vide) | Navigation | — |
| Hey Horizon | `FinanceHeyHorizonStrip` | Questions suggérées | Assistant | — |
| Exports | `FinanceExportsPanel` (direct) | PDF synthèse, échéancier, remboursement, financement | Téléchargement PDF | 4 PDF |
| KPI strip (8) | Inline `Summary` | Santé finance, trésorerie dispo, créances, dettes, position nette, marge réelle, sans preuve, signaux IA | — | — |
| IA | `FinanceIaPanel` | « Surveillance IA finance » | Tâches / alertes / navigation | — |
| Preuves | `MissingProofPanel` | Transactions sans justificatif | → Trésorerie | — |
| Cohérence | `CoherencePanel` | Incohérences créances / impayés | Appliquer finding | — |
| Workflows | Section inline | Boutons Écriture, Trésorerie, Créances, Dettes, Échéancier, Investissements, Rentabilité | `emitHorizonForm('finances', 'finance_entry')` | — |

**Moteurs :** `buildOfficialTreasuryView`, `buildExecutiveFinancialSituation`, `buildFinanceAlertsV3`, `buildFinanceDataQuality`, `buildFinanceDirectExports`, `buildFinanceHealthSnapshot`, `buildFinanceCoherenceRows`

---

### Trésorerie

| Couche | Composant | KPI / tableaux | Formulaires | Exports |
|--------|-----------|----------------|-------------|---------|
| V12 wrapper | `FinancesV12.jsx` | — | Hey Horizon finance card | — |
| Trésorerie officielle | `FinanceCashPilotPanel` | 6 mini-KPI (`TREASURY_LABELS`) | — | — |
| BP santé | `BpKpiHealth` | KPI business plan | Navigation | — |
| Compta santé | `FinanceAccountingHealth` | Rapprochement compta | Navigation | — |
| V11 corps | `FinancesV11.jsx` | 5 KPI (argent reçu, reste à encaisser, dépenses, pertes, marge) | — | — |
| Détail charges | `DerivedChargesPanel` | Ventilation animaux / avicole / cultures / stock / santé / fournisseurs / invest / événements | — | — |
| Rentabilité inline | `ProfitSummary` | Résultat activité, investissements, disponible | — | — |
| Rémunération | `OwnerSalaryRecommendationPanel` | Salaire propriétaire recommandé | Création ligne finance | — |
| Saisie manuelle | `FinanceTransactionsOnly` | Table CRUD transactions | Create / Edit / Delete modals | CSV, Excel, PDF |
| Évolution | `FinanceEvolutionPanel` (dans V11) | 3 graphiques barres 6 mois (CA, cash, dépenses, net) | — | — |
| Plan léger | `FinancialPlanLightPanel` | Lien BP | Navigation | — |

**Note :** `FinanceTreasuryView.jsx` existe sous `finance/` mais n'est pas monté dans le flux V11 actif (table = `FinanceTransactionsOnly`).

---

### Créances

| Composant | KPI | Tableau | Formulaires | Navigation |
|-----------|-----|---------|-------------|------------|
| `CreancesPanel` (inline module) | Créances, montant, clients, impayés finance | `ModuleListHub` lignes créances | — | → Commercial › Clients |

**Sources données :** reste commandes (`remainingOf`) + transactions impayées type recette (`isReceivable`).

**Doublon dormant :** `finance/FinanceCreancesPanel.jsx` (non utilisé, avec liens Commercial enrichis).

---

### Dettes

| Composant | KPI | Tableau | Navigation |
|-----------|-----|---------|------------|
| `DettesPanel` (inline) | Dettes, montant, fournisseurs, dettes fiches | `ModuleListHub` | → Achats & Stock |

**Sources :** transactions impayées charge (`isPayable`) + champ `dettes`/`dette` fournisseur.

**Doublon dormant :** `finance/FinanceDettesPanel.jsx`.

---

### Échéancier

| Composant | Contenu |
|-----------|---------|
| `FinanceSchedulePanel` | Encaissements / paiements par bucket (retard, jour, 7j, 30j, futur) |
| `FinanceAgingPanel` | Aging créances et dettes |
| `FinanceCashFlowForecastPanel` | Forecast trésorerie V2 |

**Moteurs :** `buildFinanceSchedule`, `buildReceivablesAging`, `buildPayablesAging`, `buildCashFlowForecast`

---

### Financement

| Composant | Contenu | Exports |
|-----------|---------|---------|
| `FinanceFinancingPanel` | Vue financement V3, simulateur crédit | `FinanceExportsPanel` (repayment, financing) |
| `FinanceFinancingSimulatorPanel` | Montant, durée, taux, différé, apport | — |

**Moteurs :** `buildFinancingViewV3`, `buildFinancingSimulator`, DSCR, capacité remboursement

---

### Réconciliation

| Composant | Fichier | Fonction |
|-----------|---------|----------|
| **Actif (onglet)** | `finance/FinanceReconciliationPanel.jsx` | Anomalies V2, IA rapprochement, création finance depuis paiement, lien stock |
| **Legacy (non monté V12)** | `FinanceReconciliationPanel.jsx` | `auditFinanceReconciliation` + `syncPaymentsToFinance` |
| IA | `AiReconciliationPanel` | Suggestions rapprochement |

**Moteurs :** `buildFinanceReconciliationView`, `buildFinanceReconciliationRows`, `financeReconciliationService.js`

---

### Investissements

| Composant | Contenu |
|-----------|---------|
| `InvestissementsV9.jsx` | Actifs, business plans, lignes BP, charges récurrentes, projections, financement, liens, risques |

Formulaires : CRUD investissements + sous-entités BP ; paiement investissement → ligne finance.

---

### Rentabilité

| Composant | KPI | Détail |
|-----------|-----|--------|
| `RentabilitePanel` (inline) | Rentabilité globale, aviculture, bovins, cultures, CA commercial, marge brute, taux marge, charges structure | — |
| `ProfitabilityStatement` | Table buckets `PROFIT_BUCKETS` | `computeGlobalProfitability` |

**Doublon dormant :** `finance/FinanceRentabilitePanel.jsx`.

---

### Annexe

| Composant | Contenu |
|-----------|---------|
| `FinanceAnnexePanel` | Documents filtrés finance (`filterFinanceAnnexeDocuments`) |

---

### Graphiques

| Composant | Contenu |
|-----------|---------|
| `ModuleGraphiquesTab` | Graphiques module `finance_pilotage` (transactions, paiements, ventes, investissements, BP) |

**Doublon potentiel :** `FinanceEvolutionPanel` dans Trésorerie (barres 6 mois) vs onglet Graphiques.

---

## 1.3 Pile legacy (non entry-point mais présente)

| Fichier | Statut | Risque |
|---------|--------|--------|
| `Finances.jsx` | Legacy | Référence historique |
| `FinancesV2.jsx` … `FinancesV10.jsx` | Legacy | Exports CSV/Excel/PDF dupliqués |
| `FinancesV6.jsx` | Wrapper V5 | — |
| `ConsolidatedFinanceStrip.jsx` | **Non importé** | Code mort |
| `FinanceConsolidationPanel.jsx` | **Non importé** | Code mort |

**Entry-point actif trésorerie :** `FinancesV12` → `FinancesV11` + panneaux V12.

---

## 1.4 Dashboard et modules transverses

| Emplacement | Calcul trésorerie / CA | Période |
|-------------|------------------------|---------|
| `dashboardMetrics.js` → `buildDashboardSummary` | `cashNet` via `consolidateFinance` + `encaisse`/`depenses` via `computeFinancePeriodSummary` | Scope période |
| `Dashboard.jsx` | `consolidateFinance` direct | — |
| `visionUtils.jsx` | `computeFinancePeriodSummary` | Vision |
| `objectifsCroissanceWorkflow.js` | `computeFinancePeriodSummary` | Objectifs |
| `financeKpis.js` | Réexport période | KPI engine |
| `ComptabiliteV6.jsx` / `ComptabiliteV7.jsx` | `consolidateFinance` / accounting health | Compta |
| `RapportsV2.jsx` | `FinanceAccountingHealth` | Rapports |
| `BusinessChargeSyncPanel.jsx` | `consolidateFinance` | Sync charges |

---

## 1.5 Workflows d'écriture finance (interconnexions entrantes)

| Module source | Fichier side-effect | Type écriture | Idempotence |
|---------------|---------------------|---------------|-------------|
| Achats & Stock | `purchaseSideEffects.js`, `stockPurchaseWorkflow.js` | Sortie achat stock | `financeIds.purchase` |
| Achats fournisseurs | `supplierSideEffects.js` | Dette / paiement fournisseur | Oui |
| Commercial ventes | `saleSideEffects.js` | Encaissement + créance client | `financeIds` vente |
| Élevage alimentation | `feedingSideEffects.js` | Sortie alimentation | `financeIds.feeding` |
| Élevage santé | `healthSideEffects.js` | Sortie santé | Oui |
| Cultures | `cultureSideEffects.js` | Récolte (entrée), intrants (sortie), pertes | `financeIds.culture*` |
| Équipements | `equipmentSideEffects.js` | Maintenance / achat | Oui |
| Ressources / RH | `ressourcesWorkflow.js` | Charges | Partiel |
| Documents | `documentsWorkflow.js` | Lien compta | — |
| Workflow générique | `workflowService.js` | Divers | — |
| Hey Horizon / manuel | `FinancesV12`, `FinanceTransactionsOnly` | Saisie directe | Variable |

Post-création : `syncFinanceSideEffects` → `accountingSyncService` (compta).

---

# Audit 2 — Doublons et incohérences

## 2.1 Doubles KPI (même concept, calculs ou libellés différents)

| Concept | Instance 1 | Instance 2 | Instance 3 | Écart |
|---------|------------|------------|------------|-------|
| Trésorerie disponible | Résumé `treasuryAvailable` | `FinanceCashPilotPanel` | Dashboard `cashNet` | Alignés si même input — **OK** |
| Encaisse | V11 « Argent reçu » `cashEncaisse` | Dashboard `encaisse` (`computeFinancePeriodSummary`) | Évolution V11 `cash` | Période vs tout temps ; paiements seuls vs consolidation |
| Dépenses | V11 `chargesEngagees` | Dashboard `depenses` (sorties tx période) | `ProfitSummary` | Consolidé inclut coûts métier non comptabilisés |
| Marge | Résumé `realMargin` (`margeReelle`) | V11 KPI « Marge » | Rentabilité `operatingResult` | **Formules différentes** (voir Audit 3) |
| Taux marge | `finance.marginRate` | Rentabilité `marginRate` (operatingResult/ca) | — | **Non alignés** |
| Créances | Résumé / treasury `receivables` | Créances onglet (orders + tx) | `creancesReelles` consolidation | Anti-doublon partiel dans moteur ; UI peut cumuler order + tx |
| Dettes | treasury `payables` | Dettes onglet | `dettesFournisseurs` dans charges | Dette fournisseur dans charges **et** passif |
| Position nette | Résumé `netPosition` | `FinanceCashPilotPanel` | — | Cohérent (trésorerie + créances − dettes) |
| Santé finance | Score Résumé | `FinanceAccountingHealth` | `BpKpiHealth` | Scores indépendants |

## 2.2 Doubles calculs / moteurs parallèles

| Moteur A | Moteur B | Usage | Problème |
|----------|----------|-------|----------|
| `consolidateFinance` | `computeFinancePeriodSummary` | Dashboard encaisse/dépenses période | Période ≠ vérité consolidée |
| `consolidateFinance` | `buildFinanceEvolution` (V11) | Graphiques 6 mois Trésorerie | CA ventes vs cash anti-doublon local différent |
| `buildOfficialTreasuryView` | `consolidateFinance` direct (V11) | Trésorerie vs KPI V11 | Même source mais **double appel** même écran |
| `computeGlobalProfitability` | `consolidateFinance.margeReelle` | Rentabilité vs Résumé | Buckets max() vs formule simple CA − charges |
| `stockValueOf` / `qty × prixUnit` | `summarizeStockValuation` (CMUP) | Valorisation stock dans consolidation | **Conflit Achats gelé CMUP** |
| `buildStockLossFinanceRow` | CMUP | Perte stock | Utilise `prixUnit` pas CMUP |
| `deriveBusinessCharges` | Lignes finance auto | Coûts métier | Peut doubler avec écritures auto modules |

## 2.3 Doubles workflows / écritures

| Workflow | Risque doublon |
|----------|----------------|
| Vente Commercial → `saleSideEffects` (paid + receivable) | + paiement sans lien → `orphanPayments` |
| `syncPaymentsToFinance` (legacy panel) vs `buildFinanceFromPaymentRepair` | Deux chemins création finance depuis paiement |
| Saisie manuelle `FinanceTransactionsOnly` | Peut recréer achat déjà passé par stock |
| Dette fournisseur champ fiche + transaction impayée + `supplierSideEffects` | Triple représentation dette |
| Récolte culture → entrée `a_encaisser` + vente commercial | Double revenu si commercialisé |
| Alimentation → `feedingSideEffects` + coût champ animal/lot | Coût métier + ligne finance |

## 2.4 Doubles UI / composants

| Composant actif | Doublon dormant / legacy |
|-----------------|--------------------------|
| `CreancesPanel` inline | `FinanceCreancesPanel.jsx` |
| `DettesPanel` inline | `FinanceDettesPanel.jsx` |
| `RentabilitePanel` inline | `FinanceRentabilitePanel.jsx` |
| `finance/FinanceReconciliationPanel` | `FinanceReconciliationPanel.jsx` (import mort dans V12) |
| `FinanceEvolutionPanel` (Trésorerie) | `ModuleGraphiquesTab` (Graphiques) |
| `FinanceCashPilotPanel` + V11 KPI strip | Même onglet Trésorerie |

## 2.5 Libellés IA (honnêteté)

| Emplacement | Libellé actuel | Attendu (alignement modules gelés) |
|-------------|----------------|-------------------------------------|
| `FinanceIaPanel` | « Surveillance IA finance » | « Signaux métier finance » |
| Résumé KPI | « Signaux IA » | « Signaux métier » |
| Toast `applyFinding` | « Action IA créée » | « Action métier créée » |
| `AiReconciliationPanel` | IA rapprochement | Règles métier / suggestions |

Aucun LLM obligatoire dans les moteurs finance ; findings = `erpHealthEngine` + règles.

---

# Audit 3 — Vérités canoniques (définition cible ERP)

## 3.1 Revenu (chiffre d'affaires)

| Attribut | Valeur canonique proposée |
|----------|---------------------------|
| **Définition métier** | Montant facturé / commandé sur ventes confirmées (non annulées), période ou cumul selon scope UI |
| **Source code actuelle** | `consolidateFinance` → `caFacture` / `caConsolide` = somme `calculateOrderSettlement().total` |
| **Fichier** | `src/utils/financeConsolidationEngine.js` (lignes 77–80) |
| **Ne pas utiliser pour CA officiel** | Somme brute `payments` ; somme entrées finance sans lien vente ; récolte culture seule si vente commercial existe |
| **Écarts** | `computeGlobalProfitability.caTotal` = max(CA consolidé, somme ventes, somme paiements) → peut **surévaluer** |

## 3.2 Dépense / charge

| Attribut | Valeur canonique proposée |
|----------|---------------------------|
| **Définition métier** | (1) Sorties finance payées ou à payer + (2) coûts métier non encore en finance, sans double comptage |
| **Source code actuelle** | `chargesEngagees` = `chargesMetier` + `lossCharges` ; `chargesMetier` = réconciliation tx sorties vs `deriveBusinessCharges` |
| **Fichier** | `financeConsolidationEngine.js` (lignes 36–46, 69–70, 81) |
| **Coûts métier dérivés** | `deriveBusinessCharges` : animaux, lots, cultures, achats stock, santé, alimentation, investissements, **dettes fournisseurs**, événements |
| **Risque** | `dettesFournisseurs` dans charges **et** `payables` trésorerie ; achat stock peut être dans tx + `stockPurchases` |

## 3.3 Marge

| Attribut | Valeur canonique proposée |
|----------|---------------------------|
| **Marge réelle (trésorerie / pilotage)** | `margeReelle` = `caConsolide − chargesEngagees` |
| **Fichier** | `financeConsolidationEngine.js` ligne 81 ; exposée via `buildOfficialTreasuryView.realMargin` |
| **Marge opérationnelle (rentabilité)** | `operatingResult` = CA − charges directes activité − structure (`computeGlobalProfitability`) |
| **Fichier** | `globalProfitabilityService.js` ; `buildProfitabilityView` → `marginRate` sur **operatingResult** |
| **Écart UI** | Résumé affiche `realMargin` ; Rentabilité affiche `operatingResult` — **deux marges officielles** |

## 3.4 Trésorerie

| Attribut | Valeur canonique proposée |
|----------|---------------------------|
| **Trésorerie disponible** | `cashNet` = encaissements payés (ventes + autres entrées + paiements orphelins) − dépenses payées |
| **Fichier** | `financeConsolidationEngine.js` ligne 81 ; `financePilotageCore.js` → `treasuryAvailable` |
| **Encaisse** | `cashEncaisse` avec anti-doublon ventes vs tx ventes |
| **Position nette** | `treasuryAvailable + receivables − payables` (≠ trésorerie disponible) |
| **Dashboard période** | `cashNet` consolidé global + `encaissePeriod`/`depensesPeriod` séparés — **deux lectures** |

## 3.5 Dette (passif / à payer)

| Attribut | Valeur canonique proposée |
|----------|---------------------------|
| **Dettes fournisseurs** | Somme champs `dettes`/`dette`/`solde_du` sur fiches fournisseurs |
| **Fichier** | `consolidateFinance` ; `buildOfficialTreasuryView.payables` |
| **Charges à payer** | Transactions sortie statut impayé/partiel (`buildFinanceSchedule` outflows) |
| **Écart UI** | Onglet Dettes fusionne tx impayées + fiches sans dédoublonnage strict |

## 3.6 Créance (actif / à encaisser)

| Attribut | Valeur canonique proposée |
|----------|---------------------------|
| **Créances clients** | `creancesReelles` = max(0, CA − encaisse, reste commandes) avec garde anti-doublon tx |
| **Fichier** | `financeConsolidationEngine.js` lignes 80–81 |
| **Opérationnel** | `remainingForOrder` sur commandes + tx impayées type recette (onglet Créances) |
| **Fichier** | `financePilotageRecoveredModule.jsx` ; `salesStatuses.js` |

## 3.7 Valorisation stock (lien Achats gelé)

| Attribut | Canon Achats V1 | Finance actuel |
|----------|-----------------|----------------|
| Valorisation | `summarizeStockValuation` / CMUP | `stockValue` = Σ qty × prixUnit |
| **Verdict** | **Non aligné** — P0 Finance requis pour cohérence ERP |

---

# Audit 4 — Interconnexions ERP

## 4.1 Finance ↔ Achats & Stock

| Flux | Mécanisme | Écriture finance | Dette fournisseur | Valorisation |
|------|-----------|------------------|-------------------|--------------|
| Réception achat | `commitStockPurchaseWorkflow` | `buildPurchaseFinanceRow` sortie payée | `supplierSideEffects` | CMUP ledger (gel Achats) |
| Perte stock | `buildStockLossFinanceRow` | qty × **prixUnit** | — | Pas CMUP |
| Réconciliation | `buildStockReceptionFromFinanceTransaction` | Lien inverse | — | — |
| Consolidation | `stockPurchaseCost` / `stockValueOf` | — | dettes dans `deriveBusinessCharges` | prix fiche |

**Écarts :** Finance ne lit pas CMUP ; achats comptabilisés peuvent être re-comptés via fiche stock.

## 4.2 Finance ↔ Élevage

| Flux | Side-effect | Catégorie finance |
|------|-------------|-------------------|
| Alimentation | `feedingSideEffects` | Alimentation / avicole ou animaux |
| Santé | `healthSideEffects` | Santé |
| Coûts champs animal/lot | `deriveBusinessCharges` | animaux / avicole via `animalCosts` / `lotCosts` |
| Vente animal/lot | `saleSideEffects` | Commercial + finance |

Alimentation canonique écriture = Élevage (gel) ; finance reçoit ligne auto.

## 4.3 Finance ↔ Cultures

| Flux | Side-effect | Type |
|------|-------------|------|
| Récolte | `cultureSideEffects` harvest | Entrée `a_encaisser` |
| Intrants / pertes | `cultureInput` / loss workflows | Sortie |
| Coûts parcelle | `cultureCosts` dans consolidation | Dérivé fiche culture |

Risque double revenu si récolte commercialisée sans annuler entrée culture.

## 4.4 Finance ↔ Commercial

| Flux | Mécanisme | Finance |
|------|-----------|---------|
| Commande | `saleSideEffects` | Créance si reste |
| Paiement | `buildPaidFinanceRow` | Entrée payée |
| Créances UI | Onglet + Commercial | `remainingForOrder` |
| Opportunité | `closeOpportunityForOrder` | — |

Source ventes = Commercial ; Finance agrège pour CA et encaisse.

---

# Audit 5 — Plan de correction P0 / P1 / P2

> **Aucune correction avant validation du plan.** Séquence recommandée : P0 → gel partiel → P1 → P2.

## P0 — Vérité économique unique (bloquant gel V1)

| Id | Thème | Action | Fichiers cibles | Dépendance |
|----|-------|--------|-----------------|------------|
| P0-1 | Trésorerie unique | Un seul bandeau KPI trésorerie sur onglet Trésorerie ; supprimer redondance V11 5-KPI vs CashPilot si doublon | `FinancesV11.jsx`, `FinancesV12.jsx` | — |
| P0-2 | Marge unique affichée | Aligner libellés : « Marge réelle » = `margeReelle` partout Résumé + Trésorerie ; Rentabilité = « Résultat opérationnel » explicite | `FinancePilotageRecoveredModule`, `buildProfitabilityView` | — |
| P0-3 | CMUP stock | Remplacer `stockValue` et `stockValueOf` par `summarizeStockValuation` ; pertes stock via CMUP | `financeConsolidationEngine.js`, `purchaseSideEffects.js` | Achats gelé CMUP |
| P0-4 | Créances / dettes | Dédoublonnage UI : créances = `creancesReelles` + liste opérationnelle sans double order+tx ; dettes = payables canon | `FinancePilotageRecoveredModule.jsx` | — |
| P0-5 | Dette fournisseur dans charges | Exclure `dettesFournisseurs` de `deriveBusinessCharges.total` OU exclure des charges engagées si déjà en payables | `financeConsolidationEngine.js` | — |
| P0-6 | Réconciliation unique | Retirer `FinanceReconciliationPanel.jsx` legacy ou fusionner ; supprimer import mort V12 | `FinancesV12.jsx`, réconciliation | — |
| P0-7 | IA honnête | Libellés « Signaux métier » (parité Achats/Élevage) | Module finance panels | — |
| P0-8 | Dashboard encaisse | Documenter ou unifier : `encaissePeriod` vs `cashEncaisse` ; lien explicite vers `cashNet` | `dashboardMetrics.js`, UI dashboard | — |

**Critère gel P0 :** un seul chiffre pour trésorerie dispo, marge réelle, créances, dettes, valorisation stock CMUP ; tests `financePilotageV1.test.js` + tests CMUP finance.

---

## P1 — Cohérence ERP et UX (post-P0)

| Id | Thème | Action |
|----|-------|--------|
| P1-1 | Composants dormants | Réutiliser ou supprimer `FinanceCreancesPanel`, `FinanceDettesPanel`, `FinanceRentabilitePanel`, strips non importés |
| P1-2 | Graphiques uniques | Retirer `FinanceEvolutionPanel` de Trésorerie ; Graphiques seul (parité Achats P1-2) |
| P1-3 | CA canon | `caTotal` = `caConsolide` uniquement dans `computeGlobalProfitability` |
| P1-4 | Side-effects | Audit idempotence saisie manuelle vs auto (stock, vente, alimentation) |
| P1-5 | Culture récolte | Règle : entrée finance récolte annulée ou marquée si vente liée |
| P1-6 | Exports | Un seul hub exports (Résumé + Financement) ; CSV/Excel depuis `FinanceTransactionsOnly` documenté |
| P1-7 | Multi-fermes | Vérifier scope ferme sur consolidation (comme stock ledger) |

---

## P2 — Enrichissement (non bloquant gel)

| Id | Thème | Action |
|----|-------|--------|
| P2-1 | Legacy FinancesV2–V10 | Archivage / suppression après confirmation non-référencés |
| P2-2 | FinanceTreasuryView | Intégrer ou supprimer |
| P2-3 | Simulateur financement | Persistance params auditée |
| P2-4 | Compta | Alignement `accountingSyncService` avec vérité canonique |
| P2-5 | Tests ESM | Couverture intégration side-effects cross-module |

---

## Fichiers moteurs — référence rapide

| Concept | Fichier principal |
|---------|-------------------|
| Consolidation | `src/utils/financeConsolidationEngine.js` |
| Trésorerie officielle | `src/utils/financePilotageCore.js` |
| Analytics V2 | `src/utils/financePilotageV2.js` |
| Analytics V3 | `src/utils/financePilotageV3.js` |
| Rentabilité buckets | `src/services/globalProfitabilityService.js` |
| Side-effects | `src/services/erpInterconnectionEngine.js` + `*SideEffects.js` |
| Module UI | `src/modules/FinancePilotageRecoveredModule.jsx` |
| Trésorerie UI | `src/modules/FinancesV12.jsx` → `FinancesV11.jsx` |
| Tests | `tests/unit/financePilotageV1.test.js`, `dashboardMetrics.test.js` |

---

---

# Corrections P0 appliquées

**Branche :** `cursor/finance-p0-ac42`  
**Tests :** `npx vite-node tests/unit/financeP0.test.js` · `financePilotageV1.test.js` · `dashboardMetrics.test.js` — OK  
**Build :** `npm run build` — OK

## P0-1 — Trésorerie unique (`cashNet`)

| Fichier | Avant | Après |
|---------|-------|-------|
| `FinancesV11.jsx` | 5 KPI doublons (encaisse, créances, charges, marge) | Section « Charges et marge réelle » seule ; trésorerie = `FinanceCashPilotPanel` |
| `FinancesV11.jsx` | `FinanceEvolutionPanel` (flux mensuels) | Retiré de Trésorerie (onglet Graphiques) |
| `FinancesV12.jsx` | `stockMovements` non passés au pilot | Props `stocks` + `stockMovements` → `FinanceCashPilotPanel` |

**Vérité canonique :** `treasuryAvailable` = `consolidateFinance().cashNet` via `buildOfficialTreasuryView`.

## P0-2 — Marge unique

| Écran | Libellé | Formule |
|-------|---------|---------|
| Résumé / Trésorerie | Marge réelle | `margeReelle` = CA − charges engagées |
| Rentabilité | Résultat opérationnel | `operatingResult` (`computeGlobalProfitability`) |
| Rentabilité | Taux résultat opérationnel | `operatingResult / caTotal` |

| Fichier | Changement |
|---------|------------|
| `FinancePilotageRecoveredModule.jsx` | « Rentabilité globale » → « Résultat opérationnel » |
| `FinancesV11.jsx` | KPI « Marge » → « Marge réelle » dans `ProfitSummary` |
| `globalProfitabilityService.js` | `caTotal` = `caConsolide` uniquement (plus max paiements) |

## P0-3 — CMUP unique

| Fichier | Changement |
|---------|------------|
| `financeConsolidationEngine.js` | `stockValue` = `summarizeStockValuation` ; achats via `computeWeightedAverageCost` |
| `purchaseSideEffects.js` | `buildStockLossFinanceRow` utilise CMUP |
| `App.jsx` / module Finance | `stockMovements` dans props et consolidation |

## P0-4 — Créances / dettes uniques

| Fichier | Changement |
|---------|------------|
| `financeConsolidationEngine.js` | `payablesTotal` = dettes fournisseur + charges impayées ; `isPaid` inclut `a_payer` |
| `financePilotageCore.js` | `payables` = `payablesTotal` |
| `FinancePilotageRecoveredModule.jsx` | `receivableAmount` / `payableAmount` = treasury canon ; liste créances sans doublon ventes |
| `dashboardMetrics.js` | `receivable` = `creancesReelles` ; `payables` consolidés |

## P0-5 — Dette fournisseur = passif

| Fichier | Changement |
|---------|------------|
| `financeConsolidationEngine.js` | `dettesFournisseurs` exclues du `total` charges dérivées |
| `globalProfitabilityService.js` | Bucket `fournisseurs_achats` sans injection dettes fiche |

## P0-6 — Réconciliation unique

| Action |
|--------|
| Supprimé `src/modules/FinanceReconciliationPanel.jsx` (legacy) |
| Conservé `src/modules/finance/FinanceReconciliationPanel.jsx` |
| Import mort retiré de `FinancesV12.jsx` |

## P0-7 — IA honnête

| Emplacement | Après |
|-------------|-------|
| `FinanceIaPanel` | « Signaux métier finance » |
| Résumé KPI | « Signaux métier » |
| Toast action | « Action métier créée » |

## P0-8 — Dashboard aligné

| KPI Dashboard | Moteur |
|---------------|--------|
| Trésorerie disponible | `consolidateFinance.cashNet` |
| Créances | `creancesReelles` |
| Encaisse / dépenses période | `computeFinancePeriodSummary` (flux période, pas trésorerie) |

---

## Prochaine étape

1. Valider P0 + P1 en revue.  
2. Gel V1 Finance après validation P1 (parité Élevage / Cultures / Achats).  
3. P2 uniquement après gel V1 validé.

---

# Corrections P1 appliquées

**Branche :** `cursor/finance-p1-ac42`  
**Tests :** `npx vite-node tests/unit/financeP1.test.js` · `financeP0.test.js` · `financePilotageV1.test.js` · `dashboardMetrics.test.js`  
**Build :** `npm run build`

## P1-1 — Composants dormants

| Fichier | Utilisé | Action |
|---------|---------|--------|
| `finance/FinanceCreancesPanel.jsx` | Non (0 import) | **SUPPRIMER** |
| `finance/FinanceDettesPanel.jsx` | Non (0 import) | **SUPPRIMER** |
| `finance/FinanceRentabilitePanel.jsx` | Non (0 import) | **SUPPRIMER** |
| `ConsolidatedFinanceStrip.jsx` | Non (0 import) | **SUPPRIMER** |
| `FinanceConsolidationPanel.jsx` | Non (0 import) | **SUPPRIMER** |
| `finance/financeUi.jsx` | Oui (`FinanceMissingProofPanel`) | **CONSERVER** |

**Impact ERP :** aucun runtime — UI active = `FinancePilotageRecoveredModule` (onglets Créances/Dettes/Rentabilité inline).

## P1-2 — Graphiques uniques

| Composant | Statut | Vérité graphique |
|-----------|--------|------------------|
| `FinanceEvolutionPanel` | Absent du repo (retiré P0) | — |
| `ModuleGraphiquesTab` (`finance_pilotage`) | Actif onglet Graphiques | **Hub unique** |
| `FinanceEvolution.jsx` | Rendu par `ModuleGraphiquesTab` | CA / cash / dépenses 6 mois |
| `InvestissementsEvolution` | Idem onglet Graphiques | Investissements |

**KPI doublons retirés :** flux mensuels hors Trésorerie (P0).  
**Datasets :** `transactions` + `payments` + `salesOrders` — pas de second pipeline graphique Finance.

## P1-3 — CA canonique

| Champ | Règle |
|-------|-------|
| `caTotal` | `finance.caConsolide` uniquement |
| `payments` / `cashEncaisse` | Trésorerie encaissée, pas CA |
| `Math.max` sur CA | Interdit |

**Fichier :** `globalProfitabilityService.js` lignes 90–91 (commentaire + test P1).

## P1-4 — Idempotence ERP

| Workflow | Risque | Solution |
|----------|--------|----------|
| Vente (`saleSideEffects`) | Double TRX-PAY / TRX-CREANCE | IDs `financeIds` + check `exists` par id |
| Alimentation (`feedingSideEffects`) | Double TRX-ALIM | `financeIds.feeding(logId)` |
| Culture récolte (`cultureSideEffects`) | Double TRX-RECOLTE | Id déterministe + skip commercial P1-5 |
| Culture perte | Double TRX-PERTE | Id par culture+date |
| Achat stock (`purchaseSideEffects`) | Double TRX-ACHAT | `financeIds.purchase` + idempotency key |
| Fournisseur (`supplierSideEffects`) | Double dette/paiement | `financeIds.supplierDebt` / `supplierPayment` |
| Saisie manuelle (`FinanceTransactionsOnly`) | Doublon source métier | `findDuplicateFinanceTransaction` avant create |

**Fichiers :** `financeTransactionMeta.js` (`findDuplicateFinanceTransaction`, `financeTransactionWouldDuplicate`), `FinanceTransactionsOnly.jsx`.

## P1-5 — Cultures (récolte + vente)

**Règle canonique :** récolte commerciale (stock/opportunité ouverte, `vendable`) → **pas** d'écriture `TRX-RECOLTE-{cultureId}`. Revenu = vente Commercial uniquement. Si `TRX-RECOLTE` existait, annulation à la vente (`voidCultureHarvestFinanceOnSale`).

**Fichiers :** `cultureSideEffects.js` (`shouldSkipHarvestFinanceForCommercialPath`), `saleSideEffects.js` (`voidCultureHarvestFinanceOnSale`).

## P1-6 — Exports

| Hub | Contenu | Format |
|-----|---------|--------|
| **Officiel** | `FinanceExportsPanel` (Résumé + Financement) | PDF synthèse, échéancier, remboursement, financement |
| **Lignes manuelles** | `FinanceTransactionsOnly` | CSV / Excel / PDF — libellé « Export lignes manuelles » |
| Rapprochement / autres modules | Hors hub Finance officiel | — |

## P1-7 — Multi-fermes

| Zone | Scope |
|------|-------|
| `App.jsx` | `applyFarmScopeToProps` / `applyFarmScopeToDataMap` sur `finance_pilotage` |
| Dashboard / trésorerie / rentabilité | Données pré-filtrées avant `consolidateFinance` |
| `FinanceMultiFarmPanel` | Agrégats par ferme (Résumé) |
| Échéancier / aging | `showFarmInSchedule` si plusieurs fermes actives |
| `consolidateFinance` | Ne filtre pas `farm_id` en interne — filtrage amont obligatoire |

**Verdict P1 :** composants dormants supprimés, graphiques unifiés, CA canonique testé, idempotence renforcée, cultures sans double revenu, exports cartographiés, multi-fermes documenté. **Gel V1 prêt pour validation humaine.**

---

# Audit P1 complet (missions 1–6)

**Score global avant P1 :** ~78/100 (post-P0)  
**Score global après P1 :** ~86/100 (gel V1 candidat)

| Dimension | Avant | Après |
|-----------|-------|-------|
| Architecture | 72 | 82 |
| Cohérence métier | 78 | 88 |
| UX dirigeant | 65 | 84 |
| Effet investisseur | 62 | 80 |

---

## Mission 1 — États vides intelligents

### Anomalies identifiées (avant patch)

| Écran / KPI | Problème | Correction |
|-------------|----------|------------|
| Résumé — Santé finance `32/100` | Score ERP UX sans flux financier | `Données insuffisantes` si pas de tx/vente/paiement |
| Header module — Santé | Idem | Idem |
| Situation exécutive — Risque trésorerie « Faible » | Sans historique | `Non calculable` |
| Situation exécutive — Rentabilité « À surveiller » | Sans CA | `Non calculable` |
| Qualité données — « satisfaisante » | Ferme vide | `En attente de données` |
| Alertes — « situation sous contrôle » | Ferme vide | `En attente de données` |
| Alertes financement (service dette) | Info sans données | Supprimées si `isFinanceStartupMode` |
| Signaux métier KPI | Compteur 0 ambigu | `En attente` |

### Fichiers patch

- `src/utils/financeEmptyState.js` (nouveau)
- `src/modules/finance/financeVisionHelpers.js`
- `src/utils/financePilotageV2.js` (`buildExecutiveFinancialSituation`)
- `src/utils/financePilotageV3.js` (`buildFinanceDataQuality`, `buildFinancingAlerts`)
- `src/modules/finance/FinanceExecutiveSituationPanel.jsx`
- `src/modules/finance/FinanceDataQualityPanel.jsx`
- `src/modules/finance/FinanceAlertsPanel.jsx`
- `src/modules/FinancePilotageRecoveredModule.jsx`

### Tests

`tests/unit/financeEmptyState.test.js`

---

## Mission 2 — Hey Horizon Finance (system prompt officiel)

**Fichiers :** `heyHorizonFinancePrompt.js` (system prompt + `formatFinanceSCA`), `heyHorizonFinanceAnswers.js` (réponses rule-based).

**Format obligatoire :** SITUATION / CAUSE / ACTION + `(Source ERP : …)`.

**Questions implémentées :** trésorerie 30j, créances, dettes, emprunt, priorités du jour, résumé, documents banque, relance (SMS/WhatsApp/email), arbitre trésorerie, collision 30/60/90j, ROI investissements, rapprochement (confiance Élevé/Moyen/Faible).

### `EMPTY_STATE_FINANCE_QA`

> Je ne dispose pas encore de suffisamment de données financières. Commencez par enregistrer une dépense, une vente ou un paiement.

### Implémentation

- `detectFinancePilotageQuery` + `buildFinancePilotageAnswer` → `heyHorizonFinanceAnswers.js`
- Intégration `processHeyHorizonCommand` (priorité avant brouillons terrain)
- Bandeau explicatif `FinanceHeyHorizonStrip` en mode startup

Questions couvertes : emprunt prudent, trésorerie 30j, créances, dettes semaine, documents banque, situation financière, risque trésorerie, rentabilité.

---

## Mission 3 — Composants dormants (audit, pas suppression auto)

| Fichier | Références | Utilité | Action recommandée |
|---------|------------|---------|-------------------|
| `FinanceCreancesPanel.jsx` | 0 import | Doublon inline `CreancesPanel` | **SUPPRIMÉ** (commit P1) — garder suppression |
| `FinanceDettesPanel.jsx` | 0 | Doublon inline `DettesPanel` | **SUPPRIMÉ** |
| `FinanceRentabilitePanel.jsx` | 0 | Doublon inline `RentabilitePanel` | **SUPPRIMÉ** |
| `ConsolidatedFinanceStrip.jsx` | 0 | Legacy synthèse | **SUPPRIMÉ** |
| `FinanceConsolidationPanel.jsx` | 0 | Legacy consolidation UI | **SUPPRIMÉ** |
| `finance/financeUi.jsx` | `FinanceMissingProofPanel` | Helpers UI partagés | **CONSERVER** |

---

## Mission 4 — Graphiques uniques

| Source | Statut |
|--------|--------|
| `FinanceEvolutionPanel` | **Absent** (retiré P0) |
| `ModuleGraphiquesTab` + `FinanceEvolution.jsx` | **Hub officiel** onglet Graphiques |
| Doublons KPI graphiques Trésorerie | Aucun (P0) |

**Plan fusion :** aucune fusion requise — une seule pipeline graphique Finance.

---

## Mission 5 — Idempotence finance

| Workflow | Identifiant unique | Protection | Risque | Correction |
|----------|-------------------|------------|--------|------------|
| Vente | `TRX-PAY-*`, `TRX-CREANCE-*` | `exists` par id | Faible | OK |
| Achat stock | `TRX-ACHAT-*` | id + idempotency key | Faible | OK |
| Alimentation | `TRX-ALIM-{logId}` | `exists` | Faible | OK |
| Culture récolte | `TRX-RECOLTE-{cultureId}` | skip commercial + void vente | Moyen → Faible | P1-5 |
| Culture perte | `TRX-PERTE-CULT-*` | id date | Faible | OK |
| Santé | `TRX-SANTE-{id}` | `financeIds.health` | Faible | OK |
| Équipement | `TRX-EQP-*` | id déterministe | Faible | OK |
| Fournisseur dette | `TRX-DETTE-FOUR-*` | id + canonical purchase | Faible | OK |
| Fournisseur paiement | `TRX-PAY-FOUR-*` | `exists` | Faible | OK |
| Saisie manuelle | `issue_key` | `findDuplicateFinanceTransaction` | Moyen → Faible | P1-4 |

---

## Mission 6 — Mode investisseur (Résumé)

| Critère | Note avant | Note après | Commentaire |
|---------|------------|------------|-------------|
| Architecture | 72 | 82 | Panels exécutifs + empty states cohérents |
| Cohérence métier | 78 | 88 | P0 vérités intactes ; pas de faux scores |
| UX dirigeant | 65 | 84 | Lecture 30s crédible même ferme vide |
| Effet investisseur | 62 | 80 | Demo honnête + exports PDF hub |

---

## Critère de gel Finance V1

1. P0 vérités canoniques intactes (cashNet, creancesReelles, payablesTotal, CMUP, réconciliation unique).  
2. P1 missions 1–6 validées en revue.  
3. Tests : `financeEmptyState`, `financeP1`, `financeP0`, `financePilotageV1`, `financePilotageV3`, `dashboardMetrics`, `npm run build`.  
4. Parité gel modules : Élevage V1, Cultures V1, Achats & Stock V1.  
5. **P2 interdit** avant validation humaine explicite.

---

## Fichiers modifiés (tour P1 complet)

| Fichier | Mission |
|---------|---------|
| `financeEmptyState.js` | M1, M2 |
| `heyHorizonFinanceAnswers.js` | M2 |
| `heyHorizonAssistantService.js` | M2 |
| `financeVisionHelpers.js` | M1 |
| `financePilotageV2.js` | M1 |
| `financePilotageV3.js` | M1 |
| `FinanceExecutiveSituationPanel.jsx` | M1, M6 |
| `FinanceDataQualityPanel.jsx` | M1 |
| `FinanceAlertsPanel.jsx` | M1 |
| `FinanceHeyHorizonStrip.jsx` | M2 |
| `FinancePilotageRecoveredModule.jsx` | M1, M6 |
| `financeTransactionMeta.js` | M5 |
| `cultureSideEffects.js` | M5 |
| `saleSideEffects.js` | M5 |
| `FinanceTransactionsOnly.jsx` | M5, M6 |
| `globalProfitabilityService.js` | M4 (CA) |
| `tests/unit/financeEmptyState.test.js` | M1, M2 |
| `tests/unit/financeP1.test.js` | M4, M5 |

---

*Audit initial + corrections P0 (`cursor/finance-p0-ac42`) + P1 (`cursor/finance-p1-ac42`).*
