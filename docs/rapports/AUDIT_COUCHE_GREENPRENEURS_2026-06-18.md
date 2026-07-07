# Rapport — Couche Greenpreneurs DER/FJ

**Date :** 2026-06-18  
**Branche :** `cursor/greenpreneurs-layer-ac42`  
**Objectif :** Renforcer l'ERP existant pour la demande DER/FJ Greenpreneurs sans créer un module de navigation séparé.

## Livrables

### Configuration
- `src/config/derfjGreenpreneurs.config.js` — profil DER/FJ 2026 (référence, n'écrase pas le BP officiel)

### Services
| Fichier | Rôle |
|---------|------|
| `greenpreneursMetrics.js` | Normalisation dataMap, agrégation, alertes Centre |
| `greenpreneursReadinessScore.js` | Score DER/FJ /100 (5 critères) |
| `circularEconomyMetrics.js` | KPI fientes, fumier, fertilisation, coproduits |
| `valorisationReadinessEngine.js` | Diagnostic data-driven Tallow & Go / BOVINIA |

### Composants
| Fichier | Rôle |
|---------|------|
| `GreenpreneursReadinessCard.jsx` | Carte score + forces / lacunes / actions |
| `CircularEconomyKpiPanel.jsx` | Panneau boucle élevage-cultures |
| `ValorisationPhaseAdvisor.jsx` | Phases 2 & 3 sans date arbitraire |

## Intégrations

| Module | Emplacement |
|--------|-------------|
| Documents & Rapports | Centre de contrôle (carte compacte), Rapports & exports (score + circularité + feuille de route) |
| Investisseurs & Forums | Onglet Préparation + note feuille de route progressive |
| Centre décisionnel | Urgences — alertes DER/FJ & économie circulaire |
| Objectifs & Croissance | Suivi BP — advisor phases + KPI circularité prévu/réalisé |
| Cultures | Économie circulaire — panneau KPI + fumier existant |
| Export financeur | `FinancingDossierGenerator` — annexe Greenpreneurs DER + correction `exportPdf` |

## Règles respectées

- Pas de nouveau module navigation « DER/FJ »
- Badges source : Simulation / ERP réel selon données
- Tallow & Go et BOVINIA : conditions data-driven, pas de date fixe
- BP et données simulées existantes préservés

## Correction technique

- `exportPdf(summary, draft, options = {})` — signature sécurisée pour `options.proofs` et `options.checklist`

## Tests

- `tests/unit/greenpreneursLayer.test.js` — scoring, circularité, valorisation, alertes

## Vérification

```bash
node --test tests/unit/greenpreneursLayer.test.js
```
