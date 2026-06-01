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

      <ModuleSection icon={Zap} title="Actions terrain équipements" subtitle="Déclarer une panne, programmer une maintenance ou saisir le carburant d’un matériel.">
        <EquipementsQuickActionsBridge
          rows={rows}
          tasks={props.tasks || []}
          alertes={props.alertes || []}
          onUpdate={props.onUpdate}
          onRefresh={props.onRefresh}
          onCreateTask={props.onCreateTask}
          onUpdateTask={props.onUpdateTask}
          onRefreshTasks={props.onRefreshTasks}
          onCreateAlert={props.onCreateAlert}
          onUpdateAlert={props.onUpdateAlert}
          onRefreshAlertes={props.onRefreshAlertes}
          onCreateFinanceTransaction={props.onCreateFinanceTransaction}
          onRefreshFinances={props.onRefreshFinances}
          onCreateDocument={props.onCreateDocument}
          onRefreshDocuments={props.onRefreshDocuments}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      </ModuleSection>

      <ModuleSection icon={Settings} title="Parc matériel" subtitle="Machines, incubateurs, pompes, groupes, véhicules et équipements de production.">
        <EquipementsSmartFarmBridge
          rows={rows}
          sensors={props.sensors || []}
          cameras={props.cameras || []}
          onNavigate={props.onNavigate}
        />
        <GenericCrudModule
          {...props}
          moduleKey="equipements"
          title="Matériel & Équipements"
          sub="Machines · incubateurs · pompes · groupes · véhicules · disponibilité"
          fields={MODULE_FORM_FIELDS.equipements}
          columns={['id', 'name', 'type', 'status', 'purchase_cost', 'maintenance_due', 'fuel_cost']}
          initialValues={{ status: 'operationnel', type: 'machine', purchase_cost: 0, maintenance_cost: 0, fuel_cost: 0 }}
          addLabel="Ajouter équipement"
          exportTitle="Équipements Horizon Farm"
          kpis={[
            { icon: Settings, label: 'Équipements', value: rows.length, color: 'bg-sky-500/20 text-sky-400' },
            { icon: Wrench, label: 'Maintenance', value: rows.filter((r) => r.status === 'maintenance').length, color: 'bg-amber-500/20 text-amber-500' },
            { icon: AlertTriangle, label: 'Pannes', value: rows.filter((r) => r.status === 'panne').length, color: 'bg-red-500/20 text-red-500' },
            { icon: Fuel, label: 'Carburant', value: fmtCurrency(fuel), color: 'bg-emerald-500/20 text-emerald-500' },
          ]}
        />
      </ModuleSection>

      <ModuleSection icon={Wrench} title="Maintenance du matériel" subtitle="Suivre les interventions, les pannes, les dates de contrôle et la remise en service.">
        <EquipementsMaintenanceBridge
          rows={rows}
          tasks={props.tasks || []}
          alertes={props.alertes || []}
          onUpdate={props.onUpdate}
          onRefresh={props.onRefresh}
          onCreateTask={props.onCreateTask}
          onUpdateTask={props.onUpdateTask}
          onRefreshTasks={props.onRefreshTasks}
          onCreateAlert={props.onCreateAlert}
          onUpdateAlert={props.onUpdateAlert}
          onRefreshAlertes={props.onRefreshAlertes}
          onCreateFinanceTransaction={props.onCreateFinanceTransaction}
          onRefreshFinances={props.onRefreshFinances}
          onCreateDocument={props.onCreateDocument}
          onRefreshDocuments={props.onRefreshDocuments}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      </ModuleSection>

      <ModuleSection icon={BarChart3} title="Évolution du matériel" subtitle="Disponibilité, pannes, maintenances, carburant et coût réel par équipement.">
        <EquipementsEvolution rows={rows} tasks={props.tasks || []} onNavigate={props.onNavigate} />
      </ModuleSection>
    </div>
  );
}
