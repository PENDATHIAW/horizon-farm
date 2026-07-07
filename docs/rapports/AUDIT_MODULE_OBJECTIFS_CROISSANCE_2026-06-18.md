# Audit module Objectifs & Croissance (`objectifs_croissance`)

**Date :** 2026-06-18  
**État :** structure **4 onglets** (Vision ERP 2026)

---

## 1. Onglets canoniques

```
Suivi du Business Plan | Efficacité Technique & Zootechnique | Simulateur Sandbox | Sécurisation des Flux
```

Entrée : `ObjectifsCroissanceV2.jsx` → `ObjectifsDecisionModule.jsx`

---

## 2. Formulaires

| Zone | Type | Statut |
|------|------|--------|
| Simulateur Sandbox (`npkPrice`, lancer campagne) | Input number + bouton | ✅ Crée culture + navigue ; erreur via `toast.error` |
| Autres onglets | Navigation / lecture | Analytique — pas de CRUD lourd |
| Props `onCreateBusinessPlan` App.jsx | — | Non consommées (fallback CRUD si besoin futur) |
| `BpWizard.jsx` | Wizard BP | Orphelin (non monté) — documenté |

---

## 3. Navigation (2026-06-18)

| # | Problème | Correctif |
|---|----------|-----------|
| O7 | `App.jsx` résolvait l’onglet à l’entrée | **Corrigé** — alias brut conservé (`Graphiques`, etc.) |
| O8 | `onTabChange` résolvait trop tôt | **Corrigé** — onglet brut remonté à `App` |

---

## 4. Correctifs passe complète (2026-06-18)

| # | Problème | Correctif |
|---|----------|-----------|
| O1 | `financeurs` → module Objectifs / tab `Financeurs` | → `investisseurs_forums` / `Résumé` |
| O2 | `financePilotageV2` investisseurs → Objectifs | → `investisseurs_forums` |
| O3 | Alias manquant `Objectifs & Écarts Zootechniques` | → Efficacité Technique |
| O4 | Hey Horizon objectifs tabs legacy | Tabs canoniques |
| O5 | `centreDecisionWorkflow` financeur | → investisseurs_forums |
| O6 | `navigateObjectifsTarget` résolvait tous les tabs via Objectifs | Résolution conditionnelle par module |

---

## 5. Fichiers orphelins (dette documentée)

`ObjectifsEcartsTab`, `CroissanceCapacitesTab`, `FluxEquilibresTab`, `MaraîchageDiversificationTab`, `ObjectifsActivitesPanel`, `ObjectifsCroissance.jsx`, `VisionCroissanceModule.jsx` — non montés.

---

## Vérification

```bash
node --test tests/unit/objectifsDecisionTabs.test.js tests/unit/objectifsFormsAudit.test.js tests/unit/centreObjectifsWorkflow.test.js
```
