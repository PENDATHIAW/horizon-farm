import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeDocumentForCompletion,
  applyDocumentCompletionReply,
  CONFIDENCE_THRESHOLDS,
} from '../../src/services/assistantDocumentCompletion.js';

const dataMap = {
  fournisseurs: [
    { id: 'F1', nom: 'Sedima' },
    { id: 'F2', nom: 'NMA Sanders' },
  ],
  stock: [
    { id: 'S1', produit: 'Aliment Pondeuses' },
  ],
  clients: [{ id: 'C1', nom: 'Marché Central' }],
};

test('Cas 1 — fournisseur manquant mais déductible', () => {
  const text = '20 sacs aliment pondeuses 370 000 FCFA';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.equal(result.ok, true);
  assert.ok(result.missingFields.includes('supplier_name') || result.documentCompletion.missingFields.includes('supplier'));
  assert.match(result.assistantText, /fournisseur non identifi/i);
  assert.match(result.assistantText, /Sedima|NMA Sanders/i);
  assert.doesNotMatch(result.assistantText, /champ.*manquant/i);
  assert.ok(result.confidence < CONFIDENCE_THRESHOLDS.VALIDATE);
});

test('Cas 2 — produit absent, mode conversation', () => {
  const text = 'Facture 370 000 FCFA';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.match(result.assistantText, /370\s*000|370000/i);
  assert.match(result.assistantText, /produit|contient cette facture/i);
  assert.ok(result.mode === 'conversation' || result.mode === 'confirm');

  const reply = applyDocumentCompletionReply(result.draft, 'Aliment pondeuses', dataMap);
  assert.match(reply.draft.draft_fields.product_name || '', /aliment|pondeuse/i);
});

test('Cas 3 — produit absent du référentiel', () => {
  const text = 'Aliment Super Layer Premium 10 sacs 200 000 FCFA';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.match(result.assistantText, /n'existe pas encore|pas encore dans Horizon/i);
  assert.match(result.assistantText, /rattacher|créer/i);
  assert.ok(result.documentCompletion.choices.some((c) => c.id === 'create_product' || c.action === 'create_product'));
});

test('Cas 4 — client absent sur vente', () => {
  const text = 'Facture client 120 œufs 36 000 FCFA';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.match(result.assistantText, /client/i);
  assert.match(result.assistantText, /vendu|à qui/i);
  assert.equal(result.draft.intent, 'sale_record');
});

test('Cas 5 — quantité absente', () => {
  const text = 'Aliment pondeuses 370 000 FCFA';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.match(result.assistantText, /quantité|sacs/i);
});

test('Cas 6 — interprétations multiples maïs', () => {
  const text = 'Maïs 500 kg';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.match(result.assistantText, /maïs|mais/i);
  assert.match(result.assistantText, /récolte|vente|achat/i);
  assert.ok(result.documentCompletion.choices.length >= 3);
});

test('Cas 7 — incohérence montants', () => {
  const text = '20 sacs aliment pondeuses 18 500 FCFA Total 900 000 FCFA';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.match(result.assistantText, /incohérence|370\s*000|370000/i);
  assert.match(result.assistantText, /900\s*000|900000/i);
  assert.ok(result.documentCompletion.choices.some((c) => c.action === 'set_amount'));
});

test('score confiance — validation si complet', () => {
  const text = 'Facture Fournisseur Sedima 20 sacs aliment pondeuses 370 000 FCFA payé';
  const result = analyzeDocumentForCompletion(text, dataMap);
  assert.ok(result.confidence >= CONFIDENCE_THRESHOLDS.CONFIRM);
  assert.equal(result.draft.missing_fields?.length || 0, 0);
});
