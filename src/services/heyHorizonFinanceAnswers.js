/**
 * Réponses Hey Horizon — questions Finance & Pilotage (ferme vide ou données réelles).
 */

import { buildCashFlowForecast } from '../utils/financePilotageV2.js';
import {
  buildFinancePilotageInput,
  buildOfficialTreasuryView,
  buildProfitabilityView,
} from '../utils/financePilotageCore.js';
import { buildFinancingSimulator } from '../utils/financePilotageV3.js';
import { EMPTY_STATE_FINANCE_QA, hasMinimumFinanceData } from '../utils/financeEmptyState.js';
import { fmtCurrency } from '../utils/format.js';
import { remainingForOrder } from '../utils/salesStatuses.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v) => Number(v || 0);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.montant_total);
const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function detectFinancePilotageQuery(text = '') {
  const q = low(text);
  if (!q) return null;

  if (/emprunter|emprunt|pret|prêt|capacite.*remboursement|combien.*emprunter/.test(q)) return 'borrow';
  if (/tresorerie.*30|tiendra.*30|30 jours|tenir.*30/.test(q)) return 'treasury_30';
  if (/creance|relancer|encaisser/.test(q) && !/client.*doit/.test(q)) return 'receivables';
  if (/dettes?.*(semaine|payer)|payer.*semaine/.test(q)) return 'debts_week';
  if (/document.*banque|banque|dossier.*financ/.test(q)) return 'bank_docs';
  if (/aujourd.*financ|faire.*financ/.test(q)) return 'today_finance';
  if (/situation financiere|resume.*financ|resumer.*financ/.test(q)) return 'summary';
  if (/ferme.*fragile|fragile.*ferme|fragile.*financ/.test(q)) return 'fragile_farm';
  if (/financement|remboursement|dscr|capacite/.test(q)) return 'financing';
  if (/risque.*tresorerie|tension.*tresorerie|cash.?flow/.test(q)) return 'treasury_risk';
  if (/rentabilite|marge.*reelle|resultat operationnel/.test(q)) return 'profitability';
  return null;
}

function buildEmptyAnswer(title = 'Finance & Pilotage') {
  return {
    type: 'finance_empty',
    title,
    summary: EMPTY_STATE_FINANCE_QA,
    rows: [],
    route: 'finance_pilotage',
    confidence: 95,
    insufficientData: true,
  };
}

function financePropsFromDataMap(dataMap = {}) {
  return {
    transactions: arr(dataMap.finances || dataMap.transactions),
    salesOrders: arr(dataMap.salesOrdersAll || dataMap.sales_orders || dataMap.salesOrders),
    payments: arr(dataMap.paymentsAll || dataMap.payments),
    fournisseurs: arr(dataMap.fournisseurs),
    stocks: arr(dataMap.stock || dataMap.stocks),
    investissements: arr(dataMap.investissements),
    businessPlans: arr(dataMap.business_plans || dataMap.businessPlans),
    documents: arr(dataMap.documents),
    accessibleFarms: arr(dataMap.accessibleFarms),
    farmScope: dataMap.farmScope,
  };
}

export function buildFinancePilotageAnswer(type = '', dataMap = {}) {
  const props = financePropsFromDataMap(dataMap);
  const options = {
    accessibleFarms: props.accessibleFarms,
    farmScope: props.farmScope,
    bpRecurringCosts: arr(dataMap.bpRecurringCosts),
    bpFundingSources: arr(dataMap.bpFundingSources),
  };

  if (!hasMinimumFinanceData(props)) {
    return buildEmptyAnswer();
  }

  const treasury = buildOfficialTreasuryView(props);
  const profitability = buildProfitabilityView(props);
  const forecast = buildCashFlowForecast(props, options);
  const input = buildFinancePilotageInput(props);

  switch (type) {
    case 'borrow': {
      const sim = buildFinancingSimulator(props, options);
      if (!sim.ready) {
        return {
          type,
          title: 'Emprunt prudent',
          summary: sim.message || 'Complétez le simulateur de financement (montant, durée, taux) pour une estimation.',
          rows: [],
          route: 'finance_pilotage',
          confidence: 80,
        };
      }
      return {
        type,
        title: 'Emprunt prudent',
        summary: `Mensualité estimée ${fmtCurrency(sim.monthlyPayment)} · prudence ${sim.prudenceLabel} · DSCR ${sim.dscr ?? '—'}. ${sim.disclaimer}`,
        rows: [
          { title: 'Mensualité', detail: 'Simulation', value: fmtCurrency(sim.monthlyPayment), module: 'finance_pilotage' },
          { title: 'Capacité', detail: sim.capacityLabel, value: sim.prudenceLabel, module: 'finance_pilotage' },
        ],
        route: 'finance_pilotage',
        confidence: 88,
      };
    }
    case 'treasury_30': {
      if (!forecast.ready) {
        return {
          type,
          title: 'Trésorerie 30 jours',
          summary: forecast.message || 'Prévision non calculable sans échéancier ou flux enregistrés.',
          rows: [],
          route: 'finance_pilotage',
          confidence: 90,
        };
      }
      return {
        type,
        title: 'Trésorerie 30 jours',
        summary: `Trésorerie actuelle ${fmtCurrency(forecast.currentTreasury)} · projection 30j ${fmtCurrency(forecast.projection30)} · risque ${forecast.riskLabel}.`,
        rows: [
          { title: 'Projection 30j', value: fmtCurrency(forecast.projection30), module: 'finance_pilotage' },
          { title: 'Risque', value: forecast.riskLabel, module: 'finance_pilotage' },
        ],
        route: 'finance_pilotage',
        confidence: 92,
      };
    }
    case 'receivables': {
      const rows = arr(input.salesOrders).map((order) => ({
        name: order.client_nom || order.customer_name || 'Client',
        rest: remainingForOrder(order, input.payments),
        id: order.id,
      })).filter((r) => r.rest > 0).sort((a, b) => b.rest - a.rest);
      return {
        type,
        title: 'Créances à relancer',
        summary: rows.length
          ? `${rows.length} créance(s) — total ${fmtCurrency(rows.reduce((s, r) => s + r.rest, 0))}.`
          : 'Aucune créance client ouverte.',
        rows: rows.slice(0, 6).map((r) => ({
          title: r.name,
          detail: `Commande ${r.id}`,
          value: fmtCurrency(r.rest),
          module: 'commercial',
        })),
        route: rows.length ? 'commercial' : 'finance_pilotage',
        confidence: 91,
      };
    }
    case 'debts_week': {
      return {
        type,
        title: 'Dettes cette semaine',
        summary: `Dettes à payer (canonique) : ${fmtCurrency(treasury.payables)}. Consultez l'échéancier pour les paiements des 7 prochains jours.`,
        rows: [
          { title: 'Dettes totales', value: fmtCurrency(treasury.payables), module: 'finance_pilotage' },
          { title: 'Trésorerie dispo', value: fmtCurrency(treasury.treasuryAvailable), module: 'finance_pilotage' },
        ],
        route: 'finance_pilotage',
        confidence: 85,
      };
    }
    case 'summary':
      return {
        type,
        title: 'Situation financière',
        summary: `Trésorerie ${fmtCurrency(treasury.treasuryAvailable)} · créances ${fmtCurrency(treasury.receivables)} · dettes ${fmtCurrency(treasury.payables)} · marge réelle ${fmtCurrency(treasury.realMargin)}.`,
        rows: [
          { title: 'Trésorerie disponible', value: fmtCurrency(treasury.treasuryAvailable), module: 'finance_pilotage' },
          { title: 'Position nette', value: fmtCurrency(treasury.netPosition), module: 'finance_pilotage' },
        ],
        route: 'finance_pilotage',
        confidence: 93,
      };
    case 'treasury_risk': {
      if (!forecast.ready) {
        return {
          type,
          title: 'Risque trésorerie',
          summary: 'Non calculable sans historique de flux ou échéances.',
          rows: [],
          route: 'finance_pilotage',
          confidence: 90,
        };
      }
      return {
        type,
        title: 'Risque trésorerie',
        summary: `Risque ${forecast.riskLabel} · projection 30j ${fmtCurrency(forecast.projection30)}.`,
        rows: [],
        route: 'finance_pilotage',
        confidence: 90,
      };
    }
    case 'profitability': {
      if (!profitability.ready) {
        return {
          type,
          title: 'Rentabilité',
          summary: profitability.message || 'Non calculable pour l\'instant.',
          rows: [],
          route: 'finance_pilotage',
          confidence: 88,
        };
      }
      return {
        type,
        title: 'Rentabilité',
        summary: `Résultat opérationnel ${fmtCurrency(profitability.profit.operatingResult)} · CA ${fmtCurrency(profitability.profit.caTotal)}.`,
        rows: [],
        route: 'finance_pilotage',
        confidence: 90,
      };
    }
    default:
      return {
        type,
        title: 'Finance & Pilotage',
        summary: `Trésorerie ${fmtCurrency(treasury.treasuryAvailable)} · créances ${fmtCurrency(treasury.receivables)}.`,
        rows: [],
        route: 'finance_pilotage',
        confidence: 85,
      };
  }
}
