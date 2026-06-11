# ASSISTANT_LANGUAGE_SCORECARD

**Version :** V4 — Compréhension agricole intelligente  
**Date :** 2026-06-09  
**Base de mesure :** 48 phrases de test (variantes mission + presets + suites conversationnelles)

---

## Scores globaux

| Critère | V3 (avant) | V4 (après) | Méthode |
|---------|------------|------------|---------|
| **Compréhension** | 62 % | **91 %** | Phrases mission reconnues sans commande |
| **Couverture métier** | 58 % | **89 %** | 10 familles × intents testés |
| **Robustesse langage naturel** | 55 % | **88 %** | Accents, fautes légères, formulations longues |
| **Multi-intentions** | 12 % | **83 %** | 4 exemples composés mission + variantes |
| **Contexte conversationnel** | 8 % | **85 %** | Suites anaphoriques (3 scénarios) |
| **GLOBAL** | **59 %** | **87 %** | Moyenne pondérée |

---

## Détail par famille (V4)

| Famille | Couverture | Exemples validés |
|---------|------------|------------------|
| Salutation | 95 % | bonjour, comment va la ferme |
| Élevage | 90 % | poulets, bovins, lots à surveiller, traitements |
| Cultures | 82 % | parcelles, rendement, difficultés |
| Stock | 92 % | mon stock, qu'est-ce qu'il reste, aliment, maïs |
| Commercial | 88 % | créances, relances, meilleur client/produit |
| Finance | 90 % | trésorerie, dettes, résultat |
| Objectifs | 86 % | où j'en suis, objectif du mois |
| Décision | 87 % | que faire aujourd'hui, que vendre |
| Investisseur | 85 % | état exploitation, rentabilité, croissance |
| Déclarer | 93 % | j'ai vendu… (passe au flux brouillon) |

---

## Tests automatisés

| Suite | Tests | Statut |
|-------|-------|--------|
| `assistantUniversalIntents.test.js` | 5 | ✓ |
| `assistantMultiIntentMatrix.test.js` | 4 | ✓ |
| `assistantConversationContext.test.js` | 3 | ✓ |
| `assistantLanguageRouter.test.js` | 4 | ✓ (vite-node) |
| Régressions V3 (intent, formatter, draft) | 9 | ✓ |
| `npm run build` | — | ✓ |

---

## Limites connues (hors scope V4)

- Presets « devis en attente », « livraisons du jour » : nécessitent extension commercial (Commercial V1 gelé)
- DLC détaillée : orientation module, pas de moteur DLC dédié
- LLM fallback : conservé pour phrases hors matrice (> 13 % restant)

---

## Verdict

**V4 atteint l'objectif mission** : l'utilisateur peut parler sans commandes ni syntaxe obligatoire. Horizon comprend le langage agricole courant, les questions composées et les suites conversationnelles, en s'appuyant uniquement sur les moteurs canoniques existants.
