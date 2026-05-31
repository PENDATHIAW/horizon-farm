import toast from 'react-hot-toast';
import Btn from '../../components/Btn';

export default function StrategicQuickActions({
  item = {},
  onCreateTask,
  onCreateAlert,
  onRefreshTasks,
  onRefreshAlertes,
  onNavigate,
}) {
  const priority = item.priority === 'critique' ? 'critique' : item.priority === 'haute' ? 'haute' : 'moyenne';
  const title = item.title || item.status || item.eventLabel || 'Décision stratégique';
  const message = item.message || item.recommendation || item.explanation || '';
  const lotId = item.lotId || item.entity_id;
  const building = item.building;

  const createTask = async () => {
    if (!onCreateTask) return;
    try {
      await onCreateTask({
        title: `Action : ${title}`,
        description: message,
        module_lie: item.module || 'centre_decisionnel',
        entity_type: item.entity_type || (lotId ? 'lot' : building ? 'batiment' : 'strategic'),
        related_id: lotId || building || item.id,
        priority: priority === 'critique' ? 'critique' : 'haute',
        status: 'a_faire',
        statut: 'a_faire',
        source_module: 'centre_decisionnel',
      });
      await onRefreshTasks?.();
      toast.success('Tâche créée');
    } catch {
      toast.error('Création tâche impossible');
    }
  };

  const createAlert = async () => {
    if (!onCreateAlert) return;
    try {
      await onCreateAlert({
        title,
        message,
        module_source: 'centre_decisionnel',
        entity_type: lotId ? 'lot' : building ? 'batiment' : 'strategic_decision',
        entity_id: lotId || building || item.id,
        severity: priority === 'critique' ? 'critique' : 'warning',
        status: 'nouvelle',
        statut: 'nouvelle',
        action_recommandee: (item.actions || [])[0] || message.slice(0, 120),
        alert_dedupe_key: `centre_strategique:${item.category || item.type || 'action'}:${lotId || building || item.id}:${title}`,
      });
      await onRefreshAlertes?.();
      toast.success('Alerte créée');
    } catch {
      toast.error('Création alerte impossible');
    }
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
    if (item.module) {
      onNavigate?.(item.module, { tab: item.navTab });
    }
  };

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      {onCreateTask ? (
        <Btn small variant="outline" onClick={createTask}>Créer tâche</Btn>
      ) : null}
      {onCreateAlert ? (
        <Btn small variant="outline" onClick={createAlert}>Créer alerte</Btn>
      ) : null}
      {onNavigate && (lotId || building || item.module) ? (
        <Btn small variant="outline" onClick={openLot}>
          {lotId ? 'Ouvrir lot' : building ? `Lots — ${building}` : 'Voir source'}
        </Btn>
      ) : null}
    </div>
  );
}
