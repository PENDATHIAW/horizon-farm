import assert from 'node:assert/strict';
import test from 'node:test';
import { computeFinanceKpis } from '../../src/services/kpiEngine/financeKpis.js';

test('les dépenses et recettes du KPI Finance respectent le mois sélectionné', () => {
  const transactions = [
    { id: 'JAN-OUT', type: 'sortie', montant: 1000, date: '2026-01-15' },
    { id: 'JUL-OUT', type: 'sortie', montant: 2500, date: '2026-07-12' },
    { id: 'JAN-IN', type: 'entree', montant: 4000, date: '2026-01-18' },
    { id: 'JUL-IN', type: 'entree', montant: 6000, date: '2026-07-14' },
  ];
  const scope = { mode: 'months', monthKeys: ['2026-07'] };
  const kpis = computeFinanceKpis([], transactions, scope, { finances: transactions });

  assert.equal(kpis.expenses, 2500);
  assert.equal(kpis.income, 6000);
  assert.equal(kpis.expensesAllTime, 3500);
  assert.equal(kpis.incomeAllTime, 10000);
});

test('les encaissements acceptent les colonnes historiques montant et amount', () => {
  const payments = [
    { id: 'P1', montant: 1200, date_paiement: '2026-07-01' },
    { id: 'P2', amount: 800, date_paiement: '2026-07-02' },
    { id: 'P3', montant: 9000, date_paiement: '2026-07-03', statut: 'annule' },
    { id: 'P4', montant: 7000, date_paiement: '2026-07-04', statut: 'rembourse' },
  ];
  const kpis = computeFinanceKpis(payments, [], { mode: 'months', monthKeys: ['2026-07'] });

  assert.equal(kpis.encaissePeriod, 2000);
  assert.equal(kpis.encaisseAllTime, 2000);
});
