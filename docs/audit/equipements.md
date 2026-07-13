# Fiche audit · Équipements

Entry point : `EquipementsV3.jsx`. Onglets réels : Équipements · Maintenance ·
Pannes · Coûts · Disponibilité. **Proche de la cible** (Parc · Acquisitions ·
Pannes · Réparations · Coûts & disponibilité).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Équipements (Parc) | 4/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,7/5** |
| Maintenance | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 3/5 | **3,2/5** |
| Pannes | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Coûts | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 3/5 | **3,4/5** |
| Disponibilité | 3/5 | 4/5 | 4/5 | 3/5 | n/a | 4/5 | **3,6/5** |

## Points à vérifier
- **Acquisition = une seule dépense** : Finance possède la dépense, Équipements la
  fiche actif. Vérifier qu'une acquisition ne crée pas une dépense en double.
- **Panne critique** crée alerte + tâche ; remise en service exige validation —
  bon socle (onglet Pannes). Vérifier le lien alerte→tâche (`alert_id`).
- **Coût de réparation lu depuis Finance** par rattachement, aucune somme locale —
  à confirmer (onglet Coûts).
- **Alerte de garantie** : reportée (chantier 6) — vérifier absence.
- Manque d'onglets Acquisitions/Réparations distincts (fusionnés dans
  Maintenance/Coûts).

## Corrections prioritaires
1. Aligner les libellés sur la cible (Parc, Acquisitions, Réparations).
2. Confirmer par test : acquisition = 1 dépense ; coût réparation lu de Finance.
