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

  return [
    unpaidOrders.length ? { iconKey: 'money', category: 'Argent', title: 'Encaisser les ventes en attente', detail: `${unpaidOrders.length} vente(s), ${fmtCurrency(receivable)} à récupérer`, moduleKey: 'commercial', tone: 'red', priority: 10 } : null,
    openAlerts.length ? { iconKey: 'alert', category: 'Urgences terrain', title: 'Traiter les alertes', detail: `${openAlerts.length} alerte(s) à regarder`, moduleKey: 'activite_suivi', tone: 'red', priority: 20 } : null,
    stockCritical.length ? { iconKey: 'stock', category: 'Stock', title: 'Revoir le stock faible', detail: `${stockCritical.length} produit(s) sous le seuil`, moduleKey: 'achats_stock', tone: 'amber', priority: 30 } : null,
    healthLate.length ? { iconKey: 'health', category: 'Santé', title: 'Rattraper les soins/vaccins', detail: `${healthLate.length} soin(s) ou vaccin(s) à faire`, moduleKey: 'elevage', tone: 'amber', priority: 40 } : null,
    criticalSmart.length || weatherRisk ? { iconKey: 'smart', category: 'Smart Farm', title: 'Vérifier les capteurs et la météo', detail: weatherRisk ? 'Risque météo ou capteur critique à contrôler' : `${criticalSmart.length} équipement(s) connecté(s) à contrôler`, moduleKey: 'smartfarm', tone: 'amber', priority: 45 } : null,
    openTasks.length ? { iconKey: 'task', category: 'Tâches', title: 'Terminer les tâches ouvertes', detail: `${openTasks.length} tâche(s) à suivre`, moduleKey: 'activite_suivi', tone: 'amber', priority: 50 } : null,
    docsMissing.length ? { iconKey: 'document', category: 'Administratif', title: 'Ajouter les preuves / factures', detail: `${docsMissing.length} preuve(s) à compléter`, moduleKey: 'documents_rapports', tone: 'neutral', priority: 60 } : null,
    orphanPayments.length ? { iconKey: 'sync', category: 'Contrôle ERP', title: 'Vérifier les ventes supprimées', detail: `${orphanPayments.length} ancien(s) paiement(s) à contrôler`, moduleKey: 'sync_activity', tone: 'amber', priority: 70 } : null,
  ].filter(Boolean).sort((a, b) => a.priority - b.priority);
}
