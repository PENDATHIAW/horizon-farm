import { makeId } from '../../utils/ids.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const n = (v = 0) => Number(v || 0);

export function isSaleReadyConfirmed(record = {}) {
  return Boolean(
    record.pret_vente_confirme
    || record.sale_readiness_status === 'pret_confirme'
    || ['pret_a_la_vente', 'pret_a_vendre_reforme', 'pret_vente'].includes(low(record.status || record.statut)),
  );
}

const normSource = (value = '') => low(value).replace(/[^a-z0-9]/g, '');

export function findExistingOpportunityForSource(opportunities = [], { sourceType, sourceId } = {}) {
  const wanted = normSource(sourceType);
  return arr(opportunities).find((opp) => {
    if (low(opp.status || opp.statut).includes('converti')) return false;
    const sameId = String(opp.source_id || opp.entity_id) === String(sourceId);
    const sameType = normSource(opp.source_type || opp.type_source || opp.opportunity_type) === wanted
      || normSource(opp.source_type || opp.type_source || '').includes(wanted);
    return sameId && sameType;
  }) || null;
}

export function buildSaleReadyOpportunityPayload({
  record = {},
  sourceType = 'lot_avicole',
  metrics = {},
  decision = {},
  reason = '',
} = {}) {
  const isChair = low(record.type || record.espece).includes('chair') || sourceType.includes('chair');
  const count = n(metrics.count ?? record.current_count ?? record.effectif_actuel ?? 1);
  const unitPrice = n(metrics.unitPrice ?? record.prix_vente_prevu ?? record.prix_unitaire);
  const gross = n(metrics.grossRevenue ?? count * unitPrice);
  const margin = n(metrics.estimatedMargin ?? metrics.margin);

  const payload = {
    id: makeId('OPP'),
    opportunity_type: isChair ? 'lot_chair' : sourceType.includes('animal') ? 'animal' : 'pondeuse_reforme',
    source_type: sourceType,
    source_id: record.id,
    title: `${record.name || record.nom || record.id} — opportunité de vente`,
    description: reason || decision.reason || record.raison_pret_vente || 'Confirmé prêt à la vente',
    quantity: count,
    unit: sourceType.includes('animal') ? 'unité' : 'tete',
    unit_price: unitPrice,
    estimated_value: gross,
    estimated_margin: margin,
    score: n(decision.score ?? record.sale_readiness_score ?? 80),
    status: 'proposee',
    statut: 'proposee',
    origin_type: 'workflow',
    source_module: sourceType.includes('animal') ? 'animaux' : 'avicole',
    created_by_source: 'sale_ready_workflow',
    decision_origin: 'Disponibilité ferme',
    opportunity_id: null,
    source_module: 'opportunites_vente',
    source_type: sourceType,
    source_id: record.id,
    source_label: record.name || record.nom || record.id,
  };

  return payload;
}

/** Crée opportunité si prêt vente confirmé et aucune opportunité ouverte existante. */
export function syncSaleReadyOpportunity({
  record = {},
  previous = {},
  opportunities = [],
  sourceType = 'lot_avicole',
  metrics = {},
  decision = {},
} = {}) {
  const becameReady = isSaleReadyConfirmed(record) && !isSaleReadyConfirmed(previous);
  if (!becameReady && !isSaleReadyConfirmed(record)) {
    return { created: false, skipped: true, reason: 'not_ready' };
  }
  if (!isSaleReadyConfirmed(record)) {
    return { created: false, skipped: true, reason: 'not_confirmed' };
  }

  const existing = findExistingOpportunityForSource(opportunities, { sourceType, sourceId: record.id });
  if (existing) {
    return { created: false, skipped: true, reason: 'exists', opportunity: existing };
  }

  const payload = buildSaleReadyOpportunityPayload({ record, sourceType, metrics, decision });
  return { created: true, payload, skipped: false };
}
