import { Radio, Tractor } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import GenericCrudModule from '../../components/GenericCrudModule.jsx';
import HeyHorizonQuickAsk from '../../components/HeyHorizonQuickAsk.jsx';
import ModuleAnnexeTab from '../../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../../components/PeriodScopeBadge.jsx';
import useCrudModule from '../../hooks/useCrudModule.js';
import { syncSmartFarmCriticalSignals } from '../../services/smartFarmAlertSync.js';
import { MODULE_FORM_FIELDS } from '../../utils/constants.js';
import { fmtNumber } from '../../utils/format.js';
import { rowsOf } from '../../utils/moduleRows.js';
import { isSmartFarmDeviceCritical } from '../../utils/smartFarmWorkflows.js';
import SmartFarmEmbed from './SmartFarmEmbed.jsx';
import SmartFarmEquipmentBridge from './SmartFarmEquipmentBridge.jsx';

const arr = (v) => (Array.isArray(v) ? v : []);

function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="smartfarm" active={active} onChange={onChange} />;
}

function Summary({ data, setTab }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Capteurs</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{fmtNumber(data.sensors.length)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Caméras</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{fmtNumber(data.cameras.length)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Signaux critiques</p>
          <p className={`mt-1 text-xl font-black ${data.criticalCount ? 'text-amber-700' : 'text-emerald-700'}`}>{fmtNumber(data.criticalCount)}</p>
        </div>
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="text-xs text-[#8a7456]">Zones</p>
          <p className="mt-1 text-xl font-black text-[#2f2415]">{fmtNumber(data.zoneCount)}</p>
        </div>
      </div>
      <SmartFarmEquipmentBridge
        equipements={arr(props.equipements)}
        sensors={data.sensors}
        cameras={data.cameras}
        onNavigate={data.onNavigate}
      />
      <SmartFarmEmbed {...data.embedProps} />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setTab('Capteurs')} className="rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Gérer capteurs</button>
        <button type="button" onClick={() => setTab('Caméras')} className="rounded-xl border border-[#d6c3a0] bg-white px-4 py-2 text-sm font-black text-[#2f2415]">Gérer caméras</button>
        <button type="button" onClick={() => data.onNavigate?.('activite_suivi', { tab: 'Alertes' })} className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-black text-emerald-800">Voir alertes</button>
        <button type="button" onClick={() => data.onNavigate?.('equipements')} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-2 text-sm font-black text-[#7d6a4a]">Équipements liés →</button>
      </div>
    </div>
  );
}

export default function SmartFarmRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const sensorCrud = useCrudModule('sensor_devices');
  const cameraCrud = useCrudModule('camera_devices');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');

  const sensors = rowsOf(props.sensors, sensorCrud, false);
  const cameras = rowsOf(props.cameras, cameraCrud, false);
  const tasks = rowsOf(props.tasks || props.taches, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);

  const handlers = {
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
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await syncSmartFarmCriticalSignals({
          sensors,
          cameras,
          tasks,
          alertes,
          onCreateAlert: handlers.onCreateAlert,
          onCreateBusinessEvent: handlers.onCreateBusinessEvent,
          onRefreshAlertes: handlers.onRefreshAlertes,
          onRefreshBusinessEvents: handlers.onRefreshBusinessEvents,
        });
        if (!cancelled && result.created > 0) toast.success(`${result.created} alerte(s) Smart Farm synchronisée(s)`);
      } catch {
        /* sync silencieux */
      }
    })();
    return () => { cancelled = true; };
  }, [sensors.length, cameras.length, sensors.map((s) => s.id).join(','), cameras.map((c) => c.id).join(',')]);

  const data = useMemo(() => {
    const zones = new Set([
      ...sensors.map((s) => s.zone || s.location || 'Zone'),
      ...cameras.map((c) => c.zone || c.location || 'Zone'),
    ]);
    const criticalCount = [...sensors, ...cameras].filter(isSmartFarmDeviceCritical).length;
    return {
      sensors,
      cameras,
      criticalCount,
      zoneCount: zones.size,
      onNavigate: props.onNavigate,
      embedProps: {
        meteo: props.meteo,
        sensors,
        cameras,
        tasks,
        online: props.online !== false,
        onCreateSensor: handlers.onCreateSensor,
        onCreateCamera: handlers.onCreateCamera,
        ...handlers,
      },
    };
  }, [sensors, cameras, tasks, props.meteo, props.online, props.onNavigate]);

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

  const content = tab === 'Résumé' ? (
    <Summary data={data} setTab={setTab} />
  ) : tab === 'Capteurs' ? (
    <GenericCrudModule
      {...sensorProps}
      moduleKey="sensor_devices"
      title="Capteurs terrain"
      sub="Température, humidité, eau, mouvement — reliés aux alertes Centre"
      fields={MODULE_FORM_FIELDS.sensor_devices}
      columns={['id', 'name', 'type', 'zone', 'equipment_id', 'status', 'value', 'battery_level']}
      addLabel="Ajouter capteur"
      exportTitle="Capteurs Smart Farm"
      kpis={[
        { icon: Radio, label: 'Capteurs', value: sensors.length, color: 'bg-emerald-500/20 text-emerald-600' },
        { icon: Radio, label: 'Critiques', value: data.criticalCount, color: 'bg-amber-500/20 text-amber-600' },
      ]}
    />
  ) : tab === 'Caméras' ? (
    <GenericCrudModule
      {...cameraProps}
      moduleKey="camera_devices"
      title="Caméras terrain"
      sub="Entrée, poulailler, magasin — surveillance et preuves"
      fields={MODULE_FORM_FIELDS.camera_devices}
      columns={['id', 'name', 'zone', 'equipment_id', 'type', 'status']}
      addLabel="Ajouter caméra"
      exportTitle="Caméras Smart Farm"
      kpis={[]}
    />
  ) : tab === 'Annexe' ? (
    <ModuleAnnexeTab moduleId="smartfarm" dataMap={{ meteo: props.meteo, sensor_devices: sensors, camera_devices: cameras }} onNavigate={props.onNavigate} />
  ) : (
    <ModuleGraphiquesTab
      moduleId="smartfarm"
      sensors={sensors}
      cameras={cameras}
      meteo={props.meteo}
      onNavigate={props.onNavigate}
    />
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black flex items-center gap-2">
              <Tractor size={16} /> Smart Farm
            </p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Capteurs, caméras & météo</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Surveillance terrain connectée — alertes automatiques vers Activité & Centre décisionnel.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
            <HeyHorizonQuickAsk moduleKey="smartfarm" onNavigate={props.onNavigate} onOpenAssistant={props.onOpenAssistant} className="mt-2" />
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
            <span className="text-[#8a7456]">Signaux critiques </span>
            <b className={data.criticalCount ? 'text-amber-700' : 'text-emerald-700'}>{data.criticalCount}</b>
          </div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {content}
    </div>
  );
}
