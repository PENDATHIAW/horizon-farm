/**
 * Commercial V1 P0 — validation disponibilité stock avant vente.
 */

import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value) => toNumber(value);
const clean = (value) => String(value || '').trim();

const NON_STOCK_TYPES = new Set(['service', 'autre', 'other']);

export function isStockableSourceType(sourceType = '') {
  const t = clean(sourceType).toLowerCase();
  return t && !NON_STOCK_TYPES.has(t);
}

function resolveSourceRow(sourceType, sourceId, { stocks = [], lots = [], cultures = [], animaux = [] } = {}) {
  if (!sourceId || !isStockableSourceType(sourceType)) return null;
  if (sourceType === 'stock') return arr(stocks).find((row) => String(row.id) === String(sourceId)) || null;
  if (sourceType === 'lot_avicole') return arr(lots).find((row) => String(row.id) === String(sourceId)) || null;
  if (sourceType === 'culture') return arr(cultures).find((row) => String(row.id) === String(sourceId)) || null;
  if (sourceType === 'animal') return arr(animaux).find((row) => String(row.id) === String(sourceId)) || null;
  return null;
}

export function resolveAvailableQuantity(sourceType = '', sourceRow = null) {
  if (!sourceRow || !isStockableSourceType(sourceType)) return null;

  if (sourceType === 'stock') {
    const qty = num(sourceRow.quantite ?? sourceRow.quantity);
    return Number.isFinite(qty) ? qty : null;
  }
  if (sourceType === 'lot_avicole') {
    const qty = num(
      sourceRow.current_count
      ?? sourceRow.effectif_actuel
      ?? sourceRow.active_count
      ?? sourceRow.effectif_restant
      ?? sourceRow.initial_count
      ?? sourceRow.effectif_initial,
    );
    return Number.isFinite(qty) ? qty : null;
  }
  if (sourceType === 'culture') {
    const qty = num(sourceRow.quantite_disponible ?? sourceRow.quantite_recoltee);
    return Number.isFinite(qty) ? qty : null;
  }
  if (sourceType === 'animal') {
    return 1;
  }
  return null;
}

export function buildStockInsufficientMessage({
  productName = 'Produit',
  available = 0,
  requested = 0,
  unit = 'unité',
} = {}) {
  return `Stock insuffisant : quantité disponible ${available} ${unit}, quantité demandée ${requested}. (${productName})`;
}

/**
 * Valide les lignes de vente contre les sources stockables.
 * Retourne '' si OK, sinon message d'erreur ou d'avertissement.
 */
export function validateSaleStockAvailability(form = {}, sources = {}, options = {}) {
  const lines = arr(form.lines).length
    ? arr(form.lines).filter((line) => clean(line.product_name || line.libelle))
    : [{
      source_type: form.source_type,
      source_id: form.source_id,
      product_name: form.product_name,
      quantity: form.quantity,
      unit: form.unit,
    }];

  for (const line of lines) {
    const sourceType = line.source_type || form.source_type || 'autre';
    const sourceId = line.source_id || form.source_id || '';
    const requested = num(line.quantity ?? line.quantite ?? 0);

    if (!isStockableSourceType(sourceType)) continue;
    if (!sourceId) {
      if (options.strictSourceRequired) return `Source obligatoire pour ${line.product_name || 'la ligne'}.`;
      continue;
    }

    const sourceRow = resolveSourceRow(sourceType, sourceId, sources);
    const available = resolveAvailableQuantity(sourceType, sourceRow);

    if (available == null) {
      if (options.warnOnUnknownAvailability) {
        return `Disponibilité non confirmée pour ${line.product_name || sourceId} — vérifiez la source avant validation.`;
      }
      continue;
    }

    if (requested > available) {
      return buildStockInsufficientMessage({
        productName: line.product_name || sourceRow?.produit || sourceRow?.nom || sourceId,
        available,
        requested,
        unit: line.unit || line.unite || 'unité',
      });
    }
  }

  return '';
}
