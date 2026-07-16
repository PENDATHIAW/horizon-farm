import assert from 'node:assert/strict';
import test from 'node:test';
import { buildConsolidatedCommercialKpis } from '../../src/utils/commercialKpiConsolidated.js';
import { runKpiEngine } from '../../src/services/kpiEngine/index.js';

const orders = [
  { id: 'JAN', montant_total: 10000, date: '2026-01-10', client_id: 'C1' },
  { id: 'JUL', montant_total: 20000, date: '2026-07-10', client_id: 'C2' },
];
const payments = [
  { id: 'P-JAN', order_id: 'JAN', montant: 4000, date_paiement: '2026-01-15' },
  { id: 'P-OLD-JUL', order_id: 'JAN', montant: 3000, date_paiement: '2026-07-05' },
  { id: 'P-JUL', order_id: 'JUL', montant: 5000, date_paiement: '2026-07-12' },
];

test('le filtre mensuel sépare CA, encaissements et créances', () => {
  const kpis = buildConsolidatedCommercialKpis({
    orders,
    payments,
    periodScope: { mode: 'months', monthKeys: ['2026-07'] },
  });

  assert.equal(kpis.ca, 20000);
  assert.equal(kpis.collected, 8000);
  assert.equal(kpis.receivable, 15000);
  assert.equal(kpis.orderCount, 1);
});

test('sans période explicite, les KPI restent cumulés depuis le début', () => {
  const kpis = buildConsolidatedCommercialKpis({ orders, payments });
  assert.equal(kpis.ca, 30000);
  assert.equal(kpis.collected, 12000);
  assert.equal(kpis.receivable, 18000);
});

test('un trop-perçu ne fait jamais dépasser l’encaissé au-dessus du CA cumulé', () => {
  const kpis = buildConsolidatedCommercialKpis({
    orders: [{ id: 'O1', montant_total: 1000, date: '2026-07-01' }],
    payments: [{ id: 'P1', order_id: 'O1', montant: 1400, date_paiement: '2026-07-02' }],
  });

  assert.equal(kpis.ca, 1000);
  assert.equal(kpis.collected, 1000);
  assert.equal(kpis.paymentRate, 100);
});

test('le moteur Dashboard conserve les cumuls tout en calculant la période', () => {
  const scope = { mode: 'months', monthKeys: ['2026-07'] };
  const result = runKpiEngine({
    sales_orders: [orders[1]],
    sales_orders_all: orders,
    payments: payments.filter((payment) => payment.date_paiement.startsWith('2026-07')),
    payments_all: payments,
    finances: [],
    finances_all: [],
    production_oeufs_logs: [{ id: 'E-JUL', date: '2026-07-10', oeufs_produits: 20 }],
    production_oeufs_logs_all: [
      { id: 'E-JAN', date: '2026-01-10', oeufs_produits: 10 },
      { id: 'E-JUL', date: '2026-07-10', oeufs_produits: 20 },
    ],
  }, { module: 'dashboard', periodScope: scope });

  assert.equal(result.commercial.ca, 20000);
  assert.equal(result.commercial.collected, 8000);
  assert.equal(result.livestock.eggsPeriod, 20);
  assert.equal(result.livestock.eggProduction.eggsAllTime, 30);
  assert.equal(result.dashboard.ca, 20000);
  assert.equal(result.dashboard.caAll, 30000);
  assert.equal(result.dashboard.eggProduction.eggsAllTime, 30);
});
