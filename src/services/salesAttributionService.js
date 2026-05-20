const arr = (value) => (Array.isArray(value) ? value : []);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (value = 0) => Number(value || 0);

export function inferOpportunityLink(order = {}, opportunities = []) {
  if (order.opportunity_id) return opportunities.find((opp) => String(opp.id) === String(order.opportunity_id)) || null;
  const sourceType = norm(order.source_type || order.type_vente || '');
  const sourceId = String(order.source_id || '');
  if (!sourceId) return null;
  return arr(opportunities).find((opp) => {
    const sameSource = String(opp.source_id || opp.entity_id || opp.related_id || '') === sourceId;
    const sameType = !sourceType || norm(opp.source_type || opp.type_source || opp.type || '').includes(sourceType) || sourceType.includes(norm(opp.source_type || ''));
    return sameSource && sameType;
  }) || null;
}

export function enrichOrdersWithOpportunityAttribution(orders = [], opportunities = []) {
  return arr(orders).map((order) => {
    const opp = inferOpportunityLink(order, opportunities);
    if (!opp) return order;
    return {
      ...order,
      opportunity_id: order.opportunity_id || opp.id,
      recommendation_id: order.recommendation_id || opp.recommendation_id || opp.decision_id || null,
      decision_origin: order.decision_origin || opp.decision_origin || opp.origin || 'opportunite_vente',
      source_type: order.source_type || opp.source_type || opp.type_source || 'autre',
      source_id: order.source_id || opp.source_id || opp.entity_id || opp.related_id || null,
      source_label: order.source_label || opp.title || opp.nom || opp.description || 'Opportunité de vente',
      attributable_to_decision_center: true,
    };
  });
}

export function buildOpportunityAttributionMetrics({ opportunities = [], orders = [], payments = [] } = {}) {
  const enrichedOrders = enrichOrdersWithOpportunityAttribution(orders, opportunities);
  const linkedOrders = enrichedOrders.filter((order) => order.opportunity_id || order.attributable_to_decision_center);
  const linkedIds = new Set(linkedOrders.map((order) => order.id));
  const linkedPayments = arr(payments).filter((payment) => linkedIds.has(payment.order_id));
  const convertedOppIds = new Set([
    ...arr(opportunities).filter((opp) => norm(opp.status || opp.statut).includes('converti')).map((opp) => opp.id),
    ...linkedOrders.map((order) => order.opportunity_id).filter(Boolean),
  ]);
  const totalValue = linkedOrders.reduce((sum, order) => sum + num(order.montant_total || order.total || order.amount), 0);
  const totalCash = linkedPayments.reduce((sum, payment) => sum + num(payment.montant || payment.montant_paye || payment.amount), 0);
  return {
    enrichedOrders,
    linkedOrders,
    linkedPayments,
    totalOpportunities: arr(opportunities).length,
    convertedOpportunities: convertedOppIds.size,
    conversionRate: arr(opportunities).length ? Math.round((convertedOppIds.size / arr(opportunities).length) * 100) : 0,
    attributableRevenue: totalValue,
    attributableCash: totalCash,
  };
}

export default buildOpportunityAttributionMetrics;
