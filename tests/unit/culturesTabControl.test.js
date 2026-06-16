import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { resolveCulturesTab } from '../../src/utils/culturesNavigation.js';

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
  rows: horizonFarmSimulationSeed.cultures,
  cultures: horizonFarmSimulationSeed.cultures,
  stocks: horizonFarmSimulationSeed.stock,
  salesOrders: horizonFarmSimulationSeed.sales_orders,
  payments: horizonFarmSimulationSeed.payments,
  transactions: horizonFarmSimulationSeed.finances,
  opportunities: horizonFarmSimulationSeed.sales_opportunities,
  businessEvents: horizonFarmSimulationSeed.business_events,
  onNavigate: () => {},
  onRefresh: () => {},
  accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  online: true,
};

test('onglet contrôlé — Parcelles & campagnes rend le pilotage cultures', async () => {
  const mod = await import('../../src/modules/CulturesRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Parcelles & campagnes',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Brief décision terrain|Récoltes vendables|Laitue Batavia/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('onglet contrôlé — Récoltes rend le centre de production', async () => {
  const mod = await import('../../src/modules/CulturesRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Récoltes',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Centre de production/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('resolveCulturesTab — alias legacy vers canonique', () => {
  assert.equal(resolveCulturesTab('Pilotage'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Parcelles & campagnes'), 'Parcelles & campagnes');
  assert.equal(resolveCulturesTab('Transformation'), 'Récoltes');
});
