const arr = (value) => (Array.isArray(value) ? value : []);
const clean = (value = '') => String(value || '').trim();

function orderIdOf(row = {}) {
  return clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
}

function invoiceIdOf(row = {}) {
  return clean(row.invoice_id || row.facture_id);
}

/** Supprime une vente et ses pièces liées (paiements, factures, livraisons, docs, écritures). */
export async function deleteSaleComplete(order = {}, handlers = {}) {
  const orderId = clean(order.id || order);
  if (!orderId) throw new Error('Vente introuvable');

  const payments = arr(handlers.payments).filter((row) => orderIdOf(row) === orderId);
  const invoices = arr(handlers.invoices).filter((row) => orderIdOf(row) === orderId || invoiceIdOf(order) && clean(row.id) === invoiceIdOf(order));
  const deliveries = arr(handlers.deliveries).filter((row) => orderIdOf(row) === orderId);
  const invoiceIds = new Set(invoices.map((row) => clean(row.id)).filter(Boolean));
  if (invoiceIdOf(order)) invoiceIds.add(invoiceIdOf(order));

  const documents = arr(handlers.documents).filter((row) => {
    const entityId = clean(row.entity_id || row.related_id || row.source_record_id);
    if (entityId === orderId) return true;
    const docInvoice = clean(row.invoice_id);
    return docInvoice && invoiceIds.has(docInvoice);
  });

  const transactions = arr(handlers.transactions).filter((row) => {
    const linked = clean(row.related_id || row.source_record_id || row.vente_id || row.order_id || row.sale_id);
    return linked === orderId || payments.some((payment) => clean(payment.id) === clean(row.payment_id || row.paiement_id));
  });

  await Promise.allSettled(payments.map((row) => handlers.onDeletePayment?.(row.id)));
  await Promise.allSettled(deliveries.map((row) => handlers.onDeleteDelivery?.(row.id)));
  await Promise.allSettled(documents.map((row) => handlers.onDeleteDocument?.(row.id)));
  await Promise.allSettled(transactions.map((row) => handlers.onDeleteFinanceTransaction?.(row.id)));
  await Promise.allSettled([...invoiceIds].map((id) => handlers.onDeleteInvoice?.(id)));
  await handlers.onDeleteOrder?.(orderId);

  await Promise.allSettled([
    handlers.onRefresh?.(),
    handlers.onRefreshPayments?.(),
    handlers.onRefreshInvoices?.(),
    handlers.onRefreshDeliveries?.(),
    handlers.onRefreshFinances?.(),
    handlers.onRefreshDocuments?.(),
  ]);

  return {
    orderId,
    removed: {
      payments: payments.length,
      invoices: invoiceIds.size,
      deliveries: deliveries.length,
      documents: documents.length,
      transactions: transactions.length,
    },
  };
}
