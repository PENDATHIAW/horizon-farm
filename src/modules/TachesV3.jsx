import ActionTraceHealth from './ActionTraceHealth.jsx';
import TachesTechnical from './TachesTechnical.jsx';

export default function TachesV3(props) {
  return <div className="space-y-6">
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
