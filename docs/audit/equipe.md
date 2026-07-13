# Fiche audit · Équipe (ex-RH)

Entry point : `RHV2.jsx` → `OperationsRessourcesRecoveredModule.jsx`. Onglets
réels : Cockpit RH & Maintenance · Personnel & Paie · Parc Matériel & Maintenance ·
Registres & Analyses. **Non conforme à la cible** (Vue d'ensemble · Membres ·
Affectations · Absences).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Cockpit RH & Maintenance | 2/5 | 2/5 | 3/5 | 3/5 | n/a | 2/5 | **2,4/5** |
| Personnel & Paie | 2/5 | 2/5 | 3/5 | 3/5 | 3/5 | 3/5 | **2,6/5** |
| Parc Matériel & Maintenance | 2/5 | 2/5 | 3/5 | 3/5 | n/a | 2/5 | **2,4/5** |
| Registres & Analyses | 2/5 | 2/5 | 3/5 | 3/5 | n/a | 3/5 | **2,6/5** |

## Problèmes (module le plus éloigné de la cible)
- **Mélange de propriété** : « Maintenance » et « Parc Matériel » relèvent
  d'Équipements, pas d'Équipe. Le module mêle RH et maintenance dans un même
  cockpit. **Écart de propriété majeur** : Équipe = employés uniquement.
- **Paie** : la cible impose une collecte minimale — **pas de paie**, pas de temps
  de présence, pas de données médicales visibles. L'onglet « Personnel & Paie »
  viole ce principe. À retirer/repenser.
- **Structure cible** : Vue d'ensemble · Membres · Affectations · Absences. Rôles
  opérationnels = champ « fonction » sur la fiche membre (pas un onglet). Une
  absence signale les tâches concernées sans les réaffecter.
- **Fiche employé distincte du compte utilisateur** (lien optionnel) — à vérifier
  (`farm_rh_directory` vs `profiles`).

## Corrections prioritaires
1. Restructurer vers 4 onglets Équipe ; sortir Maintenance/Parc vers Équipements.
2. Retirer la paie et toute donnée sensible (collecte minimale).
3. Absence → signalement des tâches sans réaffectation automatique.
