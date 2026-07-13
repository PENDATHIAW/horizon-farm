# Fiche audit · Objectifs & Croissance

Entry point : `ObjectifsCroissanceV2.jsx` → `objectifs/ObjectifsDecisionModule.jsx`.
Onglets réels : Suivi du Business Plan · Efficacité Technique & Zootechnique ·
Simulateur Sandbox · Sécurisation des Flux. **Non conforme à la cible** (Objectifs ·
Scénarios · Historique).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Suivi du Business Plan | 3/5 | 4/5 | 3/5 | 3/5 | n/a | 3/5 | **3,2/5** |
| Efficacité Technique & Zootechnique | 3/5 | 3/5 | 2/5 | 3/5 | n/a | 3/5 | **2,8/5** |
| Simulateur Sandbox | 3/5 | 3/5 | 2/5 | 3/5 | 3/5 | 3/5 | **2,8/5** |
| Sécurisation des Flux | 2/5 | 2/5 | 2/5 | 3/5 | n/a | 3/5 | **2,4/5** |

## Problèmes
- **Libellés non conformes** : « Efficacité Technique & Zootechnique », « Simulateur
  Sandbox », « Sécurisation des Flux » sont du jargon technique, pas la langue d'un
  exploitant. La cible : Objectifs · Scénarios · Historique.
- **Fusion Capacité/Rentabilité dans Scénarios** : non faite ; les scénarios doivent
  être des **résultats de simulation** (besoins aliment, trésorerie projetée,
  capacité bâtiments/main-d'œuvre, seuil de soutenabilité).
- **Progression automatique** : un objectif calculable doit bloquer la progression
  manuelle — à vérifier.
- **Simulations versionnées** avec hypothèses documentées ; le Centre les ouvre par
  lien (il n'a pas les siennes) — cohérent avec l'audit Centre.

## Corrections prioritaires
1. Restructurer vers Objectifs · Scénarios · Historique, dé-jargonner.
2. Fusionner Capacité + Rentabilité dans Scénarios (résultats de simulation).
3. Bloquer la progression manuelle quand la valeur est calculable.
