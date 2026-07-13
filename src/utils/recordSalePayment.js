import { buildClientSalesSummary } from './clientWorkflows.js';
import { makeId } from './ids.js';
import { toNumber } from './format.js';
import { buildCoherentOrderPatch, findExistingFinanceForPayment, findExistingPayment } from '../services/salesIntegrityService.js';
import { remainingForOrder } from './salesStatuses.js';
import { capSalePayment } from './salesWorkflows.js';
import { financeIds, runPaymentSideEffects } from './saleSideEffects.js';
import {
  buildCommercialFarmContext,
  enrichFinanceWithOrderFarmId,
  enrichPaymentWithFarmId,
  validateCommercialSaleFarmContext,
} from './commercialFarmScope.js';
import { createImpactJournal, finalizeImpactJournal, IMPACT_KEYS, instrumentHandlers, markImpactNa, OPERATION_EXPECTATIONS, OPERATION_TYPES } from './workflowImpactJournal.js';
import { showWorkflowImpactToast } from './workflowImpactToast.js';
import { buildIdempotencyKey, WORKFLOW_TYPES } from './workflowDedupe.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();

/** Met à jour le statut client selon créances réelles après encaissement. */
export function buildClientReceivablePatch(clientId, { clients = [], salesOrders = [], payments = [] } = {}) {
  const client = arr(clients).find((row) => String(row.id) === String(clientId));
  if (!client) return null;
  const summary = buildClientSalesSummary(client, salesOrders, payments);
  const hasDebt = summary.resteAPayer > 0;
  return {
    reste_a_payer: summary.resteAPayer,
    creance_reelle: summary.resteAPayer,
    dette: summary.resteAPayer,
    total_paye: summary.totalPaye,
    total_ventes: summary.totalAchete,
    statut: hasDebt ? 'a_relancer' : summary.totalAchete > 0 ? 'a_jour' : (client.statut || 'prospect'),
    status: hasDebt ? 'a_relancer' : summary.totalAchete > 0 ? 'a_jour' : (client.status || client.statut || 'prospect'),
    relance_requise: hasDebt,
    statut_relance: hasDebt ? 'a_relancer' : 'solde',
  };
}

/**
 * Encaisse une vente avec plafond, anti-doublon paiement/finance, statuts cohérents.
 * Retourne null si rien à encaisser ou doublon détecté.
 */
export async function recordSalePayment({
  sale = {},
  requestedAmount = 0,
  payments = [],
  transactions = [],
  clients = [],
  salesOrders = [],
  paymentMethod = 'especes',
  paymentDate = '',
  paymentId = '',
  alertes = [],
  tasks = [],
  handlers = {},
  farmScope = {},
  accessibleFarms = [],
  activeFarm = null,
} = {}) {
  const {
    onCreateFinanceTransaction,
    onUpdateFinanceTransaction,
    onUpdateOrder,
    onUpdateClient,
    onUpdateAlert,
  } = handlers;

  const remaining = remainingForOrder(sale, payments);
  const requested = toNumber(requestedAmount);

  if (remaining <= 0) {
    await onUpdateOrder?.(sale.id, buildCoherentOrderPatch(sale, payments, {}));
    return { skipped: true, reason: 'already_settled', remaining: 0, requested };
  }

  if (requested > remaining + 0.5) {
    return { skipped: true, reason: 'over_payment', remaining, requested };
  }

  const cappedAmount = capSalePayment(sale, payments, requested);
  if (cappedAmount <= 0) {
    await onUpdateOrder?.(sale.id, buildCoherentOrderPatch(sale, payments, {}));
    return { skipped: true, reason: 'already_settled', remaining, requested };
  }

  const existingPayment = findExistingPayment({
    orderId: sale.id,
    amount: cappedAmount,
    payments,
    paymentId,
    date: paymentDate,
    method: paymentMethod,
  });

  if (existingPayment) {
    const nextPayments = payments.some((row) => row.id === existingPayment.id) ? payments : [...payments, existingPayment];
    await onUpdateOrder?.(sale.id, buildCoherentOrderPatch(sale, nextPayments, {}));
    if (sale.client_id) {
      const clientPatch = buildClientReceivablePatch(sale.client_id, { clients, salesOrders, payments: nextPayments });
      if (clientPatch) await onUpdateClient?.(sale.client_id, clientPatch);
    }
    return { skipped: true, reason: 'duplicate_payment', payment: existingPayment };
  }

  const payId = paymentId || makeId('PAY');
  const date = paymentDate || new Date().toISOString().slice(0, 10);
  const farmContext = buildCommercialFarmContext(farmScope, accessibleFarms, activeFarm);

  const paymentRow = enrichPaymentWithFarmId({
    id: payId,
    order_id: sale.id,
    sale_id: sale.id,
    source_record_id: sale.id,
    client_id: sale.client_id || '',
    invoice_id: sale.invoice_id || '',
    date_paiement: date,
    date,
    montant: cappedAmount,
    montant_paye: cappedAmount,
    amount: cappedAmount,
    moyen_paiement: paymentMethod,
    mode_paiement: paymentMethod,
    statut: 'paye',
    created_from: 'record_sale_payment',
    side_effects_managed: true,
  }, {
    payment: { order_id: sale.id },
    order: sale,
    farmContext,
  });

  if (!paymentRow.farm_id && farmContext.filteringEnabled && !sale.id) {
    const check = validateCommercialSaleFarmContext(farmContext);
    if (!check.ok) {
      return { skipped: true, reason: 'requires_farm', message: check.message };
    }
  }

  const journal = createImpactJournal(OPERATION_TYPES.PAIEMENT, payId);
  const tracked = instrumentHandlers(handlers, journal);
  const idempotencyKey = buildIdempotencyKey({
    workflowType: WORKFLOW_TYPES.PAYMENT,
    sourceModule: 'ventes',
    sourceRecordId: sale.id,
    movementRef: `${payId}:${cappedAmount}:${date}:${paymentMethod}`,
  });

  const finalPaymentRow = {
    ...paymentRow,
    idempotency_key: idempotencyKey,
    issue_key: idempotencyKey,
  };

  await tracked.onCreatePayment?.(finalPaymentRow);

  const nextPayments = payments.some((row) => clean(row.id) === payId) ? payments : [...payments, finalPaymentRow];

  const existingFinance = findExistingFinanceForPayment({
    orderId: sale.id,
    paymentId: payId,
    amount: cappedAmount,
    transactions,
    date,
    method: paymentMethod,
  });

  if (!existingFinance && onCreateFinanceTransaction) {
    await tracked.onCreateFinanceTransaction(enrichFinanceWithOrderFarmId({
      id: financeIds.paid(sale.id, payId),
      type: 'entree',
      libelle: `Encaissement ${sale.id} - ${sale.client_label || sale.client_name || 'Client'}`,
      montant: cappedAmount,
      date,
      categorie: 'Vente',
      module_lie: 'ventes',
      related_id: sale.id,
      vente_id: sale.id,
      order_id: sale.id,
      client_id: sale.client_id || '',
      statut: 'paye',
      source_module: 'ventes',
      source_record_id: sale.id,
      invoice_id: sale.invoice_id || '',
      payment_id: payId,
      moyen_paiement: paymentMethod,
      transaction_origin: 'automatique',
      created_from: 'record_sale_payment',
      side_effects_managed: true,
      idempotency_key: idempotencyKey,
      issue_key: idempotencyKey,
    }, sale, paymentRow.farm_id || sale.farm_id));
  }

  await onUpdateOrder?.(sale.id, buildCoherentOrderPatch(sale, nextPayments, {}));

  try {
    await runPaymentSideEffects({
      sale,
      payments: nextPayments,
      transactions,
      clients,
      salesOrders,
      alertes,
      tasks,
      handlers: { onUpdateFinanceTransaction, onUpdateClient, onUpdateAlert, onUpdateTask: handlers.onUpdateTask },
    });
  } catch (error) {
    console.warn('Effets encaissement partiels', error?.message || error);
  }

  markImpactNa(journal, IMPACT_KEYS.DOCUMENT, 'Facture gérée par la vente');
  markImpactNa(journal, IMPACT_KEYS.STOCK_UPDATED, 'Non applicable pour un paiement');
  markImpactNa(journal, IMPACT_KEYS.STOCK_MOVEMENT, 'Non applicable pour un paiement');
  const impactJournal = finalizeImpactJournal(journal, OPERATION_EXPECTATIONS[OPERATION_TYPES.PAIEMENT]);
  if (handlers.showImpactToast !== false) showWorkflowImpactToast(impactJournal);
  return { paymentId: payId, amount: cappedAmount, remaining: Math.max(0, remaining - cappedAmount), requested, skipped: false, impactJournal };
}
