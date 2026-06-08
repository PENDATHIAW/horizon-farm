import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFarmScopeToDataMap,
  applyFarmScopeToProps,
  filterPaymentsByFarmScope,
} from '../../src/utils/applyFarmScope.js';
import {
  CREATE_REQUIRES_FARM_ERROR,
  enrichPayloadWithFarmId,
  validateCreateFarmContext,
} from '../../src/utils/farmScopeCreate.js';
import { canSelectAllFarmsScope } from '../../src/utils/farmScope.js';
import { getFarmActivityNotice } from '../../src/config/farmActivities.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true, activity_type: ['mixte'] };
const FARM_B = { id: 'farm-b', name: 'Site avicole', activity_type: ['aviculture_pondeuses'] };
const filterOpts = { accessibleFarms: [FARM_A, FARM_B], forceFilter: true };

test('Phase 3 — Dashboard filtre ventes et finances par ferme', () => {
  const props = applyFarmScopeToProps(
    {
      salesOrders: [
        { id: 'O1', montant_total: 1000, farm_id: FARM_A.id, date: '2026-06-01' },
        { id: 'O2', montant_total: 2000, farm_id: FARM_B.id, date: '2026-06-01' },
      ],
      salesOrdersAll: [
        { id: 'O1', montant_total: 1000, farm_id: FARM_A.id, date: '2026-06-01' },
        { id: 'O2', montant_total: 2000, farm_id: FARM_B.id, date: '2026-06-01' },
      ],
      payments: [{ id: 'P1', order_id: 'O1', montant: 500 }],
      transactions: [{ id: 'T1', type: 'entree', montant: 300, farm_id: FARM_B.id, date: '2026-06-01' }],
      stocks: [{ id: 'S1', produit: 'Maïs', quantite: 10, farm_id: FARM_A.id }],
      animaux: [{ id: 'A1', status: 'actif', farm_id: FARM_B.id }],
      lots: [{ id: 'L1', current_count: 100, farm_id: FARM_A.id }],
      cultures: [{ id: 'C1', statut: 'en_cours', farm_id: FARM_B.id }],
    },
    { mode: 'single', farmId: FARM_A.id },
    { ...filterOpts, moduleId: 'dashboard', activeFarm: FARM_A },
  );

  assert.equal(props.salesOrders.length, 1);
  assert.equal(props.transactions.length, 0);
  assert.equal(props.stocks.length, 1);
  assert.equal(props.animaux.length, 0);
  assert.equal(props.lots.length, 1);
  assert.equal(props.cultures.length, 0);
  assert.equal(props.payments.length, 1);
});

test('Phase 3 — Finance filtre transactionsAll en mode ferme', () => {
  const props = applyFarmScopeToProps(
    {
      transactions: [{ id: 'T1', montant: 100, farm_id: FARM_A.id }],
      transactionsAll: [
        { id: 'T1', montant: 100, farm_id: FARM_A.id },
        { id: 'T2', montant: 200, farm_id: FARM_B.id },
      ],
      finances: [{ id: 'F1', amount: 50, farm_id: FARM_B.id }],
    },
    { mode: 'single', farmId: FARM_A.id },
    { ...filterOpts, moduleId: 'finance_pilotage', activeFarm: FARM_A },
  );

  assert.equal(props.transactionsAll.length, 1);
  assert.equal(props.finances.length, 0);
});

test('Phase 3 — Commercial filtre commandes et paiements liés', () => {
  const orders = [
    { id: 'O1', farm_id: FARM_A.id, montant_total: 1000 },
    { id: 'O2', farm_id: FARM_B.id, montant_total: 500 },
  ];
  const props = applyFarmScopeToProps(
    {
      salesOrders: orders,
      payments: [
        { id: 'P1', order_id: 'O1', montant: 100 },
        { id: 'P2', order_id: 'O2', montant: 50 },
        { id: 'P3', montant: 20 },
      ],
    },
    { mode: 'single', farmId: FARM_A.id },
    { ...filterOpts, moduleId: 'commercial', activeFarm: FARM_A },
  );

  assert.equal(props.salesOrders.length, 1);
  assert.equal(props.payments.length, 2);
});

test('Phase 3 — Élevage filtre logs alimentation via lot', () => {
  const props = applyFarmScopeToProps(
    {
      lots: [{ id: 'L1', farm_id: FARM_A.id }, { id: 'L2', farm_id: FARM_B.id }],
      alimentationLogs: [
        { id: 'AL1', lot_id: 'L1', quantite: 10 },
        { id: 'AL2', lot_id: 'L2', quantite: 5 },
      ],
      productionLogs: [{ id: 'PL1', lot_id: 'L2', oeufs_produits: 100 }],
    },
    { mode: 'single', farmId: FARM_A.id },
    { ...filterOpts, moduleId: 'elevage', activeFarm: FARM_A },
  );

  assert.equal(props.alimentationLogs.length, 1);
  assert.equal(props.productionLogs.length, 0);
});

test('Phase 3 — mode toutes les fermes conserve consolidation', () => {
  const dataMap = applyFarmScopeToDataMap(
    {
      stock: [{ id: 1, farm_id: FARM_A.id }, { id: 2, farm_id: FARM_B.id }],
      sales_orders: [{ id: 'O1', farm_id: FARM_A.id }, { id: 'O2', farm_id: FARM_B.id }],
    },
    { mode: 'all' },
    filterOpts,
  );
  assert.equal(dataMap.stock.length, 2);
  assert.equal(dataMap.sales_orders.length, 2);
  assert.equal(dataMap.farmFiltered, false);
});

test('Phase 3 — lignes sans farm_id restent visibles', () => {
  const props = applyFarmScopeToProps(
    { stocks: [{ id: 'S-legacy', produit: 'Legacy' }, { id: 'S2', farm_id: FARM_B.id, produit: 'B' }] },
    { mode: 'single', farmId: FARM_A.id },
    { ...filterOpts, moduleId: 'achats_stock', activeFarm: FARM_A },
  );
  assert.equal(props.stocks.length, 1);
  assert.equal(props.stocks[0].id, 'S-legacy');
});

test('Phase 3 — création injecte farm_id actif', () => {
  const result = enrichPayloadWithFarmId(
    'finances',
    { type: 'entree', montant: 100 },
    { scope: { mode: 'single', farmId: FARM_A.id }, accessibleFarms: [FARM_A, FARM_B], filteringEnabled: true },
  );
  assert.equal(result.ok, true);
  assert.equal(result.payload.farm_id, FARM_A.id);
});

test('Phase 3 — création bloquée en mode toutes les fermes', () => {
  const result = validateCreateFarmContext(
    'sales_orders',
    { montant_total: 1000 },
    { scope: { mode: 'all' }, accessibleFarms: [FARM_A, FARM_B], filteringEnabled: true },
  );
  assert.equal(result.ok, false);
  assert.equal(result.error, CREATE_REQUIRES_FARM_ERROR);
});

test('Phase 3 — activité cultures affiche notice', () => {
  const notice = getFarmActivityNotice('cultures', FARM_B, true);
  assert.match(notice, /activité cultures/i);
});

test('Phase 3 — canSelectAllFarmsScope réservé direction', () => {
  assert.equal(canSelectAllFarmsScope({ role: 'admin' }), true);
  assert.equal(canSelectAllFarmsScope({ user_metadata: { role: 'employe' } }), false);
});

test('Phase 3 — Dashboard summary props filtrées conservent openSales cohérent', () => {
  const props = applyFarmScopeToProps(
    {
      salesOrders: [{ id: 'O1', montant_total: 10000, farm_id: FARM_A.id, reste_a_payer: 0 }],
      salesOrdersAll: [
        { id: 'O1', montant_total: 10000, farm_id: FARM_A.id, reste_a_payer: 0 },
        { id: 'O2', montant_total: 5000, farm_id: FARM_B.id, reste_a_payer: 5000 },
      ],
    },
    { mode: 'single', farmId: FARM_A.id },
    { ...filterOpts, moduleId: 'dashboard', activeFarm: FARM_A },
  );
  assert.equal(props.salesOrdersAll.length, 1);
  assert.equal(props.salesOrdersAll[0].id, 'O1');
});

test('filterPaymentsByFarmScope — héritage order_id', () => {
  const orders = [{ id: 'O1', farm_id: FARM_A.id }];
  const payments = filterPaymentsByFarmScope(
    [{ id: 'P1', order_id: 'O1' }, { id: 'P2', order_id: 'O2' }],
    orders,
    { mode: 'single', farmId: FARM_A.id },
    [FARM_A, FARM_B],
  );
  assert.equal(payments.length, 1);
});
