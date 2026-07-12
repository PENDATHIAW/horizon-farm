/**
 * Chantier 7 — Documents & Rapports : rattacher preuves depuis la bibliothèque (pas point de départ métier).
 */

import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { documentLinkKey, documentNeedsProof } from './documentWorkflows.js';
const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const num = (value) => toNumber(value);
const today = () => new Date().toISOString().slice(0, 10);


async function maybeSyncFinanceSideEffects(transaction, handlers, document) {
  if (handlers.onSyncFinanceSideEffects) {
    await handlers.onSyncFinanceSideEffects(transaction, { handlers, document });
    return;
  }
  try {
    const { syncFinanceSideEffects } = await import('../services/erpInterconnectionEngine.js');
    await syncFinanceSideEffects(transaction, { handlers, document });
  } catch {
    // Contexte test / bundle léger sans moteur interconnexion complet.
  }
}

export const DOCUMENT_DOMAINS = {
  LINK: 'link',
  PROOF: 'preuve',
};

export const DOCUMENT_TARGET_TYPES = {
  FINANCE: 'finance',
  SALE: 'vente',
  PAYMENT: 'paiement',
  INVOICE: 'facture',
  STOCK_PURCHASE: 'achat_stock',
  HEALTH: 'soin',
  EQUIPMENT: 'equipement',
  CULTURE: 'culture',
  PAYROLL: 'paie',
};

const TARGET_META = {
  [DOCUMENT_TARGET_TYPES.FINANCE]: {
    label: 'Transaction finance',
    source_module: 'finances',
    entity_type: 'transaction',
    contextKey: 'transactions',
    proofField: 'proof_document_id',
  },
  [DOCUMENT_TARGET_TYPES.SALE]: {
    label: 'Vente / commande',
    source_module: 'ventes',
    entity_type: 'commande',
    contextKey: 'salesOrders',
    proofField: 'document_id',
  },
  [DOCUMENT_TARGET_TYPES.PAYMENT]: {
    label: 'Paiement',
    source_module: 'ventes',
    entity_type: 'paiement',
    contextKey: 'payments',
    proofField: 'proof_document_id',
  },
  [DOCUMENT_TARGET_TYPES.INVOICE]: {
    label: 'Facture',
    source_module: 'ventes',
    entity_type: 'facture',
    contextKey: 'invoices',
    proofField: 'document_id',
  },
  [DOCUMENT_TARGET_TYPES.STOCK_PURCHASE]: {
    label: 'Achat stock',
    source_module: 'stock',
    entity_type: 'stock',
    contextKey: 'stocks',
    proofField: 'proof_document_id',
  },
  [DOCUMENT_TARGET_TYPES.HEALTH]: {
    label: 'Soin / vaccin',
    source_module: 'sante',
    entity_type: 'sante',
    contextKey: 'healthRecords',
    proofField: 'proof_document_id',
  },
  [DOCUMENT_TARGET_TYPES.EQUIPMENT]: {
    label: 'Équipement',
    source_module: 'equipements',
    entity_type: 'equipement',
    contextKey: 'equipment',
    proofField: 'proof_document_id',
  },
  [DOCUMENT_TARGET_TYPES.CULTURE]: {
    label: 'Culture',
    source_module: 'cultures',
    entity_type: 'culture',
    contextKey: 'cultures',
    proofField: 'proof_document_id',
  },
  [DOCUMENT_TARGET_TYPES.PAYROLL]: {
    label: 'Paie RH',
    source_module: 'equipe',
    entity_type: 'personne',
    contextKey: 'people',
    proofField: 'proof_document_id',
  },
};

export function buildDocumentsIssueKey(domain = '', recordId = '', suffix = '') {
  const d = clean(domain) || 'documents';
  const id = clean(recordId) || 'record';
  const tail = clean(suffix);
  return tail ? `documents:${d}:${id}:${tail}` : `documents:${d}:${id}`;
}

export function isDocumentOrphan(doc = {}) {
  return Boolean(doc?.id) && !(
    doc.module_source
    || doc.source_module
    || doc.related_type
    || doc.transaction_id
    || doc.finance_id
    || doc.source_record_id
    || doc.order_id
    || doc.sale_id
    || doc.invoice_id
    || doc.payment_id
    || doc.entity_id
    || doc.related_id
  );
}

export function validateDocumentLinkForm(form = {}) {
  if (!clean(form.document_id)) return 'Document obligatoire.';
  if (!clean(form.target_type)) return 'Type de lien obligatoire.';
  if (!clean(form.target_id)) return 'Opération source obligatoire.';
  if (!TARGET_META[form.target_type]) return 'Type de lien invalide.';
  return '';
}

function resolveTargetRecord(targetType, targetId, context = {}) {
  const meta = TARGET_META[targetType];
  if (!meta) return null;
  const list = arr(context[meta.contextKey]);
  return list.find((row) => clean(row.id) === clean(targetId)) || null;
}

function buildDocumentLinkPatch(document = {}, targetType = '', targetId = '', target = null) {
  const meta = TARGET_META[targetType];
  const issueKey = buildDocumentsIssueKey(DOCUMENT_DOMAINS.LINK, document.id, `${targetType}:${targetId}`);
  const hasFile = Boolean(document.file_url || document.url || document.storage_path);

  const patch = {
    source_module: meta.source_module,
    module_source: meta.source_module,
    source_record_id: targetId,
    entity_type: meta.entity_type,
    entity_id: targetId,
    related_id: targetId,
    related_type: meta.entity_type,
    issue_key: issueKey,
    linked_at: new Date().toISOString(),
    side_effects_managed: true,
    verification_status: hasFile ? 'verifie' : 'preuve_manquante',
    status: hasFile ? 'verifie' : (document.status || 'a_completer'),
    statut: hasFile ? 'verifie' : (document.statut || 'a_completer'),
  };

  if (targetType === DOCUMENT_TARGET_TYPES.FINANCE) {
    patch.transaction_id = targetId;
    patch.finance_id = targetId;
    patch.montant = num(target?.montant ?? target?.amount ?? document.montant);
  }
  if (targetType === DOCUMENT_TARGET_TYPES.SALE) {
    patch.order_id = targetId;
    patch.sale_id = targetId;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.PAYMENT) {
    patch.payment_id = targetId;
    patch.order_id = target?.order_id || target?.sale_id || document.order_id;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.INVOICE) {
    patch.invoice_id = targetId;
    patch.order_id = target?.order_id || document.order_id;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.STOCK_PURCHASE) {
    patch.stock_id = targetId;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.HEALTH) {
    patch.health_id = targetId;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.EQUIPMENT) {
    patch.equipment_id = targetId;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.CULTURE) {
    patch.culture_id = targetId;
  }
  if (targetType === DOCUMENT_TARGET_TYPES.PAYROLL) {
    patch.person_id = targetId;
  }

  return { patch, issueKey, meta };
}

function buildSourceRecordPatch(meta, documentId, document = {}) {
  const patch = { [meta.proofField]: documentId, document_id: documentId, last_document_id: documentId };
  if (document.file_url || document.url) {
    patch.proof_url = document.file_url || document.url;
    patch.justificatif_id = documentId;
  }
  return patch;
}

/** Lie un document orphelin (ou non) à une opération métier source. */
export async function commitDocumentLink({ form = {}, context = {}, handlers = {} } = {}) {
  const err = validateDocumentLinkForm(form);
  if (err) throw new Error(err);

  const documentId = clean(form.document_id);
  const targetType = form.target_type;
  const targetId = clean(form.target_id);
  const document = arr(context.documents).find((d) => clean(d.id) === documentId);
  if (!document) throw new Error('Document introuvable');

  const target = resolveTargetRecord(targetType, targetId, context);
  if (!target) throw new Error('Opération source introuvable');

  const duplicate = arr(context.documents).find((d) =>
    clean(d.id) !== documentId
    && clean(d.issue_key) === buildDocumentsIssueKey(DOCUMENT_DOMAINS.LINK, documentId, `${targetType}:${targetId}`)
    && (clean(d.source_record_id) === targetId || clean(d.transaction_id) === targetId));
  if (duplicate && !form.allow_duplicate) {
    throw new Error(`Document déjà lié : ${duplicate.title || duplicate.id}`);
  }

  const { patch, issueKey, meta } = buildDocumentLinkPatch(document, targetType, targetId, target);

  await handlers.onUpdateDocument?.(documentId, patch);

  const sourcePatch = buildSourceRecordPatch(meta, documentId, { ...document, ...patch });
  if (targetType === DOCUMENT_TARGET_TYPES.FINANCE && handlers.onUpdateFinanceTransaction) {
    await handlers.onUpdateFinanceTransaction(targetId, {
      ...sourcePatch,
      statut: documentNeedsProof(document) && !patch.file_url ? 'a_encaisser' : (target.statut || 'paye'),
    });
    await maybeSyncFinanceSideEffects({ ...target, ...sourcePatch, id: targetId }, handlers, { ...document, ...patch, id: documentId });
  } else if (targetType === DOCUMENT_TARGET_TYPES.SALE && handlers.onUpdateOrder) {
    await handlers.onUpdateOrder(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.PAYMENT && handlers.onUpdatePayment) {
    await handlers.onUpdatePayment(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.INVOICE && handlers.onUpdateInvoice) {
    await handlers.onUpdateInvoice(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.STOCK_PURCHASE && handlers.onUpdateStock) {
    await handlers.onUpdateStock(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.HEALTH && handlers.onUpdateHealthRecord) {
    await handlers.onUpdateHealthRecord(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.EQUIPMENT && handlers.onUpdateEquipment) {
    await handlers.onUpdateEquipment(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.CULTURE && handlers.onUpdateCulture) {
    await handlers.onUpdateCulture(targetId, sourcePatch);
  } else if (targetType === DOCUMENT_TARGET_TYPES.PAYROLL && handlers.onUpdatePerson) {
    await handlers.onUpdatePerson(targetId, sourcePatch);
  }

  const proofKey = documentLinkKey({ transaction_id: targetId, entity_id: targetId, id: documentId });
  if (handlers.onUpdateAlert) {
    const alert = arr(context.alertes).find((a) => clean(a.alert_dedupe_key) === clean(proofKey));
    if (alert?.id) {
      await handlers.onUpdateAlert(alert.id, { status: 'resolue', statut: 'resolue' });
    }
  }
  if (handlers.onUpdateTask) {
    const task = arr(context.tasks).find((t) => clean(t.task_dedupe_key || t.action_key) === clean(proofKey));
    if (task?.id) {
      await handlers.onUpdateTask(task.id, { status: 'termine', statut: 'termine' });
    }
  }

  await handlers.onCreateBusinessEvent?.({
    id: makeId('EVT'),
    event_type: 'document_lie',
    module_source: 'documents_rapports',
    entity_type: 'document',
    entity_id: documentId,
    title: `Document lié · ${document.title || documentId}`,
    description: `${meta.label} ${targetId}`,
    event_date: form.date || today(),
    linked_target_type: targetType,
    linked_target_id: targetId,
    issue_key: issueKey,
    side_effects_managed: true,
  });

  return { ok: true, documentId, targetType, targetId, issueKey, resolvedProof: !documentNeedsProof({ ...document, ...patch }) };
}

export function listLinkTargetOptions(targetType = '', context = {}) {
  const meta = TARGET_META[targetType];
  if (!meta) return [];
  return arr(context[meta.contextKey]).map((row) => ({
    value: row.id,
    label: row.libelle || row.title || row.nom || row.name || row.product_name || row.id,
    amount: num(row.montant ?? row.amount ?? row.montant_total ?? row.total),
  }));
}

export function targetTypeOptions() {
  return Object.entries(TARGET_META).map(([value, meta]) => ({ value, label: meta.label }));
}

/** Scénario intégré pour tests. */
export async function runDocumentsScenario(handlersFactory) {
  const state = {
    documents: [
      { id: 'DOC-ORPH', title: 'Facture fournisseur scan', file_url: 'https://example.com/facture.pdf', status: 'manquant' },
    ],
    transactions: [{ id: 'TRX-1', libelle: 'Dépense intrants', montant: 45000, type: 'sortie' }],
    salesOrders: [{ id: 'CMD-1', product_name: 'Tomates', montant_total: 90000 }],
    payments: [{ id: 'PAY-1', order_id: 'CMD-1', montant: 90000 }],
    invoices: [{ id: 'FAC-1', order_id: 'CMD-1', montant_total: 90000 }],
    stocks: [{ id: 'STK-1', produit: 'Engrais', source_module: 'stock' }],
    healthRecords: [{ id: 'SANTE-1', libelle: 'Vaccination lot' }],
    equipment: [{ id: 'EQ-1', nom: 'Pompe' }],
    cultures: [{ id: 'CULT-1', nom: 'Oignons' }],
    people: [{ id: 'RH-1', nom: 'Awa Diop' }],
    events: [],
    tasks: [],
    alertes: [],
  };

  const handlers = {
    onUpdateDocument: async (id, patch) => {
      const i = state.documents.findIndex((d) => d.id === id);
      if (i >= 0) state.documents[i] = { ...state.documents[i], ...patch };
    },
    onUpdateFinanceTransaction: async (id, patch) => {
      const i = state.transactions.findIndex((t) => t.id === id);
      if (i >= 0) state.transactions[i] = { ...state.transactions[i], ...patch };
    },
    onUpdateOrder: async (id, patch) => {
      const i = state.salesOrders.findIndex((o) => o.id === id);
      if (i >= 0) state.salesOrders[i] = { ...state.salesOrders[i], ...patch };
    },
    onUpdateStock: async (id, patch) => {
      const i = state.stocks.findIndex((s) => s.id === id);
      if (i >= 0) state.stocks[i] = { ...state.stocks[i], ...patch };
    },
    onUpdateHealthRecord: async (id, patch) => {
      const i = state.healthRecords.findIndex((h) => h.id === id);
      if (i >= 0) state.healthRecords[i] = { ...state.healthRecords[i], ...patch };
    },
    onCreateBusinessEvent: async (row) => { state.events.push(row); },
    ...handlersFactory?.(state),
  };

  const ctx = () => ({ ...state, healthRecords: state.healthRecords });

  await commitDocumentLink({
    form: { document_id: 'DOC-ORPH', target_type: DOCUMENT_TARGET_TYPES.FINANCE, target_id: 'TRX-1' },
    context: ctx(),
    handlers,
  });

  const saleDoc = { id: 'DOC-SALE', title: 'Facture vente PDF', file_url: 'https://example.com/fac.pdf' };
  state.documents.push(saleDoc);
  await commitDocumentLink({
    form: { document_id: 'DOC-SALE', target_type: DOCUMENT_TARGET_TYPES.SALE, target_id: 'CMD-1' },
    context: ctx(),
    handlers,
  });

  return { state };
}
