import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../src/context/AppContext.jsx';
import { AuthProvider } from '../src/context/AuthContext.jsx';
import { MODULE_ENTRY_POINTS } from '../src/config/moduleEntryPoints.js';
import { MODULE_TARGET_TABS } from '../src/config/horizonVision.config.js';
import {
  COMMERCIAL_TABS, ACHATS_STOCK_TABS, ELEVAGE_TABS, FINANCE_TABS, ACTIVITE_SUIVI_TABS,
} from '../src/utils/commercialNavigation.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
    clear: () => store.clear(),
  };
}

const baseProps = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  animaux: [], lots: [], stocks: [], rows: [], clients: [], fournisseurs: [], cultures: [],
  salesOrders: [], salesOrdersAll: [], orderItems: [], payments: [], paymentsAll: [],
  invoices: [], deliveries: [], opportunities: [],
  transactions: [], transactionsAll: [], documents: [], taches: [], alertes: [],
  businessPlans: [], investissements: [], bpInvestmentLines: [], bpRecurringCosts: [],
  dataMap: {}, onNavigate: () => {}, onRefresh: () => {}, onOpenAssistant: () => {},
  accessibleFarms: [{ id: 'f1', name: 'Ferme test', status: 'active' }],
  farmScope: { mode: 'all' }, activeFarm: null, periodLabel: 'Mois en cours',
  periodFiltered: false, online: true,
  whatsappWorkflowHandlers: {}, existingTasks: [], existingAlerts: [],
  businessEvents: [], businessEventsAll: [], sensors: [], cameras: [],
  meteo: { temp: 25, condition: 'Clair' },
};

const INITIAL_TAB_MODULES = new Set([
  'commercial', 'achats_stock', 'elevage', 'finance_pilotage', 'centre_ia', 'gestion_systeme',
]);

const MODULE_TABS = {
  commercial: COMMERCIAL_TABS,
  achats_stock: ACHATS_STOCK_TABS,
  elevage: ELEVAGE_TABS,
  finance_pilotage: FINANCE_TABS,
  activite_suivi: ACTIVITE_SUIVI_TABS,
  dashboard: MODULE_TARGET_TABS.dashboard,
  assistant_erp: MODULE_TARGET_TABS.assistant_erp,
  documents_rapports: MODULE_TARGET_TABS.documents_rapports,
  rh: MODULE_TARGET_TABS.rh,
  gestion_systeme: MODULE_TARGET_TABS.gestion_systeme,
  centre_ia: MODULE_TARGET_TABS.centre_ia,
  smartfarm: ['Résumé', 'Capteurs', 'Caméras', 'Annexe', 'Graphiques'],
  cultures: ['Vue d\u2019ensemble', 'Cultures', 'Parcelles', 'Campagnes', 'Performance'],
  investisseurs_forums: ['room', 'preparation', 'dossier', 'library', 'crm', 'preview', 'export', 'history', 'demo'],
};

const results = [];

for (const [moduleId, tabs] of Object.entries(MODULE_TABS)) {
  const loader = MODULE_ENTRY_POINTS[moduleId];
  const file = loader ? (String(loader).match(/import\(['"](.+?)['"]\)/)?.[1] ?? moduleId) : '';

  if (!loader) {
    for (const tab of tabs) {
      results.push({ moduleId, tab, ok: false, file, error: 'No MODULE_ENTRY_POINTS loader', initialTabSupported: false });
    }
    continue;
  }

  let Component;
  try {
    Component = (await loader()).default;
  } catch (e) {
    for (const tab of tabs) {
      results.push({ moduleId, tab, ok: false, file, error: `Import failed: ${e.message}`, initialTabSupported: INITIAL_TAB_MODULES.has(moduleId) });
    }
    continue;
  }

  for (const tab of tabs) {
    const initialTabSupported = INITIAL_TAB_MODULES.has(moduleId);
    try {
      const html = renderToString(
        React.createElement(
          AuthProvider,
          null,
          React.createElement(
            AppProvider,
            null,
            React.createElement(Component, {
              ...baseProps,
              initialTab: tab,
              key: `${moduleId}-${tab}`,
            }),
          ),
        ),
      );
      if (html.length <= 50) throw new Error(`Rendered empty (${html.length} chars)`);
      if (/ERREUR MODULE|is not defined|useAppData must be used|cannot read properties of undefined/i.test(html)) {
        throw new Error(`Error marker in HTML: ${html.slice(0, 300)}`);
      }
      results.push({ moduleId, tab, ok: true, file, error: '', initialTabSupported });
    } catch (e) {
      results.push({
        moduleId, tab, ok: false, file,
        error: e.message,
        stack: e.stack?.split('\n').slice(0, 8).join('\n'),
        initialTabSupported,
      });
    }
  }
}

const fails = results.filter((r) => !r.ok);
console.log(`\n=== TAB RENDER SCAN ===`);
console.log(`Total: ${results.length} | Pass: ${results.length - fails.length} | Fail: ${fails.length}\n`);

if (fails.length) {
  console.log('FAILURES:');
  console.log('module|tab|file|initialTab?|error');
  for (const f of fails) {
    console.log(`${f.moduleId}|${f.tab}|${f.file}|${f.initialTabSupported ? 'yes' : 'NO-op'}|${f.error.replace(/\n/g, ' ')}`);
    if (f.stack) console.log(f.stack);
  }
} else {
  console.log('No render throws detected.');
}

process.exit(fails.length ? 1 : 0);
