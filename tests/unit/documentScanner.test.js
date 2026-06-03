import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyScannerDocumentType,
  parsePurchaseInvoice,
  parseVetPrescription,
  listMissingScannerFields,
} from '../../src/services/aiGateway/documentScannerParser.js';
import { buildScannerDraft } from '../../src/services/aiGateway/documentScannerDrafts.js';
import { SCANNER_DOC_TYPES } from '../../src/services/aiGateway/documentScannerTypes.js';
import { TARGET_WORKFLOWS } from '../../src/services/aiGateway/aiActionDrafts.js';

test('classifie facture achat', () => {
  const type = classifyScannerDocumentType('Facture fournisseur AGRO aliment 50 sacs TTC 250000 FCFA', 'facture.pdf');
  assert.equal(type, SCANNER_DOC_TYPES.PURCHASE_INVOICE);
});

test('classifie ordonnance vétérinaire', () => {
  const type = classifyScannerDocumentType('Ordonnance vétérinaire vaccin LOT-12 dose 2ml', 'ordo.jpg');
  assert.equal(type, SCANNER_DOC_TYPES.VET_PRESCRIPTION);
});

test('parse facture achat extrait fournisseur et montants', () => {
  const fields = parsePurchaseInvoice(
    'Facture\nFournisseur: SEN AGRO\nDate 12/03/2026\nAliment pondeuse 20 sacs x 12500 FCFA\nTotal 250000 FCFA\nPayé cash',
    { fournisseurs: [{ id: 'F1', nom: 'SEN AGRO' }] },
  );
  assert.ok(fields.fournisseur);
  assert.ok(fields.quantite || fields.lignes?.length);
  assert.equal(fields.statut_paiement, 'paye');
});

test('parse ordonnance avec lot', () => {
  const fields = parseVetPrescription('Ordonnance vaccin LOT-A1 animal BOV-3 dose 5ml rappel 14 jours', {
    lots: [{ id: 'LOT-A1' }],
    animaux: [{ id: 'BOV-3' }],
  });
  assert.equal(fields.lot_id, 'LOT-A1');
  assert.ok(fields.nom || fields.vaccin);
});

test('brouillon facture cible commitStockPurchaseWorkflow', () => {
  const draft = buildScannerDraft({
    text: 'Facture fournisseur Test aliment 10 sacs 50000 FCFA payé',
    fileName: 'facture.pdf',
    extraction: { confidence: 0.8 },
    context: {},
  });
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.STOCK_PURCHASE);
  assert.equal(draft.required_validation, true);
  assert.ok(draft.draft.payload?.produit || draft.draft.fields?.produit || draft.draft.payload?.product_name);
});

test('brouillon ordonnance cible commitHealthWorkflow', () => {
  const draft = buildScannerDraft({
    text: 'Ordonnance veterinaire vaccin LOT-9 dose 2ml',
    docType: SCANNER_DOC_TYPES.VET_PRESCRIPTION,
    extraction: { confidence: 0.85 },
    context: { lots: [{ id: 'LOT-9' }] },
  });
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.HEALTH);
  const missing = listMissingScannerFields(SCANNER_DOC_TYPES.VET_PRESCRIPTION, { nom: 'Vaccin', lot_id: 'LOT-9' });
  assert.equal(missing.length, 0);
});

test('champs manquants facture demandent confirmation', () => {
  const missing = listMissingScannerFields(SCANNER_DOC_TYPES.PURCHASE_INVOICE, {});
  assert.ok(missing.includes('fournisseur'));
  assert.ok(missing.includes('produit'));
});
