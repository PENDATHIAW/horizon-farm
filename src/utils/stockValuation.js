/**
 * Achats & Stock V2 - CMUP / coût moyen pondéré et valorisation.
 */

import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => toNumber(value);
const clean = (value) => String(value || '').trim();
const low = (value) => clean(value).toLowerCase();

function stockQty(row = {}) {
  return n(row.quantite ?? row.quantity ?? row.stock);
}

function unitPrice(row = {}) {
  return n(row.prix_unitaire ?? row.unit_price ?? row.price ?? row.cout_unitaire);
}

function isPurchaseEntry(movement = {}) {
  const kind = low(movement.metadata?.movement_kind || movement.source_module || '');
  const type = low(movement.movement_type || '');
  return type === 'entree' || kind.includes('reception') || kind.includes('achat');
}

/** Entrées achat du ledger pour un article. */
export function purchaseEntriesForStock(stockId = '', movements = []) {
  return arr(movements).filter((row) => String(row.stock_id) === String(stockId) && isPurchaseEntry(row));
}

/** Dernier prix d'achat connu depuis mouvements ou fiche stock. */
export function lastPurchasePrice(stock = {}, movements = [], transactions = []) {
  const stockId = clean(stock.id);
  const entries = purchaseEntriesForStock(stockId, movements)
    .sort((a, b) => String(b.movement_date || b.created_at).localeCompare(String(a.movement_date || a.created_at)));

  if (entries.length) {
    const last = entries[0];
    const qty = n(last.quantity);
    const total = n(last.metadata?.montant ?? last.metadata?.unit_cost) * qty;
    if (n(last.metadata?.unit_cost) > 0) return n(last.metadata.unit_cost);
    if (total > 0 && qty > 0) return total / qty;
  }

  const trx = arr(transactions)
    .filter((row) => String(row.stock_id || row.related_id) === stockId || low(row.libelle || '').includes(low(stock.produit || stock.name || '')))
    .filter((row) => /achat|reception|réception|stock/.test(low(`${row.categorie} ${row.libelle}`)))
    .sort((a, b) => String(b.date || b.created_at).localeCompare(String(a.date || a.created_at)));

  if (trx.length) {
    const amount = n(trx[0].montant ?? trx[0].amount);
    const qty = stockQty(stock) || n(trx[0].quantite);
    if (amount > 0 && qty > 0) return amount / qty;
  }

  return unitPrice(stock);
}

/**
 * Coût moyen pondéré simple à partir des entrées ledger.
 * Retourne { avgCost, calculable, reason, lastPrice, stockValue }.
 */
export function computeWeightedAverageCost(stock = {}, movements = [], transactions = []) {
  const stockId = clean(stock.id);
  const qty = stockQty(stock);
  const lastPrice = lastPurchasePrice(stock, movements, transactions);
  const entries = purchaseEntriesForStock(stockId, movements);

  if (!entries.length && lastPrice <= 0) {
    return {
      avgCost: null,
      calculable: false,
      reason: 'Coût moyen non calculable : achats insuffisants.',
      lastPrice: null,
      stockValue: 0,
    };
  }

  let totalQty = 0;
  let totalCost = 0;
  entries.forEach((entry) => {
    const entryQty = n(entry.quantity);
    const cost = n(entry.metadata?.unit_cost) || (entryQty > 0 ? n(entry.metadata?.montant) / entryQty : 0) || lastPrice;
    if (entryQty > 0 && cost > 0) {
      totalQty += entryQty;
      totalCost += entryQty * cost;
    }
  });

  const avgCost = totalQty > 0 ? totalCost / totalQty : (lastPrice > 0 ? lastPrice : null);
  const calculable = avgCost != null && avgCost > 0;

  return {
    avgCost: calculable ? avgCost : null,
    calculable,
    reason: calculable ? '' : 'Coût moyen non calculable : achats insuffisants.',
    lastPrice: lastPrice > 0 ? lastPrice : null,
    stockValue: calculable && qty > 0 ? qty * avgCost : (lastPrice > 0 && qty > 0 ? qty * lastPrice : 0),
  };
}

export function summarizeStockValuation(stocks = [], movements = [], transactions = []) {
  const rows = arr(stocks).map((stock) => {
    const valuation = computeWeightedAverageCost(stock, movements, transactions);
    return {
      stockId: stock.id,
      label: stock.produit || stock.name || stock.nom || stock.id,
      qty: stockQty(stock),
      unit: stock.unite || stock.unit || '',
      ...valuation,
    };
  });

  const calculableRows = rows.filter((row) => row.calculable);
  const totalValue = calculableRows.reduce((sum, row) => sum + n(row.stockValue), 0);

  return {
    rows,
    totalValue,
    calculableCount: calculableRows.length,
    totalCount: rows.length,
  };
}
