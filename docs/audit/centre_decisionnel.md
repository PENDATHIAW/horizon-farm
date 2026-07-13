# Fiche audit · Centre décisionnel

Entry point : `CentreIA.jsx` → `centre/CentreDecisionModule.jsx`. Onglets réels :
À traiter · Écarts · Risques · Décisions · Historique. **Restructuré vers la cible
(chantier 3).**

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| À traiter | 4/5 | 4/5 | 4/5 | 4/5 | n/a | 4/5 | **4,0/5** |
| Écarts | 4/5 | 4/5 | 4/5 | 4/5 | n/a | 5/5 | **4,2/5** |
| Risques | 4/5 | 5/5 | 4/5 | 4/5 | n/a | 5/5 | **4,4/5** |
| Décisions | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | 3/5 | **3,3/5** |
| Historique | 4/5 | 4/5 | 5/5 | 5/5 | n/a | 5/5 | **4,4/5** |

## Points forts (chantier 3)
- **Risques** (`centre/CentreCibleTabs.jsx`) : registre **dérivé** des six risques
  structurels (sanitaire, aliment, eau, commercial, trésorerie, exécution), statut
  calculé depuis alertes/tâches/KPI, aucune fiche ni probabilité manuelle.
  Conforme au cahier.
- **Écarts** : lecture de `buildFinancialPlanVsActual` (Finance/Objectifs), jamais
  recalculé ici. Conforme.
- **Historique** : `uniques/JournalEvenements`. Conforme.

## Problèmes
- **Décisions** : l'onglet rend `CentreCroissanceTab` (recommandations de
  croissance) plutôt qu'une **fiche décision complète** (problème, options, choix,
  justification, responsable, échéance, indicateur de résultat) avec clôture
  impossible sans résultat mesuré. **Écart fonctionnel** : la vraie gestion des
  décisions n'est pas encore là.
- **Alertes** : 18 fichiers du dossier `centre/`+`vision/` appellent
  `onCreateAlert` — le Centre est le hub qui pousse vers la table centrale
  `alertes_center` (acceptable), mais vérifier qu'aucune table d'alertes locale
  n'existe (aucune détectée).
- **Compréhensibilité** : plusieurs panneaux `vision/*` gardent « IA »/tiret long à
  migrer.

## Corrections prioritaires
1. Onglet Décisions = vraie fiche décision avec clôture sur résultat mesuré ;
   ouvrir les simulations d'Objectifs par lien (pas de simulation locale).
2. Migrer les libellés `vision/*` au dictionnaire.
