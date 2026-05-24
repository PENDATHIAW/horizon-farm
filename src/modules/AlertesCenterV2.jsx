import ActionTraceHealth from './ActionTraceHealth.jsx';
import AlertesCenterTechnical from './AlertesCenterTechnical.jsx';
import FarmRoutineTasksPanel from './FarmRoutineTasksPanel.jsx';

export default function AlertesCenterV2(props) {
  return <div className="space-y-6">
    <FarmRoutineTasksPanel
      tasks={props.tasks || []}
      onCreateTask={props.onCreateTask}
      onRefreshTasks={props.onRefreshTasks}
      onNavigate={props.onNavigate}
    />
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={props.alertes || []}
      events={props.businessEvents || []}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <AlertesCenterTechnical {...props} />
  </div>;
}