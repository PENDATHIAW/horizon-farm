/**
 * Exécution post-validation du scanner — workflows métier uniquement.
 */

import { markDraftValidated } from './aiActionDrafts.js';
import {
  ALLOWED_WORKFLOW_EXECUTORS,
  assertNoDirectDatabaseWrite,
  containsForbiddenDirectHandlers,
  guardWorkflowExecutor,
} from './aiSafetyGuard.js';
import { recordSalePayment } from '../../utils/recordSalePayment.js';
import { commitElevageHealth, validateElevageHealthForm } from '../../utils/elevageWorkflow.js';
import {
  commitStockPurchaseWorkflow,
  prepareStockPurchaseWorkflow,
  validateStockPurchasePayload,
} from '../../utils/stockPurchaseWorkflow.js';
import { makeId } from '../../utils/ids.js';
import { SCANNER_DOC_TYPES } from './documentScannerTypes.js';
import {
  buildHealthPayloadFromScan,
  buildPaymentPayloadFromScan,
  buildPurchasePayloadFromScan,
} from './documentScannerDrafts.js';

const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);

async function ensureProofDocument(proofMeta = {}, handlers = {}) {
  if (proofMeta.document_id) return proofMeta.document_id;
  if (!handlers.onCreateDocument) return '';
  const url = proofMeta.proof_url || proofMeta.file_url || '';
  if (!url) return '';
  const id = makeId('DOC');
  await handlers.onCreateDocument({
    id,
    title: proofMeta.document_title || 'Preuve scanner IA',
    document_category: proofMeta.document_category || 'preuve',
    module_source: proofMeta.module_source || 'documents_rapports',
    file_url: url,
    url,
    created_from: 'document_scanner_ia',
    side_effects_managed: true,
  });
  return id;
}

/**
 * Exécute un brouillon scanner validé par l'utilisateur.
 */
export async function executeScannerDraft(draft = {}, handlers = {}, context = {}) {
  const validated = markDraftValidated({ ...draft, user_validated: true });
  validated.required_validation = false;
  validated.confirmation_required = false;
  validated.missing_fields = [];

  assertNoDirectDatabaseWrite({ type: 'execute', draft: validated });
  if (containsForbiddenDirectHandlers({ handlers }) || containsForbiddenDirectHandlers(validated.draft || {})) {
    return { ok: false, error: 'Handlers ou brouillon interdits : workflow métier uniquement.' };
  }
  const guard = guardWorkflowExecutor(validated.target_workflow);
  if (!guard.allowed) {
    return { ok: false, error: `Workflow non exécutable : ${validated.target_workflow}` };
  }
  if (!ALLOWED_WORKFLOW_EXECUTORS.has(validated.target_workflow)) {
    return { ok: false, error: 'Workflow hors allowlist IA.' };
  }

  const proofMeta = { ...(validated.draft?.proof || {}), ...(validated.draft?.proof_meta || {}) };
  const docId = await ensureProofDocument(proofMeta, handlers);
  if (docId) {
    proofMeta.document_id = docId;
    proofMeta.proof_url = proofMeta.proof_url || proofMeta.file_url;
  }

  const scannerType = validated.draft?.scanner_doc_type;
  const fields = validated.draft?.fields || {};
  const payload = validated.draft?.payload || {};

  try {
    if (scannerType === SCANNER_DOC_TYPES.PAYMENT_RECEIPT) {
      const payPayload = buildPaymentPayloadFromScan({ ...fields, ...payload }, proofMeta);
      const result = await recordSalePayment({
        sale: payPayload.sale,
        requestedAmount: payPayload.requestedAmount,
        paymentMethod: payPayload.paymentMethod,
        paymentDate: payPayload.paymentDate || today(),
        payments: context.payments || [],
        transactions: context.transactions || [],
        clients: context.clients || [],
        salesOrders: context.salesOrders || [],
        handlers,
      });
      if (!result) return { ok: false, error: 'Encaissement non effectué (doublon ou montant invalide).' };
      return { ok: true, workflow: 'recordSalePayment', result };
    }

    if (scannerType === SCANNER_DOC_TYPES.VET_PRESCRIPTION) {
      const healthPayload = buildHealthPayloadFromScan({ ...fields, ...payload }, proofMeta);
      const err = validateElevageHealthForm(healthPayload);
      if (err) return { ok: false, error: err };
      const result = await commitElevageHealth({
        form: { ...healthPayload, id: healthPayload.id || makeId('VAC') },
        context: {
          ...context,
          tasks: context.tasks || handlers.existingTasks || [],
          transactions: context.transactions || [],
        },
        handlers,
      });
      return { ok: true, workflow: 'commitElevageHealth', result };
    }

    const purchasePayload = buildPurchasePayloadFromScan({ ...fields, ...payload }, proofMeta);
    const validation = validateStockPurchasePayload(purchasePayload);
    if (!validation.ok) {
      return { ok: false, error: validation.errors.join(' · ') };
    }
    const preview = prepareStockPurchaseWorkflow(purchasePayload, {
      stocks: context.stocks || [],
      suppliers: context.fournisseurs || context.suppliers || [],
      transactions: context.transactions || [],
      documents: context.documents || [],
      workflows: context.workflows || [],
    });
    const result = await commitStockPurchaseWorkflow(preview, { ...handlers, context });
    return {
      ok: true,
      workflow: 'commitStockPurchaseWorkflow',
      result,
      doc_type: scannerType,
    };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
