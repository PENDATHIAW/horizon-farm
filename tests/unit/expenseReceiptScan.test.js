import test from 'node:test';
import assert from 'node:assert/strict';
import {
  categorizeExpenseReceipt,
  buildExpenseCategorizer,
  EXPENSE_CATEGORIES,
} from '../../src/services/aiGateway/expenseReceiptCategorizer.js';
import {
  classifyScannerDocumentType,
  parseExpenseReceipt,
} from '../../src/services/aiGateway/documentScannerParser.js';
import { buildScannerDraft } from '../../src/services/aiGateway/documentScannerDrafts.js';
import { SCANNER_DOC_TYPES } from '../../src/services/aiGateway/documentScannerTypes.js';
import { TARGET_WORKFLOWS, isExecutableWorkflow } from '../../src/services/aiGateway/aiActionDrafts.js';

test('catégorisation déterministe : mots-clés → catégorie finance officielle', () => {
  assert.equal(categorizeExpenseReceipt({ text: 'Reçu carburant gasoil 20000 FCFA' }).category, 'Transport');
  assert.equal(categorizeExpenseReceipt({ text: 'Facture SENELEC électricité' }).category, 'Energie');
  assert.equal(categorizeExpenseReceipt({ text: 'Achat vaccin Newcastle véto' }).category, 'Sante');
  assert.equal(categorizeExpenseReceipt({ text: 'Paie journalier manoeuvre' }).category, 'Salaires');
  assert.equal(categorizeExpenseReceipt({ text: 'Sac aliment provende ponte' }).category, 'Alimentation');
  const unknown = categorizeExpenseReceipt({ text: 'divers xyz' });
  assert.equal(unknown.category, 'Autre');
  assert.ok(unknown.confidence <= 0.5, 'faible confiance si rien de reconnu');
});

test('catégorisation : toute catégorie renvoyée est une catégorie finance valide', () => {
  for (const sample of ['carburant', 'électricité', 'vaccin', 'salaire', 'aliment', 'ciment tôle', 'semence engrais', 'rien']) {
    assert.ok(EXPENSE_CATEGORIES.includes(categorizeExpenseReceipt({ text: sample }).category));
  }
});

test('catégorisation : activité rattachée inférée', () => {
  assert.equal(categorizeExpenseReceipt({ text: 'aliment pondeuse poussin' }).activite, 'volailles');
  assert.equal(categorizeExpenseReceipt({ text: 'vaccin embouche bovin' }).activite, 'bovins');
  assert.equal(categorizeExpenseReceipt({ text: 'carburant divers' }).activite, 'general');
});

test('classification : un reçu de charge = reçu de dépense (pas facture stock)', () => {
  assert.equal(classifyScannerDocumentType('Reçu carburant total 15000 FCFA'), SCANNER_DOC_TYPES.EXPENSE_RECEIPT);
  assert.equal(classifyScannerDocumentType('Facture SENELEC électricité juillet'), SCANNER_DOC_TYPES.EXPENSE_RECEIPT);
  // Un achat stockable reste une facture achat.
  assert.equal(classifyScannerDocumentType('Facture fournisseur 10 sacs aliment ponte'), SCANNER_DOC_TYPES.PURCHASE_INVOICE);
});

test('parseExpenseReceipt : montant, catégorie et date extraits', () => {
  const fields = parseExpenseReceipt('Station Total\nCarburant gasoil\nTotal 25000 FCFA\n15/07/2026');
  assert.equal(fields.doc_type, SCANNER_DOC_TYPES.EXPENSE_RECEIPT);
  assert.equal(fields.montant, 25000);
  assert.equal(fields.categorie, 'Transport');
  assert.equal(fields.date, '2026-07-15');
});

test('buildScannerDraft : reçu de dépense → brouillon finance, ouvre le formulaire, jamais auto-exécuté', () => {
  const draft = buildScannerDraft({ text: 'Reçu réparation moteur pompe\nTotal 45000 FCFA\n10/07/2026' });
  assert.equal(draft.intent, 'expense_receipt_scan');
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.OPEN_FORM);
  assert.equal(isExecutableWorkflow(draft.target_workflow), false, 'OPEN_FORM : pas d\'auto-commit');
  assert.equal(draft.required_validation, true);
  assert.equal(draft.draft.payload.form_type, 'finance_entry');
  assert.equal(draft.draft.payload.type, 'sortie');
  assert.equal(draft.draft.payload.montant, 45000);
  assert.ok(EXPENSE_CATEGORIES.includes(draft.draft.payload.categorie));
});

test('buildScannerDraft : montant manquant → à confirmer', () => {
  const draft = buildScannerDraft({ text: 'Reçu carburant station' });
  assert.ok(draft.missing_fields.includes('montant'));
  assert.equal(draft.confirmation_required, true);
});

// --- Amorce modèle : affine la catégorie, repli déterministe si injoignable ---

const fakeFetch = (payload) => async () => ({ ok: true, status: 200, json: async () => payload });

test('buildExpenseCategorizer : le modèle affine la catégorie', async () => {
  const categorize = buildExpenseCategorizer({
    fetchImpl: fakeFetch({ ok: true, source: 'model', text: '', data: { category: 'Energie', activite: 'volailles', confidence: 0.95 } }),
  });
  const out = await categorize({ text: 'facture obscure', merchant: 'X', montant: 30000 });
  assert.equal(out.category, 'Energie');
  assert.equal(out.activite, 'volailles');
  assert.equal(out.source, 'model');
});

test('buildExpenseCategorizer : modèle injoignable → repli déterministe', async () => {
  const categorize = buildExpenseCategorizer({
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ ok: false, source: 'unconfigured' }) }),
  });
  const out = await categorize({ text: 'carburant gasoil', merchant: 'Total', montant: 20000 });
  assert.equal(out.category, 'Transport');
  assert.equal(out.source, 'deterministic');
});

test('buildExpenseCategorizer : le modèle ne peut pas imposer une catégorie hors liste', async () => {
  const categorize = buildExpenseCategorizer({
    fetchImpl: fakeFetch({ ok: true, source: 'model', text: '', data: { category: 'Licorne', activite: 'general', confidence: 0.9 } }),
  });
  const out = await categorize({ text: 'vaccin véto', merchant: '', montant: 5000 });
  assert.equal(out.category, 'Sante', 'catégorie invalide ignorée, repli déterministe');
});
