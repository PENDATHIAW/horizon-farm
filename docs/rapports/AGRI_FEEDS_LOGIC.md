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

## Étapes suivantes

3. OF + lots + stock PF + QR  
4. Essais + comparaison complète  
5. Commercial + alertes + Centre + Assistant  
6. Reporting + permissions avancées + audit + tests E2E  
