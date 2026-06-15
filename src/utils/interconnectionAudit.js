import { getInterconnectionFlow, summarizeMatrixCoverage } from './interconnectionMatrix';

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
const isCompletedTask = (row = {}) => ['termine', 'terminé', 'done', 'closed', 'clos'].includes(lower(row.status || row.statut));
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
  if (module.includes('sensor') || module.includes('capteur')) return sets.sensor_devices.has(id);
  if (module.includes('camera')) return sets.camera_devices.has(id);
  return Object.values(sets).some((set) => set.has(id));
}

function pushIssue(issues, issue) {
  const nextIssue = { severity: 'warning', ...issue };
  issues.push({ ...nextIssue, flow: nextIssue.flow || getInterconnectionFlow(nextIssue) });
}

function auditSalesWorkflow(dataMap, issues) {
  const orders = arr(dataMap.sales_orders);
  const payments = arr(dataMap.payments).filter((payment) => !isCancelled(payment));
  const invoices = arr(dataMap.invoices).filter((invoice) => !isCancelled(invoice));
  const transactions = arr(dataMap.finances);
  const clientsById = new Set(arr(dataMap.clients).filter((client) => client?.id).map((client) => String(client.id)));
  const ordersById = new Map(orders.filter((order) => order?.id).map((order) => [String(order.id), order]));

  payments.forEach((payment) => {
    const orderId = saleIdOf(payment);
    if (!orderId) { pushIssue(issues, { severity: 'critical', module: 'payments', row_id: payment.id, flow: 'sales_finance', message: 'Un paiement n’est lié à aucune vente.' }); return; }
    if (!ordersById.has(orderId)) { pushIssue(issues, { severity: 'critical', module: 'payments', row_id: payment.id, linked_id: orderId, flow: 'sales_finance', message: 'Un paiement est lié à une vente qui n’existe plus.' }); return; }
    const amount = paymentAmount(payment);
    const hasFinance = transactions.some((trx) => isFinanceSaleCash(trx) && ((payment.id && financePaymentId(trx) === clean(payment.id)) || (financeSaleId(trx) === orderId && Math.abs(financeAmount(trx) - amount) < 1)));
    if (!hasFinance && amount > 0) pushIssue(issues, { severity: 'critical', module: 'payments', row_id: payment.id, linked_id: orderId, flow: 'sales_finance', message: 'Un encaissement de vente n’apparaît pas encore dans les finances.' });
  });

  invoices.forEach((invoice) => {
    const orderId = saleIdOf(invoice);
    if (!orderId) { pushIssue(issues, { module: 'invoices', row_id: invoice.id, flow: 'sales_finance', message: 'Une facture n’est liée à aucune vente.' }); return; }
    if (!ordersById.has(orderId)) pushIssue(issues, { severity: 'critical', module: 'invoices', row_id: invoice.id, linked_id: orderId, flow: 'sales_finance', message: 'Une facture est liée à une vente qui n’existe plus.' });
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
    const clientId = clean(order.client_id || order.customer_id);
    if (clientId && !clientsById.has(clientId)) pushIssue(issues, { severity: 'critical', module: 'sales_orders', row_id: order.id, linked_id: clientId, flow: 'sales_finance', message: 'Une vente est liée à un client qui n’existe plus.' });
    if (total > 0 && paid > total + 1) pushIssue(issues, { severity: 'critical', module: 'sales_orders', row_id: order.id, flow: 'sales_finance', message: 'Une vente semble avoir reçu plus d’argent que son montant total.' });
    if (total > 0 && storedRemaining > 0 && Math.abs(storedRemaining - expectedRemaining) > 1) pushIssue(issues, { module: 'sales_orders', row_id: order.id, flow: 'sales_finance', message: 'Le reste à payer d’une vente ne correspond pas aux paiements enregistrés.' });
    if (expectedRemaining <= 0 && ['non_paye', 'non payé', 'partiel'].includes(paymentStatus)) pushIssue(issues, { module: 'sales_orders', row_id: order.id, flow: 'sales_finance', message: 'Une vente est soldée mais encore affichée comme non payée ou partielle.' });
    if (expectedRemaining > 0 && paymentStatus === 'paye') pushIssue(issues, { severity: 'critical', module: 'sales_orders', row_id: order.id, flow: 'sales_finance', message: 'Une vente est marquée payée alors qu’il reste un montant à encaisser.' });
    if (invoiceStatus === 'emise' && !hasInvoice) pushIssue(issues, { module: 'sales_orders', row_id: order.id, flow: 'sales_finance', message: 'Une vente est marquée facturée mais la facture n’est pas visible.' });
  });
}

function auditOpportunities(dataMap, issues) {
  const openSourceIds = new Set(arr(dataMap.sales_opportunities).filter((opp) => !['convertie', 'converti', 'vendue', 'vendu', 'fermee', 'fermée', 'annulee', 'annulée'].includes(lower(opp.status || opp.statut))).map((opp) => clean(opp.source_id || opp.related_id || opp.entity_id)).filter(Boolean));
  arr(dataMap.sales_orders).forEach((order) => { const sourceId = clean(order.source_id || order.product_id || order.entity_id || order.related_id); if (sourceId && openSourceIds.has(sourceId)) pushIssue(issues, { module: 'sales_opportunities', row_id: sourceId, linked_id: order.id, flow: 'sales_stock_sources', message: 'Une opportunité déjà vendue est encore ouverte.' }); });
}

function auditHealthAndStock(dataMap, issues) {
  const stockById = new Map(arr(dataMap.stock).filter((stock) => stock?.id).map((stock) => [String(stock.id), stock]));
  arr(dataMap.sante).forEach((row) => {
    const stockId = clean(row.stock_id || row.produit_stock_id || row.product_stock_id || row.source_stock_id);
    const source = lower(row.source_produit || row.product_source || row.source_stock || row.source);
    const qty = toNumber(row.quantite_utilisee ?? row.quantity_used ?? row.quantite ?? row.qty);
    if ((source.includes('stock') || stockId) && !stockId) pushIssue(issues, { module: 'sante', row_id: row.id, flow: 'health_stock_finance', message: 'Un soin utilise un produit du stock, mais le produit n’est pas précisé.' });
    if (stockId && !stockById.has(stockId)) pushIssue(issues, { severity: 'critical', module: 'sante', row_id: row.id, linked_id: stockId, flow: 'health_stock_finance', message: 'Un soin est lié à un produit de stock qui n’existe plus.' });
    if (stockId && stockById.has(stockId) && qty > toNumber(stockById.get(stockId).quantite ?? stockById.get(stockId).quantity)) pushIssue(issues, { severity: 'critical', module: 'sante', row_id: row.id, linked_id: stockId, flow: 'health_stock_finance', message: 'La quantité utilisée pour un soin dépasse le stock disponible.' });
  });
}

function auditStockSupply(dataMap, issues) {
  const tasks = arr(dataMap.taches);
  const alerts = arr(dataMap.alertes_center);
  arr(dataMap.stock).forEach((stock) => {
    const qty = toNumber(stock.quantite || stock.quantity);
    const threshold = toNumber(stock.seuil || stock.threshold);
    if (threshold > 0 && qty <= threshold) {
      const stockId = clean(stock.id);
      const hasAction = [...tasks, ...alerts].some((row) => clean(row.entity_id || row.related_id || row.stock_id || row.cible_id) === stockId || lower(`${row.title || ''} ${row.message || ''}`).includes(lower(stock.produit || stock.nom || stockId)));
      if (!hasAction) pushIssue(issues, { module: 'stock', row_id: stock.id, flow: 'stock_supply_finance', message: 'Un produit est sous le seuil, mais aucune action n’est encore prévue.' });
    }
  });
}

function auditAlertsTasks(dataMap, issues) {
  const tasks = arr(dataMap.taches);
  arr(dataMap.alertes_center).forEach((alert) => {
    const severity = lower(alert.severity || alert.gravite);
    if (['critique', 'urgence'].includes(severity)) {
      const alertId = clean(alert.id);
      const target = clean(alert.entity_id || alert.related_id || alert.cible_id);
      const hasTask = tasks.some((task) => clean(task.alert_id || task.related_id || task.entity_id) === alertId || (target && clean(task.entity_id || task.related_id || task.cible_id) === target));
      if (!hasTask && !lower(alert.status || alert.statut).includes('traitee')) pushIssue(issues, { module: 'alertes_center', row_id: alert.id, linked_id: target, flow: 'alerts_tasks_actions', message: 'Une alerte urgente n’a pas encore d’action associée.' });
    }
  });
}

function auditDocuments(dataMap, issues) {
  const knownIds = new Set([...arr(dataMap.animaux).map((row) => clean(row.id)), ...arr(dataMap.avicole).map((row) => clean(row.id)), ...arr(dataMap.cultures).map((row) => clean(row.id)), ...arr(dataMap.clients).map((row) => clean(row.id)), ...arr(dataMap.fournisseurs).map((row) => clean(row.id)), ...arr(dataMap.finances).map((row) => clean(row.id)), ...arr(dataMap.sales_orders).map((row) => clean(row.id))].filter(Boolean));
  arr(dataMap.documents).forEach((document) => { const target = clean(document.entity_id || document.related_id || document.target_id || document.order_id || document.transaction_id); if (target && !knownIds.has(target)) pushIssue(issues, { module: 'documents', row_id: document.id, linked_id: target, flow: 'documents_traceability', message: 'Un document est lié à un élément qui n’existe plus.' }); });
}

function auditIoTTelemetry(dataMap, issues) {
  const sensorIds = idSet(dataMap.sensor_devices);
  const cameraIds = idSet(dataMap.camera_devices);
  arr(dataMap.smartfarm_events).forEach((event) => {
    const deviceId = clean(event.device_id);
    if (!deviceId) {
      pushIssue(issues, {
        module: 'smartfarm_events',
        row_id: event.id,
        flow: 'smartfarm_alerts_tasks',
        scenario: 'orphan_telemetry',
        message: 'Un événement IoT n’est lié à aucun objet connecté.',
      });
      return;
    }
    if (!sensorIds.has(deviceId) && !cameraIds.has(deviceId)) {
      pushIssue(issues, {
        severity: 'critical',
        module: 'smartfarm_events',
        row_id: event.id,
        linked_id: deviceId,
        flow: 'smartfarm_alerts_tasks',
        scenario: 'orphan_telemetry',
        message: 'Un événement IoT référence un capteur ou caméra introuvable.',
      });
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
    sensor_devices: idSet(dataMap.sensor_devices),
    camera_devices: idSet(dataMap.camera_devices),
  };
  const issues = [];
  const checkRows = (moduleKey, rows) => { arr(rows).forEach((row) => { const id = linkId(row); const module = moduleOf(row); if (!id) return; if (!existsInKnownTargets(id, module, sets)) pushIssue(issues, { module: moduleKey, row_id: row.id, linked_id: id, linked_module: module || 'inconnu', message: 'Un élément est lié à une donnée qui n’existe plus.' }); }); };
  checkRows('sante', dataMap.sante); checkRows('alertes_center', dataMap.alertes_center); checkRows('taches', dataMap.taches); checkRows('documents', dataMap.documents); checkRows('business_events', dataMap.business_events); checkRows('alimentation_logs', dataMap.alimentation_logs); checkRows('production_oeufs_logs', dataMap.production_oeufs_logs); checkRows('sales_orders', dataMap.sales_orders); checkRows('payments', dataMap.payments); checkRows('invoices', dataMap.invoices);
  const duplicatePayments = new Map();
  arr(dataMap.payments).filter((payment) => !isCancelled(payment)).forEach((payment) => { const key = `${saleIdOf(payment)}:${paymentAmount(payment)}:${clean(payment.date_paiement || payment.date)}`; duplicatePayments.set(key, (duplicatePayments.get(key) || 0) + 1); });
  duplicatePayments.forEach((count, key) => { if (count > 1) pushIssue(issues, { severity: 'critical', module: 'payments', row_id: key, flow: 'sales_finance', message: `Un paiement semble être enregistré plusieurs fois (${count} fois).` }); });
  auditSalesWorkflow(dataMap, issues); auditOpportunities(dataMap, issues); auditHealthAndStock(dataMap, issues); auditStockSupply(dataMap, issues); auditAlertsTasks(dataMap, issues); auditDocuments(dataMap, issues); auditIoTTelemetry(dataMap, issues);
  const flows = summarizeMatrixCoverage(dataMap, issues);
  return { ok: issues.length === 0, issues, flows, issueCount: issues.length, criticalCount: issues.filter((issue) => issue.severity === 'critical').length, warningCount: issues.filter((issue) => issue.severity !== 'critical').length };
}

export function summarizeInterconnectionAudit(dataMap = {}) {
  const audit = auditErpInterconnections(dataMap);
  if (audit.ok) return 'Tout semble cohérent pour le moment.';
  return `${audit.issueCount} point(s) à vérifier, dont ${audit.criticalCount} urgent(s).`;
}
