/**
 * Intégrité du grand livre de stock (feuille de route HF-P1-002).
 *
 * Le stock tient un journal append-only (table stock_movements) : chaque
 * mouvement porte le solde avant, le solde après et le delta. Rien ne vérifiait
 * jusqu'ici que cette chaîne reste cohérente. Ce moteur PUR reconstitue la
 * chaîne d'un article et signale les ruptures silencieuses :
 *
 *  - rupture de chaîne : le solde avant d'un mouvement ne colle pas au solde
 *    après du mouvement précédent (un mouvement a été supprimé ou inséré) ;
 *  - delta incohérent : stock_delta ne vaut pas (après - avant), ou son ampleur
 *    ne colle pas à la quantité, ou son signe contredit le type de mouvement ;
 *  - solde final incohérent : le dernier solde après ne colle pas à la quantité
 *    réellement stockée sur l'article (le journal et l'article divergent) ;
 *  - doublon : deux mouvements partagent la même clé de dédoublonnage.
 *
 * Aucune dépendance : testable en CI et réutilisable par le centre de santé.
 */

export const LEDGER_ANOMALY = Object.freeze({
  CHAIN_BREAK: 'rupture_chaine',
  DELTA_MISMATCH: 'delta_incoherent',
  BALANCE_MISMATCH: 'solde_incoherent',
  DUPLICATE: 'doublon',
});

const DEFAULT_EPSILON = 1e-6;

const num = (value = 0) => Number(value || 0) || 0;
const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value ?? '').trim();

/** Quantité réellement stockée sur un article (champ selon la source). */
export function stockQuantityOf(stock = {}) {
  return num(stock?.quantite ?? stock?.quantity ?? stock?.stock);
}

/**
 * Clé de tri reconstituant l'ordre d'application des mouvements. On privilégie
 * created_at (horodatage d'insertion à pleine précision, qui a produit les
 * soldes avant/après) puis, à défaut, la date de mouvement, puis l'identifiant.
 */
function ledgerSortKey(movement = {}) {
  const primary = clean(movement.created_at) || clean(movement.movement_date);
  return `${primary}~${clean(movement.id)}`;
}

function sortLedger(movements) {
  return [...arr(movements)].sort((a, b) => {
    const ka = ledgerSortKey(a);
    const kb = ledgerSortKey(b);
    if (ka === kb) return 0;
    return ka < kb ? -1 : 1;
  });
}

/** Signe attendu du delta selon le type de mouvement (0 = non contraint). */
function expectedSign(movementType) {
  const type = clean(movementType).toLowerCase();
  if (type === 'entree') return 1;
  if (type === 'sortie' || type === 'perte') return -1;
  return 0;
}

/**
 * Vérifie le grand livre d'un article. Renvoie la liste des anomalies (vide si
 * la chaîne est intègre) et quelques repères de reconstitution.
 *
 * @param {object} stock article de stock (pour la quantité de référence)
 * @param {Array} movements mouvements de cet article
 * @param {object} [options]
 * @param {number} [options.epsilon] tolérance sur les comparaisons numériques
 */
export function verifyStockLedger(stock = {}, movements = [], { epsilon = DEFAULT_EPSILON } = {}) {
  const rows = sortLedger(movements);
  const anomalies = [];
  const seenDedupe = new Map();
  const stockId = stock?.id ?? (rows[0] ? rows[0].stock_id : null) ?? null;

  let previousAfter = null;
  let openingBalance = null;
  let closingBalance = null;

  rows.forEach((movement) => {
    const before = num(movement.stock_before);
    const after = num(movement.stock_after);
    const delta = num(movement.stock_delta);
    const qty = num(movement.quantity);
    const movementId = movement.id ?? null;

    if (openingBalance === null) openingBalance = before;
    closingBalance = after;

    const dedupe = clean(movement.dedupe_key);
    if (dedupe) {
      if (seenDedupe.has(dedupe)) {
        anomalies.push({ type: LEDGER_ANOMALY.DUPLICATE, movementId, dedupeKey: dedupe, firstMovementId: seenDedupe.get(dedupe) });
      } else {
        seenDedupe.set(dedupe, movementId);
      }
    }

    if (previousAfter !== null && Math.abs(before - previousAfter) > epsilon) {
      anomalies.push({ type: LEDGER_ANOMALY.CHAIN_BREAK, movementId, expectedBefore: previousAfter, foundBefore: before });
    }

    if (Math.abs(delta - (after - before)) > epsilon) {
      anomalies.push({ type: LEDGER_ANOMALY.DELTA_MISMATCH, movementId, reason: 'delta_vs_solde', delta, expectedDelta: after - before });
    } else if (Math.abs(Math.abs(delta) - qty) > epsilon) {
      anomalies.push({ type: LEDGER_ANOMALY.DELTA_MISMATCH, movementId, reason: 'quantite_vs_delta', quantity: qty, delta });
    } else {
      const sign = expectedSign(movement.movement_type);
      if (sign !== 0 && Math.abs(delta) > epsilon && Math.sign(delta) !== sign) {
        anomalies.push({ type: LEDGER_ANOMALY.DELTA_MISMATCH, movementId, reason: 'sens', movementType: clean(movement.movement_type), delta });
      }
    }

    previousAfter = after;
  });

  if (rows.length > 0) {
    const currentQty = stockQuantityOf(stock);
    if (Math.abs(closingBalance - currentQty) > epsilon) {
      anomalies.push({ type: LEDGER_ANOMALY.BALANCE_MISMATCH, expectedBalance: currentQty, foundBalance: closingBalance });
    }
  }

  return {
    stockId,
    movementCount: rows.length,
    openingBalance: openingBalance ?? 0,
    closingBalance: closingBalance ?? 0,
    anomalies,
    ok: anomalies.length === 0,
  };
}

/**
 * Audite tous les articles fournis. Regroupe les mouvements par stock_id, lance
 * verifyStockLedger sur chacun et renvoie les articles porteurs d'anomalies plus
 * une synthèse par type. Les mouvements orphelins (stock_id absent de la liste
 * d'articles) sont comptés à part pour ne pas passer inaperçus.
 */
export function auditStockLedgers(stocks = [], movements = [], options = {}) {
  const stockList = arr(stocks);
  const byStock = new Map();
  for (const movement of arr(movements)) {
    const key = clean(movement.stock_id);
    if (!key) continue;
    if (!byStock.has(key)) byStock.set(key, []);
    byStock.get(key).push(movement);
  }

  const results = [];
  const seenStockIds = new Set();
  for (const stock of stockList) {
    const key = clean(stock?.id);
    seenStockIds.add(key);
    const result = verifyStockLedger(stock, byStock.get(key) || [], options);
    if (!result.ok) results.push(result);
  }

  let orphanMovements = 0;
  for (const [key, list] of byStock.entries()) {
    if (!seenStockIds.has(key)) orphanMovements += list.length;
  }

  const anomalyCounts = { [LEDGER_ANOMALY.CHAIN_BREAK]: 0, [LEDGER_ANOMALY.DELTA_MISMATCH]: 0, [LEDGER_ANOMALY.BALANCE_MISMATCH]: 0, [LEDGER_ANOMALY.DUPLICATE]: 0 };
  for (const result of results) {
    for (const anomaly of result.anomalies) anomalyCounts[anomaly.type] += 1;
  }

  const totalAnomalies = results.reduce((sum, r) => sum + r.anomalies.length, 0);
  return {
    ok: results.length === 0 && orphanMovements === 0,
    stocksAudited: stockList.length,
    stocksWithAnomalies: results.length,
    totalAnomalies,
    orphanMovements,
    anomalyCounts,
    results,
  };
}

export default auditStockLedgers;
