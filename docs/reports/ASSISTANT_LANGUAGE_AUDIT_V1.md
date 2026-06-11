# ASSISTANT_LANGUAGE_AUDIT_V1

**Date :** 2026-06-09  
**Périmètre :** Assistant ERP V3 → V4 (compréhension langage naturel agricole)  
**Statut :** Phase 1 — audit avant refonte V4

---

## 1. Synthèse

L'assistant V3 offre une interface conversationnelle (secrétaire agricole) mais le **moteur de compréhension** reste fragmenté : matrices documentées non branchées, détecteurs parallèles, presets partiellement couverts, redirections module au lieu de réponses.

**Objectif V4 :** un routeur unique `assistantLanguageRouter` alimenté par `ASSISTANT_UNIVERSAL_INTENTS`, sans commandes obligatoires.

---

## 2. Fichiers audités

| Fichier | Rôle actuel | Problème principal |
|---------|-------------|-------------------|
| `assistantIntentMatrix.js` | 3 familles (DÉCLARER / DEMANDER / DÉCIDER) | **Non branché runtime** — tests uniquement |
| `assistantFarmSecretary.js` | Header + accueil | Lecture seule OK — pas de Q&R |
| `heyHorizonAssistantService.js` | Orchestrateur principal | Chaîne de priorité rigide, pas de mémoire |
| `assistantInvestorAnswers.js` | 5 types investisseur | Chevauche finance / stratégique |
| `heyHorizonFinanceAnswers.js` | 15+ types finance | Pas de trésorerie simple sans motif long |
| `heyHorizonCommercialAnswers.js` | 7 types commercial | Presets commercial ~50 % non couverts |
| `heyHorizonStrategicAnswers.js` | Détection stratégique | **Redirect only** — pas de réponse chat |
| `aiIntentEngine.js` | Brouillons terrain | Mots exacts (`hey horizon`, `enregistre une vente`) |
| `voiceCommands.js` | Fallback navigation | Réponses génériques, listes `includesAny` |
| `commercialHeyHorizon.js` | 10 presets | Devis, livraisons, abonnements non détectés |
| `AssistantPanel.jsx` | QUICK_ACTIONS (8) | Commandes implicites (« Créer vente ») |

---

## 3. Commandes figées identifiées

| Source | Exemple | Impact |
|--------|---------|--------|
| `aiIntentEngine` wake words | `hey horizon`, `horizon` (égalité stricte) | Inutile en chat plein écran V3 |
| `AssistantPanel` QUICK_ACTIONS | `Créer une vente`, `J'ai vacciné` | Syntaxe d'amorçage, pas NL |
| `assistantIntentMatrix` DEMANDER | `top client`, `meilleur produit` | Phrases naturelles partielles |
| `detectCommercialPilotageQuery` | `resume commercial` (sans accents) | Fautes / variantes ratées |
| `detectFinancePilotageQuery` | Patterns longs (30j, DSCR…) | « ma trésorerie » passe investisseur court |
| `detectStrategicQuery` | `client`, `relancer` | Redirige au lieu de répondre |
| `isWeakHeyHorizonDraft` | Regex vente obligatoire | Bloque brouillons commerciaux faibles |

---

## 4. Mots-clés exacts vs langage naturel

### Couverts V3 (partiel)

- `j'ai vendu` → brouillon vente (`aiIntentEngine`)
- `trésorerie` → investisseur si < 50 car. (`assistantInvestorAnswers`)
- `que faire aujourd'hui` → commercial ou redirect stratégique

### Non couverts V3 (exemples mission)

| Phrase agriculteur | Résultat V3 | Cause |
|-------------------|-------------|-------|
| « combien me reste-t-il d'aliment ? » | Fallback / LLM | Pas d'intent stock ciblé |
| « est-ce que j'ai assez de maïs pour finir le mois ? » | Non reconnu | Pas de variante culture/stock |
| « quels clients me doivent de l'argent ? » | Parfois commercial | Pattern `me doivent` absent |
| « et des bovins ? » (suite) | Non reconnu | Pas de mémoire conversation |
| « Quels devis en attente ? » (preset) | Échec règles | Hors `detectCommercialPilotageQuery` |

---

## 5. Intentions non couvertes (avant V4)

- Salutation naturelle (`comment va la ferme`)
- Effectifs par espèce (bovins, poulets, ovins, caprins)
- Stock aliment / maïs
- Questions composées (`trésorerie et objectif du mois`)
- Suites anaphoriques (`lesquels sont sous traitement ?`)
- DLC / périmption (orientation module seulement)

---

## 6. Routes cassées ou inutiles

| Route | Symptôme |
|-------|----------|
| `classifyAssistantIntent` → rien | Matrice V1/V2 jamais appelée |
| `resolveCanonicalWorkflow` | Matrice exécution non utilisée |
| `buildStrategicAnswer` | Existe mais non appelée dans le routeur principal |
| `detectStrategicQuery` + redirect | Remplace une réponse par navigation module |
| Presets `commercialHeyHorizon` | 5/10 requêtes sans détecteur dédié |

---

## 7. Moteurs canoniques (lecture seule — conformes)

Utilisés correctement dans les réponses investisseur / commercial :

- `consolidateFinance`
- `buildConsolidatedCommercialKpis`
- `summarizeSalesMargins`
- `buildObjectifsCroissanceData`
- `computeFarmHeadcount` (via dashboard)
- `computeCultureSummary`
- `computeStockSummary`

**Aucun nouveau moteur métier requis** — V4 branche la compréhension sur ces lecteurs.

---

## 8. Recommandations V4 (implémentées)

1. **`ASSISTANT_UNIVERSAL_INTENTS`** — 10 familles métier, ~70 variantes NL
2. **`ASSISTANT_MULTI_INTENT_MATRIX`** — découpage `et que / et quel / et combien`
3. **`ASSISTANT_CONVERSATION_CONTEXT`** — suites « et des bovins ? », traitements
4. **`assistantLanguageRouter`** — priorité avant finance/commercial/investisseur
5. **`formatCompactHorizonAnswer`** — SCA max 5 lignes
6. Conserver flux brouillon (`DECLARER`) et validateurs canoniques intacts

---

## 9. Contraintes respectées

- Finance P0 / P1 : non modifiés
- Commercial V1 : non modifié
- Architecture canonique / exécution : non modifiée
- Routes / permissions / workflows : inchangés
