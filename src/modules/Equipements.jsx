import { AlertTriangle, Fuel, Settings, Wrench } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency } from '../utils/format';

export default function Equipements(props) {
  const rows = props.rows || [];
  const fuel = rows.reduce((sum, row) => sum + Number(row.fuel_cost || 0), 0);
  return (
    <GenericCrudModule
      {...props}
      moduleKey="equipements"
      title="Materiel & Equipements"
      sub="Machines - incubateurs - pompes - groupes - vehicules - maintenance"
      fields={MODULE_FORM_FIELDS.equipements}
      columns={['id', 'name', 'type', 'status', 'purchase_cost', 'maintenance_due', 'fuel_cost']}
      initialValues={{ status: 'operationnel', type: 'machine' }}
      addLabel="Ajouter equipement"
      exportTitle="Equipements Horizon Farm"
      kpis={[
        { icon: Settings, label: 'Equipements', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
        { icon: Wrench, label: 'Maintenance', value: rows.filter((r) => r.status === 'maintenance').length, color: 'bg-amber-500/20 text-amber-500' },
        { icon: AlertTriangle, label: 'Pannes', value: rows.filter((r) => r.status === 'panne').length, color: 'bg-red-500/20 text-red-500' },
        { icon: Fuel, label: 'Carburant', value: fmtCurrency(fuel), color: 'bg-emerald-500/20 text-emerald-500' },
      ]}
    />
  );
}
