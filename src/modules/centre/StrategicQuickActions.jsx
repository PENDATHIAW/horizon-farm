import Btn from '../../components/Btn';
import {
  navigateFromPriorityItem,
  runPriorityAlertAction,
  runPriorityTaskAction,
} from '../vision/visionPriorityActions.js';

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

  const queueItem = {
    id: item.id || `${item.category || 'strategic'}-${lotId || building || title}`,
    title,
    detail: message,
    message,
    tone: priority === 'critique' ? 'bad' : 'warn',
    priority,
    severity: priority,
    sourceModule: item.module || 'centre_decisionnel',
    navModule: item.module,
    navTab: item.navTab,
    lotId,
    building,
    category: item.category || item.type,
    entity_type: item.entity_type || (lotId ? 'lot' : building ? 'batiment' : 'strategic'),
    alert_dedupe_key: `centre_strategique:${item.category || item.type || 'action'}:${lotId || building || item.id}:${title}`,
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

  const openLot = () => {
    if (lotId) {
      onNavigate?.('elevage', { tab: 'Avicole', lotId });
      return;
    }
    if (building) {
      onNavigate?.('elevage', { tab: 'Avicole' });
      return;
    }
    navigateFromPriorityItem(queueItem, handlers);
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {onCreateTask ? (
        <Btn small variant="outline" onClick={() => runPriorityTaskAction(queueItem, handlers)}>Créer tâche</Btn>
      ) : null}
      {onCreateAlert ? (
        <Btn small variant="outline" onClick={() => runPriorityAlertAction(queueItem, handlers)}>Créer alerte</Btn>
      ) : null}
      {onNavigate ? (
        <Btn small variant="outline" onClick={openLot}>
          {lotId ? 'Ouvrir lot' : building ? `Lots — ${building}` : 'Voir source'}
        </Btn>
      ) : null}
    </div>
  );
}
