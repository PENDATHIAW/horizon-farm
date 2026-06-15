import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { resolveCommercialTab } from '../../src/utils/commercialNavigation.js';

if (typeof globalThis.localStorage === 'undefined') {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

const seedProps = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  clients: horizonFarmSimulationSeed.clients,
  salesOrders: horizonFarmSimulationSeed.sales_orders,
  salesOrdersAll: horizonFarmSimulationSeed.sales_orders,
  orderItems: horizonFarmSimulationSeed.sales_order_items,
  payments: horizonFarmSimulationSeed.payments,
  paymentsAll: horizonFarmSimulationSeed.payments,
  deliveries: horizonFarmSimulationSeed.deliveries,
  invoices: horizonFarmSimulationSeed.invoices,
  opportunities: horizonFarmSimulationSeed.sales_opportunities,
  transactions: horizonFarmSimulationSeed.finances,
  transactionsAll: horizonFarmSimulationSeed.finances,
  stocks: horizonFarmSimulationSeed.stock,
  animaux: horizonFarmSimulationSeed.animaux,
  lots: horizonFarmSimulationSeed.avicole,
  cultures: horizonFarmSimulationSeed.cultures,
  documents: horizonFarmSimulationSeed.documents,
  taches: horizonFarmSimulationSeed.taches,
  alertes: horizonFarmSimulationSeed.alertes_center,
  businessEvents: horizonFarmSimulationSeed.business_events,
  onNavigate: () => {},
  onRefresh: () => {},
  onOpenAssistant: () => {},
  accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  online: true,
};

test('onglet contrôlé — Clients & créances rend le portefeuille clients', async () => {
  const mod = await import('../../src/modules/CommercialModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Clients & créances',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Grossiste Dakar|Restaurant Teranga|Créances à encaisser|Situation clients/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('resolveCommercialTab — alias Clients vers canonique', () => {
  assert.equal(resolveCommercialTab('Clients'), 'Clients & créances');
  assert.equal(resolveCommercialTab('Clients & créances'), 'Clients & créances');
});
