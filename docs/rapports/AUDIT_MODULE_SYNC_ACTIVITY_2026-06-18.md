# Audit module Activité & Sync ERP (`sync_activity`)

**Date :** 2026-06-18  
**État :** 3 onglets canoniques

---

## 1. Onglets canoniques

```
Vérifications | Connexion & envoi | Journal d'activité
```

Alias legacy : `Résumé`, `audit` → Vérifications ; `sync`, `offline` → Connexion & envoi ; `journal`, `audit_logs` → Journal.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs clés | Valider / Annuler |
|------------|---------|-------------|-------------------|
| Exception justifiée | `JustifiedExceptionModal.jsx` | Motif + note structurée | ✅ `markJustifiedException` |
| Réparation guidée | `SyncActivityCenter.jsx` | Boutons action (pas prompt) | ✅ MAJ vente / opportunité / document |
| Connexion / file offline | `Sync.jsx` | Boutons flush | ✅ |

Pas de `window.prompt` sur réparations interconnexions.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Audit interconnexions | `auditErpInterconnections` — ventes, paiements, stock, documents |
| Réparation vente | `sales_orders` + trace `business_events` |
| Réparation opportunité | `sales_opportunities` |
| Preuve manquante | `documents.create` |
| Lien gestion système | Exceptions → Audit système |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| Y1 | Haute | Pas de pilotage onglet depuis `App` | **Corrigé** — `syncActivityTab` + onglet brut |
| Y2 | Moyenne | Pas de `navigateSyncActivityTab` | **Corrigé** |
| Y3 | Moyenne | Alias `audit_logs` / `sync` non routés | **Corrigé** dans `navigateModule` |

---

## Vérification

```bash
node --test tests/unit/syncActivityTabsNavigation.test.js tests/unit/leadershipModulesNavigation.test.js
```
