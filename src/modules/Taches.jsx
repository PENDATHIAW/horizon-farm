import { AlertTriangle, CheckCircle, Clock, ListChecks } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import { taskFields, taskInitialValues, normalizeTaskPayload } from '../utils/taskForms';
import TachesEvolution from './TachesEvolution.jsx';

export default function Taches(props) {
  const rows = props.rows || [];
  return (
    <div className="space-y-6">
      <GenericCrudModule
        {...props}
        moduleKey="taches"
        title="Tâches terrain"
        sub="Actions quotidiennes, rappels, routines et suivi de l’équipe"
        fields={taskFields({
          lots: props.lots || [],
          animaux: props.animaux || props.animals || [],
          cultures: props.cultures || [],
          stocks: props.stocks || [],
          clients: props.clients || [],
          sensorDevices: props.sensorDevices || [],
        })}
        columns={['id', 'title', 'module_lie', 'assigned_to', 'due_date', 'priority', 'status']}
        initialValues={taskInitialValues(rows)}
        beforeCreate={normalizeTaskPayload}
        beforeUpdate={normalizeTaskPayload}
        addLabel="Ajouter tâche"
        exportTitle="Tâches Horizon Farm"
        kpis={[
          { icon: ListChecks, label: 'Tâches', value: rows.length, color: 'bg-neutral text-neutral' },
          { icon: Clock, label: 'À faire', value: rows.filter((r) => r.status === 'a_faire').length, color: 'bg-vigilance text-horizon-dark' },
          { icon: CheckCircle, label: 'Terminées', value: rows.filter((r) => r.status === 'termine').length, color: 'bg-positive text-positive' },
          { icon: AlertTriangle, label: 'Urgentes', value: rows.filter((r) => r.priority === 'critique' || r.status === 'retard').length, color: 'bg-urgent text-urgent' },
        ]}
      />
      <TachesEvolution rows={rows} onNavigate={props.onNavigate} />
    </div>
  );
}
