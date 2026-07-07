# Audit module RH / Opérations & Ressources (`rh`)

**Date :** 2026-06-18  
**État :** 4 onglets (`OperationsRessourcesRecoveredModule` via `RHV2.jsx`)

---

## 1. Onglets canoniques

```
Cockpit RH & Maintenance | Personnel & Paie | Parc Matériel & Maintenance | Registres & Analyses
```

Alias : `Affectations` / `Coûts` → Personnel ; `Équipements` / `Maintenance` → Parc ; `Documents` / `Graphiques` → Registres.

---

## 2. Formulaires audités

| Formulaire | Fichier | Champs clés | Valider / Annuler |
|------------|---------|-------------|-------------------|
| Fiche RH | `RHPeopleTeams.jsx` | Rôle **select**, équipe **select**, modules checkboxes | ✅ Enregistrer / Fermer |
| Équipe | `RHPeopleTeams.jsx` | Type **select**, modules | ✅ |
| Paie | `RHPeopleTeams` / `RhPriorityPayments` | Confirmation bannière | ✅ `runRhPayrollSideEffects` → finance + document |
| Absence | `RHPeopleTeams` | Auto tâche | ✅ `buildRhAbsenceFollowUp` |
| Maintenance équipement | Cockpit → `createMaintenanceTask` | Tâche auto | ✅ |
| Parc matériel | `ParcMaterielMaintTab` | CRUD équipements | ✅ |

Pas de `window.prompt`.

---

## 3. Interconnexions vérifiées

| Flux | Cible |
|------|-------|
| Paie RH | `finances`, `documents`, `business_events` |
| Absence | `taches`, `business_events` |
| Maintenance | `taches`, `equipements` |
| Smart Farm | Navigation `smartfarm` depuis Parc |
| Coûts RH | `RHCostCenterPanel` + Finance |

---

## 4. Écarts corrigés

| # | Gravité | Description | Statut |
|---|---------|-------------|--------|
| R1 | Haute | Alias `Équipements` / `Affectations` perdus à l’entrée module | **Corrigé** — onglet brut App.jsx |
| R2 | Moyenne | Pas de `navigateRhTab` | **Corrigé** |
| R3 | Moyenne | `navigationOptionsForFinding` sans rh | **Corrigé** |
| R4 | Info | Annuaire RH local (`rhDirectory`) + sync event | Documenté |

---

## Vérification

```bash
node --test tests/unit/rhTabsNavigation.test.js
node --test tests/unit/rhNavigationAudit.test.js
```
