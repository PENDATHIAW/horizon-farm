import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import VisionRisksTab from '../vision/VisionRisksTab.jsx';

/**
 * Urgences & risques terrain — vue condensée : top actions + blocages critiques uniquement.
 */
export default function CentreUrgencesTab({
  data,
  risksData,
  strategicPlan,
  setTab,
  onNavigate,
  onCreateTask,
  onCreateAlert,
  onUpdateAlert,
  onCreateBusinessEvent,
  onRefreshTasks,
  onRefreshAlertes,
  existingTasks = [],
  existingAlerts = [],
}) {
  const priorityProps = {
    data,
    moduleId: 'centre_ia',
    setTab,
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onUpdateAlert,
    onCreateBusinessEvent,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
    compact: true,
  };

  const riskProps = {
    data: risksData,
    strategicPlan,
    setTab,
    onNavigate,
    onCreateTask,
    onCreateAlert,
    onRefreshTasks,
    onRefreshAlertes,
    existingTasks,
    existingAlerts,
    urgentOnly: true,
    compact: true,
  };

  return (
    <div className="space-y-4">
      <VisionPrioritiesTab {...priorityProps} />
      <VisionRisksTab {...riskProps} />
    </div>
  );
}
