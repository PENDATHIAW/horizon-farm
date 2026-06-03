import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createAiActionDraft,
  TARGET_WORKFLOWS,
  markDraftValidated,
} from '../../src/services/aiGateway/aiActionDrafts.js';
import { proposeSaleDraft } from '../../src/services/aiGateway/commercialContentGenerator.js';
import {
  LOW_CONFIDENCE_THRESHOLD,
  assessDraftSafety,
  validateDraftForExecution,
  assertNoDirectDatabaseWrite,
  FORBIDDEN_DIRECT_HANDLER_KEYS,
  ALLOWED_WORKFLOW_EXECUTORS,
} from '../../src/services/aiGateway/aiSafetyGuard.js';
import {
  executeValidatedDraft,
  validateAiDraftByUser,
} from '../../src/services/aiGateway/index.js';
import { proposeReconciliationDraft } from '../../src/services/aiGateway/smartReconciliation.js';
import { proposeDocumentLinkDraft } from '../../src/services/aiGateway/documentUnderstanding.js';
import { generateChartInsightDraft } from '../../src/services/aiGateway/chartInsightGenerator.js';

test('brouillon standard contient les champs obligatoires', () => {
  const draft = createAiActionDraft({
    intent: 'sale_record',
    confidence: 0.8,
    source: 'commercial',
    draft: { preview: { client_name: 'A' } },
    target_workflow: TARGET_WORKFLOWS.SALE,
  });
  assert.equal(draft.intent, 'sale_record');
  assert.equal(typeof draft.confidence, 'number');
  assert.equal(draft.source, 'commercial');
  assert.ok(draft.draft);
  assert.equal(draft.target_workflow, TARGET_WORKFLOWS.SALE);
  assert.equal(draft.required_validation, true);
  assert.ok(Array.isArray(draft.warnings));
  assert.ok(Array.isArray(draft.missing_fields));
});

test('confiance faible impose validation obligatoire', () => {
  const draft = createAiActionDraft({
    intent: 'purchase_stock',
    confidence: 0.4,
    target_workflow: TARGET_WORKFLOWS.PURCHASE,
    user_validated: true,
  });
  const safety = assessDraftSafety(draft);
  assert.equal(safety.requiresValidation, true);
  assert.ok(safety.blockedReasons.includes('low_confidence'));
  assert.equal(safety.canExecute, false);

  const check = validateDraftForExecution(draft);
  assert.equal(check.ok, false);
  assert.match(check.error, /validation|confiance|confirmation/i);
});

test('données ambiguës demandent confirmation', () => {
  const draft = proposeReconciliationDraft({
    payment: { id: 'PAY-1', montant: 5000 },
    sale: {},
    transactions: [
      { id: 'TX-1', montant: 5000 },
      { id: 'TX-2', montant: 5000 },
    ],
  });
  assert.equal(draft.confirmation_required, true);
  assert.ok(draft.warnings.some((w) => /Plusieurs|plusieurs|choisissez/i.test(w)));
  const safety = assessDraftSafety(draft);
  assert.equal(safety.needsConfirmation, true);
  assert.equal(validateDraftForExecution(draft).ok, false);
});

test('document incomplet : champs manquants et confirmation', () => {
  const draft = proposeDocumentLinkDraft({ text: 'Facture', context: {} });
  assert.ok(draft.missing_fields.includes('related_id'));
  assert.equal(draft.confirmation_required, true);
  assert.equal(validateDraftForExecution(draft).ok, false);
});

test('insight graphique ne peut pas être exécuté en workflow', () => {
  const insight = generateChartInsightDraft({
    title: 'CA',
    series: [10, 12, 15],
    labels: ['Jan', 'Fév', 'Mar'],
  });
  assert.equal(insight.target_workflow, TARGET_WORKFLOWS.INSIGHT_ONLY);
  const validated = markDraftValidated(insight);
  const check = validateDraftForExecution(validated);
  assert.equal(check.ok, false);
});

test('l\'IA ne peut pas bypasser les workflows — écriture directe interdite', () => {
  assert.throws(
    () => assertNoDirectDatabaseWrite({ type: 'insert', direct_write: false }),
    /AI_GATEWAY_DIRECT_WRITE_FORBIDDEN/,
  );

  const draftWithForbiddenHandlers = createAiActionDraft({
    intent: 'hack',
    confidence: 0.99,
    draft: { handlers: { onCreateFinanceTransaction: () => {} } },
    target_workflow: TARGET_WORKFLOWS.SALE,
    user_validated: true,
    required_validation: false,
    missing_fields: [],
  });
  draftWithForbiddenHandlers.user_validated = true;
  draftWithForbiddenHandlers.required_validation = false;
  draftWithForbiddenHandlers.missing_fields = [];
  draftWithForbiddenHandlers.confirmation_required = false;

  const safety = assessDraftSafety(draftWithForbiddenHandlers);
  assert.equal(safety.safeForDisplay, false);

  const execCheck = validateDraftForExecution(markDraftValidated(draftWithForbiddenHandlers));
  assert.equal(execCheck.ok, false);
});

test('executeValidatedDraft refuse sans validation utilisateur', async () => {
  const saleDraft = proposeSaleDraft({
    clientName: 'Client A',
    productName: 'Poulet',
    quantity: 10,
    amount: 50000,
    paymentStatus: 'paid',
  });
  const result = await executeValidatedDraft(saleDraft, {});
  assert.equal(result.ok, false);
  assert.match(result.error, /validation/i);
});

test('executeValidatedDraft refuse handlers CRUD directs', async () => {
  const draft = validateAiDraftByUser(
    proposeSaleDraft({
      clientName: 'Client A',
      productName: 'Poulet',
      quantity: 10,
      amount: 50000,
      paymentStatus: 'paid',
    }),
  );
  draft.required_validation = false;
  draft.confirmation_required = false;
  draft.missing_fields = [];

  const result = await executeValidatedDraft(draft, {
    onCreateFinanceTransaction: async () => {},
  });
  assert.equal(result.ok, false);
  assert.match(result.error, /interdit|Handlers/i);
});

test('registre workflows autorise uniquement les commits métier connus', () => {
  assert.ok(ALLOWED_WORKFLOW_EXECUTORS.has(TARGET_WORKFLOWS.SALE));
  assert.ok(ALLOWED_WORKFLOW_EXECUTORS.has(TARGET_WORKFLOWS.PURCHASE));
  assert.ok(ALLOWED_WORKFLOW_EXECUTORS.has(TARGET_WORKFLOWS.DOCUMENT_LINK));
  assert.ok(ALLOWED_WORKFLOW_EXECUTORS.has(TARGET_WORKFLOWS.SALE_PAYMENT));
  assert.ok(!ALLOWED_WORKFLOW_EXECUTORS.has('supabaseRawInsert'));
  assert.ok(FORBIDDEN_DIRECT_HANDLER_KEYS.includes('onCreateFinanceTransaction'));
});

test('seuil LOW_CONFIDENCE_THRESHOLD cohérent avec règle produit', () => {
  assert.equal(LOW_CONFIDENCE_THRESHOLD, 0.65);
  const borderline = createAiActionDraft({ confidence: 0.64, user_validated: true });
  borderline.user_validated = true;
  assert.equal(assessDraftSafety(borderline).requiresValidation, true);
});
