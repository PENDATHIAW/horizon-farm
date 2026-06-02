import {
  buildDocumentFromInvoice,
  buildFinanceFromPayment,
  buildInterconnectionAudit,
  buildOpportunityClosedPatch,
  buildStructuredFarmImpact,
  findOrderForOpportunity,
  isOpportunityClosed,
} from './erpInterconnectionRules.js';
import { syncFinanceTransactionToAccounting, linkDocumentToAccounting } from './accountingSyncService';
import { financeIds } from '../utils/sideEffectIds';
import { remainingForOrder } from '../utils/salesStatuses';
import { makeId } from '../utils/ids';
import { makeInterconnectionEvent } from '../utils/moduleInterconnections';

const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export async function closeOpportunityForOrder(order = {}, opportunities = [], handlers = {}) {
  if (!order?.id || !handlers.onUpdateOpportunity) return null;
  const linked = arr(opportunities).find((opp) => {
    if (isOpportunityClosed(opp)) return false;
    if (order.opportunity_id && clean(opp.id) === clean(order.opportunity_id)) return true;
    if (order.converted_opportunity_id && clean(opp.id) === clean(order.converted_opportunity_id)) return true;
    return Boolean(findOrderForOpportunity(opp, [order]));
  });
  if (!linked?.id) return null;
  await handlers.onUpdateOpportunity(linked.id, buildOpportunityClosedPatch(linked, order));
  return linked;
}

export async function syncSaleTraceFromOrder(order = {}, { clientLabel = 'Client', handlers = {}, existingTraces = [] } = {}) {
  if (!order?.id) return null;
  const sourceId = order.source_id;
  const sourceType = order.source_type;
  if (!sourceId || sourceType === 'autre') return null;

  const traceId = sourceType === 'animal'
    ? `TRA-${sourceId}`
    : sourceType === 'lot_avicole'
      ? `TRA-LOT-${sourceId}`
      : `TRA-${sourceType}-${sourceId}`;

  const step = {
    date: order.date || today(),
    titre: 'Vente commercialisée',
    event_type: 'vente',
    module_source: 'ventes',
    order_id: order.id,
    client: clientLabel,
    montant: order.montant_total,
    details: `${order.product_name || 'Produit'} · ${Number(order.montant_total || 0).toLocaleString('fr-FR')} FCFA → ${clientLabel}`,
  };

  const existing = arr(existingTraces).find((row) => clean(row.id) === traceId);
  if (existing?.id && handlers.onUpdateTrace) {
    const etapes = arr(existing.etapes);
    const duplicate = etapes.some((item) => item.order_id === order.id && item.event_type === 'vente');
    if (!duplicate) {
      await handlers.onUpdateTrace(existing.id, { etapes: [...etapes, step], last_sale_id: order.id });
    }
    return { traceId, updated: true };
  }

  if (!handlers.onCreateTrace) return null;
  await handlers.onCreateTrace({
    id: traceId,
    animal: order.product_name || sourceId,
    type: sourceType,
    lot_id: sourceType === 'lot_avicole' ? sourceId : undefined,
    source_id: sourceId,
    source_module: sourceType,
    etapes: [step],
    last_sale_id: order.id,
    margeFinale: 0,
    roi: 0,
  });
  return { traceId, step };
}

export async function resolveSaleTasksOnPayment({ sale = {}, payments = [], tasks = [], handlers = {} } = {}) {
  const remaining = remainingForOrder(sale, payments);
  if (remaining > 0 || !handlers.onUpdateTask) return null;
  const related = arr(tasks).filter((task) => clean(task.related_id || task.source_record_id || task.entity_id) === clean(sale.id));
  await Promise.allSettled(related.map((task) => handlers.onUpdateTask(task.id, {
    status: 'termine',
    statut: 'termine',
    completed_at: new Date().toISOString(),
  })));
  return related.length;
}

export async function syncFinanceSideEffects(transaction = {}, { document = null, handlers = {} } = {}) {
  if (!transaction?.id) return null;
  const accounting = await syncFinanceTransactionToAccounting(transaction, handlers);
  if (document?.id && transaction.accounting_entry_id) {
    await linkDocumentToAccounting(document, { ...transaction, accounting_entry_id: accounting?.entryId || transaction.accounting_entry_id }, handlers);
  }
  return accounting;
}

/** Répare toutes les interconnexions manquantes détectées par l'audit ERP. */
export async function runErpInterconnectionRepair({
  orders = [],
  payments = [],
  finances = [],
  invoices = [],
  documents = [],
  opportunities = [],
  sante = [],
  stocks = [],
  fournisseurs = [],
  alimentationLogs = [],
  equipements = [],
  cultures = [],
  tasks = [],
  alertes = [],
  handlers = {},
} = {}) {
  const audit = buildInterconnectionAudit({ orders, payments, finances, invoices, documents, opportunities, sante, stocks, alimentationLogs });
  let fixed = 0;

  for (const { payment, order } of audit.paymentsWithoutFinance) {
    const payId = clean(payment.id);
    const payload = {
      ...buildFinanceFromPayment(payment, order),
      id: financeIds.paid(order.id, payId),
      side_effects_managed: true,
      created_from: 'interconnection_repair',
    };
    await handlers.onCreateFinanceTransaction?.(payload);
    await syncFinanceSideEffects(payload, { handlers });
    fixed += 1;
  }

  for (const { opp, order } of audit.opportunitiesToClose) {
    await handlers.onUpdateOpportunity?.(opp.id, buildOpportunityClosedPatch(opp, order));
    fixed += 1;
  }

  for (const { invoice, order } of audit.invoicesWithoutDocument) {
    await handlers.onCreateDocument?.(buildDocumentFromInvoice(invoice, order));
    fixed += 1;
  }

  for (const row of audit.healthWithoutStructuredImpact) {
    await handlers.onUpdateHealth?.(row.id, buildStructuredFarmImpact(row));
    fixed += 1;
  }

  const criticalStocks = arr(stocks).filter((row) => {
    const threshold = Number(row.seuil ?? row.threshold ?? 0);
    const qty = Number(row.quantite ?? row.quantity ?? row.stock ?? 0);
    return threshold > 0 && qty <= threshold;
  });
  for (const stock of criticalStocks.slice(0, 3)) {
    const key = `stock-critique-${stock.id}`;
    const exists = arr(alertes).some((row) => clean(row.alert_dedupe_key) === key);
    if (exists) continue;
    await handlers.onCreateAlert?.({
      id: makeId('ALT'),
      title: `Stock critique : ${stock.produit || stock.nom || stock.id}`,
      message: `Quantité ${stock.quantite ?? stock.quantity} — seuil ${stock.seuil ?? stock.threshold}`,
      module_source: 'stock',
      entity_type: 'stock',
      entity_id: stock.id,
      severity: 'warning',
      status: 'nouvelle',
      alert_dedupe_key: key,
      action_recommandee: 'Réapprovisionner depuis Achats & Stock',
    });
    fixed += 1;
  }

  for (const row of audit.healthWithoutFinance || []) {
    const payload = {
      id: financeIds.health(row.id),
      type: 'sortie',
      libelle: `Soin/Vaccin ${row.nom || row.id}`,
      montant: Number(row.cout || row.montant || 0),
      date: row.date || today(),
      categorie: 'Sante',
      module_lie: 'sante',
      related_id: row.id,
      source_module: 'sante',
      source_record_id: row.id,
      statut: 'paye',
      side_effects_managed: true,
      created_from: 'interconnection_repair',
      ...buildStructuredFarmImpact(row),
    };
    if (payload.montant > 0) {
      await handlers.onCreateFinanceTransaction?.(payload);
      await syncFinanceSideEffects(payload, { handlers });
      fixed += 1;
    }
  }

  for (const row of audit.feedingWithoutFinance || []) {
    const payload = {
      id: financeIds.feeding(row.id),
      type: 'sortie',
      libelle: `Alimentation ${row.stock_id || row.categorie || row.id}`,
      montant: Number(row.montant_total || 0),
      date: row.date || today(),
      categorie: 'Alimentation',
      module_lie: 'alimentation',
      related_id: row.stock_id || row.id,
      source_module: 'alimentation',
      source_record_id: row.id,
      statut: 'paye',
      side_effects_managed: true,
      created_from: 'interconnection_repair',
    };
    if (payload.montant > 0) {
      await handlers.onCreateFinanceTransaction?.(payload);
      await syncFinanceSideEffects(payload, { handlers });
      fixed += 1;
    }
  }

  if (handlers.onCreateBusinessEvent && fixed > 0) {
    await handlers.onCreateBusinessEvent?.(makeInterconnectionEvent({
      type: 'interconnection_repair',
      sourceModule: 'sync',
      targetModule: 'commercial',
      entityType: 'system',
      entityId: 'erp-interconnection',
      title: 'Interconnexions ERP réparées',
      description: `${fixed} lien(s) métier recréé(s) automatiquement`,
      amount: fixed,
    }));
  }

  return { fixed, audit };
}
