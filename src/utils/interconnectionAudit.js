const arr = (value) => Array.isArray(value) ? value : [];
const idSet = (rows = []) => new Set(arr(rows).filter((row) => row?.id).map((row) => String(row.id)));
const clean = (value) => String(value || '').trim();
const lower = (value) => clean(value).toLowerCase();

const linkId = (row = {}) => clean(row.related_id || row.entity_id || row.target_id || row.cible_id || row.animal_id || row.lot_id || row.stock_id || row.order_id || row.invoice_id || row.payment_id || row.module_record_id);
const moduleOf = (row = {}) => lower(row.module_lie || row.module_source || row.entity_type || row.target_type || row.source_module);

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
  return Object.values(sets).some((set) => set.has(id));
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
        issues.push({
          severity: 'warning',
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
  arr(dataMap.payments).forEach((payment) => {
    const key = `${clean(payment.order_id)}:${Number(payment.montant || payment.amount || 0)}:${clean(payment.date_paiement || payment.date)}`;
    duplicatePayments.set(key, (duplicatePayments.get(key) || 0) + 1);
  });
  duplicatePayments.forEach((count, key) => {
    if (count > 1) issues.push({ severity: 'critical', module: 'payments', row_id: key, message: `Paiement potentiellement doublonné (${count} fois).` });
  });

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
  if (audit.ok) return 'Interconnexions cohérentes : aucune référence orpheline détectée.';
  return `${audit.issueCount} point(s) à vérifier : ${audit.criticalCount} critique(s), ${audit.warningCount} avertissement(s).`;
}
