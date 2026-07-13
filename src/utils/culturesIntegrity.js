/**
 * Écarts chantier 5 - cultures / stock / commercial / finance.
 */

import { toNumber } from './format.js';

import { buildCultureIssueKey, CULTURE_DOMAINS } from './culturesWorkflow.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);

const isHarvestStock = (row = {}) => {
  const text = lower(`${row.produit || ''} ${row.categorie || ''} ${row.category || ''}`);
  return text.includes('récolte') || text.includes('recolte') || row.culture_id || row.harvest_record_id || row.stock_key?.startsWith?.('culture-stock');
};

const isCultureSale = (order = {}) =>
  lower(order.source_type || '') === 'stock' && (order.culture_id || order.harvest_record_id)
  || lower(order.source_type || '') === 'culture';

export function buildCulturesGapRows({
  cultures = [],
  stocks = [],
  businessEvents = [],
  transactions = [],
  salesOrders = [],
} = {}) {
  const gaps = [];
  const push = (row) => gaps.push({ severity: 'warning', ...row });

  const harvestEvents = arr(businessEvents).filter((e) =>
    /harvest|recolte|récolte/i.test(`${e.event_type || ''} ${e.type_evenement || ''}`));

  harvestEvents.forEach((evt) => {
    const harvestId = clean(evt.id);
    const cultureId = clean(evt.culture_id || evt.entity_id || evt.related_id);
    const qty = num(evt.quantite ?? evt.quantity);
    if (!cultureId || qty <= 0) return;
    const linkedStock = arr(stocks).find((s) =>
      clean(s.linked_harvest_id) === harvestId
      || clean(s.harvest_record_id) === harvestId
      || (clean(s.culture_id) === cultureId && isHarvestStock(s) && num(s.quantite) >= qty));
    if (!linkedStock && !evt.stock_entry_ref && !evt.side_effects_managed) {
      push({
        issue_key: buildCultureIssueKey(CULTURE_DOMAINS.HARVEST, harvestId, 'sans_stock'),
        title: 'Récolte sans stock',
        detail: `Récolte ${harvestId} : ${qty} unités non entrées en stock.`,
        repair: 'harvest_stock',
        record_id: harvestId,
        culture_id: cultureId,
      });
    }
  });

  arr(stocks).filter(isHarvestStock).forEach((stock) => {
    const cultureId = clean(stock.culture_id || stock.source_record_id);
    const hasHarvest = harvestEvents.some((e) => clean(e.culture_id || e.entity_id) === cultureId)
      || arr(cultures).some((c) => clean(c.id) === cultureId && num(c.quantite_recoltee) > 0);
    if (num(stock.quantite) > 0 && cultureId && !hasHarvest && !stock.side_effects_managed) {
      push({
        issue_key: buildCultureIssueKey('stock', stock.id, 'sans_recolte'),
        title: 'Stock culture sans récolte',
        detail: `${stock.produit || stock.id} sans journal de récolte lié.`,
        repair: 'stock_harvest_link',
        record_id: stock.id,
        culture_id: cultureId,
      });
    }
  });

  arr(salesOrders).filter(isCultureSale).forEach((order) => {
    const orderId = clean(order.id);
    const qty = num(order.quantity ?? order.quantite);
    const stockId = clean(order.source_id);
    const hasStockOut = arr(businessEvents).some((e) =>
      clean(e.linked_order_id) === orderId
      && /sortie_stock|vente/i.test(`${e.event_type || ''}`));
    const stock = arr(stocks).find((s) => clean(s.id) === stockId);
    if (orderId && qty > 0 && stockId && !hasStockOut && stock && num(stock.quantite) >= qty) {
      push({
        issue_key: buildCultureIssueKey(CULTURE_DOMAINS.SALE, orderId, 'sans_sortie_stock'),
        title: 'Vente culture sans sortie stock',
        detail: `Commande ${orderId} : sortie stock non tracée.`,
        repair: 'sale_stock_out',
        record_id: orderId,
        stock_id: stockId,
      });
    }
  });

  arr(transactions).forEach((trx) => {
    const cultureId = clean(trx.related_id || trx.source_record_id);
    const isCultureCharge = lower(trx.categorie || '').includes('culture')
      || lower(trx.module_lie || '') === 'cultures';
    if (isCultureCharge && cultureId && !arr(cultures).some((c) => clean(c.id) === cultureId)) {
      push({
        issue_key: buildCultureIssueKey(CULTURE_DOMAINS.EXPENSE, trx.id, 'orpheline'),
        title: 'Dépense culture non liée',
        detail: `Transaction ${trx.id} sans fiche culture ${cultureId}.`,
        repair: 'expense_link',
        record_id: trx.id,
      });
    }
  });

  arr(cultures).filter((c) => clean(c.record_type || c.type_fiche || 'culture') === 'culture').forEach((culture) => {
    const revenue = num(culture.revenu_reel ?? culture.revenu_estime);
    const cost = num(culture.cout_total_reel) || num(culture.cout_semences) + num(culture.cout_engrais) + num(culture.cout_eau) + num(culture.cout_main_oeuvre) + num(culture.cout_traitement);
    const sold = num(culture.quantite_vendue);
    const harvested = num(culture.quantite_recoltee);
    if (harvested > 0 && revenue <= 0 && sold <= 0 && cost > 0) {
      push({
        issue_key: buildCultureIssueKey('marge', culture.id, 'incomplete'),
        title: 'Rentabilité culture incomplète',
        detail: `${culture.nom || culture.id} : coûts sans revenu vente.`,
        repair: 'margin_review',
        record_id: culture.id,
      });
    }
  });

  return gaps;
}
