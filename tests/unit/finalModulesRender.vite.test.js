import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { getModuleTabs } from '../../src/config/moduleTabs/index.js';
import GestionSystemeV1Module from '../../src/modules/GestionSystemeV1Module.jsx';
import AgriFeedsModule from '../../src/modules/AgriFeedsModule.jsx';
import SmartFarmTelemetry from '../../src/modules/smartfarm/SmartFarmTelemetry.jsx';
import FinancementsModule from '../../src/modules/FinancementsModule.jsx';

function installStorage(name) {
  if (globalThis[name]) return;
  const store = new Map();
  globalThis[name] = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)); },
    removeItem: (key) => { store.delete(key); },
    clear: () => { store.clear(); },
  };
}

installStorage('localStorage');
installStorage('sessionStorage');

const noop = () => {};
const baseProps = {
  activeFarm: { id: 'farm-1', name: 'Ferme test', settings: {} },
  accessibleFarms: [{ id: 'farm-1', name: 'Ferme test', settings: {} }],
  dataMap: {},
  crud: {},
  sensors: [],
  smartfarmEvents: [],
  users: [],
  profiles: [],
  clients: [],
  fournisseurs: [],
  stocks: [],
  lots: [],
  animaux: [],
  transactions: [],
  documents: [],
  businessEvents: [],
  businessPlans: [],
  rapports: [],
  alertes: [],
  taches: [],
  tasks: [],
  online: false,
  onNavigate: noop,
  onRefresh: noop,
  onRefreshAll: noop,
};

function renderModule(Component, props) {
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

const suites = [
  ['gestion_systeme', GestionSystemeV1Module],
  ['agri_feeds', AgriFeedsModule],
  ['smartfarm', SmartFarmTelemetry],
  ['financements', FinancementsModule],
  ['financements_externe', FinancementsModule],
];

for (const [moduleId, Component] of suites) {
  for (const tab of getModuleTabs(moduleId)) {
    test(`rendu SSR ${moduleId}: ${tab.label}`, () => {
      const html = renderModule(Component, { initialTab: tab.label });
      assert.ok(html.length > 50, `${moduleId}/${tab.label} rendered empty`);
      assert.doesNotMatch(html, /ERREUR MODULE|useAppData must be used/i);
    });
  }
}
