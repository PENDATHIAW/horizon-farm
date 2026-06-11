# ASSISTANT_BUSINESS_COVERAGE_MATRIX

**Version :** V5 — Compréhension métier globale  
**Date :** 2026-06-09

## PILOTAGE

| Module | Questions | Moteurs canoniques | Couverture |
|--------|-----------|-------------------|------------|
| Accueil | Priorités, vue ferme | `buildDashboardSummary`, `buildCarnetDomainCards` | strong |
| Assistant ERP | Navigation NL | `assistantFarmNavigation` | strong |
| Centre décisionnel | Urgences, priorités | `buildCarnetDomainCards` | partial |
| Objectifs & Croissance | Avancement, projection annuelle | `buildObjectifsCroissanceData` | strong |
| Investisseurs & Forums | Dossier investisseur | `consolidateFinance`, `summarizeSalesMargins` | partial |

## PRODUCTION

| Module | Questions | Moteurs | Couverture |
|--------|-----------|---------|------------|
| Élevage | Poulets, pondeuses, bovins, lots malades, mortalité, traitements | `computeFarmHeadcount`, carnet | strong |
| Cultures | Parcelles, rendement, récoltes, rentabilité | `computeCultureSummary`, marges | strong |

## COMMERCE

| Module | Questions | Moteurs | Couverture |
|--------|-----------|---------|------------|
| Commercial | Meilleur client/produit, créances, ventes jour, relances | `buildConsolidatedCommercialKpis` | strong |
| Achats & Stock | Stock, reste, aliment, vendable, ruptures | `computeStockSummary` | strong |

## FINANCE

| Module | Questions | Moteurs | Couverture |
|--------|-----------|---------|------------|
| Finance & Pilotage | Trésorerie, dettes, créances, rentabilité | `consolidateFinance` | strong |

## SUIVI · RESSOURCES · ADMINISTRATION

| Section | Couverture | Note |
|---------|------------|------|
| Activité & Suivi | partial | Priorités via carnet |
| Documents & Rapports | navigation_only | Hors Q&R assistant |
| Opérations & Ressources | navigation_only | Pas de moteur dédié assistant |
| Sync / Gestion système | navigation_only | Administration technique |

## Synthèse multi-modules (V5)

| Intent | Phrase type | Modules lus |
|--------|-------------|-------------|
| `farm_overview` | Comment va la ferme ? | Élevage + Cultures + Stock + Commercial + Finance |
| `annual_outlook` | Vais-je atteindre mon objectif annuel ? | Objectifs + Commercial + Finance |
