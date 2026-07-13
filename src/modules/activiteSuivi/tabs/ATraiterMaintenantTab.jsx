import ListeTaches from '../../../components/shared/ListeTaches.jsx';
import { emitHorizonForm } from '../../../services/formModalManager.js';
import ActiviteWorkflowBridge from '../ActiviteWorkflowBridge.jsx';

const OPEN_STATUSES = ['a_faire', 'en_cours', 'todo', 'pending', 'in_progress'];

export default function ATraiterMaintenantTab({
  shared,
  workflowBridgeProps,
  onRefresh,
}) {
  return (
    <div className="space-y-6">
      <ActiviteWorkflowBridge
        {...workflowBridgeProps}
        onLinked={onRefresh}
      />
      <ListeTaches
        tasks={shared.tasks}
        farmId={shared.activeFarm?.id || shared.farm?.id}
        statuses={OPEN_STATUSES}
        period={shared.periodScope}
        onNavigate={shared.onNavigate}
        onCreate={() => emitHorizonForm('taches', 'task_creation', 'Nouvelle tâche', { due_date: new Date().toISOString().slice(0, 10) })}
      />
    </div>
  );
}
