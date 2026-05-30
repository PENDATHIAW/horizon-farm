import { fmtCurrency, toNumber } from './format';
import { deliveryFeeOf } from './saleQuantityLabel';

const clean = (value = '') => String(value || '').trim();

export const SALES_MARGIN_FORMULA = 'Marge = Total vente − coût direct unique. Coût direct = production (lot, animal, stock ou culture) + livraison client (seulement si mode livraison ET montant renseigné ; retrait sur place = 0 FCFA) + pertes éventuelles.';

export function saleLossCostOf(order = {}) {
  return toNumber(order.cout_casse ?? order.cout_pertes ?? order.loss_cost ?? 0);
}

export function saleExtrasOf(order = {}, deliveries = []) {
  const deliveryCost = deliveryFeeOf(order, deliveries);
  const lossCost = saleLossCostOf(order);
  return { deliveryCost, lossCost, totalExtras: deliveryCost + lossCost };
}

export function saleTotalOf(order = {}) {
  return toNumber(order.montant_total ?? order.total ?? order.amount ?? order.chiffre_affaires ?? 0);
}

export function productAmountOf(order = {}, deliveries = []) {
  const ht = toNumber(order.montant_ht ?? order.subtotal ?? 0);
  if (ht > 0) return ht;
  const total = saleTotalOf(order);
  const { totalExtras } = saleExtrasOf(order, deliveries);
  return Math.max(0, total - totalExtras);
}

const costSourceLabels = {
  cout_tablettes_journalier_reel: 'Lot pondeuse',
  cout_oeufs_indisponible: 'Œufs',
  cout_lot_reel: 'Lot avicole',
  cout_lot_indisponible: 'Lot avicole',
  cout_embouche_reel: 'Animal',
  cout_embouche_indisponible: 'Animal',
  cout_stock_reel: 'Stock',
  cout_stock_indisponible: 'Stock',
  cout_culture_unitaire_reel: 'Culture',
  cout_culture_total_reel: 'Culture',
  cout_culture_indisponible: 'Culture',
  cout_saisi: 'Coût saisi',
  cout_indisponible: 'Source',
};

function productionLineLabel(marginRow = {}) {
  const source = clean(marginRow.cout_source || '');
  if (costSourceLabels[source]) return costSourceLabels[source];
  if (marginRow.source_label) return marginRow.source_label;
  return 'Production';
}

export function costBreakdownOf(marginRow = {}, order = {}, deliveries = []) {
  const detail = marginRow.cout_detail || {};
  const total = Math.max(0, toNumber(marginRow.cout_revient ?? marginRow.cout_direct ?? 0));
  const deliveryCost = Math.max(0, toNumber(detail.deliveryCost ?? detail.transportSaleCost ?? saleExtrasOf(order, deliveries).deliveryCost));
  const lossCost = Math.max(0, toNumber(detail.lossCost ?? detail.lossSaleCost ?? saleLossCostOf(order)));
  const productionCost = Math.max(0, toNumber(detail.productionCost ?? (total - deliveryCost - lossCost)));

  const lines = [];
  if (toNumber(detail.eggCost) > 0) lines.push({ key: 'eggs', label: 'Œufs', amount: toNumber(detail.eggCost) });
  if (toNumber(detail.packagingCost) > 0) lines.push({ key: 'packaging', label: 'Emballage', amount: toNumber(detail.packagingCost) });

  const namedProduction = lines.reduce((sum, line) => sum + line.amount, 0);
  const remainingProduction = Math.max(0, productionCost - namedProduction);
  if (remainingProduction > 0) {
    lines.unshift({ key: 'production', label: productionLineLabel(marginRow), amount: remainingProduction });
  } else if (!lines.length && productionCost > 0) {
    lines.push({ key: 'production', label: productionLineLabel(marginRow), amount: productionCost });
  }

  if (deliveryCost > 0) lines.push({ key: 'delivery', label: 'Livraison', amount: deliveryCost });
  if (lossCost > 0) lines.push({ key: 'losses', label: 'Pertes', amount: lossCost });

  return {
    lines,
    productionCost,
    deliveryCost,
    lossCost,
    total: productionCost + deliveryCost + lossCost,
  };
}

export function costBreakdownTooltip(breakdown) {
  if (!breakdown?.lines?.length) return '';
  return breakdown.lines.map((line) => `${line.label} ${fmtCurrency(line.amount)}`).join(' · ');
}

export function costBreakdownShort(breakdown, maxParts = 2) {
  if (!breakdown?.lines?.length) return '';
  return breakdown.lines.slice(0, maxParts).map((line) => `${line.label} ${fmtCurrency(line.amount)}`).join(' · ');
}
