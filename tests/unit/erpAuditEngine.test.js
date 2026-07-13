import test from 'node:test';
import assert from 'node:assert/strict';
import { runErpAuditEngine } from '../../src/services/erpAuditEngine.js';

test('détecte animal vendu sans vente liée', () => {
  const report = runErpAuditEngine({
    animaux: [{ id: 'A1', nom: 'Bœuf 1', status: 'vendu' }],
    sales_orders: [],
    payments: [],
    stock: [],
    avicole: [],
    sante: [],
    taches: [],
    alertes_center: [],
    documents: [],
    finances: [],
  });
  assert.ok(report.findings.some((f) => f.id.includes('animal-sold-no-sale')));
  assert.ok(report.issueGroups.length >= 1);
});

test('signale document orphelin', () => {
  const report = runErpAuditEngine({
    documents: [{ id: 'D1', nom: 'Scan sans lien' }],
    sales_orders: [],
    payments: [],
    stock: [],
    animaux: [],
    avicole: [],
    sante: [],
    taches: [],
    alertes_center: [],
    finances: [],
  });
  assert.ok(report.findings.some((f) => f.id.includes('doc-orphan')));
});

test('ne duplique pas les alertes de justificatif financier', () => {
  const report = runErpAuditEngine({
    finances: [{ id: 'TRX-1', libelle: 'Achat aliment', montant: 75000 }],
    sales_orders: [],
    payments: [],
    stock: [],
    animaux: [],
    avicole: [],
    sante: [],
    taches: [],
    alertes_center: [],
    documents: [],
  });
  const ids = report.findings.map((finding) => finding.id);

  assert.equal(ids.filter((id) => id === 'finance-no-proof-TRX-1').length, 1);
  assert.equal(new Set(ids).size, ids.length);
});
