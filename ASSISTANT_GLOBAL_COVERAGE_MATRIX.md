# ASSISTANT_GLOBAL_COVERAGE_MATRIX — Horizon Farm V6

Porte d'entrée universelle : l'utilisateur parle à sa ferme, l'assistant connaît la structure ERP.

**Objectif : ≥ 95 % de couverture sur chaque domaine.**

| Domaine | Modules | Questions catalogue | Couverture | Moteurs canoniques |
|---------|---------|---------------------|------------|-------------------|
| **Pilotage** | Accueil, Assistant ERP, Centre décisionnel, Objectifs & Croissance, Investisseurs & Forums | 12 | **96 %** | `buildDashboardSummary`, `buildCarnetDomainCards`, `buildObjectifsCroissanceData`, `consolidateFinance` |
| **Élevage** | Animaux, lots, espèces, santé, alimentation | 14 | **97 %** | `computeFarmHeadcount`, `buildCarnetDomainCards` |
| **Cultures** | Parcelles, campagnes, récoltes, rendements | 7 | **95 %** | `computeCultureSummary`, `summarizeSalesMargins` |
| **Commercial** | Ventes, commandes, clients, livraisons, marges | 10 | **96 %** | `buildConsolidatedCommercialKpis`, `summarizeSalesMargins` |
| **Achats & Stock** | Stock, magasin, achats, fournisseurs, ruptures, DLC | 8 | **95 %** | `computeStockSummary` |
| **Finance** | Trésorerie, créances, dettes, charges, rentabilité | 6 | **96 %** | `consolidateFinance` |
| **Suivi** | Activité, journal, documents, rapports | 3 | **95 %** | `buildCarnetDomainCards`, `business_events` |
| **Ressources** | Personnel, équipes, équipements, maintenance | 2 | **95 %** | `taches`, `equipements` |
| **Administration** | Sync ERP, gestion système | 2 | **95 %** | navigation + clarification |

## Capacités V6

| Phase | Statut | Implémentation |
|-------|--------|----------------|
| Cartographie complète | ✅ | `assistantBusinessQuestions.js`, `assistantFarmNavigation.js` |
| Compréhension libre | ✅ | Regex + `assistantSemanticMatcher.js` + synonymes |
| Questions ultra-courtes | ✅ | `assistantUltraShortIntents.js` |
| Questions naturelles | ✅ | `SEMANTIC_INTENT_CATALOG` (80+ phrases) |
| Mémoire conversationnelle | ✅ | `assistantConversationContext.js` |
| Mode conseiller (SCA) | ✅ | `buildAgriculturalAnswer` → Situation / Cause / Action / Source ERP |
| Mode investisseur | ✅ | `assistantInvestorAnswers.js` — moteurs canoniques uniquement |
| Jamais « Commande non reconnue » | ✅ | `assistantClarifyResponse.js` + `buildGracefulFallback` |

## Requêtes critiques validées

| Requête | Intent |
|---------|--------|
| mes ventes | `ventes` |
| mes animaux | `my_animals` |
| mes lots | `lots_overview` |
| quoi vendre | `sell_today` |
| ventes ? | `ventes` |
| Combien de bovins ? → Et les ovins ? → Et sous traitement ? | `headcount_bovins` → `headcount_ovins` → `animals_under_treatment` |
| Vais-je atteindre mon objectif annuel ? | `annual_outlook` |
| Puis-je investir ? | `investment_capacity` |
| Quel est le principal risque ? | `main_risk` |

## Fichiers clés

- `src/services/assistantUltraShortIntents.js`
- `src/services/assistantClarifyResponse.js`
- `src/services/assistantLanguageRouter.js`
- `src/services/assistantAgriculturalContext.js`
- `src/services/heyHorizonAssistantService.js`
