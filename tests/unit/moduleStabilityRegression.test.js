import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';
import { CANONICAL_MODULE_FILES, MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';

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

const baseProps = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  animaux: [], lots: [], stocks: [], rows: [], clients: [], fournisseurs: [], cultures: [],
  salesOrders: [], salesOrdersAll: [], payments: [], paymentsAll: [],
  transactions: [], transactionsAll: [], documents: [], taches: [], alertes: [],
  businessPlans: [], investissements: [], bpInvestmentLines: [], bpRecurringCosts: [],
  dataMap: {}, onNavigate: () => {}, onRefresh: () => {}, onOpenAssistant: () => {},
  accessibleFarms: [{ id: 'f1', name: 'Ferme test', status: 'active' }],
  farmScope: { mode: 'all' }, activeFarm: null, periodLabel: 'Mois en cours',
  periodFiltered: false, initialTab: 'Résumé', online: true,
  whatsappWorkflowHandlers: {}, existingTasks: [], existingAlerts: [],
  businessEvents: [], businessEventsAll: [],
};

const CRITICAL_MODULES = [
  'dashboard',
  'assistant_erp',
  'finance_pilotage',
  'commercial',
  'achats_stock',
  'elevage',
  'cultures',
  'documents_rapports',
  'financements',
  'rh',
  'smartfarm',
  'gestion_systeme',
  'centre_ia',
  'activite_suivi',
  'sync_activity',
];

const TAB_OVERRIDES = {
  finance_pilotage: { initialTab: 'Investissements' },
  commercial: { initialTab: 'Résumé' },
  achats_stock: { initialTab: 'Stock' },
  elevage: { initialTab: 'Résumé' },
  centre_ia: { initialTab: 'Urgences & risques' },
  activite_suivi: { initialTab: 'Cockpit & décisions' },
  sync_activity: { initialTab: 'Vérifications' },
  gestion_systeme: { initialTab: 'Vue admin' },
};

function renderModule(Component, extra = {}) {
  return renderToString(
    React.createElement(
      AuthProvider,
      null,
      React.createElement(AppProvider, null, React.createElement(Component, { ...baseProps, ...extra })),
    ),
  );
}

for (const moduleId of CRITICAL_MODULES) {
  test(`module stability render: ${moduleId}`, async () => {
    assert.ok(CANONICAL_MODULE_FILES[moduleId], `canonical file manquant pour ${moduleId}`);
    const mod = await MODULE_ENTRY_POINTS[moduleId]();
    const html = renderModule(mod.default, TAB_OVERRIDES[moduleId] || {});
    assert.ok(html.length > 40, `${moduleId} rendu vide`);
    assert.doesNotMatch(html, /ERREUR MODULE|useAppData must be used|is not defined/i);
  });
}
