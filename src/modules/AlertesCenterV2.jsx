import ActionTraceHealth from './ActionTraceHealth.jsx';
import AlertTaskBridgePanel from './AlertTaskBridgePanel.jsx';
import AlertesCenterTechnical from './AlertesCenterTechnical.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const isUnderTreatment = (animal = {}) => /sous_traitement|traitement|soin/.test(lower(`${animal.health_status || ''} ${animal.status_sante || ''} ${animal.statut || ''}`));
const alreadyExists = (alertes = [], id = '') => arr(alertes).some((alert) => String(alert.id || '') === String(id));

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

export default function AlertesCenterV2(props) {
  const treatmentAlerts = buildTreatmentAlerts({ animaux: props.animaux || [], alertes: props.alertes || [] });
  const alertes = [...treatmentAlerts, ...(props.alertes || [])];
  const nextProps = { ...props, alertes };

  return <div className="space-y-6">
    <AlertTaskBridgePanel
      alertes={alertes}
      tasks={props.tasks || []}
      onCreateTask={props.onCreateTask}
      onRefreshTasks={props.onRefreshTasks}
      onUpdateAlert={props.onUpdate}
      onRefreshAlertes={props.onRefresh}
      onNavigate={props.onNavigate}
    />
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={alertes}
      events={props.businessEvents || []}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <AlertesCenterTechnical {...nextProps} />
  </div>;
}
