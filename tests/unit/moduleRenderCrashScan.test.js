import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';
import { AppProvider } from '../../src/context/AppContext.jsx';
import { AuthProvider } from '../../src/context/AuthContext.jsx';

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
  productionLogs: [],
  alimentationLogs: [],
  meteo: { temp: 25, condition: 'Clair' },
  dataMap: {},
  crud: {},
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
};

const CRITICAL = [
  'dashboard', 'assistant_erp', 'commercial', 'achats_stock', 'finance_pilotage',
  'financements', 'equipe', 'equipements', 'investissements',
];

for (const moduleId of CRITICAL) {
  test(`render crash scan: ${moduleId}`, async () => {
    const loader = MODULE_ENTRY_POINTS[moduleId];
    assert.ok(loader, `missing entry for ${moduleId}`);
    const mod = await loader();
    const Component = mod.default;
    const extra = moduleId === 'centre_decisionnel' ? { initialTab: 'Urgences & risques' } : {};
    const html = renderToString(
      React.createElement(
        AuthProvider,
        null,
        React.createElement(AppProvider, null, React.createElement(Component, { ...baseProps, ...extra })),
      ),
    );
    assert.ok(html.length > 20, `${moduleId} rendered empty`);
    assert.doesNotMatch(html, /ERREUR MODULE|useAppData must be used|is not defined/i);
  });
}
