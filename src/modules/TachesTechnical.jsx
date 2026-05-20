import { useMemo } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { buildTechnicalFarmingAlerts } from '../services/technicalFarmingRules';
import TachesV2 from './TachesV2.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const alertKey = (alert = {}) => `${alert.module_source || alert.module || 'autre'}:${alert.entity_type || 'entite'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
const taskKey = (task = {}) => task.alert_dedupe_key || `${task.module_lie || task.source_module || 'alertes'}:${task.entity_type || 'alerte'}:${task.related_id || task.source_record_id || task.id}:${task.action_key || task.title || 'action'}`;
const isClosed = (alert = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done'].includes(String(alert.status || alert.statut || '').toLowerCase());
const hasOpenTaskForAlert = (tasks = [], alert = {}) => arr(tasks).some((task) => !['termine', 'terminé', 'annule', 'annulé'].includes(String(task.status || '').toLowerCase()) && (String(task.source_record_id || '') === String(alert.id || '') || taskKey(task) === alertKey(alert)));
const alreadyKnown = (alerts = [], candidate = {}) => arr(alerts).some((alert) => String(alert.id) === String(candidate.id) || alert.alert_dedupe_key === alertKey(candidate) || alertKey(alert) === alertKey(candidate));

export default function TachesTechnical(props) {
  const businessEventsCrud = useCrudModule('business_events');
  const santeCrud = useCrudModule('sante');
  const technicalAlerts = useMemo(() => buildTechnicalFarmingAlerts({
    lots: props.lots || [],
    animaux: props.animaux || [],
    stocks: props.stocks || [],
    sante: santeCrud.rows || [],
    businessEvents: businessEventsCrud.rows || [],
    sensorDevices: props.sensorDevices || [],
  }).filter((alert) => !isClosed(alert) && !hasOpenTaskForAlert(props.rows || [], alert) && !alreadyKnown(props.alertes || [], alert)), [props.lots, props.animaux, props.stocks, props.sensorDevices, props.rows, props.alertes, santeCrud.rows, businessEventsCrud.rows]);

  return <TachesV2 {...props} alertes={[...technicalAlerts, ...(props.alertes || [])]} />;
}
