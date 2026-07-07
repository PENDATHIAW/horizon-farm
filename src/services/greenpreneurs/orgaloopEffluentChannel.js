import {
  ORGALOOP_EFFLUENT_CHANNEL,
} from '../../config/derfjGreenpreneurs.config.js';
import { classifySaleActivity } from '../growthDecisionEngine.js';
import { toNumber } from '../../utils/format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const EFFLUENT_WORDS = ['fumier', 'fiente', 'fientes', 'litiere', 'litière', 'compost', 'effluent', 'engrais organique', 'bouse'];

function rowText(row = {}) {
  return norm(`${row.title || ''} ${row.nom || ''} ${row.product_name || ''} ${row.libelle || ''} ${row.description || ''} ${row.notes || ''} ${row.canal || ''} ${row.channel || ''} ${row.marketplace || ''} ${row.client_name || ''}`);
}

export function isOrgaloopHybridStrategy() {
  return ORGALOOP_EFFLUENT_CHANNEL.strategy === 'hybride_surplus_orgaloop';
}

export function isOrgaloopDirectSaleStrategy() {
  return ORGALOOP_EFFLUENT_CHANNEL.strategy === 'vente_directe_orgaloop';
}

export function isOrgaloopChannelEnabled() {
  return isOrgaloopHybridStrategy() || isOrgaloopDirectSaleStrategy();
}

export function isOrgaloopTagged(row = {}) {
  const tags = ORGALOOP_EFFLUENT_CHANNEL.saleChannelTags.map(norm);
  const text = rowText(row);
  return tags.some((tag) => text.includes(tag)) || text.includes('orgaloop');
}

export function isEffluentProduct(row = {}) {
  const activity = classifySaleActivity(row, {});
  if (activity.startsWith('fumier_')) return true;
  const text = rowText(row);
  return EFFLUENT_WORDS.some((w) => text.includes(norm(w)));
}

/** Vente effluent explicitement taguée Orgaloop (canal / marketplace). */
export function isOrgaloopEffluentSale(row = {}) {
  return isEffluentProduct(row) && isOrgaloopTagged(row);
}

function orderAmount(row = {}) {
  return toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
}

function orderQty(row = {}) {
  return toNumber(row.quantity ?? row.quantite ?? row.fumier_sacs ?? 1);
}

function saleKg(row = {}) {
  const sacs = orderQty(row);
  const isSacs = norm(`${row.unit || row.unite || ''}`).includes('sac') || row.fumier_sacs;
  return isSacs ? sacs * 25 : sacs;
}

function eventKg(event = {}) {
  const sacs = toNumber(event.fumier_sacs);
  if (sacs > 0) return sacs * 25;
  const qty = toNumber(event.quantity ?? event.qty);
  const unit = norm(`${event.unit || ''}`);
  if (unit.includes('sac')) return qty * 25;
  return qty;
}

function eventAmount(event = {}) {
  return toNumber(event.montant ?? event.amount ?? event.estimated_value_fcfa);
}

/** IDs de liaison event → sales_order pour déduplication. */
export function eventLinkedSaleIds(event = {}) {
  const ids = [
    event.source_record_id,
    event.entity_id,
    event.sale_id,
    event.order_id,
    event.related_id,
    event.linked_order_id,
  ].filter(Boolean).map((id) => String(id));
  return [...new Set(ids)];
}

export function isOrgaloopTraceEvent(event = {}) {
  const type = norm(event.event_type);
  return type === 'effluent_vendu_orgaloop'
    || (type.includes('orgaloop') && isEffluentProduct(event))
    || (isEffluentProduct(event) && isOrgaloopTagged(event));
}

/** Event déjà couvert par une sales_order comptée. */
export function isEventLinkedToCountedSale(event = {}, countedSaleIds = new Set()) {
  return eventLinkedSaleIds(event).some((id) => countedSaleIds.has(id));
}

/**
 * Surplus effluent (kg) après fertilisation interne et ventes Orgaloop déjà tracées.
 */
export function computeEffluentSurplusKg(circular = {}) {
  const disponibleKg = Math.round(
    (circular.fumierBovin?.availableKg || 0)
    + (circular.fientesPondeuses?.availableKg || 0)
    + (circular.compost?.availableKg || 0),
  );
  const usedInternal = circular.usedOnCulturesKg || 0;
  const soldOrgaloop = circular.orgaloop?.soldKg || 0;
  return Math.max(0, disponibleKg - usedInternal - soldOrgaloop);
}

/**
 * Métriques vente fumier/fientes via Orgaloop.
 * sales_orders = source principale CA / kg / ventes ; events = trace si non liés à une commande.
 */
export function computeOrgaloopEffluentMetrics(dataMap = {}) {
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders);
  const events = arr(dataMap.business_events || dataMap.businessEvents);
  const payments = arr(dataMap.payments);

  const orgaloopSales = sales.filter(isOrgaloopEffluentSale);
  const orgaloopEvents = events.filter(isOrgaloopTraceEvent);
  const countedSaleIds = new Set(orgaloopSales.map((row) => String(row.id)));

  const soldKgFromSales = orgaloopSales.reduce((sum, row) => sum + saleKg(row), 0);
  const revenueFromSales = orgaloopSales.reduce((sum, row) => sum + orderAmount(row), 0);

  const orphanEvents = orgaloopEvents.filter((event) => !isEventLinkedToCountedSale(event, countedSaleIds));
  const soldKgFromOrphanEvents = orphanEvents.reduce((sum, event) => sum + eventKg(event), 0);
  const revenueFromOrphanEvents = orphanEvents.reduce((sum, event) => sum + eventAmount(event), 0);

  const soldKg = soldKgFromSales + soldKgFromOrphanEvents;
  const revenueFcfa = revenueFromSales + revenueFromOrphanEvents;

  const collectedPayments = payments.filter((p) =>
    orgaloopSales.some((sale) => String(sale.id) === String(p.sale_id || p.order_id || p.related_id)),
  );
  const encaisseFcfa = collectedPayments.reduce((sum, p) => sum + toNumber(p.montant_paye ?? p.montant), 0);

  const strategy = ORGALOOP_EFFLUENT_CHANNEL.strategy;
  const platformName = ORGALOOP_EFFLUENT_CHANNEL.platformName;
  const hybrid = isOrgaloopHybridStrategy();

  return {
    platformName,
    strategy,
    strategyLabel: ORGALOOP_EFFLUENT_CHANNEL.strategyLabel,
    isHybridStrategy: hybrid,
    isPrimaryChannel: isOrgaloopDirectSaleStrategy(),
    internalFertilizationPriority: ORGALOOP_EFFLUENT_CHANNEL.internalFertilizationPriority !== false,
    soldKg,
    soldKgFromSales,
    soldKgFromOrphanEvents,
    soldSacs: Math.round(soldKg / 25),
    revenueFcfa,
    revenueFromSales,
    revenueFromOrphanEvents,
    encaisseFcfa,
    salesCount: orgaloopSales.length,
    eventsCount: orgaloopEvents.length,
    orphanEventsCount: orphanEvents.length,
    deduplicatedEventsCount: orgaloopEvents.length - orphanEvents.length,
    hasSales: soldKg > 0 || orgaloopSales.length > 0,
    advice: hybrid
      ? (soldKg > 0
        ? `${fmtAdvice(soldKg)} vendus sur ${platformName} (surplus après cultures).`
        : `Priorité fertilisation cultures — surplus à publier sur ${platformName}.`)
      : (soldKg > 0
        ? `${fmtAdvice(soldKg)} déjà tracé(s) — vente ${platformName}.`
        : `Collecte biosécurité → publication sur ${platformName}.`),
  };
}

function fmtAdvice(kg) {
  return `${Math.round(kg)} kg`;
}

export function buildOrgaloopEffluentOpportunity({ profile = 'mixte', sacs = 0, stockId = '', surplus = false } = {}) {
  const label = profile === 'pondeuses' ? 'Fientes pondeuses' : profile === 'bovins' ? 'Fumier bovin' : profile === 'chair' ? 'Litière chair' : 'Fumier / effluent';
  const platform = ORGALOOP_EFFLUENT_CHANNEL.platformName;
  const hybridNote = isOrgaloopHybridStrategy()
    ? 'Surplus après couverture besoins cultures Horizon Farm — '
    : '';
  return {
    title: surplus || isOrgaloopHybridStrategy()
      ? `${label} — surplus ${platform}`
      : `${label} — vente ${platform}`,
    opportunity_type: 'stock',
    source_type: 'stock',
    source_id: stockId,
    phase: 'actuelle',
    statut_activite: 'vente_orgaloop',
    activity_type: 'effluent_orgaloop',
    canal: 'orgaloop',
    marketplace: 'orgaloop',
    notes: `${hybridNote}Publication sur ${platform} — ${ORGALOOP_EFFLUENT_CHANNEL.strategyLabel}`,
    quantity: sacs,
    quantite: sacs,
    unit: 'sac',
    unite: 'sac',
    status: 'a_traiter',
    statut: 'a_traiter',
    created_from: 'orgaloop_effluent_channel',
  };
}

/** Opportunité modèle pour le pipeline commercial. */
export const ORGALOOP_EFFLUENT_OPPORTUNITY_TEMPLATE = {
  title: 'Fumier & fientes — surplus Orgaloop',
  opportunity_type: 'stock',
  source_type: 'libre',
  phase: 'actuelle',
  statut_activite: 'vente_orgaloop',
  activity_type: 'effluent_orgaloop',
  canal: 'orgaloop',
  marketplace: 'orgaloop',
  notes: 'Surplus effluent après fertilisation cultures — vente plateforme Orgaloop.',
  created_from: 'orgaloop_effluent_channel',
  status: 'a_traiter',
  statut: 'a_traiter',
};
