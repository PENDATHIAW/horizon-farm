/**
 * CHEMIN D'ACHAT CANONIQUE (Achats & Stock V1 P0)
 * Besoin / fournisseur → réception achat (StockPurchaseReceptionForm)
 * → entrée stock → document justificatif → finance / dette fournisseur
 * → business_event → stock_movement → alerte / tâche si nécessaire.
 *
 * Tous les bridges (fournisseur, OCR, WhatsApp, finance repair) doivent appeler
 * prepareStockPurchaseWorkflow + commitStockPurchaseWorkflow pour produire la même structure.
 */
import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine.js';
import { persistStockMovement } from '../services/stockMovementHelpers.js';
import { buildStockCriticalFollowUp, isStockCritical, stockReorderKey, stockUnitPrice } from './stockWorkflows.js';
import { runPurchaseSideEffects } from './purchaseSideEffects.js';
import { buildSupplierDebtPatchWithFarm, defaultFarmIdForLegacy } from './supplierDebtByFarm.js';
import { alertIds, documentIds, financeIds } from './sideEffectIds.js';
import { makeId } from './ids.js';
import { toNumber } from './format.js';

export const CANONICAL_PURCHASE_ENTRY = 'StockPurchaseReceptionForm';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => String(value || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const num = (value) => toNumber(value);

export const ENTRY_KINDS = {
  ACHAT_STOCKABLE: 'achat_stockable',
  STOCK_INITIAL: 'stock_initial',
  DON: 'don',
  CORRECTION: 'correction',
};

export const PAYMENT_STATUS = {
  PAYE: 'paye',
  PARTIEL: 'partiel',
  A_PAYER: 'a_payer',
};

export function normalizePaymentStatus(value = '') {
  const v = lower(value);
  if (['paye', 'paid', 'payé'].includes(v)) return PAYMENT_STATUS.PAYE;
  if (['partiel', 'partial'].includes(v)) return PAYMENT_STATUS.PARTIEL;
  if (['a_payer', 'impaye', 'impayé', 'credit', 'due', 'unpaid'].includes(v)) return PAYMENT_STATUS.A_PAYER;
  return PAYMENT_STATUS.PAYE;
}

export function normalizeEntryKind(value = '') {
  const v = lower(value);
  if (['stock_initial', 'initial', 'inventaire_initial'].includes(v)) return ENTRY_KINDS.STOCK_INITIAL;
  if (['don', 'donation', 'cadeau'].includes(v)) return ENTRY_KINDS.DON;
  if (['correction', 'ajustement', 'inventaire'].includes(v)) return ENTRY_KINDS.CORRECTION;
  return ENTRY_KINDS.ACHAT_STOCKABLE;
}

export function computePurchaseAmounts(payload = {}) {
  const qty = num(payload.quantite_recue ?? payload.quantite ?? payload.quantity);
  const unit = num(payload.prix_unitaire ?? payload.unit_price ?? payload.prixUnit);
  const total = num(payload.montant ?? payload.amount) || Math.round(qty * unit);
  const status = normalizePaymentStatus(payload.statut_paiement ?? payload.payment_status ?? payload.statut);
  let paidAmount = num(payload.montant_paye ?? payload.paid_amount);
  if (status === PAYMENT_STATUS.PAYE) paidAmount = total;
  else if (status === PAYMENT_STATUS.A_PAYER) paidAmount = 0;
  else if (status === PAYMENT_STATUS.PARTIEL && paidAmount <= 0 && total > 0) {
    paidAmount = 0;
  }
  const remaining = Math.max(0, total - paidAmount);
  return { qty, unit, total, paidAmount, remaining, paymentStatus: status };
}

export function buildStockPurchaseIssueKey(stockId = '', movementRef = '') {
  return `stock-purchase:${clean(stockId)}:${clean(movementRef)}`;
}

export function movementDedupeKey(stockId = '', movementRef = '', type = 'entree') {
  return `stock-movement:${type}:${clean(stockId)}:${clean(movementRef)}`;
}

export function isStockableFinanceTransaction(tx = {}) {
  if (!tx?.id) return false;
  if (tx.side_effects_managed || tx.created_from === 'purchase_side_effects' || tx.created_from === 'stock_purchase_workflow') {
    return false;
  }
  if (clean(tx.stock_id) || clean(tx.linked_stock_id)) return false;
  if (clean(tx.source_module) === 'stock') return false;
  if (/^TRX-ACHAT-/i.test(clean(tx.id))) return false;
  if (lower(tx.type || tx.transaction_type) === 'entree') return false;
  const text = lower(`${tx.categorie || ''} ${tx.category || ''} ${tx.libelle || ''} ${tx.label || ''} ${tx.module_lie || ''} ${tx.source_module || ''}`);
  return /achat|stock|intrant|aliment|fournisseur|approvisionnement|réception|reception|matériel|materiel/.test(text);
}

export function financeTransactionHasStockLink(tx = {}, stocks = []) {
  if (!tx?.id) return false;
  if (tx.stock_impact === true) return true;
  const stockId = clean(tx.stock_id || tx.related_id);
  if (stockId && arr(stocks).some((row) => clean(row.id) === stockId)) return true;
  if (arr(stocks).some((row) => clean(row.last_purchase_id) === clean(tx.id))) return true;
  return /^TRX-ACHAT-/i.test(clean(tx.id));
}

export function resolveDestinationFields(payload = {}) {
  const destination = lower(payload.destination || payload.destination_type || 'stock_general');
  if (destination === 'lot' || destination === 'lot_avicole') {
    return {
      destination_type: 'lot_avicole',
      lot_id: payload.lot_id || payload.cible_id || '',
      activite_liee: 'avicole',
      type_cible: 'lot_avicole',
      cible_id: payload.lot_id || payload.cible_id || '',
    };
  }
  if (destination === 'animal') {
    return {
      destination_type: 'animal',
      animal_id: payload.animal_id || payload.cible_id || '',
      activite_liee: 'animaux',
      type_cible: 'animal',
      cible_id: payload.animal_id || payload.cible_id || '',
    };
  }
  if (destination === 'culture') {
    return {
      destination_type: 'culture',
      culture_id: payload.culture_id || payload.cible_id || '',
      activite_liee: 'cultures',
      type_cible: 'culture',
      cible_id: payload.culture_id || payload.cible_id || '',
    };
  }
  return { destination_type: 'stock_general', activite_liee: payload.activite_liee || 'stock' };
}

function safeWorkflowId(context = {}) {
  let id = makeId('WF-STK');
  const used = new Set(arr(context.workflows).map((row) => clean(row.id)));
  while (used.has(id)) id = makeId('WF-STK');
  return id;
}

function findStockRow(context = {}, payload = {}) {
  const stocks = arr(context.stocks);
  const id = clean(payload.id || payload.stock_id);
  if (id) return stocks.find((row) => clean(row.id) === id) || null;
  const product = clean(payload.produit || payload.product_name);
  if (!product) return null;
  return stocks.find((row) => lower(stockProductName(row)) === lower(product)) || null;
}

function stockProductName(row = {}) {
  return row.produit || row.name || row.nom || row.libelle || 'Produit';
}

function resolveWorkflowFarmId(payload = {}, context = {}) {
  return clean(payload.farm_id || payload.farmId || context.farmId || context.activeFarm?.id)
    || defaultFarmIdForLegacy(context.accessibleFarms);
}

function buildStockRowPatch({ existing = null, payload = {}, amounts = {}, movementRef = '', farmId = null }) {
  const qtyReceived = amounts.qty;
  const currentQty = existing ? num(existing.quantite ?? existing.quantity) : 0;
  const nextQty = payload.replace_quantity != null
    ? num(payload.replace_quantity)
    : currentQty + qtyReceived;
  const unit = amounts.unit || stockUnitPrice(existing || payload);
  const destination = resolveDestinationFields(payload);
  const stockId = clean(payload.id || payload.stock_id || existing?.id) || makeId('STK');
  return {
    id: stockId,
    produit: payload.produit || payload.product_name || stockProductName(existing || payload),
    quantite: nextQty,
    quantity: nextQty,
    unite: payload.unite || payload.unit || existing?.unite || existing?.unit || 'kg',
    prixUnit: unit,
    prixunit: unit,
    prix_unitaire: unit,
    seuil: num(payload.seuil ?? existing?.seuil ?? 0),
    stock_max: num(payload.stock_max ?? existing?.stock_max ?? 0),
    fournisseur_id: payload.fournisseur_id || existing?.fournisseur_id || '',
    categorie: payload.categorie || existing?.categorie || 'intrant',
    statut: nextQty <= 0 ? 'epuise' : 'ok',
    stock_status: nextQty <= 0 ? 'epuise' : 'ok',
    source_module: 'stock',
    source_record_id: stockId,
    last_purchase_id: payload.finance_repair_transaction_id || '',
    last_movement_type: 'entree',
    last_movement_label: payload.notes || 'Réception achat stock',
    last_movement_qty: qtyReceived,
    last_movement_at: now(),
    stock_impact: true,
    issue_key: buildStockPurchaseIssueKey(stockId, movementRef),
    workflow_id: movementRef,
    side_effects_managed: true,
    farm_id: farmId || existing?.farm_id || payload.farm_id || null,
    ...destination,
  };
}

/** Prépare le workflow achat/réception (source de vérité Achats & Stock). */
export function prepareStockPurchaseWorkflow(payload = {}, context = {}) {
  const entryKind = normalizeEntryKind(payload.entry_kind);
  const amounts = computePurchaseAmounts(payload);
  const workflowId = payload.workflow_id || safeWorkflowId(context);
  const movementRef = workflowId;
  const existing = findStockRow(context, payload);
  const farmId = resolveWorkflowFarmId(payload, context);
  const stockPatch = buildStockRowPatch({ existing, payload, amounts, movementRef, farmId });
  const issueKey = buildStockPurchaseIssueKey(stockPatch.id, movementRef);
  const productName = stockProductName(stockPatch);
  const skipFinance = [ENTRY_KINDS.STOCK_INITIAL, ENTRY_KINDS.DON, ENTRY_KINDS.CORRECTION].includes(entryKind)
    || amounts.total <= 0
    || amounts.paidAmount <= 0;
  const supplierId = clean(stockPatch.fournisseur_id);
  const supplier = supplierId ? arr(context.suppliers).find((row) => clean(row.id) === supplierId) : null;
  const financeId = financeIds.purchase(stockPatch.id, movementRef);
  const docId = documentIds.purchase(stockPatch.id, movementRef);

  return {
    workflow_type: 'stock_purchase',
    workflow_id: workflowId,
    issue_key: issueKey,
    source_module: 'stock',
    source_record_id: stockPatch.id,
    entry_kind: entryKind,
    fields: {
      amount: { auto_value: amounts.total, final_value: amounts.total },
      paid: { auto_value: amounts.paidAmount, final_value: amounts.paidAmount },
      remaining: { auto_value: amounts.remaining, final_value: amounts.remaining },
      payment_status: { auto_value: amounts.paymentStatus, final_value: amounts.paymentStatus },
    },
    records: {
      stock_patch: stockPatch,
      is_create: !existing,
      movement: {
        stock_id: stockPatch.id,
        type: 'entree',
        qty: amounts.qty,
        motif: stockPatch.last_movement_label,
        date: payload.date || today(),
      },
      movement_event: {
        id: makeId('EVT-MVT'),
        event_type: 'stock_mouvement_entree',
        module_source: 'stock',
        entity_type: 'stock',
        entity_id: stockPatch.id,
        source_module: 'stock',
        source_record_id: stockPatch.id,
        title: `Entrée stock · ${productName}`,
        description: `+${amounts.qty} ${stockPatch.unite} · ${amounts.paymentStatus}`,
        event_date: payload.date || today(),
        amount: amounts.total,
        quantity: amounts.qty,
        linked_stock_id: stockPatch.id,
        issue_key: issueKey,
        dedupe_key: movementDedupeKey(stockPatch.id, movementRef, 'entree'),
        side_effects_managed: true,
      },
      business_event: {
        id: makeId('EVT'),
        event_type: entryKind === ENTRY_KINDS.ACHAT_STOCKABLE ? 'achat_stock' : 'entree_stock',
        module_source: 'stock',
        entity_type: 'stock',
        entity_id: stockPatch.id,
        source_module: 'stock',
        source_record_id: stockPatch.id,
        title: entryKind === ENTRY_KINDS.ACHAT_STOCKABLE ? `Achat stock · ${productName}` : `Mouvement stock · ${productName}`,
        description: payload.notes || `${amounts.qty} ${stockPatch.unite}`,
        event_date: payload.date || today(),
        amount: amounts.total,
        linked_stock_id: stockPatch.id,
        linked_transaction_id: skipFinance ? '' : financeId,
        issue_key: issueKey,
        side_effects_managed: true,
        farm_id: farmId,
      },
      finance: skipFinance ? null : {
        id: financeId,
        type: 'sortie',
        libelle: `Achat ${productName}`,
        montant: amounts.paidAmount,
        amount: amounts.paidAmount,
        date: payload.date || today(),
        categorie: 'Stock',
        module_lie: 'stock',
        fournisseur_id: supplierId,
        moyen_paiement: payload.moyen_paiement || payload.mode_paiement || payload.payment_method || 'Cash',
        mode_paiement: payload.mode_paiement || payload.moyen_paiement || 'Cash',
        statut: amounts.paymentStatus === PAYMENT_STATUS.PAYE ? 'paye' : amounts.paymentStatus,
        payment_status: amounts.paymentStatus,
        source_module: 'stock',
        source_record_id: stockPatch.id,
        stock_id: stockPatch.id,
        issue_key: issueKey,
        finance_repair_transaction_id: payload.finance_repair_transaction_id || '',
        proof_url: payload.proof_url || payload.file_url || '',
        document_id: payload.document_id || '',
        transaction_origin: 'automatique',
        origin_type: 'workflow',
        side_effects_managed: true,
        created_from: 'stock_purchase_workflow',
        farm_id: farmId,
      },
      document: payload.document_payload || (payload.proof_url || payload.file_url ? {
        id: docId,
        title: payload.document_title || `Facture achat ${productName}`,
        document_category: payload.document_category || 'facture',
        module_source: 'stock',
        entity_type: 'stock',
        entity_id: stockPatch.id,
        file_url: payload.proof_url || payload.file_url || '',
        transaction_id: financeId,
        montant: amounts.total,
        issue_key: issueKey,
        side_effects_managed: true,
      } : null),
      supplier_patch: amounts.remaining > 0 && supplierId ? {
        id: supplierId,
        ...buildSupplierDebtPatchWithFarm(supplier || { id: supplierId }, amounts.remaining, farmId, defaultFarmIdForLegacy(context.accessibleFarms)),
      } : null,
      finance_repair_patch: payload.finance_repair_transaction_id ? {
        id: payload.finance_repair_transaction_id,
        stock_id: stockPatch.id,
        linked_stock_id: stockPatch.id,
        stock_impact: true,
        source_module: 'stock',
        source_record_id: stockPatch.id,
        issue_key: issueKey,
        side_effects_managed: true,
      } : null,
    },
    workflow_meta: {
      saisies_utilisateur: 1,
      entry_kind: entryKind,
      payment_status: amounts.paymentStatus,
    },
  };
}

async function resolveLowStockAlerts(stockRow = {}, handlers = {}) {
  if (!stockRow?.id || isStockCritical(stockRow)) return;
  const key = stockReorderKey(stockRow);
  const alertId = alertIds.stockCritical(stockRow.id);
  if (handlers.onUpdateAlert) {
    await handlers.onUpdateAlert(alertId, { status: 'resolue', statut: 'resolue', resolved_at: now() });
  }
  if (handlers.existingAlerts) {
    const open = arr(handlers.existingAlerts).filter((row) => !['resolu', 'résolu', 'resolue', 'clos', 'closed'].includes(lower(row.status || row.statut)));
    await Promise.allSettled(
      open
        .filter((row) => clean(row.alert_dedupe_key) === key || clean(row.id) === alertId)
        .map((row) => handlers.onUpdateAlert?.(row.id, { status: 'resolue', statut: 'resolue', resolved_at: now() })),
    );
  }
}



/** Valide le workflow achat/réception. */
export async function commitStockPurchaseWorkflow(preview = {}, handlers = {}) {
  const p = structuredClone(preview);
  const records = p.records || {};
  const stockPatch = records.stock_patch || {};
  const ctx = handlers.context || {};
  const existingRow = arr(ctx.stocks).find((row) => clean(row.id) === clean(stockPatch.id)) || null;
  const beforeQty = existingRow ? num(existingRow.quantite ?? existingRow.quantity) : 0;
  const afterQty = num(stockPatch.quantite ?? stockPatch.quantity);
  const amounts = {
    total: num(p.fields?.amount?.final_value ?? p.fields?.amount?.auto_value),
    paidAmount: num(p.fields?.paid?.final_value ?? p.fields?.paid?.auto_value),
    qty: num(records.movement?.qty),
  };

  if (records.is_create && handlers.onCreateStock) {
    await handlers.onCreateStock({ ...stockPatch, side_effects_managed: true });
  } else if (handlers.onUpdateStock) {
    await handlers.onUpdateStock(stockPatch.id, { ...stockPatch, side_effects_managed: true });
  } else if (handlers.onCreateOrUpdateStock) {
    await handlers.onCreateOrUpdateStock({ ...stockPatch, side_effects_managed: true });
  }

  let linkedMovementEventId = '';
  if (records.movement_event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent(records.movement_event);
    linkedMovementEventId = records.movement_event.id;
  }
  if (records.business_event && handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent(records.business_event);
  }

  if (handlers.onCreateStockMovement && amounts.qty > 0) {
    await persistStockMovement({
      before: { id: stockPatch.id, quantite: beforeQty },
      after: { ...stockPatch, quantite: afterQty, quantity: afterQty },
      patch: {
        last_movement_type: 'entree',
        source_module: 'stock',
        source_record_id: stockPatch.id,
        last_movement_label: records.movement?.motif || stockPatch.last_movement_label,
        movement_ref: p.workflow_id,
        dedupe_key: records.movement_event?.dedupe_key || movementDedupeKey(stockPatch.id, p.workflow_id, 'entree'),
        created_from: 'stock_purchase_workflow',
        date: records.movement?.date,
      },
      linkedEventId: linkedMovementEventId,
      farmId: stockPatch.farm_id,
      movementRef: p.workflow_id,
      dedupeKey: records.movement_event?.dedupe_key,
      handlers,
      existingMovements: handlers.existingStockMovements || ctx.stock_movements,
    });
  }

  if (records.supplier_patch && handlers.onUpdateSupplier) {
    await handlers.onUpdateSupplier(records.supplier_patch.id, records.supplier_patch);
  }

  const skipFinance = !records.finance;
  if (!skipFinance && records.finance && handlers.onCreateFinanceTransaction) {
    const exists = arr(ctx.transactions).some((row) => clean(row.id) === clean(records.finance.id));
    if (!exists) {
      await handlers.onCreateFinanceTransaction(records.finance);
      await syncFinanceSideEffects(records.finance, { handlers });
    }
  }

  if (records.document && handlers.onCreateDocument) {
    const docExists = arr(handlers.existingDocuments || ctx.documents).some((row) => clean(row.id) === clean(records.document.id));
    if (!docExists) await handlers.onCreateDocument(records.document);
  } else if (!skipFinance && amounts.paidAmount > 0) {
    await runPurchaseSideEffects({
      stockPatch,
      stockRow: stockPatch,
      amount: amounts.paidAmount,
      movementRef: p.workflow_id,
      date: records.finance?.date || today(),
      transactions: ctx.transactions || [],
      tasks: ctx.tasks || [],
      alertes: ctx.alertes || [],
      handlers: { ...handlers, skipFinance: true, skipDocument: Boolean(records.document) },
    });
  }

  if (records.finance_repair_patch && handlers.onUpdateFinanceTransaction) {
    await handlers.onUpdateFinanceTransaction(records.finance_repair_patch.id, records.finance_repair_patch);
  }

  const followUp = buildStockCriticalFollowUp(stockPatch, stockPatch.quantite);
  if (!followUp && amounts.qty > 0) {
    await resolveLowStockAlerts(stockPatch, handlers);
  } else if (followUp && handlers.onCreateTask && handlers.onCreateAlert) {
    await runPurchaseSideEffects({
      stockPatch,
      stockRow: stockPatch,
      amount: 0,
      movementRef: p.workflow_id,
      date: stockPatch.last_movement_at?.slice?.(0, 10) || today(),
      transactions: ctx.transactions || [],
      tasks: ctx.tasks || [],
      alertes: ctx.alertes || [],
      handlers,
      skipFinance: true,
      skipDocument: true,
    });
  }

  return {
    ok: true,
    workflow_id: p.workflow_id,
    issue_key: p.issue_key,
    stock_id: stockPatch.id,
    saisies_evitees: p.workflow_meta?.saisies_evitees || 4,
  };
}

/** Brouillon de réparation : créer entrée stock depuis une dépense finance historique. */
export function buildStockReceptionFromFinanceTransaction(tx = {}) {
  const amount = num(tx.montant ?? tx.amount);
  return {
    entry_kind: ENTRY_KINDS.ACHAT_STOCKABLE,
    finance_repair_transaction_id: tx.id,
    produit: tx.produit || tx.libelle || tx.label || 'Produit stock',
    prix_unitaire: amount > 0 ? amount : 0,
    quantite: 1,
    quantite_recue: 1,
    montant: amount,
    statut_paiement: lower(tx.statut || tx.status) === 'paye' ? PAYMENT_STATUS.PAYE : PAYMENT_STATUS.A_PAYER,
    montant_paye: lower(tx.statut || tx.status) === 'paye' ? amount : num(tx.montant_paye),
    fournisseur_id: tx.fournisseur_id || '',
    date: String(tx.date || today()).slice(0, 10),
    moyen_paiement: tx.moyen_paiement || tx.mode_paiement || tx.paiement || 'Cash',
    notes: `Réparation entrée stock depuis finance ${tx.id}`,
    destination: 'stock_general',
    proof_url: tx.proof_url || tx.file_url || '',
  };
}

export function validateStockPurchasePayload(payload = {}) {
  const amounts = computePurchaseAmounts(payload);
  const errors = [];
  if (!clean(payload.produit || payload.product_name)) errors.push('Produit obligatoire');
  if (amounts.qty <= 0) errors.push('Quantité obligatoire');
  if (normalizeEntryKind(payload.entry_kind) === ENTRY_KINDS.ACHAT_STOCKABLE && amounts.unit <= 0 && amounts.total <= 0) {
    errors.push('Prix unitaire ou montant total obligatoire');
  }
  if (amounts.paymentStatus === PAYMENT_STATUS.PARTIEL && amounts.paidAmount <= 0 && amounts.total > 0) {
    errors.push('Montant payé obligatoire pour un paiement partiel');
  }
  if (amounts.paymentStatus === PAYMENT_STATUS.PARTIEL && amounts.paidAmount >= amounts.total) {
    errors.push('Montant payé doit être inférieur au total pour un paiement partiel');
  }
  return { ok: errors.length === 0, errors, amounts };
}
