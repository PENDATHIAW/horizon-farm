import { useEffect, useMemo, useRef } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { buildTechnicalFarmingAlerts } from '../services/technicalFarmingRules';
import AlertesCenter from './AlertesCenter.jsx';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').toLowerCase();
const alertKey = (alert = {}) => `${alert.module_source || alert.module || 'autre'}:${alert.entity_type || 'entite'}:${alert.entity_id || alert.id}:${alert.action_recommandee || alert.title || alert.message || 'action'}`;
const isClosed = (alert = {}) => ['traitee', 'traitée', 'resolue', 'résolue', 'fermee', 'fermée', 'done'].includes(clean(alert.status || alert.statut));
const isCritical = (alert = {}) => ['critique', 'urgence'].includes(clean(alert.severity || alert.gravite));
const alreadyKnown = (alerts = [], candidate = {}) => arr(alerts).some((alert) => String(alert.id) === String(candidate.id) || alert.alert_dedupe_key === alertKey(candidate) || alertKey(alert) === alertKey(candidate));

function persistableAlert(alert = {}) {
  return {
    ...alert,
    id: alert.id || `TECH-${Date.now()}`,
    status: alert.status || 'nouvelle',
    statut: alert.statut || alert.status || 'nouvelle',
    source_type: alert.entity_type,
    source_id: alert.entity_id,
    alert_dedupe_key: alertKey(alert),
    type_alerte: 'conduite_technique',
    technical_rule: true,
  };
}

export default function AlertesCenterTechnical(props) {
  const businessEventsCrud = useCrudModule('business_events');
  const santeCrud = useCrudModule('sante');
  const persistedKeysRef = useRef(new Set());
  const technicalAlerts = useMemo(() => buildTechnicalFarmingAlerts({
    lots: props.lots || [],
    animaux: props.animaux || [],
    stocks: props.stocks || [],
    sante: santeCrud.rows || [],
    businessEvents: businessEventsCrud.rows || [],
    sensorDevices: props.sensorDevices || [],
  }).filter((alert) => !isClosed(alert) && !alreadyKnown(props.alertes || [], alert)), [props.lots, props.animaux, props.stocks, props.sensorDevices, props.alertes, santeCrud.rows, businessEventsCrud.rows]);

  useEffect(() => {
    if (!props.onCreate) return;
    const criticalToPersist = technicalAlerts.filter((alert) => isCritical(alert) && !alreadyKnown(props.alertes || [], alert));
    criticalToPersist.slice(0, 5).forEach((alert) => {
      const key = alertKey(alert);
      if (persistedKeysRef.current.has(key)) return;
      persistedKeysRef.current.add(key);
      props.onCreate(persistableAlert(alert)).then?.(() => props.onRefresh?.()).catch((error) => {
        persistedKeysRef.current.delete(key);
        console.warn('Alerte technique critique non persistée', error);
      });
    });
  }, [technicalAlerts, props.alertes, props.onCreate, props.onRefresh]);

  return <AlertesCenter {...props} alertes={[...technicalAlerts, ...(props.alertes || [])]} />;
}
