/**
 * Réponses investisseur / dirigeant — moteurs canoniques uniquement.
 * consolidateFinance · buildConsolidatedCommercialKpis · summarizeSalesMargins · buildObjectifsCroissanceData
 */

import { consolidateFinance } from '../utils/financeConsolidationEngine.js';
import { buildFinancePilotageInput } from '../utils/financePilotageCore.js';
import { buildConsolidatedCommercialKpis } from '../utils/commercialKpiConsolidated.js';
import { summarizeSalesMargins } from '../utils/salesMarginEngine.js';
import { buildObjectifsCroissanceData } from './objectifsGrowthEngine.js';
import { fmtCurrency } from '../utils/format.js';
import { formatHorizonAnswer } from './assistantResponseFormatter.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function detectInvestorQuery(text = '') {
  const q = low(text);
  if (!q) return null;
  if (/etat.*exploitation|situation.*ferme|resume.*ferme|performance.*ferme/.test(q)) return 'farm_status';
  if (/rentabilite|rentabilité|marge.*reelle|resultat/.test(q)) return 'profitability';
  if (/objectif|croissance|bp|business plan/.test(q)) return 'growth_objectives';
  if (/investisseur|financeur|dossier.*banque/.test(q)) return 'investor_room';
  if (/tresorerie|trésorerie|liquidite/.test(q) && q.length < 50) return 'treasury';
  return null;
}

function propsFromDataMap(dataMap = {}) {
  return {
    transactionsAll: arr(dataMap.finances || dataMap.transactions),
    salesOrdersAll: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    paymentsAll: arr(dataMap.paymentsAll || dataMap.payments),
    fournisseurs: arr(dataMap.fournisseurs),
    stocks: arr(dataMap.stock || dataMap.stocks),
    animaux: arr(dataMap.animaux || dataMap.animals),
    lots: arr(dataMap.lots || dataMap.avicole),
    cultures: arr(dataMap.cultures),
    sante: arr(dataMap.vaccins || dataMap.sante),
    alimentationLogs: arr(dataMap.alimentation_logs || dataMap.alimentationLogs),
    productionLogs: arr(dataMap.production_oeufs_logs || dataMap.productionLogs),
    investissements: arr(dataMap.investissements),
    businessEvents: arr(dataMap.business_events || dataMap.businessEvents),
    clients: arr(dataMap.clients),
    deliveries: arr(dataMap.deliveries),
    invoices: arr(dataMap.invoices),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
  };
}

export function buildInvestorPilotageAnswer(type = 'farm_status', dataMap = {}) {
  const props = propsFromDataMap(dataMap);
  const financeInput = buildFinancePilotageInput(props);
  const finance = consolidateFinance(financeInput);
  const commercialKpis = buildConsolidatedCommercialKpis({
    orders: props.salesOrdersAll,
    payments: props.paymentsAll,
    clients: props.clients,
    deliveries: props.deliveries,
    invoices: props.invoices,
  });
  const margins = summarizeSalesMargins({
    orders: props.salesOrdersAll,
    lots: props.lots,
    animaux: props.animaux,
    cultures: props.cultures,
    stocks: props.stocks,
    payments: props.paymentsAll,
    transactions: props.transactionsAll,
  });
  const growth = buildObjectifsCroissanceData(props);

  const treasury = n(finance.cashNet);
  const receivables = n(finance.creancesReelles);
  const payables = n(finance.payablesTotal ?? finance.dettesFournisseurs);
  const margin = n(finance.margeReelle);
  const ca = n(commercialKpis.ca ?? finance.caConsolide);
  const collected = n(commercialKpis.collected);
  const topMargin = arr(margins?.products || margins?.rows)[0];
  const monthTarget = n(growth?.monthlyTarget ?? growth?.objectifMois);
  const monthRealized = n(growth?.monthlyRealized ?? growth?.caMois);

  let situation = '';
  let cause = '';
  let action = '';
  let sources = [];
  let title = 'Horizon — Exploitation';

  switch (type) {
    case 'treasury':
      situation = `Trésorerie disponible : ${fmtCurrency(treasury)}. Créances ${fmtCurrency(receivables)} · Dettes ${fmtCurrency(payables)}.`;
      cause = receivables > payables * 1.5 ? 'Encaissements en retard par rapport aux sorties prévues.' : 'Position de liquidité issue des écritures ERP.';
      action = treasury < 0 ? 'Reporter les dépenses non urgentes et relancer les créances prioritaires.' : 'Conserver une marge de sécurité sur les paiements fournisseurs.';
      sources = ['consolidateFinance().cashNet', 'consolidateFinance().creancesReelles'];
      title = 'Trésorerie';
      break;
    case 'profitability':
      situation = `Marge réelle ${fmtCurrency(margin)} · CA consolidé ${fmtCurrency(ca)}.`;
      cause = topMargin?.name ? `Meilleure contribution : ${topMargin.name}.` : 'Marges calculées depuis les ventes et coûts ERP.';
      action = margin < 0 ? 'Revoir les prix de vente et les charges variables sur le cycle en cours.' : 'Consolider les produits les plus rentables cette semaine.';
      sources = ['consolidateFinance().margeReelle', 'summarizeSalesMargins'];
      title = 'Rentabilité';
      break;
    case 'growth_objectives':
      situation = monthTarget > 0
        ? `Objectif mois ${fmtCurrency(monthTarget)} · Réalisé ${fmtCurrency(monthRealized)} (${Math.round((monthRealized / monthTarget) * 100)}%).`
        : `CA période ${fmtCurrency(ca)} · Encaissé ${fmtCurrency(collected)}.`;
      cause = monthRealized < monthTarget ? 'Écart objectif lié au rythme commercial ou aux livraisons en attente.' : 'Rythme commercial aligné sur l\'objectif.';
      action = monthRealized < monthTarget ? 'Prioriser ventes et livraisons sur les clients à fort panier.' : 'Maintenir le rythme et sécuriser les encaissements.';
      sources = ['buildObjectifsCroissanceData', 'buildConsolidatedCommercialKpis().ca'];
      title = 'Objectifs';
      break;
    case 'investor_room':
      situation = `CA ${fmtCurrency(ca)} · Trésorerie ${fmtCurrency(treasury)} · Marge ${fmtCurrency(margin)}.`;
      cause = 'Synthèse issue des moteurs canoniques Finance et Commercial.';
      action = 'Ouvrir Investisseurs & Forums pour le dossier complet ou exporter le rapport financeur.';
      sources = ['consolidateFinance', 'buildConsolidatedCommercialKpis', 'summarizeSalesMargins', 'buildObjectifsCroissanceData'];
      title = 'Vue investisseur';
      break;
  default:
      situation = `CA ${fmtCurrency(ca)} · Trésorerie ${fmtCurrency(treasury)} · Créances ${fmtCurrency(receivables)}.`;
      cause = payables > treasury ? 'Dettes fournisseurs supérieures à la trésorerie immédiate.' : 'Exploitation suivie via les écritures terrain et commerciales.';
      action = receivables > 0 ? 'Relancer les créances prioritaires puis sécuriser les achats critiques.' : 'Poursuivre les déclarations terrain via l\'assistant.';
      sources = ['consolidateFinance', 'buildConsolidatedCommercialKpis'];
      title = 'État de l\'exploitation';
  }

  const summary = formatHorizonAnswer({ situation, cause, action, sources });
  return {
    type: `investor_${type}`,
    title,
    summary,
    situation,
    cause,
    action,
    sources,
    route: type === 'investor_room' ? 'investisseurs_forums' : 'finance_pilotage',
    confidence: 92,
    rows: [],
  };
}
