import { useMemo } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { buildTechnicalFarmingAlerts } from '../services/technicalFarmingRules';
import AlertesCenter from './AlertesCenter.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const alertKey = (alert = {}) => `${alert.module_source || alert.module || 'autre'}:${alert.entity_type || 'entite'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
const isClosed = (alert = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done'].includes(String(alert.status || alert.statut || '').toLowerCase());
const alreadyKnown = (alerts = [], candidate = {}) => arr(alerts).some((alert) => String(alert.id) === String(candidate.id) || alert.alert_dedupe_key === alertKey(candidate) || alertKey(alert) === alertKey(candidate));

export default function AlertesCenterTechnical(props) {
  const businessEventsCrud = useCrudModule('business_events');
  const santeCrud = useCrudModule('sante');
  const technicalAlerts = useMemo(() => buildTechnicalFarmingAlerts({
    lots: props.lots || [],
    animaux: props.animaux || [],
    stocks: props.stocks || [],
    sante: santeCrud.rows || [],
    businessEvents: businessEventsCrud.rows || [],
    sensorDevices: props.sensorDevices || [],
  }).filter((alert) => !isClosed(alert) && !alreadyKnown(props.alertes || [], alert)), [props.lots, props.animaux, props.stocks, props.sensorDevices, props.alertes, santeCrud.rows, businessEventsCrud.rows]);

  return <AlertesCenter {...props} alertes={[...technicalAlerts, ...(props.alertes || [])]} />;
}
