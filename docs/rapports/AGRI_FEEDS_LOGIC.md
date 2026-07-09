# AGRI FEEDS — Logique métier (Horizon Farm)

## Positionnement

AGRI FEEDS est la **Phase 2** de Horizon Farm, pas un projet séparé.

| Mode | Contenu | Interdit |
|------|---------|----------|
| **1 — Référence** | Achats aliments marché, `alimentation_logs`, benchmark, zones site prévues | Production AGRI FEEDS, vente AGRI FEEDS |
| **2A — Pilote interne** | Matières premières, formules, OF, tests sur animaux HF | Vente large |
| **2B — Vente progressive** | Vente formules **commercializables** uniquement | Formule non validée |

Le passage de mode est **data-driven** (score readiness), pas une date fixe.

## Flux cible

```
Achats marché (Phase 1) → benchmark
Matières premières → Formule → OF → Lot fini → Stock PF
→ Distribution élevage → Essai → Comparaison Phase 1
→ Validation humaine → Vente Commercial
→ Finance + Alertes + Centre + Documents + Assistant
```

## Cycle de vie formule

`draft` → `internal_testing` → `to_improve` → `internally_validated` → `client_testing` → `commercializable` → `suspended` / `abandoned`

**Bloquer commercializable** si : pas de test interne terminé, pas de coût réel, pas de performance animale, pas de validation humaine, pas de QC minimum.

## KPI Phase 1 (benchmark)

Par lot / animal : fournisseur, type aliment, prix/kg, quantité, coût total, coût/sujet, coût/plateau, coût/bœuf, mortalité, poids, ponte, marge, période.

## Rôle de l’IA

Propose (analyse, suggestion, point d’attention, décision proposée).  
**L’humain valide.** Aucune commercialisation automatique.

## Moteur `agriFeedsReadinessEngine`

Le moteur ne répond **jamais** simplement « prêt / pas prêt ». Chaque appel retourne :

- `readiness_score` sur 100 ;
- `recommendedMode` (REFERENCE / PILOT_INTERNAL / PROGRESSIVE_SALES) ;
- `blockers` critiques ;
- `warnings` ;
- `data_used` (données ERP utilisées) ;
- `data_missing` (collections/champs manquants) ;
- `priority_actions` proposées ;
- `human_validation_required: true` + `ai_disclaimer` (l’IA propose, l’humain décide) ;
- `per_mode` (score + met + missing + blockers/warnings pour chaque phase) ;
- `pilot_breakdown` (12 critères Phase 2A) ;
- `sales_gates` (6 portes Phase 2B).

### Phase 2A — Production pilote interne (12 critères pondérés / 100)

1. Qualité & volume des données historiques Phase 1 (cap 12)  
2. Stabilité sanitaire (cap 10)  
3. Indice de consommation (cap 8)  
4. Coût alimentaire suivi (cap 8)  
5. Marges observées (cap 8)  
6. Trésorerie (cap 8)  
7. Créances & dettes (cap 6)  
8. Disponibilité de l’eau (cap 6)  
9. État du site AGRI FEEDS (cap 8)  
10. Fournisseurs matières premières (cap 8)  
11. Encadrement technique (cap 8)  
12. Alertes critiques ouvertes (cap 10)  

### Phase 2B — Vente progressive (portes strictes)

La vente est **bloquée** si l’une de ces portes est fausse :

- au moins une formule testée ;  
- un coût réel de production calculé ;  
- une comparaison avec la référence Phase 1 ;  
- au moins un contrôle qualité `feed_quality_checks` enregistré ;  
- une validation humaine (essai clôturé + `reviewed_by_human` ou formule validée) ;  
- une formule au statut `commercializable`.  

### Vente AGRI FEEDS

La vente progressive réutilise les tables existantes : `clients`, `sales_orders`, `sales_order_items`, `stock`, `stock_movements`, `finances`, `alertes_center` et `business_events`.

Une vente AGRI FEEDS est autorisée uniquement si :

- le lot fini est actif ;
- le lot est destiné à `commercial_sale` ;
- la formule liée est `commercializable` ;
- le QC minimum du lot fini est enregistré ;
- la quantité demandée est disponible ;
- la sortie stock et le mouvement commercial peuvent être tracés.

Le workflow de vente calcule :

- montant total ;
- montant encaissé ;
- reste à payer ;
- marge estimée ;
- quantité restante sur le lot fini ;
- signal stock bas si nécessaire ;
- mise à jour du client pour le suivi des réachats.

Les retours clients et réclamations sont enregistrés en `business_events`. Une réclamation crée une alerte qualité afin de vérifier le lot, rappeler le client et documenter l’action corrective.

### Reporting, permissions et audit

Le reporting AGRI FEEDS construit une synthèse financeur à partir des données ERP existantes : readiness, production, essais, comparaisons, QC, traçabilité, ventes, créances, marge estimée et actions prioritaires.

Les actions sensibles sont encadrées par une matrice de permissions : validation humaine d’un essai, passage en `commercializable`, clôture d’OF, vente, génération de rapport et consultation des décisions sensibles.

La génération d’un rapport crée :

- une ligne `reports` de type `agri_feeds_financeur` ;
- une ligne `audit_logs` rattachée au module AGRI FEEDS ;
- un événement de gestion pour garder la trace de la décision.

L’objectif est de pouvoir expliquer à un financeur ou à la promotrice : ce qui a été produit, testé, validé, vendu, encaissé, réclamé et surveillé.


## Étapes livrées

### Étape 1
- Module `agri_feeds` + 8 onglets
- Readiness Mode 1 / 2A / 2B
- Benchmark Phase 1
- Zones site prévues

### Étape 2
- Tables : `feed_raw_materials`, `feed_raw_batches`, `feed_formulas`, `feed_formula_versions`, `feed_formula_ingredients`
- Enrichissement `fournisseurs` (`supplier_type`, scores, délais…) et `alimentation_logs` (`feed_source`…)
- Workflow réception MP → stock + QC + finance + alerte si rejet
- Formulations + coût théorique + cycle de vie + garde-fou commercialisable
- UI onglets **Matières & fournisseurs** et **Formulations**

### Étape 3
- Tables : `feed_production_orders`, `feed_finished_batches`, `feed_quality_checks`
- Workflow OF : FIFO matières acceptées, consommation stock, coût théorique
- Clôture OF : quantité réelle, QC obligatoire, coût réel, lot fini, stock PF, QR public (sans recette)
- Alerte si écart coût réel / théorique > seuil
- UI onglet **Production**

### Étape 4
- Tables : `feed_trials`, `feed_phase1_comparisons`
- Workflow essai : ouverture (formule × lot × lot fini) → clôture (KPI : IC, mortalité, coût / sujet, coût / plateau, coût / kg gain, marge)
- Comparaison Phase 1 formalisée et persistée (`feed_phase1_comparisons`)
- Décision proposée par IA (validate / improve / retest / abandon) — jamais appliquée seule
- Validation humaine explicite (nom du validateur + décision + justification) → alimente les portes Phase 2B (`humanValidation`, `phase1Comparison`)
- Alerte automatique si l’IA propose l’abandon
- UI onglet **Tests & comparaison** opérationnelle

### Étape 5
- Workflow commercial AGRI FEEDS : vente uniquement sur lots issus de formules `commercializable` avec QC minimum
- Réutilisation du commercial existant : `sales_orders`, `sales_order_items`, `clients`, `stock`, `finances`
- Calcul automatique : total, reste à payer, marge estimée, sortie stock, stock bas
- Suivi client : dernier achat, volume habituel, score de réachat, clients à relancer
- Retours clients / réclamations via `business_events` + alerte qualité si réclamation
- Onglet **Commercial** opérationnel : vente, KPI, réachats, points d’attention Centre/Assistant

### Étape 6
- Service `agriFeedsReportingService.js` : rapport financeur, qualité, traçabilité, permissions, audit
- Onglet **Qualité & reporting** enrichi : synthèse financeur, KPI, lecture de gestion, permissions sensibles
- Génération de rapport : `reports` + `audit_logs` + événement de gestion
- Tests unitaires `agriFeedsStep6.test.js`
- Smoke E2E `agri-feeds-smoke.spec.js`

## Étape suivante possible

7. Assistant IA dédié AGRI FEEDS : intentions naturelles, analyse mensuelle, relances commerciales et synthèses financeur automatisées.
