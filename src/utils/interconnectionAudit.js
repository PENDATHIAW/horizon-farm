const arr = (value) => Array.isArray(value) ? value : [];
const idSet = (rows = []) => new Set(arr(rows).filter((row) => row?.id).map((row) => String(row.id)));
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();
const toNumber = (value) => Number(value || 0) || 0;

const linkId = (row = {}) => clean(row.related_id || row.entity_id || row.target_id || row.cible_id || row.animal_id || row.lot_id || row.stock_id || row.order_id || row.invoice_id || row.payment_id || row.module_record_id);
const moduleOf = (row = {}) => lower(row.module_lie || row.module_source || row.entity_type || row.target_type || row.source_module);
const saleIdOf = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const orderTotal = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant);
const isCancelled = (row = {}) => ['annule', 'annulé', 'annulee', 'cancelled', 'rejete', 'rejeté'].includes(lower(row.statut || row.status));
const financePaymentId = (row = {}) => clean(row.payment_id || row.paiement_id || row.source_payment_id);
const financeSaleId = (row = {}) => clean(row.related_id || row.source_record_id || row.order_id || row.sale_id || row.commande_id);
const financeAmount = (row = {}) => toNumber(row.montant ?? row.amount);
const isFinanceSaleCash = (row = {}) => {
  const text = lower(`${row.type || ''} ${row.module_lie || ''} ${row.source_module || ''} ${row.libelle || ''} ${row.categorie || ''}`);
  return text.includes('entree') || text.includes('entrée') || text.includes('vente') || text.includes('encaissement');
};

function existsInKnownTargets(id, module, sets) {
  if (!id) return true;
  if (module.includes('animal')) return sets.animaux.has(id);
  if (module.includes('avicole') || module.includes('lot')) return sets.avicole.has(id);
  if (module.includes('stock')) return sets.stock.has(id);
  if (module.includes('culture')) return sets.cultures.has(id);
  if (module.includes('vente') || module.includes('sales') || module.includes('commande')) return sets.sales_orders.has(id);
  if (module.includes('finance') || module.includes('compta')) return sets.finances.has(id);
  if (module.includes('alerte')) return sets.alertes_center.has(id);
  if (module.includes('tache')) return sets.taches.has(id);
  if (module.includes('sante') || module.includes('santé')) return sets.sante.has(id);
  if (module.includes('document')) return sets.documents.has(id);
  return Object.values(sets).some((set) => set.has(id));
}

function pushIssue(issues, issue) {
  issues.push({ severity: 'warning', ...issue });
}

function auditSalesWorkflow(dataMap, issues) {
  const orders = arr(dataMap.sales_orders);
  const payments = arr(dataMap.payments).filter((payment) => !isCancelled(payment));
  const invoices = arr(dataMap.invoices).filter((invoice) => !isCancelled(invoice));
  const transactions = arr(dataMap.finances);
  const ordersById = new Map(orders.filter((order) => order?.id).map((order) => [String(order.id), order]));

  payments.forEach((payment) => {
    const orderId = saleIdOf(payment);
    if (!orderId) {
      pushIssue(issues, { severity: 'critical', module: 'payments', row_id: payment.id, message: 'Paiement sans commande liée.' });
      return;
    }
    if (!ordersById.has(orderId)) {
      pushIssue(issues, { severity: 'critical', module: 'payments', row_id: payment.id, linked_id: orderId, message: `Paiement lié à une commande introuvable (${orderId}).` });
      return;
    }
    const amount = paymentAmount(payment);
    const hasFinance = transactions.some((trx) => isFinanceSaleCash(trx) && ((payment.id && financePaymentId(trx) === clean(payment.id)) || (financeSaleId(trx) === orderId && Math.abs(financeAmount(trx) - amount) < 1)));
    if (!hasFinance && amount > 0) {
      pushIssue(issues, { severity: 'critical', module: 'payments', row_id: payment.id, linked_id: orderId, message: `Paiement ${payment.id || ''} sans transaction Finance correspondante.` });
    }
  });

  invoices.forEach((invoice) => {
    const orderId = saleIdOf(invoice);
    if (!orderId) {
      pushIssue(issues, { module: 'invoices', row_id: invoice.id, message: 'Facture sans commande liée.' });
      return;
    }
    if (!ordersById.has(orderId)) {
      pushIssue(issues, { severity: 'critical', module: 'invoices', row_id: invoice.id, linked_id: orderId, message: `Facture liée à une commande introuvable (${orderId}).` });
    }
  });

  orders.forEach((order) => {
    const orderId = clean(order.id);
    const total = orderTotal(order);
    const paid = payments.filter((payment) => saleIdOf(payment) === orderId).reduce((sum, payment) => sum + paymentAmount(payment), 0);
    const storedPaid = toNumber(order.montant_paye ?? order.paid_amount ?? order.amount_paid);
    const storedRemaining = toNumber(order.reste_a_payer ?? order.remaining_amount ?? order.amount_due);
    const expectedRemaining = Math.max(0, total - Math.max(paid, storedPaid));
    const paymentStatus = lower(order.statut_paiement || order.payment_status);
    const invoiceStatus = lower(order.statut_facture || order.invoice_status);
    const hasInvoice = invoices.some((invoice) => saleIdOf(invoice) === orderId);

    if (total > 0 && paid > total + 1) {
      pushIssue(issues, { severity: 'critical', module: 'sales_orders', row_id: order.id, message: `Commande surpayée : payé ${paid}, total ${total}.` });
    }
    if (total > 0 && storedRemaining > 0 && Math.abs(storedRemaining - expectedRemaining) > 1) {
      pushIssue(issues, { module: 'sales_orders', row_id: order.id, message: `Reste à payer incohérent : enregistré ${storedRemaining}, attendu ${expectedRemaining}.` });
    }
    if (expectedRemaining <= 0 && ['non_paye', 'non payé', 'partiel'].includes(paymentStatus)) {
      pushIssue(issues, { module: 'sales_orders', row_id: order.id, message: 'Commande soldée mais statut paiement non soldé.' });
    }
    if (expectedRemaining > 0 && paymentStatus === 'paye') {
      pushIssue(issues, { severity: 'critical', module: 'sales_orders', row_id: order.id, message: 'Commande marquée payée alors qu’un reste à payer existe.' });
    }
    if (invoiceStatus === 'emise' && !hasInvoice) {
      pushIssue(issues, { module: 'sales_orders', row_id: order.id, message: 'Commande marquée facturée mais aucune facture liée détectée.' });
    }
  });
}

function auditOpportunities(dataMap, issues) {
  const openSourceIds = new Set(arr(dataMap.sales_opportunities)
    .filter((opp) => !['convertie', 'converti', 'vendue', 'vendu', 'fermee', 'fermée', 'annulee', 'annulée'].includes(lower(opp.status || opp.statut)))
    .map((opp) => clean(opp.source_id || opp.related_id || opp.entity_id))
    .filter(Boolean));

  arr(dataMap.sales_orders).forEach((order) => {
    const sourceId = clean(order.source_id || order.product_id || order.entity_id || order.related_id);
    if (sourceId && openSourceIds.has(sourceId)) {
      pushIssue(issues, { module: 'sales_opportunities', row_id: sourceId, linked_id: order.id, message: `Source ${sourceId} déjà en commande mais opportunité encore ouverte.` });
    }
  });
}

function auditHealthAndStock(dataMap, issues) {
  const stockById = new Map(arr(dataMap.stock).filter((stock) => stock?.id).map((stock) => [String(stock.id), stock]));
  arr(dataMap.sante).forEach((row) => {
    const stockId = clean(row.stock_id || row.produit_stock_id || row.product_stock_id || row.source_stock_id);
    const source = lower(row.source_produit || row.product_source || row.source_stock || row.source);
    const qty = toNumber(row.quantite_utilisee ?? row.quantity_used ?? row.quantite ?? row.qty);
    if ((source.includes('stock') || stockId) && !stockId) {
      pushIssue(issues, { module: 'sante', row_id: row.id, message: 'Soin indiqué avec stock interne mais sans stock_id.' });
    }
    if (stockId && !stockById.has(stockId)) {
      pushIssue(issues, { severity: 'critical', module: 'sante', row_id: row.id, linked_id: stockId, message: `Soin lié à un stock introuvable (${stockId}).` });
    }
    if (stockId && stockById.has(stockId) && qty > toNumber(stockById.get(stockId).quantite ?? stockById.get(stockId).quantity)) {
      pushIssue(issues, { severity: 'critical', module: 'sante', row_id: row.id, linked_id: stockId, message: 'Quantité santé utilisée supérieure au stock disponible.' });
    }
  });
}

export function auditErpInterconnections(dataMap = {}) {
  const sets = {
    animaux: idSet(dataMap.animaux),
    avicole: idSet(dataMap.avicole),
    stock: idSet(dataMap.stock),
    cultures: idSet(dataMap.cultures),
    sales_orders: idSet(dataMap.sales_orders),
    finances: idSet(dataMap.finances),
    alertes_center: idSet(dataMap.alertes_center),
    taches: idSet(dataMap.taches),
    sante: idSet(dataMap.sante),
    documents: idSet(dataMap.documents),
  };

  const issues = [];
  const checkRows = (moduleKey, rows) => {
    arr(rows).forEach((row) => {
      const id = linkId(row);
      const module = moduleOf(row);
      if (!id) return;
      if (!existsInKnownTargets(id, module, sets)) {
        pushIssue(issues, {
          module: moduleKey,
          row_id: row.id,
          linked_id: id,
          linked_module: module || 'inconnu',
          message: `${moduleKey} contient une référence vers ${id}, mais la cible active n'existe plus.`,
        });
      }
    });
  };

  checkRows('sante', dataMap.sante);
  checkRows('alertes_center', dataMap.alertes_center);
  checkRows('taches', dataMap.taches);
  checkRows('documents', dataMap.documents);
  checkRows('business_events', dataMap.business_events);
  checkRows('alimentation_logs', dataMap.alimentation_logs);
  checkRows('production_oeufs_logs', dataMap.production_oeufs_logs);
  checkRows('sales_orders', dataMap.sales_orders);
  checkRows('payments', dataMap.payments);
  checkRows('invoices', dataMap.invoices);

  const duplicatePayments = new Map();
  arr(dataMap.payments).filter((payment) => !isCancelled(payment)).forEach((payment) => {
    const key = `${saleIdOf(payment)}:${paymentAmount(payment)}:${clean(payment.date_paiement || payment.date)}`;
    duplicatePayments.set(key, (duplicatePayments.get(key) || 0) + 1);
  });
  duplicatePayments.forEach((count, key) => {
    if (count > 1) pushIssue(issues, { severity: 'critical', module: 'payments', row_id: key, message: `Paiement potentiellement doublonné (${count} fois).` });
  });

  auditSalesWorkflow(dataMap, issues);
  auditOpportunities(dataMap, issues);
  auditHealthAndStock(dataMap, issues);

  return {
    ok: issues.length === 0,
    issues,
    issueCount: issues.length,
    criticalCount: issues.filter((issue) => issue.severity === 'critical').length,
    warningCount: issues.filter((issue) => issue.severity !== 'critical').length,
  };
}

export function summarizeInterconnectionAudit(dataMap = {}) {
  const audit = auditErpInterconnections(dataMap);
  if (audit.ok) return 'Interconnexions cohérentes : aucune référence orpheline ou incohérence métier détectée.';
  return `${audit.issueCount} point(s) à vérifier : ${audit.criticalCount} critique(s), ${audit.warningCount} avertissement(s).`;
}
