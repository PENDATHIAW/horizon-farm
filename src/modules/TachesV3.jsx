import ActionTraceHealth from './ActionTraceHealth.jsx';
import FarmRoutineTasksPanel from './FarmRoutineTasksPanel.jsx';
import TachesTechnical from './TachesTechnical.jsx';

export default function TachesV3(props) {
  return <div className="space-y-6">
    <FarmRoutineTasksPanel
      tasks={props.rows || []}
      onCreateTask={props.onCreate}
      onRefreshTasks={props.onRefresh}
      onNavigate={props.onNavigate}
    />
    <ActionTraceHealth
      tasks={props.rows || []}
      alertes={props.alertes || []}
      events={props.businessEvents || []}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <TachesTechnical {...props} />
  </div>;
}