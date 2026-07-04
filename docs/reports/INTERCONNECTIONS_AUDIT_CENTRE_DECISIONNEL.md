# Audit interconnexions — Centre décisionnel

## Statut

Centre décisionnel audité sur les interconnexions réelles : données, navigation, tâches, alertes et actions rapides.

## Interconnexions confirmées

- Centre décisionnel reçoit les données : élevage, avicole, cultures, stock, clients, ventes, paiements, finances, opportunités, alertes, tâches, documents, météo, capteurs et caméras.
- Centre décisionnel peut créer des tâches et alertes via Activité & Suivi.
- Centre décisionnel peut ouvrir Hey Horizon.
- Centre décisionnel peut naviguer vers Objectifs & Croissance, Commercial, Achats & Stock, Finance & Pilotage, Élevage.

## Corrections appliquées

1. Définition stratégique des interconnexions complétée dans `src/config/horizonVision.config.js`.
2. Recommandations commerciales redirigées vers `Commercial > Pilotage`.
3. En-tête Centre décisionnel clarifié.
4. Boutons `Exporter Excel` et `Exporter CSV` clarifiés.
5. Bouton `Synchroniser alertes critiques` clarifié.
6. Ajout d'une carte stratégique interconnectée pour normaliser les modules cibles avant création de tâche/alerte.
7. `VisionCyclesTab` utilise désormais `StrategicDecisionCardInterconnected`.

## Point fragile restant

Navigation fine vers `Élevage > Lots & bandes > sous-vue Animaux / Avicole`.

Le Centre décisionnel envoie bien `tab: Animaux` ou `tab: Avicole`, mais `App.jsx` résout aujourd'hui ces valeurs vers l'onglet canonique `Lots & bandes`. La sous-vue peut donc être perdue selon le chemin de navigation.

Correction recommandée au passage du module Élevage : préserver une intention de sous-vue `animaux` ou `avicole` dans `App.jsx` ou dans `ElevageRecoveredModule.jsx`.

## Verdict

Centre décisionnel : interconnexions globales correctes après corrections.

Reste à traiter plus finement au module Élevage : sous-vues Animaux / Avicole.
