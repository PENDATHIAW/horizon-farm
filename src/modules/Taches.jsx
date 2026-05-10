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
        title="Workflow & Tâches"
        sub="Tâches quotidiennes, rappels, routines et checklists terrain"
        fields={taskFields()}
        columns={['id', 'title', 'module_lie', 'assigned_to', 'due_date', 'priority', 'status']}
        initialValues={taskInitialValues(rows)}
        beforeCreate={normalizeTaskPayload}
        beforeUpdate={normalizeTaskPayload}
        addLabel="Ajouter tâche"
        exportTitle="Tâches Horizon Farm"
        kpis={[
          { icon: ListChecks, label: 'Tâches', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
          { icon: Clock, label: 'À faire', value: rows.filter((r) => r.status === 'a_faire').length, color: 'bg-amber-500/20 text-amber-500' },
          { icon: CheckCircle, label: 'Terminées', value: rows.filter((r) => r.status === 'termine').length, color: 'bg-emerald-500/20 text-emerald-500' },
          { icon: AlertTriangle, label: 'Critiques', value: rows.filter((r) => r.priority === 'critique' || r.status === 'retard').length, color: 'bg-red-500/20 text-red-500' },
        ]}
      />
      <TachesEvolution rows={rows} onNavigate={props.onNavigate} />
    </div>
  );
}
