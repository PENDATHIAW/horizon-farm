import { useMemo, useState } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import SmartFarmZoneOverview from './SmartFarmZoneOverview.jsx';
import SmartFarmDevicePanel from './ressources/SmartFarmDevicePanel.jsx';
import RessourcesRepairPanel from './ressources/RessourcesRepairPanel.jsx';
import { getRhDirectory } from '../utils/rhDirectory';

const arr = (value) => (Array.isArray(value) ? value : []);

export default function SmartFarmRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const periodFiltered = Boolean(props.periodFiltered);
  const sensorCrud = useCrudModule('sensor_devices');
  const cameraCrud = useCrudModule('camera_devices');
  const eqCrud = useCrudModule('equipements');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const eventsCrud = useCrudModule('business_events');
  const financesCrud = useCrudModule('finances');
  const docsCrud = useCrudModule('documents');

  const sensors = rowsOf(props.sensors || props.sensorDevices, sensorCrud, false);
  const cameras = rowsOf(props.cameras || props.cameraDevices, cameraCrud, false);
  const equipment = rowsOf(props.equipements, eqCrud, false);
  const tasks = rowsOf(props.tasks || props.taches, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const documents = rowsOf(props.documents, docsCrud, periodFiltered);
  const people = getRhDirectory().people || [];

  const workflowContext = useMemo(() => ({
    sensors,
    cameras,
    equipment,
    tasks,
    alertes,
    transactions,
    documents,
    businessEvents,
    people,
    teams: getRhDirectory().teams || [],
  }), [sensors, cameras, equipment, tasks, alertes, transactions, documents, businessEvents]);

  const workflowHandlers = {
    onUpdateSensor: props.onUpdateSensor || sensorCrud.update,
    onUpdateCamera: props.onUpdateCamera || cameraCrud.update,
    onUpdateEquipment: props.onUpdateEquipment || eqCrud.update,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateTrace: props.onCreateTrace,
  };

  const refreshWorkflow = async () => {
    await Promise.allSettled([
      sensorCrud.refresh?.(),
      cameraCrud.refresh?.(),
      eqCrud.refresh?.(),
      tasksCrud.refresh?.(),
      alertsCrud.refresh?.(),
      eventsCrud.refresh?.(),
    ]);
  };

  const devicePanel = (
    <SmartFarmDevicePanel
      sensors={sensors}
      cameras={cameras}
      context={workflowContext}
      handlers={workflowHandlers}
      onSuccess={refreshWorkflow}
    />
  );

  return (
    <div className="space-y-6">
      <RessourcesRepairPanel
        equipment={equipment}
        sensors={sensors}
        cameras={cameras}
        tasks={tasks}
        alertes={alertes}
        transactions={transactions}
        documents={documents}
        people={people}
        businessEvents={businessEvents}
        onRefresh={refreshWorkflow}
      />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Terrain connecté</p>
        <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Smart Farm</h1>
        <p className="mt-1 text-sm text-[#8a7456]">Capteurs, caméras, signaux offline et impacts automatiques.</p>
        {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
      </section>
      <ModuleTabsBar moduleId="smartfarm" active={tab} onChange={setTab} />
      {tab === 'Résumé' ? (
        <div className="space-y-4">
          <SmartFarmZoneOverview
            sensors={sensors}
            cameras={cameras}
            meteo={props.meteo}
            online={props.online}
            onCreateSensor={props.onCreateSensor || sensorCrud.create}
            onCreateCamera={props.onCreateCamera || cameraCrud.create}
          />
          {devicePanel}
        </div>
      ) : null}
      {tab === 'Capteurs' ? (
        <div className="space-y-4">
          {devicePanel}
          <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 text-sm text-[#7d6a4a]">
            {sensors.length} capteur(s) enregistré(s).
          </div>
        </div>
      ) : null}
      {tab === 'Caméras' ? (
        <div className="space-y-4">
          {devicePanel}
          <div className="rounded-2xl border border-[#eadcc2] bg-white p-4 text-sm text-[#7d6a4a]">
            {cameras.length} caméra(s) enregistrée(s).
          </div>
        </div>
      ) : null}
      {tab === 'Annexe' ? (
        <ModuleAnnexeTab
          moduleId="smartfarm"
          dataMap={{
            ...props.dataMap,
            sensor_devices: sensors,
            camera_devices: cameras,
            smartfarm_events: props.dataMap?.smartfarm_events || [],
          }}
          onNavigate={props.onNavigate}
        />
      ) : null}
      {tab === 'Graphiques' ? (
        <ModuleGraphiquesTab
          moduleId="smartfarm"
          periodFiltered={periodFiltered}
          equipements={equipment}
          transactions={transactions}
          onNavigate={props.onNavigate}
        />
      ) : null}
    </div>
  );
}
