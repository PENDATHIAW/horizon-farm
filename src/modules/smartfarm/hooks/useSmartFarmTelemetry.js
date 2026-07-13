import { useEffect, useMemo } from 'react';
import useCrudModule from '../../../hooks/useCrudModule';
import { rowsOf } from '../../../utils/moduleRows';
import { syncSmartFarmCriticalSignals } from '../../../services/smartFarmAlertSync.js';
import { syncSmartFarmEventSignals } from '../../../services/smartFarmEventAlertSync.js';
import { isSmartFarmDeviceCritical } from '../../../utils/smartFarmWorkflows.js';
import { countSmartFarmCriticalDevices } from '../../../services/smartFarmAlertSync.js';
import { useSmartFarmRealtime } from './useSmartFarmRealtime.js';

const arr = (v) => (Array.isArray(v) ? v : []);

export function useSmartFarmTelemetry(props = {}) {
  const sensorCrud = useCrudModule('sensor_devices');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const smartfarmEventsCrud = useCrudModule('smartfarm_events');

  const sensors = rowsOf(props.sensors, sensorCrud, false);
  const tasks = rowsOf(props.tasks || props.taches, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);
  const smartfarmEvents = arr(props.smartfarmEvents || props.dataMap?.smartfarm_events);

  const handlers = useMemo(() => ({
    onCreateSensor: props.onCreateSensor || sensorCrud.create,
    onUpdateSensor: props.onUpdateSensor || sensorCrud.update,
    onDeleteSensor: props.onDeleteSensor || sensorCrud.remove,
    onRefreshSensors: props.onRefreshSensors || sensorCrud.refresh,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onCreateSmartfarmEvent: props.onCreateSmartfarmEvent || smartfarmEventsCrud.create,
    onUpdateSmartfarmEvent: props.onUpdateSmartfarmEvent || smartfarmEventsCrud.update,
    onRefreshSmartfarmEvents: props.onRefreshSmartfarmEvents || smartfarmEventsCrud.refresh,
    onNavigate: props.onNavigate,
  }), [props, sensorCrud, tasksCrud, alertsCrud, eventsCrud, smartfarmEventsCrud]);

  const realtime = useSmartFarmRealtime({
    enabled: props.online !== false,
    seedEvents: smartfarmEvents,
    onRefreshSensors: handlers.onRefreshSensors,
    onRefreshEvents: handlers.onRefreshSmartfarmEvents,
  });

  const mergedEvents = realtime.liveEvents.length ? realtime.liveEvents : smartfarmEvents;

  useEffect(() => {
    let cancelled = false;
    const h = handlers;
    (async () => {
      try {
        const deviceResult = await syncSmartFarmCriticalSignals({
          sensors,
          tasks,
          alertes,
          onCreateTask: h.onCreateTask,
          onCreateAlert: h.onCreateAlert,
          onCreateBusinessEvent: h.onCreateBusinessEvent,
          onRefreshTasks: h.onRefreshTasks,
          onRefreshAlertes: h.onRefreshAlertes,
          onRefreshBusinessEvents: h.onRefreshBusinessEvents,
        });
        const eventResult = await syncSmartFarmEventSignals({
          events: mergedEvents,
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
  }, [sensors.length, mergedEvents.length, sensors.map((s) => s.id).join(',')]);

  const data = useMemo(() => {
    const zones = new Set([
      ...sensors.map((s) => s.zone || s.location || 'Zone'),
    ]);
    const criticalDevices = sensors.filter(isSmartFarmDeviceCritical);
    const recentEvents = [...mergedEvents]
      .sort((a, b) => String(b.created_at || '').localeCompare(String(a.created_at || '')))
      .slice(0, 100);

    return {
      sensors,
      tasks,
      alertes,
      smartfarmEvents: recentEvents,
      criticalCount: criticalDevices.length || countSmartFarmCriticalDevices(sensors),
      zoneCount: zones.size,
      online: props.online !== false,
      meteo: props.meteo,
      realtimeConnected: realtime.connected,
      lastPulse: realtime.lastPulse,
    };
  }, [sensors, tasks, alertes, mergedEvents, props.online, props.meteo, realtime.connected, realtime.lastPulse]);

  const sensorProps = {
    rows: sensors,
    loading: props.sensorLoading || sensorCrud.loading,
    onCreate: handlers.onCreateSensor,
    onUpdate: handlers.onUpdateSensor,
    onDelete: handlers.onDeleteSensor,
    onRefresh: handlers.onRefreshSensors,
    onNavigate: props.onNavigate,
  };

  return {
    data,
    handlers,
    sensorProps,
    realtime,
    crud: { sensorCrud, tasksCrud, alertsCrud, eventsCrud, smartfarmEventsCrud },
  };
}
