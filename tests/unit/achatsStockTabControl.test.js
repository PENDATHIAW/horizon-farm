import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import { resolveAchatsStockTab } from '../../src/utils/commercialNavigation.js';

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
  stocks: horizonFarmSimulationSeed.stock,
  fournisseurs: horizonFarmSimulationSeed.fournisseurs,
  suppliers: horizonFarmSimulationSeed.fournisseurs,
  transactions: horizonFarmSimulationSeed.finances,
  finances: horizonFarmSimulationSeed.finances,
  stockMovements: horizonFarmSimulationSeed.stock_movements || [],
  businessEvents: horizonFarmSimulationSeed.business_events,
  documents: horizonFarmSimulationSeed.documents,
  alimentationLogs: horizonFarmSimulationSeed.alimentation_logs,
  onNavigate: () => {},
  onRefresh: () => {},
  accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  online: true,
};

test('onglet contrôlé — Inventaire rend le stock simulé', async () => {
  const mod = await import('../../src/modules/AchatsStockRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Inventaire',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Aliment pondeuses|Achats & Stock/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('onglet contrôlé — Réceptions & achats rend le parcours d’achat', async () => {
  const mod = await import('../../src/modules/AchatsStockRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(
        AppProvider,
        null,
        React.createElement(mod.default, {
          ...seedProps,
          initialTab: 'Réceptions & achats',
          onTabChange: () => {},
        }),
      ),
    ),
  );

  assert.match(html, /Nouvelle réception|Achats sans preuve/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('resolveAchatsStockTab — anciens liens vers les vues cibles', () => {
  assert.equal(resolveAchatsStockTab('Stock'), 'Stocks & lots');
  assert.equal(resolveAchatsStockTab('Inventaire'), 'Inventaires stock');
  assert.equal(resolveAchatsStockTab('Résumé'), 'Tableau de bord stock');
});
