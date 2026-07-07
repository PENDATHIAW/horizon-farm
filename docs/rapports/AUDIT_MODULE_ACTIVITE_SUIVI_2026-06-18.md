# Audit module Activité & suivi (`activite_suivi`)

**Date :** 2026-06-18  
**État :** 4 onglets canoniques

---

## 1. Onglets canoniques

```
Cockpit & décisions | À traiter maintenant | Registre & traçabilité | Performance & analytique
```

Alias : `Alertes` / `Tâches` → À traiter ; `Traçabilité` → Registre ; `Graphiques` / `Pilotage` → Performance.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs | Valider / Annuler |
|------------|---------|--------|-------------------|
| Tâches terrain | `TachesV3.jsx` (via onglet À traiter) | Modèle, responsable RH **select**, entity_linked | ✅ CRUD + builders `taskForms.js` |
| Alertes | `AlertesCenterV3.jsx` | Statut, priorité **select** | ✅ |
| Résolution alerte | Cockpit → `createAlertResolutionTask` | Tâche auto | ✅ |
| Traçabilité | `RegistreTracabiliteTab` | Lecture + filtres | N/A création directe |

Pas de `window.prompt`.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Finding IA | `applyOneClickRecommendation` → tâche/alerte ou onglet À traiter |
| Alerte → tâche | `createAlertResolutionTask` |
| Module breakdown | Liens Commercial, Élevage, Cultures, Finance |
| Traçabilité | `business_events`, ventes, santé, récoltes |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| A1 | Haute | Navigation externe `Alertes` / `Tâches` — alias brut perdu dans App | **Corrigé** |
| A2 | Moyenne | Pas de `navigateActiviteSuiviTab` | **Corrigé** |
| A3 | Moyenne | `navigationOptionsForFinding` sans activite_suivi | **Corrigé** |
| A4 | Info | `pendingTab` pattern pour onglet contrôlé | Conservé |

---

## Vérification

```bash
node --test tests/unit/activiteSuiviTabsNavigation.test.js
node --test tests/unit/activiteSuiviWorkflow.test.js
```
