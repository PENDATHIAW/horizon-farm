import ActionTraceHealth from './ActionTraceHealth.jsx';
import AlertTaskBridgePanel from './AlertTaskBridgePanel.jsx';
import AlertesCenterTechnical from './AlertesCenterTechnical.jsx';
import { buildCalculatedCycleDates } from '../services/productionCycleDates';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const withinNext2Days = (date = '') => date && date >= today() && date <= addDays(2);
const dueSoonOrLate = (date = '') => date && date <= addDays(2);
const isUnderTreatment = (animal = {}) => /sous_traitement|traitement|soin/.test(lower(`${animal.health_status || ''} ${animal.status_sante || ''} ${animal.statut || ''}`));
const alreadyExists = (alertes = [], id = '') => arr(alertes).some((alert) => String(alert.id || '') === String(id));
const numberOf = (value) => Number(value || 0) || 0;
const rowLabel = (row = {}) => row.name || row.nom || row.title || row.libelle || row.produit || row.id;

function buildTreatmentAlerts({ animaux = [], alertes = [] }) {
  return arr(animaux).filter(isUnderTreatment).map((animal) => {
    const id = `auto-traitement-${animal.id}`;
    if (alreadyExists(alertes, id)) return null;
    return {
      id,
      title: `Animal sous traitement : ${animal.name || animal.nom || animal.id}`,
      message: 'Vérifier le délai d’attente sanitaire avant toute vente ou sortie de l’animal.',
      module_source: 'animaux',
      entity_type: 'animal',
      entity_id: animal.id,
      severity: 'warning',
      status: 'nouvelle',
      action_recommandee: 'Vérifier traitement, date de fin et délai d’attente avant vente.',
      responsable: 'TEAM-FERME',
      isAuto: true,
      created_at: new Date().toISOString(),
    };
  }).filter(Boolean);
}

function buildPreventiveAlerts(props) {
  const existing = props.alertes || [];
  const alerts = [];
  const push = (alert) => {
    if (!alert?.id) return;
    if (alreadyExists(existing, alert.id) || alerts.some((item) => item.id === alert.id)) return;
    alerts.push({ severity: 'warning', status: 'nouvelle', isAuto: true, created_at: new Date().toISOString(), ...alert });
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
    if (s > 0 && q <= s) push({ id: `auto-j2-stock-${row.id}`, title: `Stock sous seuil : ${rowLabel(row)}`, message: `Quantité ${q} sous seuil ${s}. Réapprovisionnement à préparer.`, module_source: 'stock', entity_type: 'stock', entity_id: row.id, severity: q <= 0 ? 'critique' : 'warning', action_recommandee: 'Contacter fournisseur, confirmer prix/délai et créer dépense/preuve.', responsable: 'TEAM-STOCK' });
  });
  return alerts;
}

export default function AlertesCenterV2(props) {
  const treatmentAlerts = buildTreatmentAlerts({ animaux: props.animaux || [], alertes: props.alertes || [] });
  const preventiveAlerts = buildPreventiveAlerts(props);
  const alertes = [...preventiveAlerts, ...treatmentAlerts, ...(props.alertes || [])];
  const nextProps = { ...props, alertes };

  return <div className="space-y-6">
    <AlertTaskBridgePanel alertes={alertes} tasks={props.tasks || []} onCreateTask={props.onCreateTask} onRefreshTasks={props.onRefreshTasks} onUpdateAlert={props.onUpdate} onRefreshAlertes={props.onRefresh} onNavigate={props.onNavigate} />
    <ActionTraceHealth tasks={props.tasks || []} alertes={alertes} events={props.businessEvents || []} online={props.online ?? true} onNavigate={props.onNavigate} />
    <AlertesCenterTechnical {...nextProps} />
  </div>;
}
