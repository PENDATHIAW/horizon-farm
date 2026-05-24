import InternalResourcesHealth from './InternalResourcesHealth.jsx';
import Equipements from './Equipements.jsx';

export default function EquipementsV2(props) {
  return <div className="space-y-6">
    <InternalResourcesHealth
      equipements={props.rows || []}
      transactions={props.transactions || []}
      documents={props.documents || []}
      tasks={props.tasks || []}
      onNavigate={props.onNavigate}
    />
    <Equipements {...props} />
  </div>;
}
