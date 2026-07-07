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

export function isOrgaloopEffluentSale(row = {}) {
  return isEffluentProduct(row) && (isOrgaloopTagged(row) || ORGALOOP_EFFLUENT_CHANNEL.strategy === 'vente_directe_orgaloop');
}

function orderAmount(row = {}) {
  return toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
}

function orderQty(row = {}) {
  return toNumber(row.quantity ?? row.quantite ?? row.fumier_sacs ?? 1);
}

/**
 * Métriques vente fumier/fientes via Orgaloop (plateforme conjoint).
 */
export function computeOrgaloopEffluentMetrics(dataMap = {}) {
  const sales = arr(dataMap.sales_orders || dataMap.salesOrders);
  const events = arr(dataMap.business_events || dataMap.businessEvents);
  const payments = arr(dataMap.payments);

  const orgaloopSales = sales.filter(isOrgaloopEffluentSale);
  const orgaloopEvents = events.filter((e) => {
    const type = norm(e.event_type);
    return (type.includes('orgaloop') || type === 'effluent_vendu_orgaloop')
      || (isEffluentProduct(e) && isOrgaloopTagged(e));
  });

  const soldKgFromSales = orgaloopSales.reduce((s, row) => {
    const sacs = orderQty(row);
    const isSacs = norm(`${row.unit || row.unite || ''}`).includes('sac') || row.fumier_sacs;
    return s + (isSacs ? sacs * 25 : sacs);
  }, 0);

  const soldKgFromEvents = orgaloopEvents.reduce((s, e) => s + toNumber(e.quantity ?? e.qty ?? e.fumier_sacs), 0);
  const soldKg = soldKgFromSales + soldKgFromEvents;

  const revenueFcfa = orgaloopSales.reduce((s, row) => s + orderAmount(row), 0)
    + orgaloopEvents.reduce((s, e) => s + toNumber(e.montant ?? e.amount ?? e.estimated_value_fcfa), 0);

  const collectedPayments = payments.filter((p) => orgaloopSales.some((sale) => String(sale.id) === String(p.sale_id || p.order_id || p.related_id)));
  const encaisseFcfa = collectedPayments.reduce((s, p) => s + toNumber(p.montant_paye ?? p.montant), 0);

  const strategy = ORGALOOP_EFFLUENT_CHANNEL.strategy;
  const platformName = ORGALOOP_EFFLUENT_CHANNEL.platformName;

  return {
    platformName,
    strategy,
    strategyLabel: ORGALOOP_EFFLUENT_CHANNEL.strategyLabel,
    isPrimaryChannel: strategy === 'vente_directe_orgaloop',
    soldKg,
    soldSacs: Math.round(soldKg / 25),
    revenueFcfa,
    encaisseFcfa,
    salesCount: orgaloopSales.length,
    eventsCount: orgaloopEvents.length,
    hasSales: soldKg > 0 || orgaloopSales.length > 0,
    advice: soldKg > 0
      ? `${fmtAdvice(soldKg)} déjà tracé(s) — vente Orgaloop.`
      : `Collecte biosécurité → publication directe sur ${platformName} (pas de stock longue durée).`,
  };
}

function fmtAdvice(kg) {
  return `${Math.round(kg)} kg`;
}

export function buildOrgaloopEffluentOpportunity({ profile = 'mixte', sacs = 0, stockId = '' } = {}) {
  const label = profile === 'pondeuses' ? 'Fientes pondeuses' : profile === 'bovins' ? 'Fumier bovin' : profile === 'chair' ? 'Litière chair' : 'Fumier / effluent';
  return {
    title: `${label} — vente ${ORGALOOP_EFFLUENT_CHANNEL.platformName}`,
    opportunity_type: 'stock',
    source_type: 'stock',
    source_id: stockId,
    phase: 'actuelle',
    statut_activite: 'vente_orgaloop',
    activity_type: 'effluent_orgaloop',
    canal: 'orgaloop',
    marketplace: 'orgaloop',
    notes: `Publication directe sur ${ORGALOOP_EFFLUENT_CHANNEL.platformName} — ${ORGALOOP_EFFLUENT_CHANNEL.strategyLabel}`,
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
  title: 'Fumier & fientes — vente Orgaloop',
  opportunity_type: 'stock',
  source_type: 'libre',
  phase: 'actuelle',
  statut_activite: 'vente_orgaloop',
  activity_type: 'effluent_orgaloop',
  canal: 'orgaloop',
  marketplace: 'orgaloop',
  notes: 'Valorisation directe sur la plateforme Orgaloop — pas de stockage long terme.',
  created_from: 'orgaloop_effluent_channel',
  status: 'a_traiter',
  statut: 'a_traiter',
};
