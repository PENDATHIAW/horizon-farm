# ASSISTANT ERP V3 — AUDIT SECRÉTAIRE AGRICOLE

**Date :** 9 juin 2026  
**Objectif :** Transformer Horizon en secrétaire numérique de l'exploitation  
**Branche :** `cursor/assistant-erp-v3-secretary-ac42`

---

## 1. Éléments encore trop techniques (V2 → corrigés V3)

| Élément | Problème | Correction V3 |
|---------|----------|---------------|
| Header « Votre exploitation agricole » | Générique, non agricole | **Ferme Horizon** + stats contexte |
| Welcome SCA technique | Ressemble à doc ERP | **Bonjour Penda + Aujourd'hui :** bullets |
| « Résumé détecté » / « Impacts » | Jargon ERP | **Vous allez enregistrer / Conséquences** |
| ✓ Stock / Commercial / Finance | Modules techniques | Langage ferme (stock diminué, facture…) |
| « Action validée dans l'ERP » | Logiciel | **C'est enregistré dans le carnet de la ferme** |
| Bulle utilisateur vert foncé | Effet chatbot | **Vert clair** `#E8F2EA` |
| Labels SCA uppercase tracking | Style dashboard | Labels naturels, taille humaine |

---

## 2. Éléments encore trop ChatGPT (V2 → corrigés V3)

| Élément | Problème | Correction V3 |
|---------|----------|---------------|
| Message d'accueil SCA Situation/Cause/Action | Copie assistant IA | Message secrétaire personnalisé |
| Bulle user sombre type messaging app | ChatGPT/WhatsApp | Bulle claire agricole |
| Placeholder générique sans contexte | IA vide | Header ferme + accueil contextualisé |
| Ton « Reformulez votre action » | Bot | « Que souhaitez-vous faire ? » |

---

## 3. Éléments encore trop ERP (V2 → corrigés V3)

| Élément | Statut |
|---------|--------|
| KPI dashboard (supprimés V1) | Absent ✓ |
| Modules impactés listés | Remplacé par conséquences métier |
| heyHorizonModuleLabel dans confirmation | Supprimé de la vue confirmation |
| Source « Assistant ERP → brouillon » | **Carnet Horizon** |

---

## 4. Éléments inutiles restants

| Élément | Fichier | Décision |
|---------|---------|----------|
| `AssistantPanel.jsx` panneau flottant | overlay | **Conservé** (hors module, non modifié) |
| `AssistantERPInsights.jsx` | module | Non monté ✓ |
| `WhatsAppHorizonDemoPanel` | module | Non monté ✓ |
| Variant `full` HorizonDraftPanel | AssistantPanel | Conservé pour overlay |

---

## 5. Doublons visuels

| Doublon | Résolution V3 |
|---------|---------------|
| Header + welcome tous deux génériques | Header = état ferme, Welcome = priorités jour |
| SCA welcome + SCA réponses | Welcome = prose, réponses = SCA naturel |
| Confirmation carte + message brouillon | Un seul bloc inline dans le fil |

---

## 6. Textes peu agricoles → remplacés

| Avant | Après |
|-------|-------|
| Votre exploitation agricole | Ferme Horizon · X animaux · Y parcelles |
| Résumé détecté | Vous allez enregistrer |
| Impacts : ✓ Commercial | Conséquences : Facture créée |
| Je parle à ma ferme (header) | Contexte ferme dans l'en-tête |
| Horizon (titre seul) | Ferme Horizon |

---

## 7. Moteurs canoniques utilisés (lecture seule)

| Besoin | Moteur existant |
|--------|-----------------|
| Effectifs, alertes élevage | `buildCarnetDomainCards` + `buildDashboardSummary` |
| Parcelles | `carnetHorizon` cultures |
| Produits stock | `buildDashboardSummary.stockSummary` |
| Dernière activité | `buildCarnetTodayJournal` |
| Clients à relancer | `buildConsolidatedCommercialKpis().unpaidOrders` |
| Objectif mensuel % | `buildCarnetObjectifs` → `buildObjectifsCroissanceData` |
| Réponses finance/commercial | `heyHorizonFinanceAnswers` / `heyHorizonCommercialAnswers` |
| Écriture terrain | Workflows canoniques via `validateHeyHorizonDraft` |

**Aucun nouveau moteur créé.**

---

## 8. Fichiers modifiés V3

```
src/services/assistantFarmSecretary.js          (nouveau)
src/services/assistantDraftHumanSummary.js      (nouveau)
src/modules/assistant/horizonDesignTokens.js    (palette V3)
src/modules/assistant/HorizonStructuredMessage.jsx
src/modules/HeyHorizonModule.jsx
src/components/HeyHorizonDraftSummary.jsx
src/services/assistantResponseFormatter.js
tests/unit/assistantFarmSecretary.test.js
tests/unit/assistantDraftHumanSummary.test.js
tests/e2e/assistant-erp-smoke.spec.js
```
