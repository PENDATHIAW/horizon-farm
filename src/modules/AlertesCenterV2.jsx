import ActionTraceHealth from './ActionTraceHealth.jsx';
import AlertTaskBridgePanel from './AlertTaskBridgePanel.jsx';
import AlertesCenterTechnical from './AlertesCenterTechnical.jsx';
import { buildCalculatedCycleDates } from '../services/productionCycleDates';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const withinNext2Days = (date = '') => date && date >= today() && date <= addDays(2);
const dueSoonOrLate = (date = '') => date && date <= addDays(2);
const isUnderTreatment = (animal = {}) => /sous_traitement|traitement|soin/.test(lower(`${animal.health_status || ''} ${animal.status_sante || ''} ${animal.statut || ''}`));
const alreadyExists = (alertes = [], id = '') => arr(alertes).some((alert) => String(alert.id || '') === String(id));
const numberOf = (value) => Number(value || 0) || 0;
const rowLabel = (row = {}) => row.name || row.nom || row.title || row.libelle || row.produit || row.id;
const isResolved = (row = {}) => ['resolue', 'résolue', 'cloturee', 'clôturée', 'terminee', 'terminée', 'fermee', 'fermée', 'ok'].includes(norm(row.status || row.statut || row.etat));
const isTaskDone = (row = {}) => ['termine', 'terminé', 'done', 'resolue', 'résolue', 'cloturee', 'clôturée'].includes(norm(row.status || row.statut || row.etat));
const alertKey = (row = {}) => String(row.alert_dedupe_key || row.dedupe_key || row.source_record_id || row.entity_id || row.id || `${row.module_source || ''}:${row.title || ''}`).trim();
const taskKey = (row = {}) => String(row.task_dedupe_key || row.action_key || row.alert_dedupe_key || row.source_record_id || row.related_id || '').trim();
const taskBelongsToAlert = (task = {}, alert = {}) => {
  const aKey = alertKey(alert);
  const tKey = taskKey(task);
  if (!aKey || !tKey) return false;
  return aKey === tKey || tKey.includes(aKey) || aKey.includes(tKey);
};
function dedupeAlerts(alertes = []) {
  const map = new Map();
  arr(alertes).forEach((alert) => {
    const key = alertKey(alert);
    const previous = map.get(key);
    if (!previous) { map.set(key, alert); return; }
    if (isResolved(alert) && !isResolved(previous)) return;
    if (!isResolved(alert) && isResolved(previous)) { map.set(key, alert); return; }
    const prevDate = new Date(previous.updated_at || previous.created_at || 0).getTime();
    const nextDate = new Date(alert.updated_at || alert.created_at || 0).getTime();
    if (nextDate >= prevDate) map.set(key, { ...previous, ...alert });
  });
  return [...map.values()];
}

function buildTreatmentAlerts({ animaux = [], alertes = [] }) {
  return arr(animaux).filter(isUnderTreatment).map((animal) => {
    const id = `auto-traitement-${animal.id}`;
    if (alreadyExists(alertes, id)) return null;
    return { id, alert_dedupe_key: id, dedupe_key: id, title: `Animal sous traitement : ${animal.name || animal.nom || animal.id}`, message: 'Vérifier le délai d’attente sanitaire avant toute vente ou sortie de l’animal.', module_source: 'animaux', entity_type: 'animal', entity_id: animal.id, severity: 'warning', status: 'nouvelle', action_recommandee: 'Vérifier traitement, date de fin et délai d’attente avant vente.', responsable: 'TEAM-FERME', isAuto: true, created_at: new Date().toISOString() };
  }).filter(Boolean);
}

function buildPreventiveAlerts(props) {
  const existing = props.alertes || [];
  const alerts = [];
  const push = (alert) => {
    if (!alert?.id) return;
    if (alreadyExists(existing, alert.id) || alerts.some((item) => item.id === alert.id)) return;
    alerts.push({ severity: 'warning', status: 'nouvelle', isAuto: true, created_at: new Date().toISOString(), alert_dedupe_key: alert.id, dedupe_key: alert.id, ...alert });
  };
  arr(props.vaccins || props.sante).forEach((row) => {
    const due = String(row.date_rappel || row.next_date || row.date_prevue || row.due_date || row.date || '').slice(0, 10);
    if (!withinNext2Days(due)) return;
    push({ id: `auto-j2-sante-${row.id || due}`, title: `Soin à préparer : ${rowLabel(row) || row.type || 'Santé'}`, message: `Échéance prévue le ${due}. Préparer le suivi, la cible et le responsable.`, module_source: 'sante', entity_type: row.animal_id ? 'animal' : 'sante', entity_id: row.animal_id || row.lot_id || row.id, action_recommandee: 'Planifier la tâche santé et prévenir le responsable si nécessaire.', responsable: 'TEAM-FERME' });
  });
  const cycles = buildCalculatedCycleDates({ lots: props.lots || props.avicole || [], animaux: props.animaux || [] });
  arr(cycles.chairSales).forEach((row) => { if (dueSoonOrLate(row.targetDate)) push({ id: `auto-j2-chair-${row.id}`, title: `Lot chair prêt à vendre : ${row.label}`, message: `Date calculée J+40 : ${row.targetDate}. Préparer clients, prix et livraison.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: row.id, severity: row.targetDate < today() ? 'critique' : 'warning', action_recommandee: 'Créer une vente ou une tâche de prospection clients.', responsable: 'TEAM-COMMERCIAL' }); });
  arr(cycles.bovinSales).forEach((row) => { if (dueSoonOrLate(row.targetDate)) push({ id: `auto-j2-bovin-${row.id}`, title: `Bovin prêt à vendre : ${row.label}`, message: `Date calculée J+90 : ${row.targetDate}. Préparer prix, marge et acheteur.`, module_source: 'animaux', entity_type: 'animal', entity_id: row.id, severity: row.targetDate < today() ? 'critique' : 'warning', action_recommandee: 'Contrôler poids, marge et créer opportunité de vente.', responsable: 'TEAM-COMMERCIAL' }); });
  arr(cycles.layerReform).forEach((row) => { if (dueSoonOrLate(row.targetDate)) push({ id: `auto-j2-pondeuse-${row.id}`, title: `Pondeuses à surveiller : ${row.label}`, message: `Renouvellement à décider selon ponte réelle à partir du ${row.targetDate}.`, module_source: 'avicole', entity_type: 'lot_avicole', entity_id: row.id, action_recommandee: 'Vérifier taux de ponte, demande œufs et risque de rupture.', responsable: 'TEAM-FERME' }); });
  arr(props.stocks).forEach((row) => {
    const q = numberOf(row.quantite ?? row.quantity ?? row.stock);
    const s = numberOf(row.seuil ?? row.threshold ?? row.min_quantity);
    if (s > 0 && q <= s) push({ id: `auto-j2-stock-${row.id}`, title: `Stock sous seuil : ${rowLabel(row)}`, message: `Quantité ${q} sous seuil ${s}. Réapprovisionnement à préparer.`, module_source: 'stock', entity_type: 'stock', entity_id: row.id, severity: q <= 0 ? 'critique' : 'warning', action_recommandee: 'Contacter fournisseur, confirmer prix/délai et enregistrer l’achat avec sa preuve.', responsable: 'TEAM-STOCK' });
  });
  return alerts;
}

export default function AlertesCenterV2(props) {
  const tasks = props.tasks || [];
  const treatmentAlerts = buildTreatmentAlerts({ animaux: props.animaux || [], alertes: props.alertes || [] });
  const preventiveAlerts = buildPreventiveAlerts(props);
  const alertes = dedupeAlerts([...preventiveAlerts, ...treatmentAlerts, ...(props.alertes || [])]);

  const guardedUpdateAlert = async (id, payload = {}) => {
    const before = alertes.find((alert) => String(alert.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    if (isResolved(after)) {
      const linkedTasks = tasks.filter((task) => taskBelongsToAlert(task, after) && !isTaskDone(task));
      await Promise.allSettled(linkedTasks.map((task) => props.onUpdateTask?.(task.id, { status: 'termine', completed_at: new Date().toISOString(), resolved_from_alert_id: id })));
      if (linkedTasks.length) await props.onRefreshTasks?.();
    }
    await props.onRefresh?.();
  };

  const guardedUpdateTask = async (id, payload = {}) => {
    const before = tasks.find((task) => String(task.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdateTask?.(id, payload);
    if (isTaskDone(after)) {
      const linkedAlerts = alertes.filter((alert) => taskBelongsToAlert(after, alert) && !isResolved(alert));
      await Promise.allSettled(linkedAlerts.map((alert) => props.onUpdate?.(alert.id, { status: 'resolue', resolved_at: new Date().toISOString(), resolved_from_task_id: id })));
      if (linkedAlerts.length) await props.onRefresh?.();
    }
    await props.onRefreshTasks?.();
  };

  const nextProps = { ...props, alertes, tasks, onUpdate: guardedUpdateAlert, onUpdateTask: guardedUpdateTask };
  return <div className="space-y-6">
    <AlertTaskBridgePanel alertes={alertes} tasks={tasks} onCreateTask={props.onCreateTask} onRefreshTasks={props.onRefreshTasks} onUpdateAlert={guardedUpdateAlert} onRefreshAlertes={props.onRefresh} onNavigate={props.onNavigate} />
    <ActionTraceHealth tasks={tasks} alertes={alertes} events={props.businessEvents || []} online={props.online ?? true} onNavigate={props.onNavigate} />
    <AlertesCenterTechnical {...nextProps} />
  </div>;
}
