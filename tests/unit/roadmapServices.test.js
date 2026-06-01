import test from 'node:test';
import assert from 'node:assert/strict';
import { findOrphanDocuments, summarizeOrphanDocuments } from '../../src/services/documentsOrphanSyncService.js';
import { buildStockMovementPayload } from '../../src/services/stockMovementHelpers.js';
import { rollupLotCosts } from '../../src/services/profitabilityRollupService.js';
import { auditCultureWorkflow } from '../../src/services/cultureWorkflowBridgeService.js';
import { buildFinanceurReportData } from '../../src/services/financeurReportService.js';
import { canAccessModule } from '../../src/services/rbacService.js';

test('findOrphanDocuments flags unlinked docs', () => {
  const orphans = findOrphanDocuments([{ id: 'DOC-1', title: 'Scan' }, { id: 'DOC-2', title: 'Facture', order_id: 'CMD-1' }]);
  assert.equal(orphans.length, 1);
  assert.equal(summarizeOrphanDocuments([{ id: 'DOC-1', title: 'Scan' }]).count, 1);
});

test('buildStockMovementPayload tracks delta', () => {
  const payload = buildStockMovementPayload({
    before: { id: 'STK-1', quantite: 10 },
    after: { id: 'STK-1', quantite: 15, unite: 'kg' },
  });
  assert.equal(payload.movement_type, 'entree');
  assert.equal(payload.quantity, 5);
});

test('rollupLotCosts uses alimentation logs when lot costs missing', () => {
  const rollup = rollupLotCosts(
    { id: 'LOT-1', nom: 'Poulets', cout_poussins: 1000 },
    { alimentationLogs: [{ lot_id: 'LOT-1', cout_total: 2500 }], salesOrders: [{ source_id: 'LOT-1', source_module: 'avicole', montant_total: 6000 }] },
  );
  assert.equal(rollup.reliable, true);
  assert.equal(rollup.margin, 6000 - (1000 + 2500));
});

test('auditCultureWorkflow detects harvest without stock', () => {
  const audit = auditCultureWorkflow({
    cultures: [{ id: 'CULT-1', nom: 'Tomates', quantite_recoltee: 100 }],
    stocks: [],
    salesOrders: [],
    businessEvents: [{ culture_id: 'CULT-1', event_type: 'recolte_culture', target_id: 'CULT-1' }],
  });
  assert.equal(audit[0].gaps.includes('recolte_sans_stock'), true);
});

test('buildFinanceurReportData includes checklist', () => {
  const report = buildFinanceurReportData({
    sales_orders: [{ montant_total: 10000 }],
    payments: [{ montant: 7000 }],
    documents: [{ id: 'DOC-1', title: 'Preuve', source_record_id: 'TRX-1' }],
  }, { financier: 'DER' });
  assert.ok(report.checklist.length >= 6);
  assert.equal(report.financier, 'DER');
});

test('rbacService restricts employe write access', () => {
  assert.equal(canAccessModule('employe', 'finances', 'write'), false);
  assert.equal(canAccessModule('comptable', 'finances', 'write'), true);
  assert.equal(canAccessModule('admin', 'finances', 'admin'), true);
});
