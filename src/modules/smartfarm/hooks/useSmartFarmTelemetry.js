import { useEffect, useMemo } from 'react';
import useCrudModule from '../../../hooks/useCrudModule';
import { rowsOf } from '../../../utils/moduleRows';
import { syncSmartFarmCriticalSignals } from '../../../services/smartFarmAlertSync.js';
import { syncSmartFarmEventSignals } from '../../../services/smartFarmEventAlertSync.js';
import { isSmartFarmDeviceCritical } from '../../../utils/smartFarmWorkflows.js';
import { countSmartFarmCriticalDevices } from '../../../services/smartFarmAlertSync.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export function useSmartFarmTelemetry(props = {}) {
  const sensorCrud = useCrudModule('sensor_devices');
  const cameraCrud = useCrudModule('camera_devices');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');

  const sensors = rowsOf(props.sensors, sensorCrud, false);
  const cameras = rowsOf(props.cameras, cameraCrud, false);
  const tasks = rowsOf(props.tasks || props.taches, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);
  const smartfarmEvents = arr(props.smartfarmEvents || props.dataMap?.smartfarm_events);

  const handlers = useMemo(() => ({
    onCreateSensor: props.onCreateSensor || sensorCrud.create,
    onUpdateSensor: props.onUpdateSensor || sensorCrud.update,
    onDeleteSensor: props.onDeleteSensor || sensorCrud.remove,
    onRefreshSensors: props.onRefreshSensors || sensorCrud.refresh,
    onCreateCamera: props.onCreateCamera || cameraCrud.create,
    onUpdateCamera: props.onUpdateCamera || cameraCrud.update,
    onDeleteCamera: props.onDeleteCamera || cameraCrud.remove,
    onRefreshCameras: props.onRefreshCameras || cameraCrud.refresh,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  }), [props, sensorCrud, cameraCrud, tasksCrud, alertsCrud, eventsCrud]);

  useEffect(() => {
    let cancelled = false;
    const h = handlers;
    (async () => {
      try {
        const deviceResult = await syncSmartFarmCriticalSignals({
          sensors,
          cameras,
          tasks,
          alertes,
          onCreateAlert: h.onCreateAlert,
          onCreateBusinessEvent: h.onCreateBusinessEvent,
          onRefreshAlertes: h.onRefreshAlertes,
          onRefreshBusinessEvents: h.onRefreshBusinessEvents,
        });
        const eventResult = await syncSmartFarmEventSignals({
          events: smartfarmEvents,
          alertes,
          onCreateAlert: h.onCreateAlert,
          onCreateBusinessEvent: h.onCreateBusinessEvent,
          onRefreshAlertes: h.onRefreshAlertes,
          onRefreshBusinessEvents: h.onRefreshBusinessEvents,
        });
        if (!cancelled && (deviceResult.created || 0) + (eventResult.created || 0) > 0) {
          /* sync silencieux */
        }
      } catch {
        /* sync silencieux */
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync sur changement de parc / événements
  }, [sensors.length, cameras.length, smartfarmEvents.length, sensors.map((s) => s.id).join(','), cameras.map((c) => c.id).join(',')]);

  const data = useMemo(() => {
    const zones = new Set([
      ...sensors.map((s) => s.zone || s.location || 'Zone'),
      ...cameras.map((c) => c.zone || c.location || 'Zone'),
    ]);
    const criticalDevices = [...sensors, ...cameras].filter(isSmartFarmDeviceCritical);
    const recentEvents = [...smartfarmEvents]
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 100);

    return {
      sensors,
      cameras,
      tasks,
      alertes,
      smartfarmEvents: recentEvents,
      criticalCount: criticalDevices.length || countSmartFarmCriticalDevices(sensors, cameras),
      zoneCount: zones.size,
      online: props.online !== false,
      meteo: props.meteo,
    };
  }, [sensors, cameras, tasks, alertes, smartfarmEvents, props.online, props.meteo]);

  const sensorProps = {
    rows: sensors,
    loading: props.sensorLoading || sensorCrud.loading,
    onCreate: handlers.onCreateSensor,
    onUpdate: handlers.onUpdateSensor,
    onDelete: handlers.onDeleteSensor,
    onRefresh: handlers.onRefreshSensors,
    onNavigate: props.onNavigate,
  };

  const cameraProps = {
    rows: cameras,
    loading: props.cameraLoading || cameraCrud.loading,
    onCreate: handlers.onCreateCamera,
    onUpdate: handlers.onUpdateCamera,
    onDelete: handlers.onDeleteCamera,
    onRefresh: handlers.onRefreshCameras,
    onNavigate: props.onNavigate,
  };

  return {
    data,
    handlers,
    sensorProps,
    cameraProps,
    crud: { sensorCrud, cameraCrud, tasksCrud, alertsCrud, eventsCrud },
  };
}
