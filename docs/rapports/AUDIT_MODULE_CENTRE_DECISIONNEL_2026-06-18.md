# Audit module Centre décisionnel (`centre_ia`)

**Date :** 2026-06-18  
**État :** mergé sur `main` (structure **3 onglets**)

## Onglets canoniques

```
Urgences & risques | Croissance & opportunités | Saisons & marchés
```

| Onglet | Composant |
|--------|-----------|
| Urgences & risques | `CentreUrgencesTab` |
| Croissance & opportunités | `CentreCroissanceTab` |
| Saisons & marchés | `CentreSaisonsTab` |

## Correctifs mergés

- `resolveCentreTab` / `navigateCentreTab` dans `commercialNavigation.js` (alias legacy → 3 onglets)
- Sync alertes stratégiques **manuelle** uniquement (bouton dans paramètres pilotage)
- KPIs VisionPrioritiesTab : Créances → Commercial ; Opportunités → Commercial
- Accueil pilotage : Rentabilité lots → Objectifs ; Flux & stocks → Centre Urgences
- Suppression `CentreOpportunitesTab.jsx` (orphelin)
- Hey Horizon déjà branché dans l'en-tête (`onOpenAssistant`)

## Vérification

```bash
node --test tests/unit/centreDecisionTabs.test.js tests/unit/centreObjectifsWorkflow.test.js
```
