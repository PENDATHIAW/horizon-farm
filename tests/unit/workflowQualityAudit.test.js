import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditWorkflowQuality,
  computeWorkflowQualityScore,
  WORKFLOW_QUALITY_RECIPES,
} from '../../src/utils/workflowQualityAudit.js';

test('auditWorkflowQuality retourne 11 recettes métier', () => {
  const results = auditWorkflowQuality({});
  assert.equal(results.length, WORKFLOW_QUALITY_RECIPES.length);
  assert.equal(results.every((row) => row.status === 'untested'), true);
});

test('vente payée détectée avec finance et paiement', () => {
  const dataMap = {
    sales_orders: [{ id: 'CMD-1', client_nom: 'Client A', montant_total: 10000 }],
    payments: [{ id: 'PAY-1', order_id: 'CMD-1', montant: 10000, date: '2026-06-01', statut: 'paye' }],
    finances: [{
      id: 'TRX-PAY-PAY-1',
      type: 'entree',
      order_id: 'CMD-1',
      payment_id: 'PAY-1',
      montant: 10000,
      libelle: 'Encaissement CMD-1',
      statut: 'paye',
    }],
    invoices: [{ id: 'INV-1', order_id: 'CMD-1' }],
    business_events: [{ id: 'EVT-1', order_id: 'CMD-1', event_type: 'sortie_stock', title: 'Sortie stock CMD-1' }],
  };
  const salePaid = auditWorkflowQuality(dataMap).find((row) => row.id === 'vente_payee');
  assert.equal(salePaid.status, 'ok');
  assert.ok(salePaid.createdObjects.some((item) => item.key === 'payment'));
});

test('document orphelin remonte en erreur', () => {
  const dataMap = {
    documents: [
      { id: 'DOC-OK', entity_id: 'CMD-1', title: 'Facture OK' },
      { id: 'DOC-BAD', title: 'Sans source' },
    ],
  };
  const orphan = auditWorkflowQuality(dataMap).find((row) => row.id === 'document_orphelin');
  assert.equal(orphan.status, 'error');
  assert.ok(orphan.missingObjects.length > 0);
});

test('score global compte les validations manuelles', () => {
  const results = auditWorkflowQuality({}, {
    achat_stock_paye: { status: 'manual_ok', validatedAt: '2026-06-01T10:00:00.000Z', note: 'Test terrain OK' },
  });
  const score = computeWorkflowQualityScore(results);
  assert.equal(score.okCount, 1);
  assert.equal(score.untestedCount, 10);
  assert.ok(score.score >= 9);
});
