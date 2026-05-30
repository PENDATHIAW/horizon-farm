import { makeId } from '../utils/ids';

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const num = (value = 0) => Number(value || 0);

export const OPPORTUNITY_STATUS = {
  proposed: 'proposee',
  confirmed: 'confirmee',
  converted: 'converti',
  ignored: 'ignoree',
  cancelled: 'annulee',
};

export function isOpportunityClosed(opportunity = {}) {
  const status = norm(opportunity.status || opportunity.statut);
  return ['converti', 'converted', 'ignoree', 'ignore', 'annulee', 'annule', 'cloture', 'cloturee'].some((item) => status.includes(item));
}

export function buildOpportunityOrderLink(opportunity = {}) {
  return {
    opportunity_id: opportunity.id || null,
    recommendation_id: opportunity.recommendation_id || opportunity.decision_id || null,
    source_module: 'opportunites_vente',
    source_type: opportunity.source_type || opportunity.type_source || opportunity.type || 'autre',
    source_id: opportunity.source_id || opportunity.entity_id || opportunity.related_id || null,
    source_label: opportunity.title || opportunity.nom || opportunity.description || 'Opportunité de vente',
    decision_origin: opportunity.decision_origin || opportunity.origin || 'opportunite_vente',
  };
}

export function buildOpportunityConversionEvent({ opportunity = {}, order = {}, amount = 0 } = {}) {
  return {
    id: makeId('EVT'),
    event_type: 'opportunite_convertie',
    module_source: 'ventes',
    entity_type: 'opportunite_vente',
    entity_id: opportunity.id || order.opportunity_id || order.id,
    title: `Opportunité convertie en commande ${order.id ? `CMD-${String(order.id).slice(-6)}` : ''}`.trim(),
    description: opportunity.title || opportunity.description || 'Opportunité commerciale convertie en vente.',
    amount: num(amount || order.montant_total || opportunity.estimated_value),
    linked_sale_id: order.id || null,
    event_date: new Date().toISOString(),
    severity: 'info',
  };
}

export function buildOpportunityUpdateAfterConversion(opportunityId, orderId) {
  return {
    status: OPPORTUNITY_STATUS.converted,
    statut: OPPORTUNITY_STATUS.converted,
    converted_sale_id: orderId,
    converted_at: new Date().toISOString(),
  };
}

export function buildOpportunityUpdateAfterConfirmation() {
  return {
    status: OPPORTUNITY_STATUS.confirmed,
    statut: OPPORTUNITY_STATUS.confirmed,
    confirmed_at: new Date().toISOString(),
  };
}

export function buildOpportunityUpdateAfterIgnore(reason = '') {
  return {
    status: OPPORTUNITY_STATUS.ignored,
    statut: OPPORTUNITY_STATUS.ignored,
    ignored_at: new Date().toISOString(),
    ignore_reason: reason || 'Ignorée par utilisateur',
  };
}

export function opportunityConversionSummary({ opportunities = [], orders = [], payments = [] } = {}) {
  const realOpportunities = opportunities.filter((opp) => !opp.isAuto);
  const converted = realOpportunities.filter((opp) => norm(opp.status || opp.statut).includes('converti'));
  const linkedOrders = orders.filter((order) => order.opportunity_id || converted.some((opp) => opp.converted_sale_id === order.id));
  const linkedOrderIds = new Set(linkedOrders.map((order) => order.id));
  const linkedPayments = payments.filter((payment) => linkedOrderIds.has(payment.order_id));
  return {
    total: realOpportunities.length,
    converted: converted.length,
    conversionRate: realOpportunities.length ? Math.round((converted.length / realOpportunities.length) * 100) : 0,
    attributableRevenue: linkedOrders.reduce((sum, order) => sum + num(order.montant_total), 0),
    attributableCash: linkedPayments.reduce((sum, payment) => sum + num(payment.montant || payment.montant_paye), 0),
  };
}
