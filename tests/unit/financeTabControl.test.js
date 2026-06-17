import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { resolveFinanceTab } from '../../src/utils/commercialNavigation.js';

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
  transactions: horizonFarmSimulationSeed.finances,
  transactionsAll: horizonFarmSimulationSeed.finances,
  finances: horizonFarmSimulationSeed.finances,
  payments: horizonFarmSimulationSeed.payments,
  paymentsAll: horizonFarmSimulationSeed.payments,
  salesOrders: horizonFarmSimulationSeed.sales_orders,
  salesOrdersAll: horizonFarmSimulationSeed.sales_orders,
  fournisseurs: horizonFarmSimulationSeed.fournisseurs,
  clients: horizonFarmSimulationSeed.clients,
  businessPlans: horizonFarmSimulationSeed.business_plans || [],
  investissements: horizonFarmSimulationSeed.investissements || [],
  documents: horizonFarmSimulationSeed.documents,
  onNavigate: () => {},
  onRefresh: () => {},
  accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  online: true,
};

test('onglet contrôlé — Résumé rend le cockpit finance', async () => {
  const mod = await import('../../src/modules/FinancePilotageRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Résumé',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Finance & Pilotage|Situation financière|Trésorerie/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('onglet contrôlé — Trésorerie rend la saisie flux', async () => {
  const mod = await import('../../src/modules/FinancePilotageRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Trésorerie',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Saisie & flux|Réconciliation|FinancesV12/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('resolveFinanceTab — alias Investissements vers Pilotage', () => {
  assert.equal(resolveFinanceTab('Investissements'), 'Pilotage');
  assert.equal(resolveFinanceTab('Résumé'), 'Résumé');
  assert.equal(resolveFinanceTab('Créances'), 'Créances & dettes');
});
