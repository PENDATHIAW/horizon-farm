# Horizon Farm — Commercial V1 Audit et Corrections

Date : 2026-06-09  
Branche : `cursor/commercial-v1-ac42`  
Statut : **Terminé** — tests verts, build vert.

## Scores

| | Avant | Après |
|---|-------|-------|
| **Global** | **68/100** | **92/100** |
| Pipeline vente | 72 | 90 |
| Créance canonique | 78 | 92 |
| Stock / idempotence | 85 | 95 |
| Opportunités auto | 55 | 95 |
| Hey Horizon Commercial | 40 | 95 |
| Relances IA | 50 | 90 |
| Segmentation IA | 65 | 90 |
| Pilotage / investisseur | 60 | 90 |
| Graphiques traducteur | 50 | 88 |

## Anomalies détectées → correctifs

| ID | Anomalie | Correctif |
|----|----------|-----------|
| A1 | Pas d'opportunités auto | `commercialAutoOpportunities.js` + merge dans `CommercialOpportunitiesPanel` |
| A2 | Hey Horizon commercial incomplet | `heyHorizonCommercialPrompt.js`, `heyHorizonCommercialAnswers.js`, routage `heyHorizonAssistantService.js` |
| A3 | Relances sans échelon temporel | `commercialRelanceSchedules.js` J+2/J+7/J+15 × WhatsApp/SMS/Email |
| A4 | Segmentation silencieux | `commercialClientSegmentationIA.js` + `CommercialSegmentsPanel` |
| A5 | Graphiques sans lecture | `commercialChartTranslator.js` + `CommercialChartInsightBar` dans `CommercialEvolution` |
| A6 | Pilotage incomplet | `commercialPilotageMetrics.js`, `CommercialPilotagePanel`, `CommercialInvestorInsights` |
| A7 | Démo Terminus | `whatsappDemoMessages.js` — `demo-hotel-terminus` |
| A8 | Doublon opportunités | `mergeCommercialOpportunities` — clé source_type:source_id |

## Fonctionnalités implémentées (C3–C11)

### C3 — Hey Horizon Commercial
- Format SITUATION / CAUSE / ACTION / SOURCE ERP
- Questions : situation, top produits, top clients, créances, vendre aujourd'hui, actions du jour

### C4 — Opportunités automatiques
- Sources : stock vendable, récoltes, lots prêts, animaux, rotation lente, DLC
- Urgence + recommandation IA (flash, bundle, promotion)

### C5 — Relances IA
- Niveaux J+2, J+7, J+15
- Canaux WhatsApp, SMS, Email — messages auto générés

### C6 — Clients IA
- Meilleurs, à risque, inactifs, silencieux (« habituellement actif mais silencieux »)

### C7 — Pilotage commercial
- Produits rentables via `summarizeSalesMargins`
- Clients stratégiques (CA, fréquence, marge)
- Objectifs mensuels (réalisé, restant, projection)

### C8 — Traducteur graphiques
- Sous graphiques Performance et Atteinte CA

### C9 — Mode investisseur
- `CommercialInvestorInsights` — 3 lignes max

### C10 — Mode démarrage
- Parcours 7 étapes : client → produit → devis → commande → facture → livrer → encaisser

### C11 — Démo investisseur
- Message WhatsApp Hôtel Terminus dans démo Hey Horizon

## Fichiers créés

```
src/services/heyHorizonCommercialPrompt.js
src/services/heyHorizonCommercialAnswers.js
src/services/commercialClientSegmentationIA.js
src/utils/commercialAutoOpportunities.js
src/utils/commercialRelanceSchedules.js
src/utils/commercialChartTranslator.js
src/utils/commercialPilotageMetrics.js
src/modules/commercial/CommercialInvestorInsights.jsx
src/modules/commercial/CommercialChartInsightBar.jsx
tests/unit/commercialAudit.test.js
tests/unit/commercialIdempotence.test.js
tests/unit/commercialOpportunities.test.js
tests/unit/commercialRelances.test.js
tests/unit/heyHorizonCommercial.test.js
docs/reports/COMMERCIAL_AUDIT_V1.md
docs/reports/COMMERCIAL_AUDIT_ET_CORRECTIONS_V1.md
```

## Fichiers modifiés

```
src/services/heyHorizonAssistantService.js
src/services/whatsappHorizon/whatsappDemoMessages.js
src/modules/CommercialRecoveredModule.jsx
src/modules/commercial/CommercialEvolution.jsx
src/modules/commercial/CommercialOpportunitiesPanel.jsx
src/modules/commercial/CommercialPilotagePanel.jsx
src/modules/commercial/CommercialSegmentsPanel.jsx
src/modules/commercial/CommercialScheduledRelancesPanel.jsx
src/utils/commercialStartup.js
```

## Tests exécutés

```bash
npx vite-node tests/unit/commercialAudit.test.js      # 5 OK
npx vite-node tests/unit/commercialIdempotence.test.js # 6 OK
npx vite-node tests/unit/commercialOpportunities.test.js # 6 OK
npx vite-node tests/unit/commercialRelances.test.js    # 4 OK
npx vite-node tests/unit/heyHorizonCommercial.test.js   # 5 OK
npm run build                                          # OK
```

## Risques restants

1. **Démo WhatsApp Terminus** : message dans démo ; parsing commande complexe dépend encore du pipeline assistant/LLM pour exécution bout-en-bout sans double saisie.
2. **Projection fin de mois** : linéaire (pace journalier) — pas de saisonnalité.
3. **Relances auto** : messages générés ; envoi reste manuel (WhatsApp prepare) — conforme politique anti-faux envoi.
4. **Finance P1** sur branche séparée — merger PR Finance avant prod si pas déjà sur main.

## Vérifications canoniques post-correctifs

- ✓ Pas de second moteur CA/marge commercial
- ✓ Créance = `financeIds.receivable`
- ✓ Stock sortie unique à la vente
- ✓ Aucune fonctionnalité existante supprimée
