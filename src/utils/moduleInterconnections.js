const arr = (value) => Array.isArray(value) ? value : [];
const low = (value) => String(value || '').toLowerCase();
const n = (value = 0) => Number(value || 0);
const amount = (row = {}) => n(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.cout ?? row.cost ?? 0);
const dateOf = (row = {}) => row.event_date || row.date || row.created_at || row.updated_at || '—';
const labelOf = (row = {}) => row.title || row.nom || row.name || row.libelle || row.produit || row.id || 'Élément';

export const MODULE_ROUTES = {
  elevage: 'Élevage',
  cultures: 'Cultures',
  commercial: 'Commercial',
  achats_stock: 'Achats & Stock',
  finance_pilotage: 'Finance & Pilotage',
  activite_suivi: 'Activité & Suivi',
  documents_rapports: 'Documents & Rapports',
  operations_ressources: 'Opérations & Ressources',
  pilotage_strategie: 'Pilotage & Stratégie',
  administration_sync: 'Administration & Sync',
};

export const BUSINESS_FLOWS = {
  vente: ['commercial', 'finance_pilotage', 'documents_rapports', 'activite_suivi'],
  vente_elevage: ['elevage', 'commercial', 'finance_pilotage', 'documents_rapports', 'activite_suivi'],
  vente_culture: ['cultures', 'commercial', 'finance_pilotage', 'documents_rapports', 'activite_suivi'],
  achat_stock: ['achats_stock', 'finance_pilotage', 'documents_rapports', 'activite_suivi'],
  soin: ['elevage', 'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports'],
  alimentation: ['elevage', 'achats_stock', 'finance_pilotage', 'activite_suivi'],
  charge: ['finance_pilotage', 'documents_rapports', 'pilotage_strategie'],
  maintenance: ['operations_ressources', 'finance_pilotage', 'activite_suivi', 'documents_rapports'],
  objectif: ['pilotage_strategie', 'activite_suivi', 'finance_pilotage'],
};

export function matchEntity(item = {}, entity = {}) {
  const id = String(entity.id || '');
  const code = String(entity.boucle_numero || entity.qr_code || entity.tag || entity.lot_id || entity.id || '');
  const values = [item.animal_id, item.lot_id, item.culture_id, item.product_id, item.article_id, item.source_id, item.source_record_id, item.related_id, item.cible_id, item.target_id, item.entity_id].map((v) => String(v || ''));
  if (values.some((value) => value && (value === id || value === code))) return true;
  const text = low(`${item.libelle || ''} ${item.title || ''} ${item.description || ''} ${item.notes || ''} ${item.product_name || ''} ${item.nom || ''}`);
  return Boolean(code && text.includes(low(code))) || Boolean(id && text.includes(low(id)));
}

export function buildEntityLinks(entity = {}, context = {}) {
  const salesOrders = arr(context.salesOrders || context.sales_orders);
  const payments = arr(context.payments);
  const transactions = arr(context.transactions || context.finances);
  const documents = arr(context.documents);
  const tasks = arr(context.tasks || context.taches);
  const alertes = arr(context.alertes);
  const businessEvents = arr(context.businessEvents || context.business_events || context.events);
  const stocks = arr(context.stocks || context.stock);
  const health = arr(context.sante || context.healthRows || context.vaccins);
  const feedLogs = arr(context.alimentationLogs || context.feedLogs);
  const productionLogs = arr(context.productionLogs || context.production_oeufs_logs);
  return {
    salesOrders: salesOrders.filter((row) => matchEntity(row, entity)),
    payments: payments.filter((row) => matchEntity(row, entity)),
    transactions: transactions.filter((row) => matchEntity(row, entity)),
    documents: documents.filter((row) => matchEntity(row, entity)),
    tasks: tasks.filter((row) => matchEntity(row, entity)),
    alertes: alertes.filter((row) => matchEntity(row, entity)),
    businessEvents: businessEvents.filter((row) => matchEntity(row, entity)),
    stocks: stocks.filter((row) => matchEntity(row, entity)),
    health: health.filter((row) => matchEntity(row, entity)),
    feedLogs: feedLogs.filter((row) => matchEntity(row, entity)),
    productionLogs: productionLogs.filter((row) => matchEntity(row, entity)),
  };
}

export function summarizeEntityLinks(links = {}) {
  const totalSales = arr(links.salesOrders).reduce((sum, row) => sum + amount(row), 0);
  const paid = arr(links.payments).reduce((sum, row) => sum + amount(row), 0);
  const finance = arr(links.transactions).reduce((sum, row) => sum + amount(row), 0);
  const charges = [...arr(links.feedLogs), ...arr(links.health), ...arr(links.businessEvents), ...arr(links.transactions)].reduce((sum, row) => sum + amount(row), 0);
  return {
    totalSales,
    paid,
    remaining: Math.max(0, totalSales - paid),
    finance,
    charges,
    documentsCount: arr(links.documents).length,
    tasksCount: arr(links.tasks).length,
    alertsCount: arr(links.alertes).length,
    eventsCount: arr(links.businessEvents).length,
  };
}

export function buildModuleConnections(moduleKey, context = {}) {
  const transactions = arr(context.transactions || context.finances);
  const documents = arr(context.documents);
  const tasks = arr(context.tasks || context.taches);
  const alertes = arr(context.alertes);
  const salesOrders = arr(context.salesOrders || context.sales_orders);
  const stocks = arr(context.stocks || context.stock);
  const businessEvents = arr(context.businessEvents || context.business_events || context.events);
  const missingProofs = transactions.filter((row) => amount(row) > 0 && !row.document_id && !row.proof_url && !row.justificatif_id);
  const stockCritical = stocks.filter((row) => n(row.seuil ?? row.threshold) > 0 && n(row.quantite ?? row.quantity ?? row.stock) <= n(row.seuil ?? row.threshold));
  const openTasks = tasks.filter((row) => !['termine', 'terminé', 'done', 'closed', 'clos'].includes(low(row.status || row.statut)));
  const openAlerts = alertes.filter((row) => !['termine', 'terminé', 'done', 'closed', 'clos'].includes(low(row.status || row.statut)));
  const unpaidSales = salesOrders.filter((row) => !['paye', 'payé', 'paid', 'closed', 'termine', 'terminé'].includes(low(row.payment_status || row.status || row.statut)));
  const suggestions = [];
  if (missingProofs.length) suggestions.push({ id: 'missing-proofs', moduleKey: 'documents_rapports', title: 'Justificatifs manquants', detail: `${missingProofs.length} mouvement(s) financier(s) sans preuve`, value: 'Documents' });
  if (stockCritical.length) suggestions.push({ id: 'stock-critical', moduleKey: 'achats_stock', title: 'Stocks sous seuil', detail: `${stockCritical.length} produit(s) à réapprovisionner`, value: 'Stock' });
  if (openTasks.length) suggestions.push({ id: 'open-tasks', moduleKey: 'activite_suivi', title: 'Tâches ouvertes', detail: `${openTasks.length} action(s) à suivre`, value: 'Suivi' });
  if (openAlerts.length) suggestions.push({ id: 'open-alerts', moduleKey: 'activite_suivi', title: 'Alertes ouvertes', detail: `${openAlerts.length} alerte(s) à traiter`, value: 'Alertes' });
  if (unpaidSales.length) suggestions.push({ id: 'unpaid-sales', moduleKey: 'commercial', title: 'Ventes à encaisser', detail: `${unpaidSales.length} vente(s) non soldée(s)`, value: 'Commercial' });
  return { moduleKey, suggestions, recentEvents: businessEvents.slice(0, 8), counts: { transactions: transactions.length, documents: documents.length, tasks: tasks.length, alertes: alertes.length, salesOrders: salesOrders.length, stocks: stocks.length } };
}

export function makeInterconnectionEvent({ type, sourceModule, targetModule, entityType, entityId, title, description, amount: eventAmount }) {
  return {
    id: `EVT-${Date.now()}`,
    event_type: type,
    module_source: sourceModule,
    target_module: targetModule,
    entity_type: entityType,
    entity_id: entityId,
    source_id: entityId,
    title,
    description,
    event_date: new Date().toISOString().slice(0, 10),
    amount: eventAmount || 0,
    severity: 'info',
  };
}

export function humanLinkRow(row = {}) {
  return { title: labelOf(row), detail: dateOf(row), value: amount(row) ? amount(row) : (row.status || row.statut || row.event_type || 'Lié') };
}
