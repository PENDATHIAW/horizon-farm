# Audit module Investisseurs & Forums (`investisseurs_forums`)

**Date :** 2026-06-18  
**État :** 9 onglets (Investor Room, Préparation, Dossier, Data Room, CRM, Aperçu, Exports, Historique, Démo)

---

## 1. Onglets canoniques

```
room | preparation | dossier | library | crm | preview | export | history | demo
```

Alias legacy : `Préparation`, `Résumé` → room ; `Data Room` → library ; `Financeurs` → preparation.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs clés | Valider / Annuler |
|------------|---------|-------------|-------------------|
| Profil investisseur (édition) | `InvestisseursForumsModule.jsx` | Textareas / inputs structurés | ✅ `saveInvestorForumProfile` |
| Statut dossier | idem | **select** `DOSSIER_STATUS_OPTIONS` | ✅ |
| Audience export | idem | Boutons audience (pas prompt) | ✅ |
| CRM contacts | `InvestorCrmPanel.jsx` | CRUD inline | ✅ |
| Data Room | `InvestorDossierLibrary.jsx` | Upload document | ✅ |

Pas de `window.prompt` sur flux métier.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Readiness Greenpreneurs | `GreenpreneursReadinessCard` → Préparation |
| Profil auto | Agrégation `dataMap` (finances, ventes, cultures, BP) |
| Export PDF | `forumPackBuilder` + historique local |
| Navigation Vision / Accueil | `investisseurs_forums` / `Préparation` |
| Documents | `onCreateDocument` pour pièces jointes |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| I1 | Haute | `App.jsx` résolvait l’onglet à l’entrée (perte alias `Préparation`) | **Corrigé** — onglet brut conservé |
| I2 | Moyenne | Pas de `navigateInvestisseursTab` | **Corrigé** |
| I3 | Moyenne | `INVESTISSEURS_TAB_ALIASES` incomplet | **Corrigé** |

---

## Vérification

```bash
node --test tests/unit/leadershipModulesNavigation.test.js
```
