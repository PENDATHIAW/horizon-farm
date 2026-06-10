import { syncFinanceSideEffects } from '../services/erpInterconnectionEngine';
import { computeWeightedAverageCost } from './stockValuation.js';
import { buildStockCriticalFollowUp, hasOpenStockReorderTask, stockProductName, stockQuantity } from './stockWorkflows';
import { alertIds, documentIds, financeIds } from './sideEffectIds';
import { attachIdempotency, buildIdempotencyKey, WORKFLOW_TYPES } from './workflowDedupe';
import { toNumber } from './format';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const num = (value) => toNumber(value);

export function buildPurchaseFinanceRow({
  stockId = '',
  productName = 'Achat stock',
  amount = 0,
  date = '',
  supplierId = '',
  movementRef = '',
  stock = {},
} = {}) {
  const value = num(amount);
  if (value <= 0 || !stockId) return null;
  return {
    id: financeIds.purchase(stockId, movementRef || date || today()),
    type: 'sortie',
    libelle: `Achat ${productName}`,
    montant: value,
    amount: value,
    date: date || today(),
    categorie: 'Stock',
    module_lie: 'stock',
    related_id: stockId,
    stock_id: stockId,
    fournisseur_id: supplierId || stock.fournisseur_id || '',
    statut: 'paye',
    source_module: 'stock',
    source_record_id: stockId,
    source_type: stock.source_type || 'stock',
    transaction_origin: 'automatique',
    side_effects_managed: true,
    created_from: 'purchase_side_effects',
  };
}

export function buildPurchaseDocumentRow({
  stockId = '',
  productName = 'Achat',
  amount = 0,
  movementRef = '',
  financeId = '',
} = {}) {
  if (!stockId) return null;
  const docId = documentIds.purchase(stockId, movementRef || today());
  return {
    id: docId,
    title: `Justificatif achat ${productName}`,
    document_category: 'facture',
    module_source: 'stock',
    entity_type: 'stock',
    entity_id: stockId,
    related_id: stockId,
    transaction_id: financeId || financeIds.purchase(stockId, movementRef || today()),
    montant: num(amount),
    notes: 'Généré automatiquement depuis réception stock.',
    side_effects_managed: true,
  };
}

export function buildStockLossFinanceRow({ stock = {}, qty = 0, date = '', movementRef = '', movements = [], transactions = [] } = {}) {
  const valuation = computeWeightedAverageCost(stock, movements, transactions);
  const unitCost = valuation.calculable && valuation.avgCost > 0
    ? valuation.avgCost
    : num(stock.prixUnit ?? stock.prix_unitaire ?? stock.unit_price);
  const value = num(qty) * unitCost;
  if (value <= 0 || !stock.id) return null;
  return {
    id: financeIds.stockLoss(stock.id, movementRef || date || today()),
    type: 'sortie',
    libelle: `Perte stock ${stockProductName(stock)}`,
    montant: value,
    amount: value,
    date: date || today(),
    categorie: 'Stock',
    module_lie: 'stock',
    related_id: stock.id,
    stock_id: stock.id,
    statut: 'paye',
    source_module: 'stock',
    source_record_id: stock.id,
    side_effects_managed: true,
    created_from: 'purchase_side_effects',
  };
}

async function ensureCriticalStockFollowUp({ stockRow = {}, tasks = [], alertes = [], handlers = {} } = {}) {
  const followUp = buildStockCriticalFollowUp(stockRow, stockQuantity(stockRow));
  if (!followUp || hasOpenStockReorderTask(stockRow, tasks)) return null;
  const alertExists = arr(alertes).some((row) => clean(row.alert_dedupe_key) === clean(followUp.key));
  if (!alertExists) await handlers.onCreateAlert?.({ ...followUp.alert, id: alertIds.stockCritical(stockRow.id), side_effects_managed: true });
  const taskExists = arr(tasks).some((row) => clean(row.task_dedupe_key) === clean(followUp.key));
  if (!taskExists) await handlers.onCreateTask?.(followUp.task);
  if (handlers.onCreateBusinessEvent && followUp.event) await handlers.onCreateBusinessEvent(followUp.event);
  return followUp;
}

/** Effets après réception / achat stock (finance · document · alerte seuil · comptabilité). */
export async function runPurchaseSideEffects({
  stockPatch = {},
  stockRow = {},
  amount = 0,
  movementRef = '',
  date = '',
  transactions = [],
  tasks = [],
  alertes = [],
  handlers = {},
  skipFinance = false,
  skipDocument = false,
} = {}) {
  const stockId = clean(stockPatch.id || stockRow.id);
  const productName = stockPatch.produit || stockRow.produit || stockProductName(stockRow);
  const supplierId = stockPatch.fournisseur_id || stockRow.fournisseur_id || '';
  const mergedStock = { ...stockRow, ...stockPatch, id: stockId };

  if (!skipFinance && amount > 0) {
    const financeRow = buildPurchaseFinanceRow({
      stockId,
      productName,
      amount,
      date,
      supplierId,
      movementRef,
      stock: mergedStock,
    });
    if (financeRow) {
      const idempotencyKey = buildIdempotencyKey({
        workflowType: WORKFLOW_TYPES.PURCHASE,
        sourceModule: 'stock',
        sourceRecordId: stockId,
        movementRef: movementRef || date || today(),
      });
      const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
      if (!exists) await handlers.onCreateFinanceTransaction?.(attachIdempotency(financeRow, idempotencyKey, { workflowType: WORKFLOW_TYPES.PURCHASE, sourceModule: 'stock', sourceRecordId: stockId }));
      await syncFinanceSideEffects(exists || financeRow, { handlers });
    }
  }

  if (!skipDocument) {
    const financeId = financeIds.purchase(stockId, movementRef || date || today());
    const docRow = buildPurchaseDocumentRow({ stockId, productName, amount, movementRef, financeId });
    if (docRow && handlers.onCreateDocument) {
      const docExists = arr(handlers.existingDocuments || []).some((row) => clean(row.id) === clean(docRow.id));
      if (!docExists) await handlers.onCreateDocument(docRow);
    }
  }

  await ensureCriticalStockFollowUp({ stockRow: mergedStock, tasks, alertes, handlers });
  return { stockId, amount: num(amount) };
}

/** Effets après perte stock. */
export async function runStockLossSideEffects({
  stock = {},
  qty = 0,
  date = '',
  movementRef = '',
  transactions = [],
  movements = [],
  handlers = {},
} = {}) {
  const financeRow = buildStockLossFinanceRow({
    stock,
    qty,
    date,
    movementRef,
    movements: movements.length ? movements : handlers.stockMovements || [],
    transactions,
  });
  if (!financeRow) return null;
  const exists = arr(transactions).find((row) => clean(row.id) === clean(financeRow.id));
  if (!exists) await handlers.onCreateFinanceTransaction?.(financeRow);
  await syncFinanceSideEffects(exists || financeRow, { handlers });
  await appendStockTraceStep({
    stock,
    eventType: 'perte_stock',
    titre: 'Perte stock',
    details: `${stockProductName(stock)} · ${num(qty)} ${stock.unite || ''}`,
    montant: financeRow.montant,
    date,
    handlers,
  });
  return financeRow;
}
