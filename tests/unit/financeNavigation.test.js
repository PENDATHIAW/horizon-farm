import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOfficialTreasuryView } from '../../src/utils/financePilotageCore.js';
import { resolveFinanceNavigation, resolveFinanceTab, navigationOptionsForFinding } from '../../src/utils/commercialNavigation.js';

test('resolveFinanceNavigation — Réconciliation ouvre sous-vue trésorerie', () => {
  const nav = resolveFinanceNavigation('Réconciliation');
  assert.equal(nav.tab, 'Trésorerie finance');
  assert.equal(nav.treasurySubview, 'reconciliation');
  assert.equal(nav.pilotageSubview, null);
});

test('resolveFinanceNavigation — Investissements ouvre la vue dédiée', () => {
  const nav = resolveFinanceNavigation('Investissements');
  assert.equal(nav.tab, 'Investissements & dettes finance');
  assert.equal(nav.pilotageSubview, 'investissements');
});

test('resolveFinanceNavigation — Rentabilité ouvre Coûts & marges', () => {
  const nav = resolveFinanceNavigation('Rentabilité');
  assert.equal(nav.tab, 'Coûts & marges finance');
  assert.equal(nav.pilotageSubview, 'rentabilite');
});

test('resolveFinanceNavigation — Dépenses ouvre Transactions', () => {
  const nav = resolveFinanceNavigation('Dépenses');
  assert.equal(nav.tab, 'Transactions finance');
  assert.equal(nav.treasurySubview, 'saisie');
});

test('resolveFinanceTab — 6 vues canoniques', () => {
  assert.equal(resolveFinanceTab('Créances'), 'Budget & écarts finance');
  assert.equal(resolveFinanceTab('Échéancier'), 'Budget & écarts finance');
  assert.equal(resolveFinanceTab('Financement'), 'Budget & écarts finance');
});

test('resolveFinanceNavigation — Créances ouvre l’échéancier clients et fournisseurs', () => {
  const nav = resolveFinanceNavigation('Créances');
  assert.equal(nav.tab, 'Budget & écarts finance');
  assert.equal(nav.pilotageSubview, 'echeancier');
});

test('navigationOptionsForFinding — conserve l’alias finance pour sous-vues', () => {
  const nav = navigationOptionsForFinding({ module: 'finance_pilotage', tab: 'Investissements' });
  assert.equal(nav.module, 'finance_pilotage');
  assert.equal(nav.tab, 'Investissements');
  const resolved = resolveFinanceNavigation(nav.tab);
  assert.equal(resolved.pilotageSubview, 'investissements');
});

test('buildOfficialTreasuryView — transactionsAll préserve le cumul', () => {
  const allTx = [
    { id: 't1', montant: 200000, type: 'entree', date: '2026-01-10' },
    { id: 't2', montant: 50000, type: 'sortie', date: '2026-06-01' },
  ];
  const periodOnly = [allTx[1]];
  const cumulView = buildOfficialTreasuryView({
    transactions: periodOnly,
    transactionsAll: allTx,
    salesOrders: [],
    payments: [],
  });
  const wrongView = buildOfficialTreasuryView({
    transactions: periodOnly,
    transactionsAll: periodOnly,
    salesOrders: [],
    payments: [],
  });
  assert.equal(cumulView.treasuryAvailable, 150000);
  assert.equal(wrongView.treasuryAvailable, -50000);
});
