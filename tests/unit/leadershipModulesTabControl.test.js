import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { horizonFarmSimulationSeed } from '../../src/utils/horizonFarmSimulationSeed.js';
import {
  resolveElevageTab,
  resolveObjectifsTab,
  resolveCentreTab,
} from '../../src/utils/commercialNavigation.js';

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
  animaux: horizonFarmSimulationSeed.animaux,
  lots: horizonFarmSimulationSeed.avicole,
  rows: horizonFarmSimulationSeed.avicole,
  sante: horizonFarmSimulationSeed.sante,
  stocks: horizonFarmSimulationSeed.stock,
  alimentationLogs: horizonFarmSimulationSeed.alimentation_logs,
  productionLogs: horizonFarmSimulationSeed.production_oeufs_logs,
  businessEvents: horizonFarmSimulationSeed.business_events,
  dataMap: { animaux: horizonFarmSimulationSeed.animaux, avicole: horizonFarmSimulationSeed.avicole },
  onNavigate: () => {},
  onRefresh: () => {},
  accessibleFarms: [{ id: 'HF-FARM-001', name: 'Horizon Farm', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
  online: true,
};

test('Élevage — onglet contrôlé Lots & bandes', async () => {
  const mod = await import('../../src/modules/ElevageRecoveredModule.jsx');
  const html = renderToString(
    React.createElement(AuthProvider, null, React.createElement(AppProvider, null, React.createElement(mod.default, {
      ...seedProps,
      initialTab: 'Lots & bandes',
      onTabChange: () => {},
    }))),
  );
  assert.match(html, /Élevage|Lots|bandes|Avicole/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('Objectifs — onglet contrôlé BP', async () => {
  const mod = await import('../../src/modules/objectifs/ObjectifsDecisionModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(AppProvider, null, React.createElement(mod.default, {
        ...seedProps,
        dataMap: seedProps.dataMap,
        initialTab: 'Suivi du Business Plan',
        onTabChange: () => {},
      })),
    ),
  );
  assert.match(html, /Objectifs|Business Plan|Croissance/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('Centre IA — onglet contrôlé Urgences', async () => {
  const mod = await import('../../src/modules/centre/CentreDecisionModule.jsx');
  const html = renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(AppProvider, null, React.createElement(mod.default, {
        ...seedProps,
        dataMap: seedProps.dataMap,
        initialTab: 'Urgences & risques',
        onTabChange: () => {},
      })),
    ),
  );
  assert.match(html, /Centre|Urgences|risques|décision/i);
  assert.doesNotMatch(html, /ERREUR MODULE|is not defined/i);
});

test('alias legacy — Résumé et Avicole', () => {
  assert.equal(resolveElevageTab('Résumé'), 'Vue élevage');
  assert.equal(resolveElevageTab('Avicole'), 'Production élevage');
  assert.equal(resolveObjectifsTab('Graphiques'), 'Historique objectifs');
  assert.equal(resolveCentreTab('Priorités'), 'Urgences & risques');
});
