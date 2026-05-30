import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import {
  buildSupplierDebtFollowUp,
  buildSupplierPaymentWorkflow,
  buildSupplierReceptionWorkflow,
  supplierDebtKey,
} from './supplierWorkflows';
import { documentIds, financeIds } from './sideEffectIds';
import { runPurchaseSideEffects } from './purchaseSideEffects';
import { toNumber } from './format';

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
} = {}) {
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
  date = '',
  openDebtTransactions = [],
  paymentRef = '',
  transactions = [],
  tasks = [],
  alertes = [],
  handlers = {},
} = {}) {
  const raw = buildSupplierPaymentWorkflow({
    supplier,
    debtAmount,
    date: date || today(),
    openDebtTransactions,
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

  if (handlers.onUpdateTask && handlers.onUpdateAlert) {
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
