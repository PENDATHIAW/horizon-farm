/**
 * Achats & Stock V2 — péremption / DLC opérationnelle.
 */

import {
  daysUntilDlc,
  dlcAlertLevel,
  isCommerciallyBlocked,
  requiresDlc,
} from './stockFreshProduct.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const n = (value) => toNumber(value);
const label = (row = {}) => row.produit || row.name || row.nom || row.id || 'Produit';

export const EXPIRY_RISK_LEVELS = {
  expired: 'expired',
  critical: 'critical',
  warning: 'warning',
  ok: 'ok',
  missing: 'missing',
  none: 'none',
};

export function expiryRiskLevel(row = {}, referenceDate = new Date()) {
  const level = dlcAlertLevel(row, referenceDate);
  if (level === 'black') return EXPIRY_RISK_LEVELS.expired;
  if (level === 'red') return EXPIRY_RISK_LEVELS.critical;
  if (level === 'orange') return EXPIRY_RISK_LEVELS.warning;
  if (level === 'missing') return EXPIRY_RISK_LEVELS.missing;
  if (level === 'none') return EXPIRY_RISK_LEVELS.none;
  return EXPIRY_RISK_LEVELS.ok;
}

export function recommendedExpiryAction(row = {}, referenceDate = new Date()) {
  const risk = expiryRiskLevel(row, referenceDate);
  const sellable = row.vendable !== false && row.is_sellable !== false;
  if (risk === EXPIRY_RISK_LEVELS.expired) {
    return { action: 'mark_loss', label: 'Marquer comme perdu', severity: 'high' };
  }
  if (risk === EXPIRY_RISK_LEVELS.critical) {
    return sellable
      ? { action: 'quick_sale', label: 'Vente rapide recommandée', severity: 'high' }
      : { action: 'mark_loss', label: 'Sortie perte recommandée', severity: 'high' };
  }
  if (risk === EXPIRY_RISK_LEVELS.warning) {
    return sellable
      ? { action: 'promote_sale', label: 'Prioriser la vente', severity: 'medium' }
      : { action: 'create_alert', label: 'Créer alerte péremption', severity: 'medium' };
  }
  if (risk === EXPIRY_RISK_LEVELS.missing && requiresDlc(row)) {
    return { action: 'set_dlc', label: 'Renseigner la DLC', severity: 'low' };
  }
  return { action: 'none', label: 'Aucune action', severity: 'none' };
}

export function buildExpirySnapshot(stocks = [], referenceDate = new Date()) {
  const rows = arr(stocks)
    .filter((row) => n(row.quantite ?? row.quantity) > 0)
    .map((row) => {
      const daysLeft = daysUntilDlc(row, referenceDate);
      const risk = expiryRiskLevel(row, referenceDate);
      const blocked = isCommerciallyBlocked(row);
      return {
        id: row.id,
        label: label(row),
        qty: n(row.quantite ?? row.quantity),
        unit: row.unite || row.unit || '',
        dlc: row.date_peremption || row.dlc || row.date_limite_consommation || '',
        daysLeft,
        risk,
        blocked,
        vendable: row.vendable !== false && row.is_sellable !== false,
        farmId: row.farm_id || null,
        recommended: recommendedExpiryAction(row, referenceDate),
      };
    })
    .filter((row) => row.risk !== EXPIRY_RISK_LEVELS.none);

  return {
    expired: rows.filter((row) => row.risk === EXPIRY_RISK_LEVELS.expired),
    soon: rows.filter((row) => row.risk === EXPIRY_RISK_LEVELS.critical || row.risk === EXPIRY_RISK_LEVELS.warning),
    missingDlc: rows.filter((row) => row.risk === EXPIRY_RISK_LEVELS.missing),
    all: rows.sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999)),
  };
}

/** Prépare patch perte depuis péremption (sans suppression auto). */
export function buildExpiryLossPatch(stock = {}, reason = 'Péremption') {
  const qty = n(stock.quantite ?? stock.quantity);
  if (!stock.id || qty <= 0) return null;
  return {
    quantite: 0,
    quantity: 0,
    last_movement_type: 'perte',
    last_movement_qty: qty,
    last_movement_label: reason,
    last_movement_note: reason,
    statut: 'perime',
    stock_status: 'perime',
    skip_stock_movement_event: false,
  };
}
