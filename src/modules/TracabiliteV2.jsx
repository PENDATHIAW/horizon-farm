import ActionTraceHealth from './ActionTraceHealth.jsx';
import Tracabilite from './Tracabilite.jsx';

export default function TracabiliteV2(props) {
  return <div className="space-y-6">
    <ActionTraceHealth
      tasks={props.tasks || []}
      alertes={props.alertes || []}
      events={props.events || []}
      online={props.online ?? true}
      onNavigate={props.onNavigate}
    />
    <Tracabilite {...props} />
  </div>;
}
