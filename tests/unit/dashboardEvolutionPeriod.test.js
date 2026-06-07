import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRowsByPeriodScope } from '../../src/utils/periodScope.js';

test('P-04: alertes et taches filtrées par période ERP', () => {
  const periodScope = { mode: 'months', monthKeys: ['2026-01'] };
  const alertes = [
    { id: 'A1', severity: 'critique', date: '2026-01-15', status: 'nouvelle' },
    { id: 'A2', severity: 'critique', date: '2025-06-10', status: 'nouvelle' },
  ];
  const taches = [
    { id: 'T1', status: 'retard', date: '2026-01-10' },
    { id: 'T2', status: 'retard', date: '2025-12-01' },
  ];

  assert.equal(filterRowsByPeriodScope(alertes, periodScope).length, 1);
  assert.equal(filterRowsByPeriodScope(taches, periodScope).length, 1);
});
