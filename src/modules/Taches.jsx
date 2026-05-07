import { AlertTriangle, CheckCircle, Clock, ListChecks } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';

export default function Taches(props) {
  const rows = props.rows || [];
  return (
    <GenericCrudModule
      {...props}
      moduleKey="taches"
      title="Workflow & Taches"
      sub="Taches quotidiennes - rappels - routines - checklists terrain"
      fields={MODULE_FORM_FIELDS.taches}
      columns={['id', 'title', 'module_lie', 'assigned_to', 'due_date', 'priority', 'status']}
      initialValues={{ status: 'a_faire', priority: 'normale' }}
      addLabel="Ajouter tache"
      exportTitle="Taches Horizon Farm"
      kpis={[
        { icon: ListChecks, label: 'Taches', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
        { icon: Clock, label: 'A faire', value: rows.filter((r) => r.status === 'a_faire').length, color: 'bg-amber-500/20 text-amber-500' },
        { icon: CheckCircle, label: 'Terminees', value: rows.filter((r) => r.status === 'termine').length, color: 'bg-emerald-500/20 text-emerald-500' },
        { icon: AlertTriangle, label: 'Critiques', value: rows.filter((r) => r.priority === 'critique' || r.status === 'retard').length, color: 'bg-red-500/20 text-red-500' },
      ]}
    />
  );
}
