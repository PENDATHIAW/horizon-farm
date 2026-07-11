import { AlertTriangle, BarChart3, Fuel, Settings, Wrench, Zap } from 'lucide-react';
import GenericCrudModule from '../components/GenericCrudModule';
import { MODULE_FORM_FIELDS } from '../utils/constants';
import { fmtCurrency } from '../utils/format';
import { buildEquipmentPurchaseWorkflow } from '../utils/equipmentWorkflows.js';
import { dispatchBpLineCompleted } from '../utils/bpLineConcretization.js';
import EquipementsMaintenanceBridge from './EquipementsMaintenanceBridge.jsx';
import EquipementsQuickActionsBridge from './EquipementsQuickActionsBridge.jsx';
import EquipementsSmartFarmBridge from './EquipementsSmartFarmBridge.jsx';
import EquipementsEvolution from './EquipementsEvolution.jsx';
import AntiDuplicationNotice from '../components/AntiDuplicationNotice.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function Equipements(props) {
  const rows = props.rows || [];
  const fuel = rows.reduce((sum, row) => sum + Number(row.fuel_cost || 0), 0);
  const handleCreateEquipment = async (payload) => {
    const supplier = (props.fournisseurs || props.suppliers || []).find((row) => String(row.id) === String(payload.fournisseur_id || payload.supplier_id)) || {};
    const fundingSource = (props.bpFundingSources || []).find((row) => String(row.id) === String(payload.funding_source_id || payload.financement_id)) || {};
    const workflow = buildEquipmentPurchaseWorkflow({
      payload,
      supplier,
      fundingSource,
      date: payload.date_achat || payload.purchase_date || new Date().toISOString().slice(0, 10),
    });
    await props.onCreate?.(workflow.equipment);
    if (workflow.financeTransaction) await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    if (workflow.document) await props.onCreateDocument?.(workflow.document);
    if (workflow.maintenanceTask) await props.onCreateTask?.(workflow.maintenanceTask);
    if (workflow.alert) await props.onCreateAlert?.(workflow.alert);
    await props.onCreateBusinessEvent?.({ ...workflow.event, linked_task_id: workflow.maintenanceTask?.id || '' });
    if (payload.bp_line_id) {
      dispatchBpLineCompleted({
        bp_line_id: payload.bp_line_id,
        assetModule: 'equipements',
        assetId: workflow.equipment.id,
        amount: workflow.financeTransaction?.montant || workflow.equipment.purchase_cost || 0,
        date: workflow.equipment.date_achat,
        source: 'equipment_purchase',
        issue_key: workflow.event.issue_key,
      });
    }
    await Promise.allSettled([
      props.onRefresh?.(),
      props.onRefreshFinances?.(),
      props.onRefreshDocuments?.(),
      props.onRefreshTasks?.(),
      props.onRefreshAlertes?.(),
      props.onRefreshBusinessEvents?.(),
    ]);
  };

  return (
    <div className="space-y-6 equipements-mobile-structured">
      <style>{`@media (max-width: 640px){.equipements-mobile-structured .rounded-2xl{border-radius:18px}.equipements-mobile-structured table{font-size:12px}.equipements-mobile-structured th,.equipements-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.equipements-mobile-structured .text-2xl{font-size:1.35rem}.equipements-mobile-structured .grid{gap:.75rem}.equipements-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>

      <AntiDuplicationNotice pairId="maintenance_rh_equipements" compact className="mb-2" />
      <AntiDuplicationNotice pairId="capteurs_smartfarm_equipements" onNavigate={props.onNavigate} actionLabel="Smart Farm (capteurs)" compact className="mb-2" />
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
          onCreate={handleCreateEquipment}
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
