import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MODULE_ENTRY_POINTS } from '../../src/config/moduleEntryPoints.js';

const baseProps = {
  animaux: [], lots: [], stocks: [], rows: [], clients: [], fournisseurs: [],
  salesOrders: [], salesOrdersAll: [], payments: [], paymentsAll: [],
  transactions: [], transactionsAll: [], documents: [], dataMap: {},
  onNavigate: () => {}, onRefresh: () => {}, initialTab: 'Résumé', online: true,
  businessEvents: [], taches: [], alertes: [], businessPlans: [], investissements: [],
  bpInvestmentLines: [], bpRecurringCosts: [], bpRevenueProjections: [], bpFundingSources: [],
  whatsappWorkflowHandlers: {},
};

for (const moduleId of ['assistant_erp', 'commercial', 'achats_stock', 'finance_pilotage']) {
  test(`render crash scan: ${moduleId}`, async () => {
    const mod = await MODULE_ENTRY_POINTS[moduleId]();
    const html = renderToString(React.createElement(mod.default, baseProps));
    assert.ok(html.length > 20, `${moduleId} rendered empty`);
  });
}
