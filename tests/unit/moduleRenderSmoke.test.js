import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import DashboardV2 from '../../src/modules/DashboardV2.jsx';
import CentreIA from '../../src/modules/CentreIA.jsx';
import ObjectifsCroissanceV2 from '../../src/modules/ObjectifsCroissanceV2.jsx';

const baseProps = {
  user: { email: 'test@horizonfarm.app', user_metadata: { name: 'Test' } },
  animaux: [],
  lots: [],
  lotsData: [],
  stocks: [],
  clients: [],
  fournisseurs: [],
  cultures: [],
  salesOrders: [],
  salesOrdersAll: [],
  payments: [],
  paymentsAll: [],
  transactions: [],
  transactionsAll: [],
  documents: [],
  taches: [],
  alertes: [],
  businessPlans: [],
  investissements: [],
  productionLogs: [],
  alimentationLogs: [],
  meteo: { temp: 25, condition: 'Clair' },
  dataMap: {},
  onNavigate: () => {},
  onRefresh: () => {},
  accessibleFarms: [{ id: 'f1', name: 'Ferme test', status: 'active' }],
  farmScope: { mode: 'all' },
  activeFarm: null,
  periodLabel: 'Mois en cours',
  periodFiltered: false,
};

for (const [name, Component, extra = {}] of [
  ['DashboardV2', DashboardV2, {}],
  ['CentreIA', CentreIA, { initialTab: 'À traiter' }],
  ['ObjectifsCroissanceV2', ObjectifsCroissanceV2, { initialTab: 'Suivi du Business Plan' }],
]) {
  test(`render smoke (SSR): ${name}`, () => {
    const html = renderToString(React.createElement(Component, { ...baseProps, ...extra }));
    assert.ok(html.length > 50, `${name} should render HTML`);
  });
}
