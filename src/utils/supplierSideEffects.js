import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine.js';
import {
  buildSupplierDebtFollowUp,
  buildSupplierPaymentWorkflow,
  buildSupplierReceptionWorkflow,
  stockProductName,
  supplierDebtKey,
} from './supplierWorkflows.js';
import {
  commitStockPurchaseWorkflow,
  ENTRY_KINDS,
  PAYMENT_STATUS,
  prepareStockPurchaseWorkflow,
} from './stockPurchaseWorkflow.js';
import { documentIds, financeIds } from './sideEffectIds.js';
import { runPurchaseSideEffects } from './purchaseSideEffects.js';
import { toNumber } from './format.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

function applyDeterministicSupplierReception(workflow = {}, supplier = {}, stock = {}) {
  const supplierId = clean(supplier.id);
  const stockId = clean(stock.id);
  const financeId = financeIds.supplierDebt(supplierId, stockId);
  const docId = documentIds.supplierDebt(supplierId, stockId);
  return {
    ...workflow,
    debtTransaction: {
      ...workflow.debtTransaction,
      id: financeId,
      side_effects_managed: true,
      created_from: 'supplier_side_effects',
    },
    missingInvoiceDocument: {
      ...workflow.missingInvoiceDocument,
      id: docId,
      transaction_id: financeId,
      finance_id: financeId,
      side_effects_managed: true,
    },
    event: {
      ...workflow.event,
      linked_transaction_id: financeId,
      linked_document_id: docId,
      side_effects_managed: true,
    },
  };
}

function applyDeterministicSupplierPayment(workflow = {}, supplier = {}, paymentRef = '') {
  const supplierId = clean(supplier.id);
  const ref = paymentRef || today();
  const trxId = financeIds.supplierPayment(supplierId, ref);
  const docId = documentIds.supplierPayment(supplierId, ref);
  return {
    ...workflow,
    paymentTransaction: {
      ...workflow.paymentTransaction,
      id: trxId,
      side_effects_managed: true,
      created_from: 'supplier_side_effects',
    },
    paymentProofDocument: {
      ...workflow.paymentProofDocument,
      id: docId,
      transaction_id: trxId,
      side_effects_managed: true,
    },
    event: {
      ...workflow.event,
      linked_transaction_id: trxId,
      linked_document_id: docId,
      side_effects_managed: true,
    },
    supplierPatch: {
      ...workflow.supplierPatch,
      last_payment_id: trxId,
    },
  };
}

export async function runSupplierReceptionSideEffects({
  supplier = {},
  stock = {},
  qty = 0,
  unitPrice = 0,
  date = '',
  tasks = [],
  alertes = [],
  transactions = [],
  handlers = {},
  useCanonicalPurchase = true,
} = {}) {
  const amount = num(qty) * num(unitPrice ?? stock.prixUnit ?? stock.prix_unitaire ?? stock.unit_price);
  if (useCanonicalPurchase !== false && amount > 0) {
    const payload = {
      id: stock.id,
      stock_id: stock.id,
      produit: stockProductName(stock),
      quantite: qty,
      quantite_recue: qty,
      prix_unitaire: unitPrice,
      statut_paiement: PAYMENT_STATUS.A_PAYER,
      fournisseur_id: supplier.id,
      farm_id: stock.farm_id || supplier.farm_id,
      date: date || today(),
      notes: `Réception fournisseur - ${supplier.nom || supplier.name || supplier.id}`,
      entry_kind: ENTRY_KINDS.ACHAT_STOCKABLE,
    };
    const preview = prepareStockPurchaseWorkflow(payload, {
      stocks: [stock],
      suppliers: [supplier],
      transactions,
      accessibleFarms: handlers.accessibleFarms,
    });
    if (preview.issue_key && arr(transactions).some((tx) => clean(tx.issue_key) === clean(preview.issue_key))) {
      return preview;
    }
    await commitStockPurchaseWorkflow(preview, { ...handlers, context: { stocks: [stock], transactions, tasks, alertes } });
    return preview;
  }

  const raw = buildSupplierReceptionWorkflow({ supplier, stock, qty, unitPrice, date: date || today() });
  const workflow = applyDeterministicSupplierReception(raw, supplier, stock);

  await handlers.onUpdateStock?.(stock.id, workflow.stockPatch);
  await handlers.onUpdateSupplier?.(supplier.id, workflow.supplierPatch);

  const debtExists = arr(transactions).find((row) => clean(row.id) === clean(workflow.debtTransaction.id));
  if (!debtExists) await handlers.onCreateFinanceTransaction?.(workflow.debtTransaction);
  await syncFinanceSideEffects(debtExists || workflow.debtTransaction, { handlers, document: workflow.missingInvoiceDocument });

  const docExists = arr(handlers.existingDocuments || []).some((row) => clean(row.id) === clean(workflow.missingInvoiceDocument.id));
  if (!docExists) await handlers.onCreateDocument?.(workflow.missingInvoiceDocument);

  if (handlers.onCreateBusinessEvent) await handlers.onCreateBusinessEvent(workflow.event);

  await runPurchaseSideEffects({
    stockPatch: workflow.stockPatch,
    stockRow: stock,
    amount: 0,
    skipFinance: true,
    skipDocument: true,
    tasks,
    alertes,
    handlers,
  });

  const debtAmount = num(workflow.amount);
  if (debtAmount > 0) {
    const followUp = buildSupplierDebtFollowUp(supplier, debtAmount, date || today());
    if (followUp) {
      const alertExists = arr(alertes).some((row) => clean(row.alert_dedupe_key) === supplierDebtKey(supplier));
      if (!alertExists) await handlers.onCreateAlert?.(followUp.alert);
    }
  }

  return workflow;
}

export async function runSupplierPaymentSideEffects({
  supplier = {},
  debtAmount = 0,
  paymentAmount = debtAmount,
  date = '',
  openDebtTransactions = [],
  sourceTransactionId = '',
  paymentMethod = '',
  proofUrl = '',
  paymentRef = '',
  transactions = [],
  tasks = [],
  alertes = [],
  handlers = {},
} = {}) {
  if (!clean(supplier.id)) throw new Error('Fournisseur obligatoire pour enregistrer le paiement.');
  const amount = num(paymentAmount);
  if (amount <= 0) throw new Error('Montant de paiement fournisseur obligatoire.');
  const sourceDebt = arr(openDebtTransactions).find((row) => clean(row.id) === clean(sourceTransactionId)) || arr(openDebtTransactions)[0];
  if (!sourceDebt?.id) throw new Error('Dette fournisseur source obligatoire.');
  const sourceRemaining = num(sourceDebt.reste_a_payer ?? sourceDebt.amount ?? sourceDebt.montant);
  if (amount > sourceRemaining) throw new Error('Le paiement dépasse le reste dû sur la dette sélectionnée.');
  if (!clean(paymentMethod)) throw new Error('Mode de paiement fournisseur obligatoire.');
  if (!clean(proofUrl)) throw new Error('Preuve du paiement fournisseur obligatoire.');

  const raw = buildSupplierPaymentWorkflow({
    supplier,
    debtAmount: amount,
    totalDebt: debtAmount,
    date: date || today(),
    paymentMethod,
    proofUrl,
    sourceTransactionId: sourceDebt.id,
    openDebtTransactions: [sourceDebt],
  });
  const workflow = applyDeterministicSupplierPayment(raw, supplier, paymentRef);

  const trxExists = arr(transactions).find((row) => clean(row.id) === clean(workflow.paymentTransaction.id));
  if (!trxExists) await handlers.onCreateFinanceTransaction?.(workflow.paymentTransaction);
  await syncFinanceSideEffects(trxExists || workflow.paymentTransaction, { handlers, document: workflow.paymentProofDocument });

  await handlers.onCreateDocument?.(workflow.paymentProofDocument);
  await handlers.onUpdateSupplier?.(supplier.id, workflow.supplierPatch);

  for (const patchRow of workflow.debtTransactionPatches) {
    await handlers.onUpdateFinanceTransaction?.(patchRow.id, patchRow.patch);
  }

  if (handlers.onCreateBusinessEvent) await handlers.onCreateBusinessEvent(workflow.event);

  if (num(workflow.supplierPatch.dettes) <= 0 && handlers.onUpdateTask && handlers.onUpdateAlert) {
    const key = supplierDebtKey(supplier);
    for (const task of arr(tasks).filter((row) => clean(row.task_dedupe_key) === key)) {
      await handlers.onUpdateTask(task.id, { status: 'termine', statut: 'termine' });
    }
    for (const alert of arr(alertes).filter((row) => clean(row.alert_dedupe_key) === key)) {
      await handlers.onUpdateAlert(alert.id, { status: 'resolue', statut: 'resolue' });
    }
  }

  return workflow;
}
