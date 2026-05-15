import { AlertTriangle, BarChart3, Fuel, Settings, Wrench, Zap } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency } from '../utils/format';
import EquipementsMaintenanceBridge from './EquipementsMaintenanceBridge.jsx';
import EquipementsQuickActionsBridge from './EquipementsQuickActionsBridge.jsx';
import EquipementsEvolution from './EquipementsEvolution.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function Equipements(props) {
  const rows = props.rows || [];
  const fuel = rows.reduce((sum, row) => sum + Number(row.fuel_cost || 0), 0);
  return (
    <div className="space-y-6 equipements-mobile-structured">
      <style>{`@media (max-width: 640px){.equipements-mobile-structured .rounded-2xl{border-radius:18px}.equipements-mobile-structured table{font-size:12px}.equipements-mobile-structured th,.equipements-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.equipements-mobile-structured .text-2xl{font-size:1.35rem}.equipements-mobile-structured .grid{gap:.75rem}.equipements-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection icon={Settings} title="Parc matériel" subtitle="Machines, incubateurs, pompes, groupes, véhicules et équipements de production.">
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
      </ModuleSection>

      <ModuleSection icon={Zap} title="Actions rapides équipements" subtitle="Panne, carburant, maintenance urgente, alertes et écritures liées.">
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
      </ModuleSection>

      <ModuleSection icon={Wrench} title="Maintenance équipements" subtitle="Planning, coûts, tâches, documents et suivi des interventions.">
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
      </ModuleSection>

      <ModuleSection icon={BarChart3} title="Évolution équipements" subtitle="Graphes des pannes, maintenances, carburant, coûts et disponibilité.">
        <EquipementsEvolution rows={rows} tasks={props.tasks || []} onNavigate={props.onNavigate} />
      </ModuleSection>
    </div>
  );
}
