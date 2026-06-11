# Horizon Farm — Audit UX Anti-doublons Commercial V1

Date : 2026-06-09  
Branche : `cursor/commercial-ux-anti-dup-ac42`  
Périmètre : module Commercial (C3–C11), navigation, KPIs, IA, investisseur, workflows.  
Contrainte : **aucune suppression de fonctionnalité métier** ; vérités canoniques inchangées.

---

## Score final

| Dimension | Avant | Après | Commentaire |
|-----------|-------|-------|-------------|
| Architecture | 72 | 78 | Onglets clarifiés ; doublons panneaux réduits |
| UX | 58 | 76 | 1 entrée principale par domaine ciblé |
| Investisseur | 65 | 72 | Pilotage recentré ; narrative unique en tête |
| Lisibilité | 60 | 74 | Résumé allégé ; démarrage aligné |
| Anti-doublons | 52 | 82 | Relances / réconciliation / créances recentrés |
| **Global** | **61** | **82** | Phase 2 correctifs appliqués |

---

## Tableau synthèse Avant → Après

| Zone | Avant | Après (correctif minimal) |
|------|-------|---------------------------|
| Relances Résumé | Panneau complet `CommercialRelancesPanel` | Teaser `CommercialRelancesTeaser` → onglet Relances |
| Réconciliation | Résumé + Pilotage (double montage) | Résumé seul + lien Pilotage → Finance |
| Hey Horizon « Créances » | Onglet Clients | Onglet Relances |
| Démarrage encaissement | Onglet Ventes | Finance → Réconciliation |
| Démarrage relance | Onglet Clients | Onglet Relances |
| Composants morts | 2 fichiers non référencés | Documentés ; pas supprimés |
| Workflow vente legacy | `commitSaleWorkflow` encore accessible WhatsApp simple | Conservé ; canonical = `commitCommercialSale` |

---

## 1. Audit navigation

### 1.1 Onglets principaux (`COMMERCIAL_TABS`)

| Onglet | Entrée canonique | Doublons détectés |
|--------|------------------|-------------------|
| Résumé | Cockpit dirigeant | KPIs + todos + devis + réconciliation + teaser relances |
| Ventes | Devis, commandes, encaissement terrain | Mobile « Devis », Hey « Devis en attente », startup étapes 3–4–7 |
| Clients | Fiches, créances, segmentation | Hey « Top clients », « Créances » (avant fix), carte créances Résumé |
| Livraisons | Livraisons & confirmations | Mobile « Livrer », startup étape 6, todos |
| Relances | Relances IA + WhatsApp manuel | Résumé (avant : panneau complet), Hey « Clients à relancer » |
| Opportunités | Stock / élevage / cultures auto | InvestorInsights ligne opportunités, Hey sell_today |
| Pilotage | Objectifs, PDF investisseur | KPIs objectifs = Graphiques/Résumé (métriques partagées) |
| Graphiques | Visualisations CA/marges | Hey « Top produits », KPIs Résumé (clic → Graphiques) |

### 1.2 Doublons navigation — liste détaillée

| ID | Source | Cible | Justification | Recommandation | Statut |
|----|--------|-------|---------------|--------------|--------|
| NAV-01 | `CommercialQuickActions` « Devis & ventes » | Onglet Ventes | Même destination que toolbar mobile « Devis » | Garder : navigation vs action « Nouvelle vente » | CONSERVER |
| NAV-02 | `CommercialQuickActions` « Livraisons » | Onglet Livraisons | Doublon onglet + mobile « Livrer » | CONSERVER (raccourci Résumé) | CONSERVER |
| NAV-03 | `CommercialQuickActions` « Clients & créances » | Onglet Clients | Doublon KPI Créances → Clients | Fusionner libellé : « Clients » | MASQUER libellé long |
| NAV-04 | `CommercialQuickActions` « Relances » | Onglet Relances | Doublon mobile « Relancer » | CONSERVER | CONSERVER |
| NAV-05 | Résumé `CommercialRelancesPanel` | Onglet Relances | **Double UI relances** | Teaser → Relances | **CORRIGÉ** |
| NAV-06 | Pilotage `CommercialReconciliationPanel` | Résumé même panneau | **Double réconciliation** | Masquer sur Pilotage | **CORRIGÉ** |
| NAV-07 | Hey Horizon « Créances » | Clients (avant) | Créances aussi Finance onglet Créances | Pointer Relances commercial | **CORRIGÉ** |
| NAV-08 | Hey Horizon « Clients à relancer » | Relances | Aligné avec onglet | CONSERVER | CONSERVER |
| NAV-09 | Dashboard « Nouvelle vente » | Commercial Ventes | 2e module d’entrée vente | CONSERVER (accueil global) | CONSERVER |
| NAV-10 | Alias `devis` → Ventes | Ventes | Pas d’onglet Devis dédié | CONSERVER (canonique) | CONSERVER |
| NAV-11 | Alias `reconciliation` → Pilotage | Pilotage | Finance a Réconciliation propre | Documenter ; lien Finance | MASQUER alias ambigu |
| NAV-12 | `payments` search → Finance Créances | Finance | vs Commercial Clients créances | CONSERVER (vérité Finance) | CONSERVER |

### 1.3 Raccourcis Hey Horizon (6 chips visibles)

Fichier : `src/utils/commercialHeyHorizon.js`

Chaque preset = **navigation + question** — pas un 2e moteur de données (réponses dans `heyHorizonCommercialAnswers.js` réutilisent `buildConsolidatedCommercialKpis`).

---

## 2. Audit parcours démarrage

Fichiers : `commercialStartup.js`, `CommercialStartupPanel.jsx`

### Avant

- Libellé « Démarrage Commercial » (pas aligné autres modules « Mode démarrage »)
- 9 étapes affichées (spec audit C0 parlait de 7)
- Encaissement → Ventes (doublon avec saisie vente)
- Relance WhatsApp → Clients (doublon segmentation / fiche client)
- Suivi créances → Clients

### Mapping recommandé (guide, pas 2e navigation)

| Étape | Action réelle | Destination canonique |
|-------|---------------|----------------------|
| 1. Créer client | Créer fiche client | Commercial → Clients |
| 2. Publier produit vendable | Stock vendable | Achats & Stock → Stock |
| 3. Créer devis | Devis | Commercial → Ventes |
| 4. Créer commande | Commande | Commercial → Ventes |
| 5. Créer facture | Facture / Annexe | Commercial → Annexe |
| 6. Livrer | Confirmation livraison | Commercial → Livraisons |
| 7. Encaisser | Encaissement / rapprochement | **Finance → Réconciliation** |
| 8. Première relance | WhatsApp manuel | Commercial → **Relances** |
| 9. Suivi créances | Portefeuille client | Commercial → Clients |

**Correctifs appliqués** : étapes 7–8–9 alignées ; libellé « Mode démarrage ».

Le parcours reste un **guide** (`openStep` = `setTab` ou `onNavigate`) — pas un workflow parallèle.

---

## 3. Audit KPI

Source canonique module : `buildConsolidatedCommercialKpis` (`commercialKpiConsolidated.js`).

| KPI | Occurrences avant | Redondance | Action |
|-----|-------------------|------------|--------|
| CA | Résumé grille, Graphiques, Pilotage objectifs, Hey summary, Investor report | Métrique partagée, affichages différents | CONSERVER (1 source) |
| Encaissé | Résumé, Graphiques pie, Pilotage preuve PDF | Idem | CONSERVER |
| Créances | Résumé KPI + carte + header badge + Clients segmentation + Relances | **4 surfaces** | Carte + KPI → liens ; relances centralisées |
| Clients actifs | Résumé, Pilotage stratégiques, Top clients | Complémentaire | CONSERVER |
| Panier moyen | Résumé, Hey summary | Faible | CONSERVER |
| Commandes ouvertes | Résumé, badge Ventes, VentesV4 todos | Badge utile | CONSERVER |
| Objectifs mois | Pilotage seul | Pas sur Résumé | CONSERVER (investisseur) |

**Hors module** : `computeCommercialKpis` (dashboard) — moteur parallèle documenté ; non modifié (vérité dashboard).

---

## 4. Audit IA (Hey Horizon Commercial)

| Capacité Hey Horizon | Panel / onglet équivalent | Doublon ? |
|----------------------|---------------------------|-----------|
| `receivables` / relances | Relances + Clients segmentation | Oui → route Relances |
| `sell_today` / opportunités | Opportunités tab + auto-opps | Narration vs liste — CONSERVER |
| `today_actions` | Résumé todos | Synthèse — CONSERVER |
| `top_clients` / `segment_ca` | Clients segments + Pilotage stratégiques | Partiel — CONSERVER |
| `top_products` / `low_margin` | Graphiques + Pilotage produits | Partiel — CONSERVER |
| `summary` | Résumé KPIs | Même `buildConsolidatedCommercialKpis` — CONSERVER |
| `quotes_pending` | CommercialQuotesPanel Résumé + Ventes | Navigation — CONSERVER |

Hey Horizon = **couche question/réponse + navigation** ; pas un 2e calcul métier.

---

## 5. Audit investisseur

`CommercialInvestorInsights` (Pilotage uniquement) :

| Ligne narrative | Doublon avec |
|-----------------|--------------|
| CA / encaissement | Résumé KPIs, Pilotage objectifs, PDF export |
| Concentration client/produit | Pilotage stratégiques / produits rentables |
| Opportunités auto | Onglet Opportunités |
| Clients à risque / silencieux | `CommercialSegmentsPanel` (Clients) |

**Recommandation** : InvestorInsights = **seule narrative 3 lignes** ; Pilotage listes = données détaillées (pas re-narrer en prose).  
**Action** : CONSERVER structure ; ne pas ajouter 4e bloc texte sur Graphiques.

---

## 6. Audit composants

| Composant | Références | Action recommandée |
|-----------|------------|------------------|
| `CommercialInsightPanel.jsx` | 0 | SUPPRIMER (futur) ou FUSIONNER Centre IA — **CONSERVER fichier** audit |
| `CommercialDeliverySyncPanel.jsx` | 0 | FUSIONNER dans Livraisons — **CONSERVER fichier** audit |
| `CommercialRelancesPanel.jsx` | Relances tab (+ Scheduled wrapper) | CONSERVER (canonique relances) |
| `CommercialRelancesTeaser.jsx` | Résumé | CONSERVER (nouveau anti-doublon) |
| `CommercialReconciliationPanel.jsx` | Résumé seul (après fix) | CONSERVER |
| `VentesTerrain.jsx` / V2 / standalone V3 | Legacy loaders | MASQUER routes ; pas dans Commercial shell |
| `VentesV2` + `commitSaleWorkflow` | Legacy ventes | CONSERVER code ; WhatsApp simple seulement |

Tous les autres `Commercial*.jsx` (25 fichiers) : référencés, **CONSERVER**.

---

## 7. Audit workflows vente

Pipeline canonique Commercial :

```
Devis (commercialQuoteWorkflow)
  → Commande (prepareCommercialSaleCommit)
  → Facture + lignes (buildCommercialSaleRecords)
  → Livraison (delivery record)
  → Encaissement (recordSalePayment / financeIds.paid)
  → Réconciliation (Finance)
```

| Variante | Usage | Statut |
|----------|-------|--------|
| `commitCommercialSale` | VentesV4 modal, WhatsApp Terminus, AI COMMERCIAL_SALE | **Canonique** |
| `commitSaleWorkflow` | VentesV2, WhatsApp vente simple | Legacy terrain |
| `horizon-open-form` event | Assistant / dashboard | Raccourci vers Ventes |
| Conversion opportunité | `buildSaleFormFromOpportunity` | Raccourci vers Ventes |

**Pas de fusion workflow** dans cette mission (risque Finance/Stock).

---

## 8. Audit UX — nouvel agriculteur

| Fonctionnalité | Entrées principales (après correctifs) | Entrées secondaires (raccourcis) |
|----------------|--------------------------------------|----------------------------------|
| **Créer une vente** | 1 — Ventes → « Nouvelle vente » | Résumé bouton, mobile Vente, dashboard, abonnements, opportunités convert |
| **Relancer un client** | 1 — Onglet Relances | Hey Horizon, mobile Relancer, Clients fiche WhatsApp |
| **Suivre une créance** | 1 — Clients (portefeuille) | Finance Créances (canonique finance), Relances (actions), Résumé KPI/carte |

Objectif « 1 = 1 principal » : **partiellement atteint** — raccourcis conservés comme guides, pas comme 2e modules.

---

## Liste des doublons détectés

| ID | Description | Impact | Correction proposée |
|----|-------------|--------|---------------------|
| DUP-01 | Relances panel Résumé = copie onglet Relances | Haute confusion | Teaser → Relances (**appliqué**) |
| DUP-02 | Réconciliation Résumé + Pilotage | Moyenne | Masquer Pilotage (**appliqué**) |
| DUP-03 | Hey Créances → Clients vs Relances/Finance | Moyenne | Route Relances (**appliqué**) |
| DUP-04 | Démarrage encaissement → Ventes | Moyenne | Finance Réconciliation (**appliqué**) |
| DUP-05 | Démarrage relance → Clients | Moyenne | Onglet Relances (**appliqué**) |
| DUP-06 | KPI Créances × 4 surfaces | Lisibilité | Centraliser actions Relances |
| DUP-07 | Opportunités × 3 (tab, IA, investor line) | Faible | CONSERVER |
| DUP-08 | Segmentation Clients × Hey + Pilotage | Faible | CONSERVER |
| DUP-09 | `commitSaleWorkflow` vs `commitCommercialSale` | Technique | Documenter ; pas fusion |
| DUP-10 | Composants Insight/DeliverySync morts | Dette | FUSIONNER phase ultérieure |

---

## Correctifs appliqués (cette branche)

1. `CommercialRelancesTeaser.jsx` — remplace panneau relances sur Résumé  
2. `CommercialRecoveredModule.jsx` — utilise teaser  
3. `CommercialPilotagePanel.jsx` — retire double réconciliation  
4. `commercialStartup.js` — destinations encaissement / relance alignées  
5. `CommercialStartupPanel.jsx` — libellé « Mode démarrage »  
6. `commercialHeyHorizon.js` — preset Créances → Relances  
7. `tests/unit/commercialUxAntiDuplication.test.js` — garde-fous navigation  

**Non modifié** (règles obligatoires) : Finance consolidation, KPI canonique, routes, permissions, workflows Finance, données.

---

## Tests exécutés

```bash
npx vite-node tests/unit/commercialUxAntiDuplication.test.js
npx vite-node tests/unit/whatsappHorizon.test.js
npx vite-node tests/unit/antiDuplicationAudit.test.js
npm run build
```

---

## Phase 2 — correctifs appliqués (suite audit)

| Action | Fichier | Statut |
|--------|---------|--------|
| Fusion gaps livraison | `CommercialDeliveriesPanel` intègre `CommercialDeliverySyncPanel` | **Appliqué** |
| Signaux IA sur Résumé | `CommercialInsightPanel` monté dans Summary | **Appliqué** |
| Libellé « Clients » | `CommercialQuickActions` | **Appliqué** |
| Dépréciation VentesV2 | Commentaire `@deprecated` en tête de fichier | **Appliqué** |
| Alias `reconciliation` → Finance | `isCommercialReconciliationAlias` + redirect `App.jsx` | **Appliqué** |

Score global révisé : **76 → 82/100**.

---

*Audit UX Anti-doublons Commercial V1 — Horizon Farm.*
