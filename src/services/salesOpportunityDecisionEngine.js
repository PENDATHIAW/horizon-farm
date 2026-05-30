const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

function findSource(opportunity = {}, dataMap = {}) {
  const type = norm(opportunity.source_type || opportunity.type_source || opportunity.type);
  const id = opportunity.source_id || opportunity.entity_id || opportunity.related_id;
  if (!id) return null;
  if (type.includes('animal')) return arr(dataMap.animaux).find((row) => String(row.id) === String(id));
  if (type.includes('lot')) return arr(dataMap.avicole || dataMap.lots).find((row) => String(row.id) === String(id));
  if (type.includes('culture')) return arr(dataMap.cultures).find((row) => String(row.id) === String(id));
  if (type.includes('stock')) return arr(dataMap.stock || dataMap.stocks).find((row) => String(row.id) === String(id));
  return null;
}

function sourceCapacity(opportunity = {}, source = {}) {
  const type = norm(opportunity.source_type || opportunity.type_source || opportunity.type);
  if (!source) return num(opportunity.quantity || opportunity.quantite || 0);
  if (type.includes('animal')) return ['vendu', 'mort', 'vole', 'volé'].includes(norm(source.status || source.statut)) ? 0 : 1;
  if (type.includes('lot')) return num(source.current_count ?? source.effectif_actuel ?? source.initial_count ?? source.effectif ?? 0);
  if (type.includes('culture')) return num(source.quantite_disponible ?? source.quantite_recoltee ?? source.quantite_produite ?? 0);
  if (type.includes('stock')) return num(source.quantite ?? source.quantity ?? 0);
  return num(opportunity.quantity || opportunity.quantite || 0);
}

function decisionOrigin(opportunity = {}) {
  const text = norm(`${opportunity.title || ''} ${opportunity.description || ''} ${opportunity.reason || ''} ${opportunity.opportunity_type || ''}`);
  if (opportunity.recommendation_id || opportunity.decision_id || text.includes('centre decisionnel') || text.includes('horizon')) return 'Centre décisionnel';
  if (text.includes('tabaski') || text.includes('magal') || text.includes('gamou') || text.includes('fin d annee') || text.includes('noel')) return 'Calendrier commercial';
  if (text.includes('pret') || text.includes('recolte') || text.includes('stock')) return 'Disponibilité ferme';
  return opportunity.isAuto ? 'Détection automatique ERP' : 'Saisie commerciale';
}

export function enrichSalesOpportunity(opportunity = {}, dataMap = {}) {
  const source = findSource(opportunity, dataMap);
  const capacity = sourceCapacity(opportunity, source);
  const requested = num(opportunity.quantity || opportunity.quantite || opportunity.demand_quantity || 0) || capacity;
  const coverageRate = requested > 0 ? Math.min(100, Math.round((capacity / requested) * 100)) : capacity > 0 ? 100 : 0;
  const origin = decisionOrigin(opportunity);
  const canSell = capacity > 0 && coverageRate >= 100;
  const partial = capacity > 0 && coverageRate > 0 && coverageRate < 100;

  const action = (() => {
    if (canSell) return 'Créer une commande ou appeler les clients prioritaires.';
    if (partial) return 'Vendre partiellement et chercher une compensation stock/lot/culture.';
    return 'Ne pas promettre : capacité insuffisante ou source indisponible.';
  })();

  return {
    ...opportunity,
    decision_origin: origin,
    source_record: source,
    capacity_available: capacity,
    demand_quantity: requested,
    demand_coverage_rate: coverageRate,
    decision_action: action,
    decision_status: canSell ? 'vendable' : partial ? 'partiel' : 'non_couvert',
    decision_linked: ['Centre décisionnel', 'Calendrier commercial', 'Détection automatique ERP'].includes(origin),
  };
}

export function enrichSalesOpportunities(opportunities = [], dataMap = {}) {
  return arr(opportunities)
    .map((opportunity) => enrichSalesOpportunity(opportunity, dataMap))
    .sort((a, b) => (b.decision_linked ? 1 : 0) - (a.decision_linked ? 1 : 0) || num(b.score) - num(a.score));
}

export default enrichSalesOpportunities;
