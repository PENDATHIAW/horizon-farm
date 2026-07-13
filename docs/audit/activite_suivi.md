# Fiche audit · Activité & Suivi

Entry point : `ActiviteSuiviModule.jsx` → `ActiviteSuiviRecoveredModule.jsx`.
Onglets réels : Cockpit & décisions · À traiter maintenant · Registre &
traçabilité · Performance & analytique. **Non conforme à la cible** (À faire ·
Calendrier · Alertes liées · Journal d'exploitation · Historique).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Cockpit & décisions | 3/5 | 3/5 | 4/5 | 3/5 | n/a | 3/5 | **3,2/5** |
| À traiter maintenant | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Registre & traçabilité | 4/5 | 4/5 | 4/5 | 3/5 | n/a | 4/5 | **3,8/5** |
| Performance & analytique | 2/5 | 2/5 | 4/5 | 3/5 | n/a | 3/5 | **2,8/5** |

## Problèmes
- **Chevauchement avec le Centre décisionnel** : « Cockpit & décisions » recoupe le
  Centre (décisions). Le cahier réserve les décisions au Centre décisionnel et
  les tâches/calendrier à Activité & Suivi. **Écart de propriété** à corriger.
- **Structure** : pas d'onglet Calendrier ni Alertes liées distincts ; le « Journal
  d'exploitation » devrait être le composant `JournalEvenements` sans table
  parallèle — à brancher.
- **Actions correctives** : doivent être un **filtre des tâches avec `alert_id`**
  (`ListeTaches({actionsCorrectives:true})`), pas une entité séparée. Le composant
  unique le supporte ; vérifier l'adoption ici.
- **Tâche critique** : non clôturable sans résultat (et preuve si exigée) — à
  vérifier dans le workflow de clôture.
- **Pas de réaffectation automatique** en cas d'absence : une alerte « tâche sans
  ressource » suffit — à vérifier.

## Corrections prioritaires
1. Restructurer vers 5 onglets ; Journal = `JournalEvenements`, À faire =
   `ListeTaches`, Alertes liées = `ListeAlertes`.
2. Retirer la gestion de décisions ici (propriété Centre décisionnel).
