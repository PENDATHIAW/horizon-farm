import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFinanceurReportData } from '../../src/services/financeurReportService.js';

test('buildFinanceurReportData agrège KPI commercial et cultures', () => {
  const report = buildFinanceurReportData({
    sales_orders: [{ id: 'O1', montant_total: 250000 }],
    payments: [{ id: 'P1', order_id: 'O1', montant: 150000 }],
    finances: [{ id: 'F1', type: 'sortie', montant: 80000 }],
    stock: [{ id: 'S1', quantite: 10, prixunit: 5000 }],
    cultures: [{ id: 'C1', quantite_recoltee: 120 }],
    documents: [{ id: 'D1', title: 'Facture', source_module: 'ventes', source_record_id: 'O1' }],
  }, {
    financier: 'DER',
    amountRequested: 5000000,
    purpose: 'Extension serres',
  });

  assert.equal(report.financier, 'DER');
  assert.equal(report.amountRequested, 5000000);
  assert.ok(report.kpis.commercial.ca >= 250000);
  assert.ok(report.kpis.commercial.collected >= 150000);
  assert.ok(report.checklist.some((row) => row.item.includes('Production récoltes')));
  assert.ok(report.proofs.length >= 1);
});
