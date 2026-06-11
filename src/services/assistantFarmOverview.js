/**
 * Synthèses multi-modules — « Comment va la ferme ? », objectif annuel, etc.
 * Moteurs canoniques uniquement.
 */

import { buildAgriculturalAnswer } from './assistantAgriculturalContext.js';
import { consolidateFinance } from '../utils/financeConsolidationEngine.js';
import { buildFinancePilotageInput } from '../utils/financePilotageCore.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { buildObjectifsCroissanceData } from './objectifsGrowthEngine.js';
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
  };
}

/**
 * Réponse multi-domaines : Élevage · Cultures · Stock · Commercial · Finance
 */
export function buildFarmOverviewAnswer(dataMap = {}) {
  const sections = [
    { key: 'elevage', label: 'Élevage', intent: 'elevage_status' },
    { key: 'cultures', label: 'Cultures', intent: 'parcelles_status' },
    { key: 'stock', label: 'Stock', intent: 'stock_overview' },
    { key: 'commercial', label: 'Commercial', intent: 'ventes' },
    { key: 'finance', label: 'Finance', intent: 'treasury' },
  ];

  const lines = [];
  const sources = new Set();

  for (const section of sections) {
    const answer = buildAgriculturalAnswer(section.intent, dataMap);
    if (answer?.situation) {
      lines.push(`${section.label} : ${answer.situation}`);
      (answer.sources || []).forEach((s) => sources.add(s));
    }
  }

  const situation = lines.join('\n') || 'Peu de données terrain pour synthétiser la ferme.';
  const cause = 'Lecture consolidée des moteurs ERP (élevage, cultures, stock, commercial, finance).';
  const action = lines.length >= 3
    ? 'Traitez d\'abord les alertes signalées dans le carnet.'
    : 'Enregistrez les activités terrain pour enrichir la synthèse.';

  return {
    title: 'Vue ferme',
    situation,
    cause,
    action,
    sources: [...sources],
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

  const situation = annualTarget > 0
    ? `Objectif annuel ${fmtCurrency(annualTarget)} · Réalisé ${fmtCurrency(annualRealized)}${pct != null ? ` (${pct} %)` : ''}. Trésorerie ${fmtCurrency(treasury)}.`
    : `CA période ${fmtCurrency(commercial.ca)} · Trésorerie ${fmtCurrency(treasury)}.`;

  let cause = 'Projection depuis objectifs de croissance et CA consolidé.';
  let action = 'Maintenez le rythme commercial et sécurisez les encaissements.';
  if (pct != null && pct < 70) {
    cause = 'Rythme annuel en retard sur la cible.';
    action = 'Accélérez ventes et livraisons sur le trimestre en cours.';
  } else if (pct != null && pct >= 100) {
    cause = 'Objectif annuel déjà atteint ou dépassé.';
    action = 'Consolidez la trésorerie et préparez la prochaine campagne.';
  }

  return {
    title: 'Objectif annuel',
    situation,
    cause,
    action,
    sources: ['buildObjectifsCroissanceData', 'buildConsolidatedCommercialKpis', 'consolidateFinance'],
    confidence: 90,
  };
}

export default {
  buildFarmOverviewAnswer,
  buildAnnualOutlookAnswer,
};
