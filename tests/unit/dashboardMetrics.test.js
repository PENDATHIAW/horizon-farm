import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDashboardSummary,
  computeCultureSummary,
  formatCultureDetail,
  isDashboardStartupMode,
} from '../../src/modules/dashboard/dashboardMetrics.js';
import { openSalesCount, receivableFromOrders } from '../../src/modules/commercial/commercialMetrics.js';

const monthKey = () => new Date().toISOString().slice(0, 7);

test('P-01: openSales aligné avec commercialMetrics', () => {
  const orders = [
    { id: 'O1', montant_total: 10000, date: `${monthKey()}-01`, statut_livraison: 'livree' },
    { id: 'O2', montant_total: 5000, date: `${monthKey()}-02`, statut_livraison: 'livree' },
  ];
  const payments = [{ id: 'P1', order_id: 'O1', montant: 10000 }];
  const expected = openSalesCount(orders, payments);

  const summary = buildDashboardSummary({
    salesOrders: orders,
    salesOrdersAll: orders,
    payments,
    paymentsAll: payments,
    transactions: [],
    stocks: [],
    productionLogs: [],
  });

  assert.equal(expected, 1);
  assert.equal(summary.openSales, expected);
  assert.equal(summary.receivable, receivableFromOrders(orders, payments));
});

test('P-01: openSales à 0 quand toutes les ventes sont clôturées', () => {
  const orders = [
    { id: 'O1', montant_total: 10000, date: `${monthKey()}-01`, statut_livraison: 'livree' },
  ];
  const payments = [{ id: 'P1', order_id: 'O1', montant: 10000 }];
  const summary = buildDashboardSummary({
    salesOrders: orders,
    salesOrdersAll: orders,
    payments,
    paymentsAll: payments,
  });

  assert.equal(summary.openSales, 0);
});

test('P-10: trésorerie disponible via consolidateFinance', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 20000, date: `${monthKey()}-01` }],
    salesOrdersAll: [{ id: 'O1', montant_total: 20000, date: `${monthKey()}-01` }],
    payments: [{ id: 'P1', order_id: 'O1', montant: 15000, date: `${monthKey()}-01` }],
    paymentsAll: [{ id: 'P1', order_id: 'O1', montant: 15000, date: `${monthKey()}-01` }],
    transactions: [{ id: 'T1', type: 'sortie', montant: 3000, statut: 'paye', date: `${monthKey()}-01` }],
    transactionsAll: [{ id: 'T1', type: 'sortie', montant: 3000, statut: 'paye', date: `${monthKey()}-01` }],
  });

  assert.equal(summary.cashNet, 12000);
});

test('P-08: computeCultureSummary parcelles et cultures actives', () => {
  const summary = computeCultureSummary([
    { record_type: 'parcelle', parcelle_nom: 'P1', surface: 2, unite_surface: 'ha', statut: 'actif' },
    { record_type: 'culture', parcelle_nom: 'P1', surface: 1.5, unite_surface: 'ha', statut: 'en_cours' },
    { record_type: 'culture', parcelle_nom: 'P2', surface: 500, unite_surface: 'm²', statut: 'en_cours' },
  ]);

  assert.equal(summary.parcelCount, 1);
  assert.equal(summary.activeCultures, 2);
  assert.equal(summary.surfaceM2, 20000);
  assert.equal(summary.hasData, true);
  assert.match(formatCultureDetail(summary), /parcelle/);
});

test('P-26: mode démarrage sans activité', () => {
  const props = {
    salesOrders: [],
    salesOrdersAll: [],
    payments: [],
    paymentsAll: [],
    stocks: [],
    productionLogs: [],
  };

  assert.equal(isDashboardStartupMode(props), true);

  const summary = buildDashboardSummary(props);
  assert.equal(summary.startupMode, true);
});

test('P-26: sortie du mode démarrage dès qu une vente existe', () => {
  const props = {
    salesOrders: [{ id: 'O1', montant_total: 1000, date: `${monthKey()}-01` }],
    salesOrdersAll: [{ id: 'O1', montant_total: 1000, date: `${monthKey()}-01` }],
    payments: [],
    paymentsAll: [],
    stocks: [],
    productionLogs: [],
  };

  assert.equal(isDashboardStartupMode(props), false);
  assert.equal(buildDashboardSummary(props).startupMode, false);
});
