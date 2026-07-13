# Fiche audit · Assistant

Entry point : `AssistantERPV2.jsx` (flag `assistant_erp`). Onglets réels : Hey
Horizon · Questions métier · Aide à la décision · Recherche dans les données.
**Non conforme à la cible** (un seul écran Conversation avec bloc Suggestions).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Hey Horizon | 3/5 | 4/5 | 3/5 | 3/5 | n/a | 4/5 | **3,4/5** |
| Questions métier | 3/5 | 3/5 | 3/5 | 3/5 | n/a | 4/5 | **3,2/5** |
| Aide à la décision | 2/5 | 3/5 | 3/5 | 3/5 | n/a | 4/5 | **3,0/5** |
| Recherche dans les données | 3/5 | 3/5 | 3/5 | 3/5 | n/a | 4/5 | **3,2/5** |

## Problèmes
- **Structure** : la cible impose **un seul écran Conversation** avec bloc
  Suggestions intégré ; supprimer Sources et Questions fréquentes (chaque réponse
  chiffrée cite déjà sa provenance « D'après {module}, {période} »). Ici 4 onglets.
- **Nom « IA »** : le module s'appelle Assistant (bon), mais des libellés internes
  (« Hey Horizon », panneaux d'analyse) et des prompts (`heyHorizon*Prompt.js`)
  contiennent encore des références à migrer ; les fonctions doivent s'appeler
  Suggestions/Analyse/Explication à l'écran.
- **Lecture seule** : vérifier qu'aucune écriture métier n'est possible depuis
  l'Assistant (`aiSafetyGuard.js` bloque les handlers d'écriture — bon socle).
- **Droits** : réponses filtrées par les droits réels de l'utilisateur — à vérifier.

## Corrections prioritaires
1. Réduire à un écran Conversation + Suggestions ; citation en ligne de la source.
2. Confirmer lecture seule par test (aucune écriture métier).
