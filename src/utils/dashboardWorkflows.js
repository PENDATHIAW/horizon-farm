import { fmtCurrency } from './format.js';
import { isOpenForPayment, remainingForOrder } from './salesStatuses.js';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const n = (value = 0) => Number(value) || 0;

const CLOSED_STATUSES = ['termine', 'terminé', 'done', 'traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'annule', 'annulé', 'ignoree', 'ignorée'];
const CRITICAL_DEVICE_STATUSES = ['critique', 'critical', 'offline', 'hors_service', 'hors service', 'panne', 'en panne'];
const HIGH_WEATHER_RISKS = ['eleve', 'élevé', 'fort', 'high', 'critique', 'critical', 'orage', 'canicule', 'secheresse', 'sécheresse'];

export function sanitizeDashboardMetric(value, fallback = '0') {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && !Number.isFinite(value)) return fallback;
  const text = String(value);
  if (!text || /undefined|null|nan|\[object object\]/i.test(text)) return fallback;
  return text;
}

function transactionHasDocument(transaction, documents) {
  const id = String(transaction.id || transaction.transaction_id || '');
  if (!id) return false;
  return documents.some((doc) => {
    const status = lower(doc.status || doc.statut);
    if (['manquant', 'missing', 'a fournir', 'à fournir'].includes(status)) return false;
    return [doc.related_id, doc.transaction_id, doc.entity_id, doc.source_id, doc.module_record_id]
      .map((value) => String(value || ''))
      .includes(id);
  });
}

function isSmartCritical(row = {}) {
  const status = lower(row.status || row.statut || row.etat);
  return CRITICAL_DEVICE_STATUSES.some((term) => status.includes(term));
}

function isWeatherRisk(meteo = {}) {
  const risk = lower(meteo.risk_level || meteo.risque || meteo.alert || meteo.alerte || meteo.condition || meteo.weather);
  return HIGH_WEATHER_RISKS.some((term) => risk.includes(term));
}

export function buildDashboardTodayActions(data = {}) {
  const salesOrders = arr(data.salesOrders || data.sales_orders);
  const payments = arr(data.payments);
  const stocks = arr(data.stocks || data.stock);
  const sante = arr(data.vaccins || data.sante);
  const alertes = arr(data.alertes || data.alertes_center);
  const taches = arr(data.taches || data.tasks);
  const documents = arr(data.documents);
  const transactions = arr(data.transactions || data.finances);
  const sensors = arr(data.sensorDevices || data.sensors || data.sensor_devices);
  const cameras = arr(data.cameraDevices || data.cameras || data.camera_devices);

  const unpaidOrders = salesOrders.filter((order) => isOpenForPayment(order, payments));
  const receivable = unpaidOrders.reduce((sum, order) => sum + remainingForOrder(order, payments), 0);
  const stockCritical = stocks.filter((stock) => n(stock.seuil ?? stock.threshold) > 0 && n(stock.quantite ?? stock.quantity) <= n(stock.seuil ?? stock.threshold));
  const healthLate = sante.filter((row) => ['retard', 'a faire', 'à faire', 'a_faire', 'en retard'].some((term) => lower(row.statut || row.status).includes(term)));
  const openAlerts = alertes.filter((alert) => !CLOSED_STATUSES.includes(lower(alert.status || alert.statut || 'nouvelle')));
  const openTasks = taches.filter((task) => !CLOSED_STATUSES.includes(lower(task.status || task.statut || 'a_faire')));
  const docsMissing = transactions.filter((trx) => n(trx.montant ?? trx.amount) > 0 && !transactionHasDocument(trx, documents));
  const orphanPayments = payments.filter((payment) => payment.order_id && !salesOrders.some((order) => String(order.id) === String(payment.order_id)));
  const criticalSmart = [...sensors.filter(isSmartCritical), ...cameras.filter(isSmartCritical)];
  const weatherRisk = isWeatherRisk(data.meteo);

  const feedCritical = stockCritical.filter((row) => /aliment|provende|intrant|granul|maïs|mais|soja|feed/i.test(`${row.produit || row.nom || row.name || ''}`));

  return [
    unpaidOrders.length ? {
      iconKey: 'money',
      category: 'Argent',
      title: unpaidOrders.length === 1 ? '1 vente reste à encaisser' : `${unpaidOrders.length} ventes restent à encaisser`,
      detail: `${fmtCurrency(receivable)} à récupérer — relancer depuis Commercial`,
      moduleKey: 'commercial',
      tone: 'red',
      priority: 10,
    } : null,
    openAlerts.length ? {
      iconKey: 'alert',
      category: 'Urgences terrain',
      title: openAlerts.length === 1 ? '1 alerte terrain ouverte' : `${openAlerts.length} alertes terrain ouvertes`,
      detail: openAlerts[0]?.title || openAlerts[0]?.message || 'Traiter depuis Activité & Suivi',
      moduleKey: 'activite_suivi',
      tone: 'red',
      priority: 20,
    } : null,
    feedCritical.length ? {
      iconKey: 'stock',
      category: 'Stock',
      title: feedCritical.length === 1 ? 'Stock aliment sous le seuil' : `${feedCritical.length} stocks aliment sous le seuil`,
      detail: 'Réapprovisionner avant rupture de ration',
      moduleKey: 'achats_stock',
      tone: 'red',
      priority: 25,
    } : null,
    stockCritical.length && !feedCritical.length ? {
      iconKey: 'stock',
      category: 'Stock',
      title: `${stockCritical.length} produit(s) sous le seuil`,
      detail: 'Réapprovisionner les intrants critiques',
      moduleKey: 'achats_stock',
      tone: 'amber',
      priority: 30,
    } : null,
    healthLate.length ? {
      iconKey: 'health',
      category: 'Santé',
      title: healthLate.length === 1 ? '1 soin ou vaccin en retard' : `${healthLate.length} soins ou vaccins en retard`,
      detail: 'Planifier depuis Élevage / Santé',
      moduleKey: 'elevage',
      tone: 'amber',
      priority: 40,
    } : null,
    criticalSmart.length || weatherRisk ? {
      iconKey: 'smart',
      category: 'Smart Farm',
      title: weatherRisk ? 'Risque météo détecté sur la ferme' : `${criticalSmart.length} capteur(s) en alerte`,
      detail: weatherRisk ? (data.meteo?.impact || 'Vérifier abreuvement, ventilation et parcelles') : 'Contrôler Smart Farm',
      moduleKey: 'smartfarm',
      tone: 'amber',
      priority: 45,
    } : null,
    openTasks.length ? {
      iconKey: 'task',
      category: 'Tâches',
      title: openTasks.length === 1 ? '1 tâche ouverte' : `${openTasks.length} tâches ouvertes`,
      detail: 'Prioriser depuis Activité & Suivi',
      moduleKey: 'activite_suivi',
      tone: 'amber',
      priority: 50,
    } : null,
    docsMissing.length ? {
      iconKey: 'document',
      category: 'Administratif',
      title: docsMissing.length === 1 ? '1 transaction sans justificatif' : `${docsMissing.length} transactions sans justificatif`,
      detail: 'Attacher preuves ou factures pour conformité',
      moduleKey: 'documents_rapports',
      tone: 'neutral',
      priority: 60,
    } : null,
    orphanPayments.length ? {
      iconKey: 'sync',
      category: 'Contrôle ERP',
      title: orphanPayments.length === 1 ? '1 paiement reste à rapprocher' : `${orphanPayments.length} paiements restent à rapprocher`,
      detail: 'Vérifier la vente liée ou régulariser',
      moduleKey: 'sync_activity',
      tone: 'amber',
      priority: 70,
    } : null,
  ].filter(Boolean).sort((a, b) => a.priority - b.priority);
}
