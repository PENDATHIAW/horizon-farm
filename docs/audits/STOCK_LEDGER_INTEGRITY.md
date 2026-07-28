# Intégrité du grand livre de stock (HF-P1-002)

Objectif (feuille de route) : garantir que le journal des mouvements de stock
(`stock_movements`) reste un grand livre **append-only** cohérent, et rendre
visible toute rupture silencieuse (mouvement supprimé, delta trafiqué, solde
divergent).

## Ce qui est livré

- **`src/services/stockLedgerIntegrity.js`** *(moteur pur, sans dépendance)* —
  reconstitue la chaîne des mouvements d'un article et détecte quatre familles
  d'anomalies :
  - `rupture_chaine` : le solde avant d'un mouvement ne colle pas au solde après
    du mouvement précédent (un maillon a été retiré ou inséré) ;
  - `delta_incoherent` : `stock_delta` ne vaut pas `après - avant`, ou son
    ampleur ne colle pas à la quantité, ou son signe contredit le type
    (`entree` positif, `sortie`/`perte` négatif) ;
  - `solde_incoherent` : le dernier solde après diverge de la quantité stockée
    sur l'article ;
  - `doublon` : deux mouvements partagent la même clé de dédoublonnage.

  API : `verifyStockLedger(stock, movements)` (un article),
  `auditStockLedgers(stocks, movements)` (tous les articles, + comptage des
  mouvements orphelins dont le `stock_id` n'a pas d'article).

- **Câblage centre de santé** — `evaluateErpHealth` accepte désormais `stocks` et
  `stockMovements` (ou les lit depuis `dataMap.stock` / `dataMap.stock_movements`)
  et ajoute un contrôle `stock_ledger`. Le contrôle ne s'affiche que si des
  mouvements sont fournis, pour ne pas produire de faux signal.

## Reconstitution de l'ordre

La chaîne est reconstituée par `created_at` (horodatage d'insertion à pleine
précision, celui qui a produit les soldes avant/après), puis `movement_date`,
puis l'identifiant. Une entrée désordonnée est donc réordonnée avant contrôle.

## Tolérance

Les comparaisons numériques utilisent une tolérance (`1e-6`) pour éviter les faux
positifs liés aux décimales (par exemple 0,1 + 0,2 en flottant).

## Suite possible

- Contrôle périodique côté serveur et blocage des mises à jour/suppressions
  directes sur `stock_movements` (durcissement append-only au niveau base).
- Bouton de reconstruction du solde à partir du journal quand un écart est
  détecté.
