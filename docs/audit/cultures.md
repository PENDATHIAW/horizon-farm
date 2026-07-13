# Fiche audit · Cultures

Entry point : `CulturesRecoveredModule.jsx`. Onglets réels : Parcelles & campagnes
· Récoltes · Économie circulaire. **Non conforme à la cible** (7 onglets :
Parcelles · Campagnes · Irrigation · Intrants & fertilisation · Récoltes · Coûts &
marge · Historique).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Parcelles & campagnes | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,5/5** |
| Récoltes | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Économie circulaire | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 4/5 | **3,3/5** |

## Points
- **Récolte** : `src/utils/cultureWorkflows.js` gère la création de campagne
  (calendrier, budget, tâches) et la récolte. La cible impose que la récolte crée
  l'entrée de stock et calcule rendement + coût au kg sans saisie supplémentaire —
  à vérifier que l'onglet Récoltes le fait automatiquement.
- **Qualité de récolte** : doit être une liste fermée (conforme / déclassé / perte).
  À vérifier qu'elle est en référentiel et non en champ libre.
- **Économie circulaire** : matière organique suspecte ne doit pas être affectée à
  une parcelle — vérifier le garde-fou (lien Élevage → effluents → Cultures).
- **Structure** : Irrigation et Intrants & fertilisation n'ont pas d'onglet dédié
  alors que le contrat des 20 s les cite comme saisies (irrigation, semis).

## Corrections prioritaires
1. Restructurer vers 7 onglets ; Historique = `JournalEvenements` filtré parcelle.
2. Qualité de récolte en référentiel fermé.
3. Garde-fou matière organique suspecte → parcelle.
