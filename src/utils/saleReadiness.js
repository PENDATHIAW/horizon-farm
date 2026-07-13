import { toNumber } from './format';

const truthyValues = new Set(['true', 'oui', 'yes', '1', 'pret', 'prêt', 'prete', 'prête', 'pret_a_la_vente', 'pret_a_vendre', 'pret_a_vendre_reforme', 'a_reformer', 'confirme', 'confirmé']);
const closedStatuses = new Set(['vendu', 'annule', 'annulé', 'annulee', 'mort', 'vole', 'volé', 'reforme', 'réforme', 'perdu', 'archive', 'archivé']);
const clean = (value) => String(value || '').trim().toLowerCase();
const boolish = (value) => value === true || truthyValues.has(clean(value));

export function isSaleReady(record = {}) {
  return Boolean(
    boolish(record.pret_vente_confirme) ||
    boolish(record.pret_a_la_vente) ||
    boolish(record.ready_for_sale) ||
    boolish(record.sale_ready) ||
    boolish(record.vendable) ||
    boolish(record.pret_vente) ||
    truthyValues.has(clean(record.status)) ||
    truthyValues.has(clean(record.statut)) ||
    truthyValues.has(clean(record.sale_readiness_status))
  );
}

export function canBeSold(record = {}) {
  return !closedStatuses.has(clean(record.status || record.statut));
}

export function saleReadyPatch(record = {}, extra = {}) {
  const confirmedAt = record.sale_ready_confirmed_at || record.date_pret_vente_confirme || new Date().toISOString();
  return {
    ...extra,
    status: extra.status || 'pret_a_la_vente',
    statut: extra.statut || 'pret_a_la_vente',
    sale_readiness_status: 'confirme',
    pret_vente_confirme: true,
    pret_a_la_vente: true,
    ready_for_sale: true,
    sale_ready: true,
    vendable: true,
    date_pret_vente_confirme: String(confirmedAt).slice(0, 10),
    sale_ready_confirmed_at: confirmedAt,
    ready_for_sale_at: confirmedAt,
    updated_at: new Date().toISOString(),
  };
}

export function saleOpportunityKey(sourceModule, id) {
  const key = String(id || '').trim();
  if (!key) return '';
  if (sourceModule === 'avicole') return `avicole-sale:${key}`;
  if (sourceModule === 'animaux') return `animal-sale:${key}`;
  return `${sourceModule}:${key}`;
}

export function findSaleOpportunity({ sourceModule, id, opportunities = [] }) {
  const rows = Array.isArray(opportunities) ? opportunities : [];
  const key = saleOpportunityKey(sourceModule, id);
  const legacyKeys = sourceModule === 'avicole'
    ? [`avicole:${id}`, `avicole-sale:${id}`]
    : sourceModule === 'animaux'
      ? [`animaux:${id}`, `animal-sale:${id}`]
      : [];
  return rows.find((opp) => {
    const oppKey = String(opp.opportunity_key || opp.dedupe_key || '');
    if (oppKey === key || legacyKeys.includes(oppKey)) return true;
    return String(opp.source_module || '') === sourceModule
      && String(opp.source_id || opp.related_id || opp.entity_id || '') === String(id);
  });
}

export function saleQuantity(record = {}, fallback = 1) {
  return Math.max(0, toNumber(record.current_count ?? record.effectif_actuel ?? record.effectif_vendable ?? record.initial_count ?? record.quantite_disponible ?? fallback));
}

export function saleUnitPrice(record = {}, keys = []) {
  const allKeys = [...keys, 'prix_vente_prevu', 'prix_vente_estime_auto', 'prix_vente_estime', 'sale_price', 'prix_vente_reel', 'prix_unitaire', 'unit_price'];
  return allKeys.reduce((best, key) => best || toNumber(record?.[key]), 0);
}

const explicitlyUnconfirmed = (payload = {}) => payload.pret_vente_confirme === false
  || payload.pret_vente_confirme === 'non'
  || payload.pret_a_la_vente === false
  || payload.ready_for_sale === false;

export function mergeSaleReadiness(existing = {}, payload = {}, extra = {}) {
  const merged = { ...existing, ...payload, ...extra };
  if (explicitlyUnconfirmed(payload)) {
    return {
      ...merged,
      pret_vente_confirme: false,
      pret_a_la_vente: false,
      ready_for_sale: false,
      sale_ready: false,
      vendable: false,
      sale_readiness_status: 'non_pret',
    };
  }
  if (isSaleReady(payload) || (isSaleReady(existing) && !explicitlyUnconfirmed(payload))) {
    return saleReadyPatch(merged, extra);
  }
  return merged;
}

export function shouldSyncSaleOpportunity(_before = {}, after = {}) {
  return isSaleReady(after) && !explicitlyUnconfirmed(after);
}
