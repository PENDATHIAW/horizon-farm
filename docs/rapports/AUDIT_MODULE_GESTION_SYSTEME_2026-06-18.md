# Audit module Gestion système (`gestion_systeme`)

**Date :** 2026-06-18  
**État :** 8 onglets admin

---

## 1. Onglets canoniques

```
Vue admin | Utilisateurs | Fermes | Paramètres | Sécurité | Sauvegardes | Réinitialisation | Audit
```

Alias legacy : `Résumé` → Vue admin ; `settings` → Paramètres ; `audit` → Audit.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs clés | Valider / Annuler |
|------------|---------|-------------|-------------------|
| Fermes multi-site | `FarmsManagementPanel.jsx` | Nom, code, statut | ✅ CRUD ferme |
| Réinitialisation données | `GestionSystemeUnified.jsx` | Confirmation explicite (pas prompt libre) | ✅ `canPerformSystemAction` |
| Exceptions justifiées | `JustifiedExceptionsAuditPanel.jsx` | Modal structurée | ✅ |
| Mode données simulées | Paramètres | Toggle | ✅ `setSimulatedDataMode` |

Pas de `window.prompt` sur actions destructives montées.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Audit Vision modules | `VisionModuleAuditPanel` → navigation modules |
| Findings IA système | Création tâche / alerte |
| Sync / exceptions | Lien vers journal justified exceptions |
| Carnet dirigeant | Paramètres ferme |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| G1 | Moyenne | `resolveGestionSystemeTab` absent | **Corrigé** |
| G2 | Moyenne | `onTabChange` sans alias brut | **Corrigé** — `navigateGestionSystemeTab` |

---

## Vérification

```bash
node --test tests/unit/leadershipModulesNavigation.test.js
```
