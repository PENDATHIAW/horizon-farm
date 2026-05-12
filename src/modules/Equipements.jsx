import { AlertTriangle, Fuel, Settings, Wrench } from 'lucide-react';
import { useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency } from '../utils/format';
import EquipementsMaintenanceBridge from './EquipementsMaintenanceBridge.jsx';
import EquipementsQuickActionsBridge from './EquipementsQuickActionsBridge.jsx';
import EquipementsEvolution from './EquipementsEvolution.jsx';

export default function Equipements(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const rows = props.rows || [];
  const fuel = rows.reduce((sum, row) => sum + Number(row.fuel_cost || 0), 0);
  return (
    <div className="space-y-6">
      <GenericCrudModule
        {...props}
        moduleKey="equipements"
        title="Materiel & Equipements"
        sub="Machines - incubateurs - pompes - groupes - vehicules - maintenance"
        fields={MODULE_FORM_FIELDS.equipements}
        columns={['id', 'name', 'type', 'status', 'purchase_cost', 'maintenance_due', 'fuel_cost']}
        initialValues={{ status: 'operationnel', type: 'machine', purchase_cost: 0, maintenance_cost: 0, fuel_cost: 0 }}
        addLabel="Ajouter equipement"
        exportTitle="Equipements Horizon Farm"
        kpis={[
          { icon: Settings, label: 'Equipements', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
          { icon: Wrench, label: 'Maintenance', value: rows.filter((r) => r.status === 'maintenance').length, color: 'bg-amber-500/20 text-amber-500' },
          { icon: AlertTriangle, label: 'Pannes', value: rows.filter((r) => r.status === 'panne').length, color: 'bg-red-500/20 text-red-500' },
          { icon: Fuel, label: 'Carburant', value: fmtCurrency(fuel), color: 'bg-emerald-500/20 text-emerald-500' },
        ]}
      />
      <CollapsibleAdvancedSection
        title="Équipements : actions rapides, maintenance et évolution"
        description="Les actions techniques restent disponibles ici sans alourdir la liste des équipements."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
        <EquipementsQuickActionsBridge
          rows={rows}
          onUpdate={props.onUpdate}
          onRefresh={props.onRefresh}
          onCreateTask={props.onCreateTask}
          onRefreshTasks={props.onRefreshTasks}
          onCreateAlert={props.onCreateAlert}
          onRefreshAlertes={props.onRefreshAlertes}
          onCreateFinanceTransaction={props.onCreateFinanceTransaction}
          onRefreshFinances={props.onRefreshFinances}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
        <EquipementsMaintenanceBridge
          rows={rows}
          tasks={props.tasks || []}
          onUpdate={props.onUpdate}
          onRefresh={props.onRefresh}
          onCreateTask={props.onCreateTask}
          onUpdateTask={props.onUpdateTask}
          onRefreshTasks={props.onRefreshTasks}
          onCreateAlert={props.onCreateAlert}
          onRefreshAlertes={props.onRefreshAlertes}
          onCreateFinanceTransaction={props.onCreateFinanceTransaction}
          onRefreshFinances={props.onRefreshFinances}
          onCreateDocument={props.onCreateDocument}
          onRefreshDocuments={props.onRefreshDocuments}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
        <EquipementsEvolution rows={rows} tasks={props.tasks || []} onNavigate={props.onNavigate} />
      </CollapsibleAdvancedSection>
    </div>
  );
}
