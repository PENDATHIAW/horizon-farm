# Fiche audit · Finance & Pilotage

Entry point : `FinancePilotageModule.jsx` → `FinancePilotageRecoveredModule.jsx`.
Onglets réels : Résumé · Trésorerie · Créances & dettes · Pilotage · Graphiques.
**Non conforme à la cible** (Vue d'ensemble · Transactions · Trésorerie · Budget &
écarts · Coûts & marges · Investissements & dettes). 65 fichiers, **31 avec calcul
local** — le module le plus dense en calcul.

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Résumé | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 3/5 | **3,4/5** |
| Trésorerie | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Créances & dettes | 3/5 | 4/5 | 4/5 | 3/5 | 4/5 | 3/5 | **3,5/5** |
| Pilotage | 3/5 | 3/5 | 3/5 | 3/5 | n/a | 3/5 | **3,0/5** |
| Graphiques | 2/5 | 2/5 | 3/5 | 3/5 | n/a | 3/5 | **2,6/5** |

## Problèmes
- **Libellés non conformes** : « Graphiques », « Pilotage » ne sont pas des rôles
  d'onglet clairs pour un exploitant ; la cible parle de Budget & écarts, Coûts &
  marges, Investissements & dettes. Restructurer.
- **Reconnaissance financière (critique)** : vérifier les moments — dépense à la
  facture fournisseur, décaissement au paiement fournisseur, encaissement client
  **lu** depuis Commercial, dette = exigible − payé. Avec 31 fichiers de calcul
  local, le risque de double comptage CA/encaissé/trésorerie est réel (voir
  99_transverse §4).
- **Catalogue KPI** : les formules de coût/marge doivent vivre dans le catalogue
  KPI, pas dans les composants. Aujourd'hui `kpiEngine/financeKpis.js` centralise
  une partie, mais de nombreux panneaux recalculent — à consolider.
- **Objet de coût + justificatif** : vérifier que chaque dépense porte un objet de
  coût (lot/animal/parcelle/équipement/activité/frais généraux) et exige un
  justificatif au-dessus du seuil de la ferme (`farm_cost_settings`).
- **Éditabilité** : seuils dans `farm_cost_settings` (bon) mais onglets/libellés
  encore en dur dans le composant.

## Corrections prioritaires
1. Restructurer vers la cible 6 onglets.
2. Test de non double comptage (Accueil = module source = rapport).
3. Migrer toutes les formules de coût vers le catalogue KPI.
