/**
 * WhatsApp Horizon - analyse, validation et exécution via AI Gateway (mode démo).
 * Aucune écriture métier sans validation utilisateur explicite.
 */

import {
  TARGET_WORKFLOWS,
  markDraftValidated,
} from '../aiGateway/aiActionDrafts.js';
import {
  assertNoDirectDatabaseWrite,
  validateDraftForExecution,
} from '../aiGateway/aiSafetyGuard.js';
import { gatewayDraftToLegacyHeyDraft } from '../aiGateway/gatewayFormBridge.js';
import { openHeyHorizonForm } from '../heyHorizonAssistantService.js';
import { makeId } from '../../utils/ids.js';
import { parseWhatsAppCommand } from './whatsappCommandParser.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);

export const WHATSAPP_WORKFLOW_LABELS = {
  [TARGET_WORKFLOWS.SALE]: 'Vente (commitSaleWorkflow)',
  [TARGET_WORKFLOWS.COMMERCIAL_SALE]: 'Vente commercial (commitCommercialSale)',
  [TARGET_WORKFLOWS.PURCHASE]: 'Achat stock (commitPurchaseWorkflow)',
  [TARGET_WORKFLOWS.STOCK_PURCHASE]: 'Réception stock',
  [TARGET_WORKFLOWS.SALE_PAYMENT]: 'Encaissement (recordSalePayment)',
  [TARGET_WORKFLOWS.FEEDING]: 'Alimentation lot',
  [TARGET_WORKFLOWS.HEALTH]: 'Événement santé / mortalité',
  [TARGET_WORKFLOWS.OPEN_FORM]: 'Ouvrir formulaire prérempli',
  [TARGET_WORKFLOWS.INSIGHT_ONLY]: 'Information seule',
};

/**
 * Journal whatsapp_logs - uniquement si handler CRUD fourni.
 */
export async function journalizeWhatsAppEvent({
  message = '',
  status = 'parsed',
  draft = null,
  clarify = '',
  handlers = {},
  meta = {},
} = {}) {
  const onCreate = handlers.onCreateWhatsappLog;
  if (typeof onCreate !== 'function') {
    return { skipped: true, reason: 'no_whatsapp_log_handler' };
  }

  const row = {
    id: makeId('WTL'),
    message: String(message || '').slice(0, 2000),
    status,
    provider: 'simulation',
    channel: 'whatsapp_demo',
    reason: meta.reason || 'whatsapp_horizon_demo',
    intent: draft?.intent || meta.intent || '',
    draft_id: draft?.id || meta.draft_id || '',
    parsed_payload: draft
      ? {
          intent: draft.intent,
          target_workflow: draft.target_workflow,
          confidence: draft.confidence,
          missing_fields: draft.missing_fields,
        }
      : null,
    clarify: clarify || null,
    sent_at: new Date().toISOString(),
    event_date: today(),
    dedupe_key: meta.dedupe_key || `whatsapp-demo:${status}:${draft?.id || Date.now()}`,
    side_effects_managed: true,
    created_from: 'whatsapp_horizon',
  };

  assertNoDirectDatabaseWrite({ type: 'propose', draft: row });
  const created = await onCreate(row);
  return { ok: true, row: created || row };
}

/**
 * Analyse un message → brouillon(s) gateway. Aucune écriture métier.
 */
export async function analyzeWhatsAppMessage({
  message = '',
  dataMap = {},
  handlers = {},
} = {}) {
  const parsed = parseWhatsAppCommand(message, dataMap);
  const primaryDraft = parsed.drafts?.find((d) => d.meta?.role === 'primary') || parsed.drafts?.[0] || null;

  const journal = await journalizeWhatsAppEvent({
    message,
    status: parsed.clarify && !parsed.drafts?.length ? 'clarify' : 'parsed',
    draft: primaryDraft,
    clarify: parsed.clarify,
    handlers,
    meta: { scenario: parsed.scenario },
  });

  return {
    ...parsed,
    primaryDraft,
    journal,
  };
}

/**
 * Marque un brouillon validé par l'utilisateur (AI Gateway).
 */
export function validateWhatsAppDraft(draft = {}, meta = {}) {
  if (!draft?.id) throw new Error('Brouillon WhatsApp invalide.');
  let missing = arr(draft.missing_fields);
  if (meta.confirmCreateClient) {
    missing = missing.filter((field) => field !== 'confirm_create_client');
  }
  if (missing.length > 0) {
    throw new Error(`Complétez les champs manquants : ${missing.join(', ')}`);
  }
  const validated = markDraftValidated(draft, { userId: meta.userId || 'whatsapp_demo_user' });
  validated.required_validation = false;
  validated.confirmation_required = false;
  validated.missing_fields = [];
  validated.confidence = Math.max(validated.confidence ?? 0.5, 0.75);
  validated.status = 'validated';
  return validated;
}

function buildSaleOrderFromDraft(draft = {}, _dataMap = {}) {
  const fields = draft.draft?.fields || draft.draft?.preview || {};
  const amount = fields.montant_total ?? fields.payment_amount ?? fields.amount ?? 0;
  return {
    id: fields.order_id || fields.source_id || '',
    client_id: fields.client_id || '',
    client_nom: fields.client_name || fields.client_nom || '',
    product_name: fields.product_name || 'produit',
    quantite: fields.quantity ?? fields.quantite ?? 1,
    quantity: fields.quantity ?? fields.quantite ?? 1,
    montant_total: amount,
    total_amount: amount,
    montant_paye: fields.montant_paye ?? (fields.payment_status === 'paid' ? amount : 0),
    payment_amount: fields.payment_amount ?? amount,
    payment_status: fields.payment_status || 'unknown',
    statut_paiement: fields.payment_status === 'paid' ? 'paye' : 'non_paye',
    moyen_paiement: fields.payment_method || fields.moyen_paiement || 'especes',
    date: fields.date || today(),
    notes: draft.raw_input || fields.notes || '',
    side_effects_managed: false,
    source_type: fields.product_name === 'oeufs' || fields.product_name === 'œufs' ? 'oeufs' : 'stock',
  };
}

function buildPurchasePayloadFromDraft(draft = {}) {
  const fields = draft.draft?.fields || {};
  return {
    product_name: fields.product_name,
    quantity: fields.quantity,
    unit: fields.unit,
    supplier_name: fields.supplier_name,
    payment_amount: fields.payment_amount,
    payment_status: fields.payment_status,
    date: fields.date || today(),
    notes: draft.raw_input || fields.notes || '',
  };
}

/**
 * Exécute un brouillon WhatsApp déjà validé via workflows métier autorisés.
 */
export async function executeWhatsAppDraft(draft = {}, { handlers = {}, dataMap = {}, onNavigate } = {}) {
  assertNoDirectDatabaseWrite({ type: 'execute', draft });

  const check = validateDraftForExecution(draft);
  if (!check.ok) {
    return { ok: false, error: check.error, assessment: check.assessment };
  }

  const workflow = draft.target_workflow;
  const context = {
    clients: arr(dataMap.clients),
    stocks: arr(dataMap.stock || dataMap.stocks),
    lots: arr(dataMap.lots || dataMap.avicole),
    cultures: arr(dataMap.cultures),
    animaux: arr(dataMap.animaux),
    payments: arr(dataMap.payments || dataMap.paymentsAll),
    salesOrders: arr(dataMap.sales_orders || dataMap.salesOrders),
    transactions: arr(dataMap.finances || dataMap.transactions),
    tasks: arr(dataMap.taches || dataMap.tasks),
    alertes: arr(dataMap.alertes || dataMap.alertes_center),
    documents: arr(dataMap.documents),
    fournisseurs: arr(dataMap.fournisseurs),
    events: arr(dataMap.business_events),
  };

  const workflowHandlers = {
    context,
    ...handlers,
  };

  try {
    if (workflow === TARGET_WORKFLOWS.OPEN_FORM) {
      const legacy = gatewayDraftToLegacyHeyDraft(draft);
      openHeyHorizonForm(legacy, onNavigate);
      await journalizeWhatsAppEvent({
        message: draft.raw_input,
        status: 'executed',
        draft,
        handlers,
        meta: { reason: 'open_form', workflow },
      });
      return { ok: true, workflow, openedForm: true, message: 'Formulaire prérempli ouvert - confirmez la saisie.' };
    }

    if (workflow === TARGET_WORKFLOWS.SALE_PAYMENT) {
      const { recordSalePayment } = await import('../../utils/recordSalePayment.js');
      const inner = draft.draft || {};
      const saleId = inner.sale?.id || inner.sale?.order_id || inner.fields?.order_id;
      const sale = arr(context.salesOrders).find((row) => String(row.id) === String(saleId)) || inner.sale || { id: saleId };
      const result = await recordSalePayment({
        sale,
        requestedAmount: inner.requestedAmount ?? inner.fields?.amount ?? inner.preview?.requested_amount,
        paymentMethod: inner.paymentMethod || inner.fields?.payment_method || 'especes',
        payments: context.payments,
        transactions: context.transactions,
        clients: context.clients,
        salesOrders: context.salesOrders,
        handlers: workflowHandlers,
      });
      if (result?.skipped) {
        return { ok: false, error: `Encaissement non effectué (${result.reason || 'doublon ou montant invalide'}).` };
      }
      await journalizeWhatsAppEvent({ message: draft.raw_input, status: 'executed', draft, handlers, meta: { workflow } });
      return { ok: true, workflow, result };
    }

    if (workflow === TARGET_WORKFLOWS.SALE) {
      const { prepareSaleWorkflow, commitSaleWorkflow } = await import('../workflowService.js');
      const order = buildSaleOrderFromDraft(draft, dataMap);
      const preview = prepareSaleWorkflow(order, context);
      const result = await commitSaleWorkflow(preview, workflowHandlers);
      await journalizeWhatsAppEvent({ message: draft.raw_input, status: 'executed', draft, handlers, meta: { workflow } });
      return { ok: true, workflow, result };
    }

    if (workflow === TARGET_WORKFLOWS.COMMERCIAL_SALE) {
      const { prepareCommercialSaleCommit, commitCommercialSale } = await import('../../utils/commercialSaleWorkflow.js');
      const { buildClientPayloadFromDraft } = await import('./whatsappInvestorOrder.js');
      const fields = draft.draft?.fields || {};
      let form = { ...fields };
      let clients = [...context.clients];

      if (fields.create_client) {
        const clientPayload = buildClientPayloadFromDraft(draft);
        if (clientPayload) {
          if (typeof handlers.onCreateClient === 'function') {
            const created = await handlers.onCreateClient(clientPayload);
            const clientId = created?.id || clientPayload.id;
            form = { ...form, client_id: clientId };
            clients = [...clients, created || { ...clientPayload, id: clientId }];
          } else {
            form = { ...form, client_id: clientPayload.id };
            clients = [...clients, clientPayload];
          }
        }
      }

      const orderId = form.order_id || makeId('CMD');
      const clientLabel = form.client_label || fields.client_label || 'Client';
      const { records } = prepareCommercialSaleCommit({ form, orderId, clientLabel });

      const saleHandlers = {
        ...handlers,
        onCreateOrder: handlers.onCreateOrder,
        onCreateItem: handlers.onCreateItem,
        onCreateDelivery: handlers.onCreateDelivery,
        onCreateInvoice: handlers.onCreateInvoice,
        onCreateDocument: handlers.onCreateDocument,
        onCreatePayment: handlers.onCreatePayment,
        onCreateBusinessEvent: handlers.onCreateBusinessEvent,
        onRefreshWorkflow: handlers.onRefreshWorkflow,
        onUpdateStock: handlers.onUpdateStock,
        onUpdateLot: handlers.onUpdateLot,
        onUpdateAnimal: handlers.onUpdateAnimal,
        onUpdateCulture: handlers.onUpdateCulture,
        onCreateFinanceTransaction: handlers.onCreateFinanceTransaction,
        onUpdateFinanceTransaction: handlers.onUpdateFinanceTransaction,
        onUpdateClient: handlers.onUpdateClient,
        onCreateTask: handlers.onCreateTask,
        onCreateAlert: handlers.onCreateAlert,
        onUpdateOpportunity: handlers.onUpdateOpportunity,
        onCreateTrace: handlers.onCreateTrace,
      };

      const result = await commitCommercialSale(records, saleHandlers, {
        form,
        clientLabel,
        stocks: context.stocks,
        lots: context.lots,
        cultures: context.cultures,
        animaux: context.animaux,
        clients,
        salesOrders: context.salesOrders,
        payments: context.payments,
        transactions: context.transactions,
        tasks: context.tasks,
        alertes: context.alertes,
        sideEffectHandlers: saleHandlers,
      });

      await journalizeWhatsAppEvent({ message: draft.raw_input, status: 'executed', draft, handlers, meta: { workflow, orderId: result?.orderId } });
      return { ok: true, workflow, result };
    }

    if (workflow === TARGET_WORKFLOWS.PURCHASE) {
      const { preparePurchaseWorkflow, commitPurchaseWorkflow } = await import('../workflowService.js');
      const payload = buildPurchasePayloadFromDraft(draft);
      const preview = preparePurchaseWorkflow({
        produit: payload.product_name,
        libelle: payload.product_name,
        quantite: payload.quantity,
        montant: payload.payment_amount,
        amount: payload.payment_amount,
        fournisseur_id: payload.supplier_id,
        last_movement_at: new Date().toISOString(),
      }, context);
      const result = await commitPurchaseWorkflow(preview, workflowHandlers);
      await journalizeWhatsAppEvent({ message: draft.raw_input, status: 'executed', draft, handlers, meta: { workflow } });
      return { ok: true, workflow, result };
    }

    if (workflow === TARGET_WORKFLOWS.STOCK_PURCHASE) {
      const { prepareStockPurchaseWorkflow, commitStockPurchaseWorkflow } = await import('../../utils/stockPurchaseWorkflow.js');
      const payload = buildPurchasePayloadFromDraft(draft);
      const preview = prepareStockPurchaseWorkflow(payload, context);
      const result = await commitStockPurchaseWorkflow(preview, workflowHandlers);
      await journalizeWhatsAppEvent({ message: draft.raw_input, status: 'executed', draft, handlers, meta: { workflow } });
      return { ok: true, workflow, result };
    }

    const { resolveWorkflowExecutor } = await import('../aiGateway/workflowExecutors.js');
    const executor = resolveWorkflowExecutor(workflow);
    if (!executor) {
      return { ok: false, error: `Workflow non supporté en démo WhatsApp : ${workflow}` };
    }

    const payload = draft.draft?.preview ?? draft.draft?.form ?? draft.draft?.fields ?? draft.draft;
    const result = await executor(payload, workflowHandlers);
    await journalizeWhatsAppEvent({ message: draft.raw_input, status: 'executed', draft, handlers, meta: { workflow } });
    return { ok: true, workflow, result };
  } catch (err) {
    return { ok: false, error: err?.message || String(err) };
  }
}
