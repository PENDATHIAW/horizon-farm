import SmartFarmEquipmentAdvisor from './SmartFarmEquipmentAdvisor.jsx';
import SmartFarmSafetyBridge from './SmartFarmSafetyBridge.jsx';
import SmartFarmZoneOverview from './SmartFarmZoneOverview.jsx';
import AntiDuplicationNotice from '../components/AntiDuplicationNotice.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';

export default function SmartFarmModule({
  sensors = [],
  cameras = [],
  meteo = null,
  online = true,
  tasks = [],
  alertes = [],
  periodLabel,
  onNavigate,
  onCreateSensor,
  onUpdateSensor,
  onDeleteSensor,
  onRefreshSensors,
  onCreateCamera,
  onUpdateCamera,
  onDeleteCamera,
  onRefreshCameras,
  onCreateTask,
  onRefreshTasks,
  onCreateAlert,
  onRefreshAlertes,
}) {
  const sensorHandlers = {
    onCreateSensor,
    onUpdateSensor,
    onDeleteSensor,
    onRefreshSensors,
    onCreateCamera,
    onUpdateCamera,
    onDeleteCamera,
    onRefreshCameras,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">IoT & terrain</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Smart Farm</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Capteurs, caméras, météo et alertes — source unique pour l’IoT (distinct des équipements physiques).</p>
            {periodLabel ? <div className="mt-2"><PeriodScopeBadge label={periodLabel} /></div> : null}
          </div>
        </div>
      </section>
      <AntiDuplicationNotice pairId="capteurs_smartfarm_equipements" onNavigate={onNavigate} actionLabel="Module Smart Farm (ici)" />
      <SmartFarmZoneOverview
        sensors={sensors}
        cameras={cameras}
        meteo={meteo}
        online={online}
        onCreateSensor={onCreateSensor}
        onCreateCamera={onCreateCamera}
      />
      <SmartFarmEquipmentAdvisor {...sensorHandlers} sensors={sensors} cameras={cameras} />
      <SmartFarmSafetyBridge
        sensors={sensors}
        cameras={cameras}
        tasks={tasks}
        alertes={alertes}
        onCreateTask={onCreateTask}
        onRefreshTasks={onRefreshTasks}
        onCreateAlert={onCreateAlert}
        onRefreshAlertes={onRefreshAlertes}
      />
    </div>
  );
}
