# Carte des modules canoniques — Horizon Farm ERP

> Source de vérité : `src/config/moduleEntryPoints.js` (`CANONICAL_MODULE_FILES`, `MODULE_ENTRY_POINTS`).
> App.jsx charge **uniquement** depuis `MODULE_ENTRY_POINTS` — jamais depuis `src/modules/index.js`.

## Règle anti-régression

- Toute modification d’un module doit cibler le **fichier canonique** ou son `*RecoveredModule` monté par l’entry point.
- Les fichiers listés dans `FORBIDDEN_ENTRY_FILES` ne doivent **pas** devenir entry points.
- Les tests `moduleEntryPoints.test.js` et `moduleRenderWithProvider.vite.test.js` verrouillent les versions canoniques et le rendu sans crash.

## Grands modules (navigation principale)

| Module | Version canonique | Entry point | Composant monté | Legacy / alias |
|--------|-------------------|-------------|-----------------|----------------|
| Accueil | DashboardV2 | `DashboardV2.jsx` | `DashboardV2` | `Dashboard.jsx` interdit |
| Assistant ERP | AssistantERPV2 | `AssistantERPV2.jsx` | `HeyHorizonModule` | — |
| Centre décisionnel | CentreIA | `CentreIA.jsx` | `CentreDecisionModule` | — |
| Objectifs & Croissance | ObjectifsCroissanceV2 | `ObjectifsCroissanceV2.jsx` | `ObjectifsDecisionModule` | — |
| Élevage | ElevageModule | `ElevageModule.jsx` | `ElevageRecoveredModule` → AnimauxV2 / AvicoleV10 / SanteV8 | `animaux`, `avicole`, `sante` → elevage |
| Commercial | CommercialModule | `CommercialModule.jsx` | `CommercialRecoveredModule` → VentesV5→V6, ClientsReadable | `ventes`, `clients` → commercial |
| Achats & Stock | AchatsStockModule | `AchatsStockModule.jsx` | `AchatsStockRecoveredModule` → StocksV5→V4→V3 | `stock`, `fournisseurs` → achats_stock |
| Finance & Pilotage | FinancePilotageModule | `FinancePilotageModule.jsx` | `FinancePilotageRecoveredModule` → FinancesV12, **InvestissementsV9** | `finances`, `investissements` → finance_pilotage |
| Activité & Suivi | ActiviteSuiviModule | `ActiviteSuiviModule.jsx` | `ActiviteSuiviRecoveredModule` | `alertes`, `taches`, `tracabilite` |
| Documents & Rapports | DocumentsRapportsModule | `DocumentsRapportsModule.jsx` | UI unifiée dossiers | `documents`, `rapports` |
| Investisseurs & Forums | InvestisseursForumsModule | `InvestisseursForumsModule.jsx` | self | `impact_business` alias |
| RH | RHV2 | `RHV2.jsx` | `OperationsRessourcesRecoveredModule` | label nav « RH » |
| Smart Farm | SmartFarm | `SmartFarm.jsx` | `smartfarm/SmartFarmRecoveredModule` | duplicate root file à ne pas utiliser |
| Gestion système | GestionSystemeV2 | `GestionSystemeV2.jsx` | `GestionSystemeUnified` | `GestionSysteme.jsx` interdit |

## Finance & Pilotage — onglet Investissements

| Élément | Fichier | Remarque |
|---------|---------|----------|
| Onglet Investissements | `FinancePilotageRecoveredModule.jsx` tab `Investissements` | Monte `InvestissementsV9` |
| Lignes investissement | `InvestissementsV9.jsx` | Onglet « Mes investissements » |
| Charges BP | `InvestmentsFinancePanels.jsx` → `BpMonthlyCostsPanel` | Onglet « Charges mensuelles » |
| Actions ligne | `BpLineActionsMenu.jsx` + `bpLineLinkage.js` | Concrétiser, Modifier, Reporter, Annuler |
| Sync BP | `InvestissementsV9.syncBp()` | Crée lignes DB si aperçu `off-*` |

## Chaînes de versions (risque régression)

| Famille | Chaîne montée | Fichiers legacy non montés |
|---------|---------------|----------------------------|
| Stock | StocksV5 → StocksV4 → StocksV3 | StocksV2, StocksV1 |
| Ventes | VentesV5 → VentesV6 | VentesV2, VentesV3 |
| Finance | FinancesV12 (dans FinancePilotage) | FinancesV1–V11 |
| Avicole | AvicoleV10 (via Élevage) | AvicoleV2–V9 |
| Alertes | AlertesCenterV3 (via Activité) | AlertesCenter, V2 |
| Équipements | EquipementsV3 → Equipements.jsx | EquipementsV2 |

## Erreurs runtime corrigées (stabilisation 2026-06)

| Module | Erreur | Correctif |
|--------|--------|-----------|
| Assistant ERP | `getValidatableDrafts(null)` | Garde null dans `HeyHorizonVoiceDraftsPanel` |
| Achats & Stock | `deriveAlimentationValues is not defined` | Import dans `StocksV3.jsx` |
| Achats & Stock | `pricePerKg is not defined` | Destructuring dans `StockFeedingCostPlanner.jsx` |
| Équipements | `EquipementsSmartFarmBridge is not defined` | Import dans `Equipements.jsx` |
| Investissements | Actions absentes sur lignes aperçu | `allowPreviewActions` + sync auto BP |

## Fonctionnalités Finance Investissements — état attendu

Chaque ligne investissement / charge BP doit exposer :

- **Concrétiser** — ouvre le module cible avec fiche préremplie
- **Modifier** — modal édition (après sync si aperçu)
- **Reporter** — statut `reporte`
- **Annuler** — statut `annule`
- **Statut** — select quand ligne en base (ID réel, pas `off-*` / `cost-*`)

Statuts : prévu, à concrétiser, en cours, concrétisé partiel, concrétisé, reporté, annulé.
