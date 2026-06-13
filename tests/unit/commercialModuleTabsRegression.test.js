import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

const baseProps = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  animaux: [], lots: [], stocks: [], rows: [], clients: [], fournisseurs: [], cultures: [],
  salesOrders: [], salesOrdersAll: [], orderItems: [], payments: [], paymentsAll: [],
  invoices: [], deliveries: [], opportunities: [],
  transactions: [], transactionsAll: [], documents: [], taches: [], alertes: [],
  businessPlans: [], businessEvents: [], alimentationLogs: [], productionLogs: [],
  dataMap: {}, onNavigate: () => {}, onRefresh: () => {}, onOpenAssistant: () => {},
  accessibleFarms: [{ id: 'f1', name: 'Ferme test', status: 'active' }],
  farmScope: { mode: 'all' }, activeFarm: null, periodLabel: 'Mois en cours',
  periodFiltered: false, online: true,
};

const COMMERCIAL_TABS = [
  'Ventes', 'Clients & créances', 'Livraisons',
];

for (const tab of COMMERCIAL_TABS) {
  test(`Commercial tab render: ${tab}`, async () => {
    const mod = await import('../../src/modules/CommercialModule.jsx');
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(
          AppProvider,
          null,
          React.createElement(mod.default, { ...baseProps, initialTab: tab }),
        ),
      ),
    );
    assert.ok(html.length > 50, `Commercial/${tab} rendu vide`);
    assert.doesNotMatch(html, /ERREUR MODULE|is not defined|useAppData must be used/i);
  });
}
