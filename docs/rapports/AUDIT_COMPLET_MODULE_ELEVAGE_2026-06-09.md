# Audit complet — Module Élevage

**Date :** 9 juin 2026  
**Périmètre :** module `elevage` (point d'entrée `ElevageModule.jsx` → `ElevageRecoveredModule.jsx`)  
**Méthode :** revue code, config cible, docs d'audit récents, tests unitaires, comparaison Centre / Objectifs / Dashboard  
**Type :** lecture seule — document de référence pour pilotage produit

**Horizon Farm ERP — Vision 2026–2027**

---

## Synthèse exécutive

| Indicateur | Valeur |
|------------|--------|
| Score global module | 52 / 100 |
| Maturité workflows terrain | Bonne (alimentation, ponte, santé, mortalité, pesée) |
| Maturité pilotage / stratégie | Moyenne (Cycles réparé, mais doublons KPI) |
| Dette structurelle | Élevée — 11 onglets, orchestrateur ~800 lignes |
| Rupture critique | ReproductionWorkflowForm jamais monté — workflows saillie/gestation/mise bas cassés côté UI |

Le module Élevage est le plus riche métier de l'ERP (animaux, avicole, santé, reproduction, transformation, cycles). Les workflows officiels (`elevageWorkflow.js`) et la canonisation V3 (`ELEVAGE_LEGACY_NOTES.md`) sont solides. Le problème principal est la surcharge UX, les doublons inter-modules, et un formulaire reproduction non branché.

---

## 1. Architecture & point d'entrée

```
App.jsx (elevage)
  → ElevageModule.jsx (re-export)
  → ElevageRecoveredModule.jsx (~801 lignes) — orchestrateur
      ├── Header fixe (titre + Santé module X/100 + Hey Horizon)
      ├── ModuleTabsBar (11 onglets)
      ├── SanitaryWithdrawalBanner (si retrait sanitaire actif)
      ├── Contenu onglet actif
      ├── ElevageWorkflowPanels (modales terrain)
      └── ElevageMobileToolbar (mobile, sticky)
```

| Fichier | Lignes | Rôle |
|---------|--------|------|
| ElevageRecoveredModule.jsx | 801 | Orchestrateur + hubs inline |
| ElevageCyclesPanel.jsx | 421 | Onglet Cycles opérationnel |
| ProductionHub.jsx | 357 | Onglet Production |
| ReproductionWorkflowForm.jsx | 487 | Non monté (bug critique) |
| ElevageWorkflowPanels.jsx | 228 | Modales workflow |
| AvicoleV10.jsx | 236 | Onglet Avicole |
| AnimauxV2.jsx | 244 | Onglet Animaux |
| SanteV8.jsx | 234 | Onglet Santé |

**Canon :** tout nouveau code doit passer par `ElevageRecoveredModule` ou utilitaires V3 (`elevageWorkflow.js`, `elevageActivityPnl.js`, `elevageExport.js`).

---

## 2. Onglets cibles (config)

`MODULE_TARGET_TABS.elevage` — 11 onglets :

Résumé · Cycles · Animaux · Avicole · Alimentation · Santé · Reproduction · Production · Transformation · Annexe · Graphiques

**Verdict UX :** beaucoup plus dense que Centre (3) ou Objectifs (4). Pas de sous-onglets, mais 11 vues de premier niveau = charge cognitive élevée pour un exploitant terrain.

---

## 3. Audit par onglet

### 3.1 Résumé — score 58 / 100

**Contenu :** ElevageSummaryCockpit — cockpit KPI, brief assistant, actions terrain (desktop), P&L/rentabilité/IA en accordéon, parcours métier (6 cartes).

| Point | Verdict |
|-------|---------|
| Cockpit KPI (buildElevageCockpitKpis) | OK |
| Brief exécutif | OK |
| Actions terrain dupliquées vs mobile toolbar | Doublon partiel |
| ElevageIaPanel + RentabilitySection dans accordéon | Recoupe Centre / Objectifs |
| Parcours métier (6 cartes → autres onglets) | Redondant avec la barre d'onglets |

**Problème :** l'onglet Résumé fait encore office de mini-dashboard alors que Accueil et Centre existent.

### 3.2 Cycles — score 55 / 100

**Montage actuel :** ElevageCyclesPanel (amélioration vs audit 9 juin où VisionCyclesTab seul était monté).

| Élément | Statut |
|---------|--------|
| Table échéances J+40 / J+90 / J+510 | OK |
| KPI cycles (retards, ponte 7j, blocage lancement) | OK |
| ProductionQuestionsPanel | Monté dans le panel |
| Deep-link horizon-production-question | OK |
| Lien Centre → Stratégie cycles | OK (alias Saisons & marchés) |
| Navigation interne setTab('Avicole') | OK |

**Doublons :** AvicoleCycleHealthPanel, AnimalCycleHealthPanel, VisionCyclesTab (Centre), alertes J+40/J+90 (Alertes).

**Absence métier :** pas d'entité `cycles` persistée — projections sur date_entree + règles (`productionCycleDates.js`).

### 3.3 Animaux — score 62 / 100

Fiches espèces, coûts, marge, pesées, ventes. AnimalCycleHealthPanel = doublon cycles bovins. Transformation déplacée vers hub Transformation (bon). Manques : pas d'onglet Reproduction dans fiche animal ; généalogie limitée.

### 3.4 Avicole — score 64 / 100

Lots chair/pondeuses, production, ventes partielles. AvicoleCycleHealthPanel = doublon cycles. Ramassage via workflow + commitElevageEggProduction. IC/ponte aussi visibles dans Objectifs Technique.

### 3.5 Alimentation — score 50 / 100

Hub léger + workflow modal feeding. Valeur réelle dans modales et logs Avicole/Animaux.

### 3.6 Santé — score 68 / 100

SanteV8 complet, biosécurité, commitBiosecurityWorkflow. SanitaryWithdrawalBanner global. Lien fumier → Objectifs BP à vérifier en données.

### 3.7 Reproduction — score 28 / 100 (rupture critique)

ReproductionHub affiche stats et boutons + Saillie / Gestation / Mise bas, mais ReproductionWorkflowForm.jsx (487 lignes) n'est importé ni rendu nulle part. scrollToReproductionWorkflowForm() cible un élément DOM absent. reproductionHorizonDraft stocké mais jamais passé au formulaire.

**Verdict :** boutons reproduction cassés en UI (toast + scroll vers rien).

### 3.8 Production — score 60 / 100

ProductionHub : filières repliables, performance agrégée, diagnostic lot. Doublon avec Résumé et Objectifs.

### 3.9 Transformation — score 65 / 100

Hub + TransformationOfficialForm + bridges abattage/avicole. Journal transformation. Hub canonique unique (bon).

### 3.10 Annexe — score 55 / 100

ElevageAnnexeVault — coffre documents.

### 3.11 Graphiques — score 50 / 100

ModuleGraphiquesTab générique elevage.

---

## 4. Header & éléments toujours visibles

Sur tous les onglets :

1. Bandeau Production / Élevage + période + Hey Horizon
2. Score Santé module /100
3. Barre 11 onglets
4. Bannière retrait sanitaire (conditionnelle)
5. Mobile toolbar (6 actions)

Comparaison : Centre a réduit la redondance ; Élevage garde header + score + toolbar = charge permanente élevée.

---

## 5. Doublons inter-modules

| Domaine | Source de vérité | Doublons |
|---------|------------------|----------|
| Marge / rentabilité | Finance (globale) ; Élevage (métier) | Résumé, Production, Avicole/Animaux, Objectifs, Centre |
| Cycles / quand lancer | Élevage Cycles (opérationnel) | Centre Saisons, panels Avicole/Animaux, Alertes |
| IC / ponte / GMQ | Élevage Production + logs | Objectifs Technique |
| Alertes santé | Activité & Suivi (CRUD) | Centre Urgences, ElevageIaPanel |
| Ventes animaux | Commercial | Toolbar Vente, Transformation |

Registre antiDuplicationRegistry : rentabilite_finance_elevage → Finance global, Élevage/Objectifs lecture métier. Pas toujours respecté dans l'UI.

---

## 6. Workflows & interconnexions

| Workflow | Statut |
|----------|--------|
| Distribution aliment | OK |
| Ramassage œufs → stock | OK |
| Santé / biosécurité | OK |
| Mortalité / pesée | OK |
| Transformation officielle | OK |
| Reproduction | UI non montée |
| Export investisseur PDF | OK (Résumé accordéon) |

Navigation : resolveElevageTab, navigateForIaFinding, setTab interne pour elevage.

---

## 7. Tests

12 fichiers elevage*.test.js — couverture bonne sur workflows, Production hub, transformation.

**Gaps :** montage ReproductionWorkflowForm, intégration 11 onglets, lien biosécurité → fumier Objectifs.

---

## 8. Dette & legacy

AvicoleV2–V9 conservés non montés. ElevageReproductionPanel orphelin si présent. Docs : ELEVAGE_LEGACY_NOTES.md, ELEVAGE_VISION_ALIGN_2026-06-09.md, rapports Cycles/Reproduction (partiellement obsolètes sur Cycles).

---

## 9. Scores par axe

| Axe | /10 | Commentaire |
|-----|-----|-------------|
| Boutons & actions terrain | 7 | Modales workflow solides |
| Formulaires métier | 5 | Reproduction cassée |
| Workflows bout-en-bout | 6 | Gap repro |
| Interconnexions | 6 | Commercial, stock, finances OK |
| Doublons | 4 | KPI/marge/cycles répétés |
| KPI & cockpit | 6 | Riches mais redispersés |
| IA / findings | 6 | Pas d'actions auto sans validation |
| Mobile terrain | 7 | Toolbar sticky utile |
| Design / digestibilité | 5 | 11 onglets + header chargé |
| Tests | 7 | Gap repro UI |
| Documentation | 7 | Legacy notes + audits |

**Total ≈ 52/100**

---

## 10. Priorités recommandées

### P0 — Bloquant

1. Monter ReproductionWorkflowForm dans l'onglet Reproduction (draft, handlers, id elevage-reproduction-workflow-form).
2. Test unitaire : clic + Saillie → formulaire dans le DOM.

### P1 — UX / doublons

3. Résumé allégé : cockpit + brief + actions ; P&L/IA vers accordéon ou liens Objectifs/Centre.
4. Réduire doublons cycles (panels Avicole/Animaux vs Cycles).
5. Header : score Santé → badge cliquable vers Santé.

### P2 — Structure

6. Grouper onglets (6 max) : Pilotage | Registres | Opérations | Annexe.
7. Câbler fumier biosécurité → objectifs fumier BP.

### P3 — Métier

8. UI reproduction_events si persistance requise.
9. Filière lait explicite (hors scope actuel).

---

## 11. Ce qui fonctionne bien

- Workflows terrain modales + refresh post-action
- Split Cycles opérationnel (Élevage) vs stratégie marché (Centre Saisons)
- Hub Transformation canonique + tests anti-doublon Animaux/Avicole
- commitElevageEggProduction + chemin stock œufs documenté
- Mode startup (ElevageStartupPanel)
- Export PDF investisseur depuis P&L

---

## Conclusion

Le module Élevage est fonctionnel et profond métier, mais pas encore exemplaire UX comme Centre/Objectifs après refactor. Correction immédiate : montage formulaire Reproduction. Stratégie produit : moins d'onglets visibles, moins de KPI dupliqués, Résumé orienté action terrain.

---

*Document généré pour Horizon Farm ERP — module Élevage — juin 2026*
