import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}
if (typeof globalThis.sessionStorage === 'undefined') {
  const store = new Map();
  globalThis.sessionStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';

const baseProps = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  animaux: [],
  lots: [],
  lotsData: [],
  stocks: [],
  rows: [],
  clients: [],
  fournisseurs: [],
  cultures: [],
  salesOrders: [],
  salesOrdersAll: [],
  payments: [],
  paymentsAll: [],
  transactions: [],
  transactionsAll: [],
  finances: [],
  documents: [],
  taches: [],
  tasks: [],
  alertes: [],
  businessPlans: [],
  investissements: [],
  bpInvestmentLines: [],
  bpRecurringCosts: [],
  productionLogs: [],
  alimentationLogs: [],
  meteo: { temp: 25, condition: 'Clair' },
  dataMap: {},
  onNavigate: () => {},
  onRefresh: () => {},
  onOpenAssistant: () => {},
  accessibleFarms: [{ id: 'f1', name: 'Ferme test', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  initialTab: 'Résumé',
  online: true,
  whatsappWorkflowHandlers: {},
  existingTasks: [],
  existingAlerts: [],
  businessEvents: [],
  businessEventsAll: [],
};

function renderWithProvider(Component, props = {}) {
  return renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(Component, { ...baseProps, ...props }),
      ),
    ),
  );
}

for (const moduleId of ['assistant_erp', 'commercial', 'achats_stock', 'finance_pilotage']) {
  test(`render with AppProvider: ${moduleId}`, async () => {
    const mod = await MODULE_ENTRY_POINTS[moduleId]();
    const Component = mod.default;
    const extra = moduleId === 'finance_pilotage'
      ? { initialTab: 'Investissements' }
      : moduleId === 'commercial'
        ? { initialTab: 'Ventes' }
        : moduleId === 'achats_stock'
          ? { initialTab: 'Stock' }
          : {};
    const html = renderWithProvider(Component, extra);
    assert.ok(html.length > 50, `${moduleId} rendered empty`);
    assert.doesNotMatch(html, /ERREUR MODULE|useAppData must be used/i);
  });
}
