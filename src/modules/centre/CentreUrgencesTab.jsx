import { useMemo } from 'react';
import VisionPrioritiesTab from '../vision/VisionPrioritiesTab.jsx';
import VisionRisksTab from '../vision/VisionRisksTab.jsx';
import { buildTitleKeys } from './centreContentUtils.js';

/**
 * Urgences & risques — actions du jour + blocages critiques, sans doublon avec priorités.
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
  const excludeTitleKeys = useMemo(
    () => buildTitleKeys(data?.priorities || []),
    [data?.priorities],
  );

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
    excludeTitleKeys,
  };

  return (
    <div className="space-y-4">
      <VisionPrioritiesTab {...priorityProps} />
      <VisionRisksTab {...riskProps} />
    </div>
  );
}
