import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportPreview, collectReportSnapshot, isImmutableReport, transitionReport } from '../../src/utils/reportLifecycle.js';

const dataMap = {
  sales_orders: [
    { id: 'SALE-1', status: 'validee', montant_total: 120000 },
    { id: 'SALE-2', status: 'brouillon', montant_total: 900000 },
  ],
  payments: [{ id: 'PAY-1', status: 'paye', montant: 50000 }],
  finances: [{ id: 'FIN-1', type: 'sortie', montant: 30000 }],
  stock: [{ id: 'STK-1' }],
};

test('la collecte calcule le CA depuis les seules ventes validées', () => {
  const snapshot = collectReportSnapshot(dataMap);
  assert.equal(snapshot.revenue, 120000);
  assert.equal(snapshot.receipts, 50000);
  assert.equal(snapshot.expenses, 30000);
  assert.match(snapshot.source_digest, /^src-/);
});

test('le cycle impose aperçu, validation humaine, gel puis publication', () => {
  const report = buildReportPreview({ dataMap, generatedAt: '2026-07-12T10:00:00.000Z' });
  assert.equal(report.status, 'apercu');
  assert.equal(transitionReport(report, 'freeze').ok, false);
  const validation = transitionReport(report, 'validate', { actor: 'USR-1', timestamp: '2026-07-12T11:00:00.000Z' });
  assert.equal(validation.ok, true);
  const validated = { ...report, ...validation.patch };
  const freeze = transitionReport(validated, 'freeze', { timestamp: '2026-07-12T12:00:00.000Z' });
  assert.equal(freeze.ok, true);
  const frozen = { ...validated, ...freeze.patch };
  assert.equal(isImmutableReport(frozen), true);
  assert.equal(transitionReport(frozen, 'publish').ok, false);
  assert.equal(transitionReport(frozen, 'publish', { channel: 'Portail financeur' }).ok, true);
});

test('une correction d’un rapport gelé crée une nouvelle version', () => {
  const frozen = { ...buildReportPreview({ dataMap }), status: 'gele', frozen_at: '2026-07-12T12:00:00.000Z', immutable: true, version_number: 1 };
  const correction = transitionReport(frozen, 'correct', { reports: [frozen], dataMap, timestamp: '2026-07-13T08:00:00.000Z' });
  assert.equal(correction.mode, 'create');
  assert.equal(correction.record.version_number, 2);
  assert.equal(correction.record.parent_report_id, frozen.id);
  assert.equal(correction.record.status, 'apercu');
});
