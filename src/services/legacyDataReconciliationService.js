import {
  buildDocumentFromInvoice,
  buildFinanceFromPayment,
  buildOpportunityClosedPatch,
  buildStructuredFarmImpact,
  documentExistsForInvoice,
  financeExistsForPayment,
  findOrderForOpportunity,
  findOrderForPayment,
  isOpportunityClosed,
} from './erpInterconnectionRules';
import { syncBusinessChargesToFinance } from './businessChargeSyncService.js';
import { syncSupplierDebtsToFinance } from './supplierDebtSyncService.js';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim().toLowerCase();
const raw = (value = '') => String(value || '').trim();
const now = () => new Date().toISOString();
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.montant_paye ?? 0) || 0;

function linkedIds(row = {}) {
  return [
    row.sale_order_id,
    row.commande_id,
    row.vente_id,
    row.linked_sale_id,
    row.last_sale_id,
    row.order_id,
    row.sale_id,
  ].map(raw).filter(Boolean);
}

function orderLinkedToAnimal(order = {}, animal = {}) {
  const ids = linkedIds(animal);
  const animalId = raw(animal.id);
  const tag = raw(animal.tag || animal.numero || animal.identifiant);
  const orderId = raw(order.id);
  const sourceId = raw(order.source_id || order.product_id || order.entity_id || order.related_id || order.animal_id || order.asset_id);
  const text = clean(`${order.source_type || ''} ${order.product_name || ''} ${order.libelle || ''} ${order.notes || ''}`);
  return ids.includes(orderId)
    || (animalId && sourceId === animalId)
    || (tag && sourceId === tag)
    || (animalId && text.includes(clean(animalId)))
    || (tag && text.includes(clean(tag)));
}

function animalSalePatch(animal = {}, order = {}, payments = [], finances = []) {
  const orderId = raw(order.id);
  const payment = arr(payments).find((p) => raw(p.order_id || p.sale_id || p.source_record_id || p.related_id) === orderId) || {};
  const trx = arr(finances).find((f) => raw(f.order_id || f.sale_id || f.related_id || f.source_record_id) === orderId || (payment.id && raw(f.payment_id || f.source_payment_id) === raw(payment.id))) || {};
  const saleAmount = amount(order) || amount(payment) || amount(trx);
  return {
    sale_order_id: orderId,
    commande_id: orderId,
    vente_id: orderId,
    linked_sale_id: orderId,
    last_sale_id: orderId,
    linked_payment_id: payment.id || animal.linked_payment_id || '',
    linked_transaction_id: trx.id || animal.linked_transaction_id || '',
    status: 'vendu',
    statut: 'vendu',
    locked: true,
    verrouille: true,
    locked_reason: 'Animal vendu lié à une commande commerciale existante',
    locked_at: animal.locked_at || now(),
    prix_vente: animal.prix_vente || animal.sale_price || saleAmount,
    prix_vente_reel: animal.prix_vente_reel || saleAmount,
    sale_price: animal.sale_price || saleAmount,
    sold_at: animal.sold_at || order.date || order.date_commande || new Date().toISOString().slice(0, 10),
    date_vente: animal.date_vente || order.date || order.date_commande || new Date().toISOString().slice(0, 10),
    updated_from_legacy_reconciliation_at: now(),
  };
}

export async function reconcileLegacyData({ data = {}, actions = {} } = {}) {
  const summary = {
    payments_finance_created: 0,
    invoices_documents_created: 0,
    opportunities_closed: 0,
    sold_animals_linked: 0,
    health_impacts_structured: 0,
    business_charges_synced: 0,
    supplier_debts_synced: 0,
    skipped: 0,
    errors: [],
  };

  const orders = arr(data.sales_orders);
  const payments = arr(data.payments);
  const finances = arr(data.finances);
  const invoices = arr(data.invoices);
  const documents = arr(data.documents);
  const opportunities = arr(data.sales_opportunities);
  const animals = arr(data.animaux);
  const healthRows = arr(data.sante);

  for (const payment of payments) {
    const order = findOrderForPayment(payment, orders);
    if (amount(payment) > 0 && !financeExistsForPayment(payment, order, finances)) {
      try {
        if (actions.onCreateFinanceTransaction) {
          await actions.onCreateFinanceTransaction(buildFinanceFromPayment(payment, order));
          summary.payments_finance_created += 1;
        } else summary.skipped += 1;
      } catch (error) {
        summary.errors.push(`finance payment ${payment.id}: ${error.message}`);
      }
    }
  }

  for (const invoice of invoices) {
    const order = orders.find((row) => raw(row.id) === raw(invoice.order_id || invoice.sale_id || invoice.related_id)) || {};
    if (!documentExistsForInvoice(invoice, documents)) {
      try {
        if (actions.onCreateDocument) {
          await actions.onCreateDocument(buildDocumentFromInvoice(invoice, order));
          summary.invoices_documents_created += 1;
        } else summary.skipped += 1;
      } catch (error) {
        summary.errors.push(`document invoice ${invoice.id}: ${error.message}`);
      }
    }
  }

  for (const opp of opportunities) {
    const order = findOrderForOpportunity(opp, orders);
    if (order && !isOpportunityClosed(opp)) {
      try {
        if (actions.onUpdateOpportunity) {
          await actions.onUpdateOpportunity(opp.id, buildOpportunityClosedPatch(opp, order));
          summary.opportunities_closed += 1;
        } else summary.skipped += 1;
      } catch (error) {
        summary.errors.push(`opportunity ${opp.id}: ${error.message}`);
      }
    }
  }

  for (const animal of animals.filter((row) => clean(row.status || row.statut) === 'vendu')) {
    if (linkedIds(animal).length) continue;
    const order = orders.find((row) => orderLinkedToAnimal(row, animal));
    if (!order?.id) continue;
    try {
      if (actions.onUpdateAnimal) {
        await actions.onUpdateAnimal(animal.id, animalSalePatch(animal, order, payments, finances));
        summary.sold_animals_linked += 1;
      } else summary.skipped += 1;
    } catch (error) {
      summary.errors.push(`animal ${animal.id}: ${error.message}`);
    }
  }

  for (const row of healthRows.filter((item) => amount(item) > 0 && !item.impact_structured)) {
    try {
      if (actions.onUpdateHealth) {
        await actions.onUpdateHealth(row.id, buildStructuredFarmImpact(row));
        summary.health_impacts_structured += 1;
      } else summary.skipped += 1;
    } catch (error) {
      summary.errors.push(`health impact ${row.id}: ${error.message}`);
    }
  }

  try {
    const chargeSync = await syncBusinessChargesToFinance({
      data,
      handlers: {
        onCreateFinanceTransaction: actions.onCreateFinanceTransaction,
        onRefreshFinances: actions.onRefreshFinances,
      },
    });
    summary.business_charges_synced = chargeSync.created || 0;
  } catch (error) {
    summary.errors.push(`business charges: ${error.message}`);
  }

  try {
    const supplierSync = await syncSupplierDebtsToFinance({
      data,
      handlers: {
        onCreateFinanceTransaction: actions.onCreateFinanceTransaction,
        onRefreshFinances: actions.onRefreshFinances,
      },
    });
    summary.supplier_debts_synced = supplierSync.created || 0;
  } catch (error) {
    summary.errors.push(`supplier debts: ${error.message}`);
  }

  return summary;
}
