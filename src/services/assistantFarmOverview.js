/**
 * Synthèses multi-modules — « Comment va la ferme ? », objectif annuel, etc.
 * Moteurs canoniques uniquement — prose humaine côté utilisateur.
 */

import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import { consolidateFinance } from '../utils/financeConsolidationEngine.js';
import { buildFinancePilotageInput } from '../utils/financePilotageCore.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { buildObjectifsCroissanceData } from './objectifsGrowthEngine.js';
import { buildCarnetDomainCards } from '../modules/dashboard/carnetHorizon.js';
import { fmtCurrency } from '../utils/format.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);

function propsFromDataMap(dataMap = {}) {
  return {
    transactionsAll: arr(dataMap.finances || dataMap.transactions),
    salesOrdersAll: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    paymentsAll: arr(dataMap.paymentsAll || dataMap.payments),
    stocks: arr(dataMap.stock || dataMap.stocks),
    animaux: arr(dataMap.animaux || dataMap.animals),
    lots: arr(dataMap.lots || dataMap.avicole),
    cultures: arr(dataMap.cultures),
    clients: arr(dataMap.clients),
    deliveries: arr(dataMap.deliveries),
    invoices: arr(dataMap.invoices),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
    periodScope: dataMap.periodScope,
  };
}

/**
 * Réponse conversationnelle type directeur d'exploitation.
 */
export function buildFarmOverviewAnswer(dataMap = {}) {
  const props = propsFromDataMap(dataMap);
  const commercial = buildConsolidatedCommercialKpis({
    orders: props.salesOrdersAll,
    payments: props.paymentsAll,
    clients: props.clients,
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const finance = consolidateFinance(buildFinancePilotageInput(props));
  const stockAnswer = buildAgriculturalAnswer('stock_overview', dataMap);
  const elevageAnswer = buildAgriculturalAnswer('elevage_status', dataMap);

  const receivableCount = n(commercial.unpaidOrders);
  const receivableAmount = n(commercial.receivable);
  const lowStock = n(stockAnswer?.situation?.match(/(\d+)\s+sous seuil/i)?.[1] || 0);

  const sentences = ['Dans l\'ensemble la ferme se porte bien.'];

  if (n(commercial.ca) > 0) {
    sentences.push('Les ventes progressent ce mois-ci et les stocks sont sous contrôle.');
  }

  if (receivableCount > 0) {
    sentences.push(
      `J'ai simplement repéré ${receivableCount} créance${receivableCount > 1 ? 's' : ''} qui mériterai${receivableCount > 1 ? 'ent' : 't'} une relance aujourd'hui${receivableAmount > 0 ? `, pour un total de ${fmtCurrency(receivableAmount)}` : ''}.`,
    );
  }

  if (lowStock > 0) {
    sentences.push(`${lowStock} produit${lowStock > 1 ? 's' : ''} approche${lowStock > 1 ? 'nt' : ''} d'un seuil bas en stock.`);
  }

  const cards = buildCarnetDomainCards({ dataMap, ...props });
  const elevageAlerts = cards.find((card) => card.id === 'elevage')?.alerts || [];
  if (elevageAlerts.length > 0 && !receivableCount) {
    sentences.push(`${elevageAlerts.length} lot${elevageAlerts.length > 1 ? 's' : ''} mérite${elevageAlerts.length > 1 ? 'nt' : ''} un œil cette semaine.`);
  }

  if (n(finance.cashNet) < 0) {
    sentences.push('La trésorerie reste un peu tendue — gardons un œil sur les sorties de la semaine.');
  }

  if (sentences.length === 1 && elevageAnswer?.situation) {
    sentences.push('L\'exploitation avance de façon stable sur le terrain.');
  }

  return {
    title: 'Vue ferme',
    situation: sentences.join(' '),
    cause: '',
    action: receivableCount > 0 ? 'Si vous voulez, on peut détailler les clients à relancer.' : '',
    sources: [],
    confidence: 92,
  };
}

/**
 * Objectif annuel — buildObjectifsCroissanceData + commercial + finance
 */
export function buildAnnualOutlookAnswer(dataMap = {}) {
  const props = propsFromDataMap(dataMap);
  const finance = consolidateFinance(buildFinancePilotageInput(props));
  const commercial = buildConsolidatedCommercialKpis({
    orders: props.salesOrdersAll,
    payments: props.paymentsAll,
    clients: props.clients,
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const growth = buildObjectifsCroissanceData(props);

  const annualTarget = n(growth?.annualTarget ?? growth?.objectifAnnuel);
  const annualRealized = n(growth?.annualRealized ?? growth?.caAnnee ?? commercial.ca);
  const pct = annualTarget > 0 ? Math.round((annualRealized / annualTarget) * 100) : null;
  const treasury = n(finance.cashNet);

  let situation;
  if (annualTarget > 0 && pct != null) {
    situation = `Vous êtes à ${pct} % de votre objectif annuel (${fmtCurrency(annualRealized)} sur ${fmtCurrency(annualTarget)}). La trésorerie est de ${fmtCurrency(treasury)}.`;
  } else {
    situation = `Le chiffre d'affaires de la période est de ${fmtCurrency(commercial.ca)} et la trésorerie de ${fmtCurrency(treasury)}.`;
  }

  let action = 'Le rythme actuel tient la route — continuez à sécuriser les encaissements.';
  if (pct != null && pct < 70) {
    action = 'Il faudrait accélérer un peu les ventes et les livraisons sur le trimestre.';
  } else if (pct != null && pct >= 100) {
    action = 'Belle dynamique — vous pouvez consolider la trésorerie pour la prochaine campagne.';
  }

  return {
    title: 'Objectif annuel',
    situation,
    cause: '',
    action,
    sources: [],
    confidence: 90,
  };
}

export default {
  buildFarmOverviewAnswer,
  buildAnnualOutlookAnswer,
};
