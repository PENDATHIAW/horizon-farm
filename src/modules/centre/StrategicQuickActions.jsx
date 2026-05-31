import Btn from '../../components/Btn';
import {
  navigateFromPriorityItem,
  runPriorityAlertAction,
  runPriorityTaskAction,
} from '../vision/visionPriorityActions.js';

function resolveOpenTarget(item = {}) {
  const activity = item.type || item.activity;
  const entityType = item.entityType || item.entity_type;
  const entityId = item.entityId || item.animalId || item.lotId;

  if (entityType === 'animal' || ['bovins', 'ovins', 'caprins', 'animaux'].includes(activity)) {
    return {
      module: 'elevage',
      tab: 'Animaux',
      params: { animalId: entityId },
      label: item.openLabel || 'Ouvrir animal',
    };
  }

  if (entityType === 'bande_chair' || entityType === 'bande' || activity === 'poulets_chair' || activity === 'oeufs') {
    return {
      module: 'elevage',
      tab: 'Avicole',
      params: { lotId: entityId || item.lotId },
      label: item.openLabel || 'Ouvrir bande',
    };
  }

  if (item.module === 'finance_pilotage' || item.navModule === 'finance_pilotage') {
    return {
      module: 'finance_pilotage',
      tab: item.navTab || 'Trésorerie',
      params: {},
      label: item.openLabel || 'Voir trésorerie',
    };
  }

  if (item.module === 'achats_stock' || item.navModule === 'achats_stock') {
    return {
      module: 'achats_stock',
      tab: item.navTab || 'Stock',
      params: {},
      label: item.openLabel || 'Voir stock',
    };
  }

  if (item.category === 'launch_timing' || item.navTab === 'Cycles') {
    return {
      module: 'centre_ia',
      tab: 'Cycles',
      params: {},
      label: item.openLabel || 'Voir calendrier',
    };
  }

  if (item.navModule) {
    return {
      module: item.navModule,
      tab: item.navTab,
      params: {},
      label: item.openLabel || 'Voir source',
    };
  }

  return null;
}

export default function StrategicQuickActions({
  item = {},
  onCreateTask,
  onCreateAlert,
  onRefreshTasks,
  onRefreshAlertes,
  onNavigate,
  existingTasks = [],
  existingAlerts = [],
}) {
  const priority = item.priority === 'critique' ? 'critique' : item.priority === 'haute' ? 'haute' : 'moyenne';
  const title = item.title || item.status || item.eventLabel || 'Décision stratégique';
  const message = item.message || item.recommendation || item.explanation || '';
  const lotId = item.lotId || item.entity_id;
  const building = item.building;
  const subject = item.subjectLabel || item.lotName;

  const queueItem = {
    id: item.id || `${item.category || 'strategic'}-${lotId || building || title}`,
    title: subject ? `${title} — ${subject}` : title,
    detail: message,
    message,
    tone: priority === 'critique' ? 'bad' : 'warn',
    priority,
    severity: priority,
    sourceModule: item.module || 'centre_decisionnel',
    navModule: item.navModule || item.module,
    navTab: item.navTab,
    lotId,
    building,
    category: item.category || item.type,
    entity_type: item.entityType || item.entity_type || (lotId ? 'lot' : building ? 'batiment' : 'strategic'),
    entity_id: item.entityId || item.animalId || lotId,
    alert_dedupe_key: `centre_strategique:${item.category || item.type || 'action'}:${item.entityId || lotId || building || item.id}:${title}`,
  };

  const handlers = {
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
  };

  const openTarget = resolveOpenTarget(item);

  const openSource = () => {
    if (openTarget && onNavigate) {
      onNavigate(openTarget.module, { tab: openTarget.tab, ...openTarget.params });
      return;
    }
    if (building) {
      onNavigate?.('elevage', { tab: 'Avicole' });
      return;
    }
    navigateFromPriorityItem(queueItem, handlers);
  };

  const openLabel = openTarget?.label
    || (item.entityType === 'animal' ? 'Ouvrir animal' : lotId ? 'Ouvrir bande' : building ? `Lots — ${building}` : 'Voir source');

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {onCreateTask ? (
        <Btn small variant="outline" onClick={() => runPriorityTaskAction(queueItem, handlers)}>Créer tâche</Btn>
      ) : null}
      {onCreateAlert ? (
        <Btn small variant="outline" onClick={() => runPriorityAlertAction(queueItem, handlers)}>Créer alerte</Btn>
      ) : null}
      {onNavigate ? (
        <Btn small variant="outline" onClick={openSource}>{openLabel}</Btn>
      ) : null}
    </div>
  );
}
