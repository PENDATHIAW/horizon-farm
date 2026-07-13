# Fiche audit · Achats & Stock

Entry point : `AchatsStockModule.jsx` → `AchatsStockRecoveredModule.jsx`. Onglets
réels : Inventaire · Réceptions & achats · Fournisseurs & dettes. **Non conforme à
la cible** (7 onglets : Tableau de bord · Produits & catégories · Fournisseurs ·
Achats & réceptions · Stocks & lots · Mouvements · Inventaires).

| Onglet | S | P | C | É | Saisie | Intégrité | Note |
|---|---|---|---|---|---|---|---|
| Inventaire | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Réceptions & achats | 4/5 | 4/5 | 4/5 | 3/5 | 4/5 | 4/5 | **3,8/5** |
| Fournisseurs & dettes | 3/5 | 3/5 | 4/5 | 3/5 | 3/5 | 3/5 | **3,2/5** |

## Points forts
- **Coût moyen calculé, jamais saisi** : la fiche stock se crée sans prix, le prix
  vient de la réception (constaté chantier 1 : « créer fiche stock sans prix,
  utiliser Réception achat »). Conforme.
- **Réception = parcours unique** : stock, finance, mouvement, preuve
  (`AchatsStockPurchasesPanel`, `AchatsStockStartupPanel`). Bon.
- **Mode démarrage** guidé quand pas de données.

## Problèmes
- **Structure** : 3 onglets seulement ; « Mouvements » (journal immuable),
  « Produits & catégories », « Stocks & lots », « Inventaires » (écart/motif/
  responsable) ne sont pas des onglets distincts. La cible impose un journal des
  mouvements immuable et un inventaire conservant écart/motif/responsable.
- **Fournisseurs & dettes** : la dette fournisseur est une donnée Finance ; ici
  elle doit être **lue**, pas recalculée. À vérifier.
- **AGRI FEEDS** : les matières doivent être une **catégorie de produits**, pas une
  table à part — cohérent avec `feed_raw_materials` en base ? À vérifier que
  l'inventaire les affiche comme catégorie.
- **Éditabilité** : catégories/motifs en dur vs référentiels de la ferme.

## Corrections prioritaires
1. Restructurer vers 7 onglets, dont Mouvements (immuable) et Inventaires.
2. Vérifier que la dette fournisseur est lue depuis Finance.
