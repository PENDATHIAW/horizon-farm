import test from 'node:test';
import assert from 'node:assert/strict';

import { parseInvoiceOcrText, INVOICE_OCR_DEMO_SAMPLES } from '../../src/services/ocrIntelligent/invoiceOcrParser.js';
import { analyzeMarginImpact } from '../../src/services/ocrIntelligent/marginImpactAnalyzer.js';
import {
  analyzeInvoiceDiagnostic,
  validateInvoiceDiagnosticDraft,
} from '../../src/services/ocrIntelligent/invoiceDiagnosticDraftService.js';
import { TARGET_WORKFLOWS } from '../../src/services/aiGateway/aiActionDrafts.js';
import { validateDraftForExecution } from '../../src/services/aiGateway/aiSafetyGuard.js';

const dataMap = {
  fournisseurs: [{ id: 'F1', nom: 'SEN AGRO DISTRIBUTION' }],
  stock: [{ id: 'STK-1', produit: 'Aliment chair', prix_unitaire: 12500, quantite: 20 }],
  stocks: [{ id: 'STK-1', produit: 'Aliment chair', prix_unitaire: 12500, quantite: 20 }],
  finances: [
    { id: 'TX-1', type: 'sortie', libelle: 'Achat aliment chair', montant: 125000, quantite: 10, date: '2026-02-01' },
  ],
  sales_orders: [
    { id: 'CMD-1', product_name: 'Poulet', produit: 'Poulet', quantite: 10, montant_total: 45000 },
  ],
  salesOrders: [
    { id: 'CMD-1', product_name: 'Poulet', produit: 'Poulet', quantite: 10, montant_total: 45000 },
  ],
  lots: [{ id: 'LOT-CHAIR', nom: 'lot chair', type: 'poulets_de_chair' }],
  avicole: [{ id: 'LOT-CHAIR', nom: 'lot chair', type: 'poulets_de_chair' }],
  payments: [],
};

test('parseInvoiceOcrText extrait fournisseur, lignes et stockable', () => {
  const sample = INVOICE_OCR_DEMO_SAMPLES.find((s) => s.id === 'demo-aliment').text;
  const invoice = parseInvoiceOcrText(sample, { fournisseurs: dataMap.fournisseurs });
  assert.ok(invoice.fournisseur);
  assert.equal(invoice.stockable, true);
  assert.ok(invoice.montant_total > 0);
  assert.ok(invoice.lignes.length >= 1);
});

test('analyzeMarginImpact détecte hausse vs achats précédents', () => {
  const sample = INVOICE_OCR_DEMO_SAMPLES.find((s) => s.id === 'demo-aliment').text;
  const invoice = parseInvoiceOcrText(sample, { fournisseurs: dataMap.fournisseurs });
  const diagnostic = analyzeMarginImpact(invoice, dataMap);
  assert.equal(diagnostic.price_comparison.trend, 'hausse');
  assert.ok((diagnostic.price_comparison.delta_pct || 0) >= 10);
  assert.ok(diagnostic.recommendation.summary.includes('Hausse'));
  assert.ok(diagnostic.margin_impact.applicable);
});

test('facture transport non stockable → open_form', async () => {
  const sample = INVOICE_OCR_DEMO_SAMPLES.find((s) => s.id === 'demo-transport').text;
  const { draft, invoice } = await analyzeInvoiceDiagnostic({
    pastedText: sample,
    context: { fournisseurs: dataMap.fournisseurs, stocks: dataMap.stocks },
    dataMap,
  });
  assert.equal(invoice.stockable, false);
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.OPEN_FORM);
});

test('facture aliment produit brouillon STOCK_PURCHASE validable', async () => {
  const sample = INVOICE_OCR_DEMO_SAMPLES.find((s) => s.id === 'demo-aliment').text;
  const { draft, diagnostic } = await analyzeInvoiceDiagnostic({
    pastedText: sample,
    context: { fournisseurs: dataMap.fournisseurs, stocks: dataMap.stocks },
    dataMap,
  });
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.STOCK_PURCHASE);
  assert.ok(diagnostic.recommendation.recommended_alert);
  assert.equal(validateDraftForExecution(draft).ok, false);
  const validated = validateInvoiceDiagnosticDraft(draft);
  assert.equal(validated.user_validated, true);
  assert.equal(validateDraftForExecution(validated).ok, true);
});

test('aucune écriture sans validation utilisateur', async () => {
  const { draft } = await analyzeInvoiceDiagnostic({
    pastedText: INVOICE_OCR_DEMO_SAMPLES[0].text,
    context: {},
    dataMap,
  });
  assert.notEqual(draft.user_validated, true);
  assert.equal(draft.required_validation, true);
});
