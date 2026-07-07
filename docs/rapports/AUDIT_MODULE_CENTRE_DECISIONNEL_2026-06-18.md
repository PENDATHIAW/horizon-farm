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
node --test tests/unit/centreDecisionTabs.test.js tests/unit/centreObjectifsWorkflow.test.js tests/unit/centreContentUtils.test.js
```

---

## 9. Passe complète financeur (2026-06-18)

| # | Correctif |
|---|-----------|
| D1 | Suppression orphelins `CentreHistoriqueTab`, `PilotageContextStrip`, `StrategicQuickActionsInterconnected` |
| D2 | `PILOTAGE_NAV_TARGETS.centre_ia` → `Urgences & risques` |
| D3 | Export CSV défaut + colonne Destination alignés |
| D4 | Code mort `TAB_IDS` retiré de `CentreDecisionModule` |

Formulaires : `PilotageSettingsPanel` (seuils, fêtes) — Valider/Réinitialiser fonctionnels. Sync alertes **manuelle** (volontaire).

