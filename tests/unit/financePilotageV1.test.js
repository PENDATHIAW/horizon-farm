import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildFinancePilotageInput,
  buildFinanceSchedule,
  buildOfficialTreasuryView,
  buildProfitabilityView,
  filterFinanceAnnexeDocuments,
  isFinanceStartupMode,
  TREASURY_LABELS,
} from '../../src/utils/financePilotageCore.js';
import { consolidateFinance } from '../../src/utils/financeConsolidationEngine.js';
import { applyFarmScopeToProps } from '../../src/utils/applyFarmScope.js';
import { resolveFinanceTab } from '../../src/utils/commercialNavigation.js';
import { MODULE_TARGET_TABS } from '../../src/config/horizonVision.config.js';
import { buildDashboardSummary } from '../../src/modules/dashboard/dashboardMetrics.js';

const FARM_A = { id: 'farm-a', name: 'Horizon Farm', is_default: true };
const FARM_B = { id: 'farm-b', name: 'Site Thiès', is_default: false };

test('TREASURY_LABELS — libellés officiels distincts', () => {
  assert.equal(TREASURY_LABELS.treasuryAvailable, 'Trésorerie disponible');
  assert.equal(TREASURY_LABELS.receivables, 'Créances clients');
  assert.equal(TREASURY_LABELS.payables, 'Dettes à payer');
  assert.equal(TREASURY_LABELS.netPosition, 'Position nette');
  assert.equal(TREASURY_LABELS.realMargin, 'Marge réelle');
  assert.notEqual(TREASURY_LABELS.treasuryAvailable, TREASURY_LABELS.realMargin);
});

test('buildOfficialTreasuryView — source unique consolidateFinance.cashNet', () => {
  const props = {
    transactions: [
      { id: 't1', type: 'entree', montant: 100000, statut: 'paye' },
      { id: 't2', type: 'sortie', montant: 30000, statut: 'paye' },
    ],
    salesOrders: [],
    payments: [],
  };
  const input = buildFinancePilotageInput(props);
  const finance = consolidateFinance(input);
  const view = buildOfficialTreasuryView(props);

  assert.equal(view.treasuryAvailable, finance.cashNet);
  assert.equal(view.realMargin, finance.margeReelle);
  assert.equal(view.netPosition, view.treasuryAvailable + view.receivables - view.payables);
});

test('buildProfitabilityView — rentabilité calculable avec ventes et charges', () => {
  const props = {
    transactions: [
      { id: 't1', type: 'sortie', montant: 20000, statut: 'paye', libelle: 'Aliment poulet', categorie: 'avicole' },
    ],
    salesOrders: [{ id: 'o1', montant_total: 80000, client_nom: 'Client A' }],
    payments: [{ id: 'p1', order_id: 'o1', montant: 80000 }],
    lots: [{ id: 'l1', farm_id: FARM_A.id, nom: 'Lot 1' }],
  };
  const view = buildProfitabilityView(props);
  assert.equal(view.ready, true);
  assert.ok(view.profit.caTotal > 0);
  assert.ok(typeof view.activityBreakdown.aviculture === 'number');
});

test('buildProfitabilityView — message si données insuffisantes', () => {
  const view = buildProfitabilityView({});
  assert.equal(view.ready, false);
  assert.match(view.message, /Rentabilité non encore calculable/i);
});

test('buildFinancePilotageInput — injecte animaux, lots et cultures', () => {
  const input = buildFinancePilotageInput({
    animaux: [{ id: 'a1' }],
    lots: [{ id: 'l1' }],
    cultures: [{ id: 'c1' }],
    sante: [{ id: 's1' }],
    alimentationLogs: [{ id: 'al1' }],
    productionLogs: [{ id: 'pl1' }],
  });
  assert.equal(input.animaux.length, 1);
  assert.equal(input.lots.length, 1);
  assert.equal(input.cultures.length, 1);
  assert.equal(input.sante.length, 1);
  assert.equal(input.alimentationLogs.length, 1);
  assert.equal(input.productionLogs.length, 1);
});

test('buildFinanceSchedule — buckets et séparation encaissements / paiements', () => {
  const today = new Date().toISOString().slice(0, 10);
  const schedule = buildFinanceSchedule({
    salesOrders: [{ id: 'o1', montant_total: 50000, montant_paye: 0, date_echeance: today, client_nom: 'Amadou' }],
    payments: [],
    fournisseurs: [{ id: 'f1', nom: 'Provende SA', dettes: 12000 }],
    transactions: [{ id: 't1', type: 'sortie', montant: 8000, statut: 'impaye', date_echeance: today, libelle: 'Charge' }],
  }, { accessibleFarms: [FARM_A] });

  assert.ok(schedule.inflows.length >= 1);
  assert.ok(schedule.outflows.length >= 1);
  assert.ok(schedule.buckets.today.inflows.length >= 1);
  assert.ok(schedule.totals.inflows >= 50000);
});

test('buildFinanceSchedule — étiquette ferme en multi-fermes', () => {
  const schedule = buildFinanceSchedule({
    salesOrders: [{ id: 'o1', farm_id: FARM_B.id, montant_total: 10000, client_nom: 'Client B' }],
    payments: [],
  }, { accessibleFarms: [FARM_A, FARM_B] });

  assert.equal(schedule.inflows[0].farmLabel, FARM_B.name);
});

test('buildFinanceSchedule — lignes sans farm_id restent visibles', () => {
  const schedule = buildFinanceSchedule({
    salesOrders: [{ id: 'o1', montant_total: 15000, client_nom: 'Legacy' }],
    payments: [],
  }, { accessibleFarms: [FARM_A, FARM_B] });

  assert.equal(schedule.inflows.length, 1);
  assert.ok(schedule.inflows[0].farmLabel);
});

test('filterFinanceAnnexeDocuments — pièces financières uniquement', () => {
  const docs = filterFinanceAnnexeDocuments([
    { id: 'd1', title: 'Facture fournisseur', categorie: 'finance' },
    { id: 'd2', title: 'Photo parcelle', categorie: 'cultures' },
  ]);
  assert.equal(docs.length, 1);
  assert.equal(docs[0].id, 'd1');
});

test('isFinanceStartupMode — aucune donnée financière', () => {
  assert.equal(isFinanceStartupMode({}), true);
  assert.equal(isFinanceStartupMode({
    transactions: [{ id: 't1', type: 'entree', montant: 1000 }],
  }), false);
});

test('resolveFinanceTab — anciens liens vers les 5 vues cibles', () => {
  assert.equal(resolveFinanceTab('Échéancier'), 'Budget & écarts finance');
  assert.equal(resolveFinanceTab('Investissements'), 'Investissements & dettes finance');
  assert.equal(resolveFinanceTab('Réconciliation'), 'Trésorerie finance');
  assert.equal(resolveFinanceTab('Créances & dettes'), 'Budget & écarts finance');
  assert.deepEqual(MODULE_TARGET_TABS.finance_pilotage, ['Vue d’ensemble', 'Saisie & trésorerie', 'Coûts & marges', 'Budget & financements', 'Investissements & dettes']);
});

test('applyFarmScopeToProps finance_pilotage — filtre farm_id si activé', () => {
  const scoped = applyFarmScopeToProps({
    transactions: [{ id: 't1' }, { id: 't2', farm_id: FARM_B.id }],
    animaux: [{ id: 'a1' }, { id: 'a2', farm_id: FARM_B.id }],
    lots: [{ id: 'l1', farm_id: FARM_A.id }, { id: 'l2', farm_id: FARM_B.id }],
    cultures: [{ id: 'c1' }],
  }, { mode: 'single', farmId: FARM_A.id }, {
    accessibleFarms: [FARM_A, FARM_B],
    activeFarm: FARM_A,
    moduleId: 'finance_pilotage',
    forceFilter: true,
  });
  assert.equal(scoped.transactions.some((row) => row.farm_id === FARM_B.id), false);
  assert.equal(scoped.lots.some((row) => row.farm_id === FARM_B.id), false);
  assert.ok(scoped.cultures.some((row) => !row.farm_id));
});

test('applyFarmScopeToProps finance_pilotage — pas de filtrage par défaut mono-ferme', () => {
  const scoped = applyFarmScopeToProps({
    transactions: [{ id: 't1' }, { id: 't2', farm_id: FARM_B.id }],
    lots: [{ id: 'l2', farm_id: FARM_B.id }],
  }, { mode: 'single', farmId: FARM_A.id }, {
    accessibleFarms: [FARM_A, FARM_B],
    activeFarm: FARM_A,
    moduleId: 'finance_pilotage',
  });
  assert.equal(scoped.transactions.length, 2);
  assert.equal(scoped.farmFiltered, false);
});

test('non-régression Dashboard — buildDashboardSummary inchangé', () => {
  const summary = buildDashboardSummary({
    salesOrders: [{ id: 'O1', montant_total: 25000, date: '2026-06-01' }],
    salesOrdersAll: [{ id: 'O1', montant_total: 25000, date: '2026-06-01' }],
    payments: [],
    paymentsAll: [],
    transactions: [{ id: 'T1', type: 'entree', montant: 5000 }],
    stocks: [],
    productionLogs: [],
  });
  assert.ok(summary);
  assert.ok(typeof summary.revenue === 'number' || summary.revenue == null);
});
