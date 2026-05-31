import SmartFarmEquipmentAdvisor from '../SmartFarmEquipmentAdvisor.jsx';
import SmartFarmSafetyBridge from '../SmartFarmSafetyBridge.jsx';
import SmartFarmZoneOverview from '../SmartFarmZoneOverview.jsx';

/** Bloc Smart Farm embarqué (RH Maintenance) — sans shell navigation. */
export default function SmartFarmEmbed({
  meteo,
  sensors = [],
  cameras = [],
  tasks = [],
  online = true,
  onCreateSensor,
  onCreateCamera,
  onCreateAlert,
  onRefreshAlertes,
  onCreateTask,
  onRefreshTasks,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  return (
    <div className="space-y-4">
      <SmartFarmZoneOverview
        sensors={sensors}
        cameras={cameras}
        meteo={meteo}
        online={online}
        onCreateSensor={onCreateSensor}
        onCreateCamera={onCreateCamera}
      />
      <SmartFarmSafetyBridge
        meteo={meteo}
        sensors={sensors}
        cameras={cameras}
        tasks={tasks}
        onCreateAlert={onCreateAlert}
        onRefreshAlertes={onRefreshAlertes}
        onCreateTask={onCreateTask}
        onRefreshTasks={onRefreshTasks}
        onCreateBusinessEvent={onCreateBusinessEvent}
        onRefreshBusinessEvents={onRefreshBusinessEvents}
      />
      <SmartFarmEquipmentAdvisor
        sensors={sensors}
        cameras={cameras}
        onCreateSensor={onCreateSensor}
        onCreateCamera={onCreateCamera}
      />
    </div>
  );
}
