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
| Simulateur Sandbox (`npkPrice`, lancer campagne) | Input + bouton | ✅ Crée culture + navigue |
| Autres onglets | Navigation / lecture | Analytique — pas de CRUD lourd |
| Props `onCreateBusinessPlan` App.jsx | — | Non consommées (fallback CRUD si besoin futur) |

---

## 3. Correctifs passe complète (2026-06-18)

| # | Problème | Correctif |
|---|----------|-----------|
| O1 | `financeurs` → module Objectifs / tab `Financeurs` | → `investisseurs_forums` / `Résumé` |
| O2 | `financePilotageV2` investisseurs → Objectifs | → `investisseurs_forums` |
| O3 | Alias manquant `Objectifs & Écarts Zootechniques` | → Efficacité Technique |
| O4 | Hey Horizon objectifs tabs legacy | Tabs canoniques |
| O5 | `centreDecisionWorkflow` financeur | → investisseurs_forums |
| O6 | `navigateObjectifsTarget` résolvait tous les tabs via Objectifs | Résolution conditionnelle par module |

---

## 4. Fichiers orphelins (dette documentée)

`ObjectifsEcartsTab`, `CroissanceCapacitesTab`, `FluxEquilibresTab`, `MaraîchageDiversificationTab`, `ObjectifsActivitesPanel`, `ObjectifsCroissance.jsx`, `VisionCroissanceModule.jsx` — non montés.

---

## Vérification

```bash
node --test tests/unit/objectifsDecisionTabs.test.js tests/unit/centreObjectifsWorkflow.test.js
```
