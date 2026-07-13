# Fiche audit · Financements (flag)

Entry point : `FinancementsModule.jsx` (flag `financements`). Onglets réels :
Tableau de bord · Opportunités · Contacts · Dossiers & pièces · Fonds &
justificatifs · Espace Financeurs. **Non conforme à la cible** (deux faces
étanches : Cockpit 8 onglets + Espace Financeurs 5 onglets en lecture seule).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Tableau de bord | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 4/5 | **3,5/5** |
| Opportunités | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,5/5** |
| Contacts | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,3/5** |
| Dossiers & pièces | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,5/5** |
| Fonds & justificatifs | 4/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,7/5** |
| Espace Financeurs | 4/5 | 5/5 | 4/5 | 4/5 | n/a | 5/5 | **4,3/5** |

## Points (module refactoré récemment, tables `funding_*`/`funder_*` avec RLS ferme)
- **Deux faces étanches** : Cockpit (interne) et Espace Financeurs (rôle
  `financeur_externe`, lecture seule). L'Espace Financeurs est le mieux isolé
  (RLS par ferme, `funder_access_logs`). Bon.
- **Écart cible** : le Cockpit devrait avoir 8 onglets (Tableau de bord ·
  Opportunités · Contacts & échanges · Candidatures · Pièces du dossier · Fonds &
  utilisation · Publications · Accès externes) et l'Espace 5 (Vue d'ensemble ·
  Rapports · Journal du projet · Documents partagés · Contact). Aujourd'hui 6
  onglets mélangés.
- **Dépense rattachée à convention + ligne budgétaire, jamais ressaisie** :
  `funding_expense_allocations` — vérifier que le montant affecté ≤ dépense.
- **Privé par défaut, publié par action ; rapport publié immuable ; révocation
  immédiate et auditée** : socle présent (`funder_access_logs`), à prouver par test.
- **Notes internes et noms de clients ne sortent jamais** : point critique de
  confidentialité à vérifier.
- **Mode démonstration isolé** : données fictives sans partage de stockage avec les
  pièces réelles — `demo` tab présent, à vérifier l'isolation.

## Corrections prioritaires
1. Séparer proprement les deux faces et compléter les onglets cibles.
2. Tests : immuabilité rapport publié, révocation d'accès, non-fuite noms clients.
