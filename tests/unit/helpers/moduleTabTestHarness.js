import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../../src/context/AppContext.jsx';
import { AuthProvider } from '../../../src/context/AuthContext.jsx';
import { MODULE_ENTRY_POINTS } from '../../../src/config/moduleEntryPoints.js';
import { MODULE_TARGET_TABS } from '../../../src/config/horizonVision.config.js';
import {
  COMMERCIAL_TABS,
  ACHATS_STOCK_TABS,
  ELEVAGE_TABS,
  FINANCE_TABS,
  ACTIVITE_SUIVI_TABS,
  DOCUMENTS_RAPPORTS_TABS,
  RH_TABS,
  SMARTFARM_TABS,
  SYNC_ACTIVITY_TABS,
  CULTURES_TABS,
  AGRI_FEEDS_TABS,
  DASHBOARD_TABS,
  OBJECTIFS_TABS,
  CENTRE_IA_TABS,
  INVESTISSEURS_TABS,
} from '../../../src/utils/commercialNavigation.js';
import { SIMULATED_DATA_MODE_KEY } from '../../../src/utils/uiPreferences.js';
import { horizonFarmSimulationSeed } from '../../../src/utils/horizonFarmSimulationSeed.js';

const ERROR_PATTERN = /ERREUR MODULE|is not defined|useAppData must be used|cannot read properties of undefined|useApp must be used/i;

export const MODULE_TAB_MATRIX = {
  dashboard: DASHBOARD_TABS,
  assistant_erp: MODULE_TARGET_TABS.assistant_erp,
  finance_pilotage: FINANCE_TABS,
  commercial: COMMERCIAL_TABS,
  achats_stock: ACHATS_STOCK_TABS,
  elevage: ELEVAGE_TABS,
  agri_feeds: AGRI_FEEDS_TABS,
  cultures: CULTURES_TABS,
  documents_rapports: DOCUMENTS_RAPPORTS_TABS,
  investisseurs_forums: INVESTISSEURS_TABS,
  rh: RH_TABS,
  smartfarm: SMARTFARM_TABS,
  sync_activity: SYNC_ACTIVITY_TABS,
  gestion_systeme: MODULE_TARGET_TABS.gestion_systeme,
  activite_suivi: ACTIVITE_SUIVI_TABS,
  centre_ia: CENTRE_IA_TABS,
  objectifs_croissance: OBJECTIFS_TABS,
};

export function setupTestStorage() {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map();
    globalThis.localStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => { store.clear(); },
    };
  }
  if (typeof globalThis.sessionStorage === 'undefined') {
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
      clear: () => { store.clear(); },
    };
  }
}

export function buildBaseProps(overrides = {}) {
  return {
    user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
    animaux: [], lots: [], stocks: [], rows: [], clients: [], fournisseurs: [], cultures: [],
    salesOrders: [], salesOrdersAll: [], orderItems: [], payments: [], paymentsAll: [],
    invoices: [], deliveries: [], opportunities: [],
    transactions: [], transactionsAll: [], documents: [], taches: [], alertes: [],
    businessPlans: [], investissements: [], bpInvestmentLines: [], bpRecurringCosts: [],
    bpRevenueProjections: [], bpFundingSources: [],
    dataMap: {}, onNavigate: () => {}, onRefresh: () => {}, onOpenAssistant: () => {},
    accessibleFarms: [{ id: 'f1', name: 'Ferme test', status: 'active' }],
    farmScope: { mode: 'all' }, activeFarm: null, periodLabel: 'Mois en cours',
    periodFiltered: false, online: true,
    whatsappWorkflowHandlers: {}, existingTasks: [], existingAlerts: [],
    businessEvents: [], businessEventsAll: [], sensors: [], cameras: [],
    meteo: { temp: 25, condition: 'Clair' },
    crud: {},
    ...overrides,
  };
}

export function buildSimulatedProps(overrides = {}) {
  const m = horizonFarmSimulationSeed;
  return buildBaseProps({
    animaux: m.animaux || [],
    lots: m.avicole || m.lots || [],
    stocks: m.stock || m.stocks || [],
    clients: m.clients || [],
    fournisseurs: m.fournisseurs || [],
    cultures: m.cultures || [],
    salesOrders: m.sales_orders || [],
    salesOrdersAll: m.sales_orders || [],
    orderItems: m.sales_order_items || [],
    payments: m.payments || [],
    paymentsAll: m.payments || [],
    deliveries: m.deliveries || [],
    invoices: m.invoices || [],
    transactions: m.finances || [],
    transactionsAll: m.finances || [],
    documents: m.documents || [],
    taches: m.taches || [],
    alertes: m.alertes_center || [],
    businessPlans: m.business_plans || [],
    bpInvestmentLines: m.bp_investment_lines || [],
    bpRecurringCosts: m.bp_recurring_costs || [],
    opportunities: m.sales_opportunities || [],
    businessEvents: m.business_events || [],
    sensors: m.sensor_devices || [],
    cameras: m.camera_devices || [],
    rows: m.sales_orders || [],
    ...overrides,
  });
}

export async function withSimulatedMode(enabled, fn) {
  const prev = globalThis.localStorage.getItem(SIMULATED_DATA_MODE_KEY);
  if (enabled) globalThis.localStorage.setItem(SIMULATED_DATA_MODE_KEY, '1');
  else globalThis.localStorage.removeItem(SIMULATED_DATA_MODE_KEY);
  try {
    return await fn();
  } finally {
    if (prev === null) globalThis.localStorage.removeItem(SIMULATED_DATA_MODE_KEY);
    else globalThis.localStorage.setItem(SIMULATED_DATA_MODE_KEY, prev);
  }
}

export async function renderModuleTab(moduleId, tab, propsExtra = {}) {
  const loader = MODULE_ENTRY_POINTS[moduleId];
  if (!loader) throw new Error(`Module inconnu: ${moduleId}`);
  const mod = await loader();
  const props = { ...buildBaseProps(), ...propsExtra, initialTab: tab, key: `${moduleId}-${tab}` };
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(AppProvider, null, React.createElement(mod.default, props)),
    ),
  );
  if (html.length <= 50) throw new Error(`Rendu vide (${html.length} chars)`);
  if (ERROR_PATTERN.test(html)) throw new Error(`Marqueur erreur: ${html.slice(0, 400)}`);
  return html;
}

export async function assertModuleTabStable(moduleId, tab, propsExtra = {}) {
  await renderModuleTab(moduleId, tab, propsExtra);
}

export function criticalModuleIds() {
  return Object.keys(MODULE_TAB_MATRIX);
}
