# Fiche audit · AGRI FEEDS (flag off par défaut)

Entry point : `AgriFeedsModule.jsx` (flag `agri_feeds`, désactivé par défaut).
Onglets réels : Tableau de bord · Référence Phase 1 · Matières & fournisseurs ·
Formulations · Production · Tests & comparaison · Commercial · Qualité & reporting.
**Proche de la cible** (Vue d'ensemble · Matières & fournisseurs [vue] ·
Formulations · Production · Essais & performance · Qualité · Commercial [vue] ·
Coûts & décisions).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Tableau de bord | 3/5 | 4/5 | 4/5 | 4/5 | n/a | 4/5 | **3,7/5** |
| Référence Phase 1 | 3/5 | 3/5 | 4/5 | 4/5 | n/a | 4/5 | **3,5/5** |
| Matières & fournisseurs | 3/5 | 4/5 | 4/5 | 4/5 | n/a | 3/5 | **3,5/5** |
| Formulations | 4/5 | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | **3,8/5** |
| Production | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 | 4/5 | **4,0/5** |
| Tests & comparaison | 3/5 | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | **3,7/5** |
| Commercial | 3/5 | 3/5 | 4/5 | 4/5 | 3/5 | 3/5 | **3,3/5** |
| Qualité & reporting | 3/5 | 4/5 | 4/5 | 4/5 | n/a | 4/5 | **3,7/5** |

## Points
- **Flag** : désactivé par défaut ; vérifier zéro import/route/requête quand off
  (couvert par test `moduleAliasesEtFlags`). Bon.
- **Matières & fournisseurs / Commercial** doivent être des **vues filtrées**
  d'Achats & Stock / Commercial, sans table propre. `feed_raw_materials` existe
  comme table dédiée — **à vérifier** : le cahier veut les matières comme catégorie
  de produits d'Achats & Stock, pas une table à part (tension à trancher).
- **Formule figée par version, total 100 %** : `formulaLifecycleService.js` gère le
  cycle ; vérifier la tolérance et le blocage vente sans lot libéré.
- **Ordre de fabrication idempotent** : une clôture produit une seule sortie
  matières + une seule entrée produit fini même après rejeu — à confirmer par test.
- **Reporting** : bien renommé « Qualité & reporting » (le mot IA a été retiré des
  panneaux, chantier 1).

## Corrections prioritaires
1. Trancher matières = catégorie Achats & Stock vs table `feed_*` propre.
2. Test d'idempotence de l'ordre de fabrication.
