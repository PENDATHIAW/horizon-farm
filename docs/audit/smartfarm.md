# Fiche audit · Smart Farm (flag off par défaut)

Entry point : `SmartFarm.jsx` → `SmartFarmRecoveredModule.jsx` (flag `smartfarm`).
Onglets réels : Objets connectés · Flux temps réel · Automatisation. **Non conforme
à la cible** (Vue d'ensemble · Relevés d'eau · Énergie · Bâtiments · Dispositifs ·
Relevés & qualité · Configuration).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Objets connectés | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 3/5 | **3,2/5** |
| Flux temps réel | 2/5 | 2/5 | 4/5 | 3/5 | n/a | 3/5 | **2,8/5** |
| Automatisation | 2/5 | 2/5 | 3/5 | 3/5 | n/a | 3/5 | **2,6/5** |

## Problèmes
- **Structure** : 3 onglets contre 7 cibles ; manquent Relevés d'eau, Énergie,
  Bâtiments, Relevés & qualité, Configuration.
- **Aucun capteur/caméra fictif, aucune commande automatique** : l'onglet
  « Automatisation » et « Flux temps réel » suggèrent de la commande/temps réel —
  **à vérifier** qu'aucune commande automatique ni capteur fictif n'est simulé
  (`sensor_devices`, `camera_devices` ne doivent pas contenir de démo présentée
  comme réelle).
- **Valeur hors plage** : marquée suspecte, pas supprimée ; saisies manuelles
  valides et identifiables — à vérifier dans les relevés.
- **Heure réelle de mesure** conservée par relevé — à vérifier.

## Corrections prioritaires
1. Restructurer vers 7 onglets orientés relevés (eau, énergie, bâtiments).
2. Retirer toute automatisation/commande et tout capteur fictif.
3. Marquer les valeurs hors plage « suspectes » sans suppression.
