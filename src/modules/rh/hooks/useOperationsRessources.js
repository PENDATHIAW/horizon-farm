import { useCallback, useEffect, useMemo, useState } from 'react';
import useCrudModule from '../../../hooks/useCrudModule';
import { rowsOf } from '../../../utils/moduleRows';
import { getRhDirectory } from '../../../utils/rhDirectory';
import {
  aggregateMaintenanceQueue,
  buildRhCoherenceRows,
  buildRhHealthSnapshot,
  computePayrollSummary,
} from '../rhVisionHelpers.js';

const arr = (v) => (Array.isArray(v) ? v : []);
const low = (v) => String(v || '').toLowerCase();
const n = (v = 0) => Number(v || 0);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.cout ?? r.cost);
const isRisk = (r = {}) =>
  ['panne', 'maintenance', 'hors_service', 'offline', 'hors_ligne'].includes(low(r.status || r.statut || r.etat))
  || r.online === false;
const isRhDoc = (r = {}) =>
  /rh|equipe|équipe|equipement|maintenance|ressource/.test(low(`${r.module_source || ''} ${r.type || ''} ${r.categorie || ''} ${r.title || ''}`));
const isRhCost = (r = {}) =>
  /equipement|maintenance|rh|salaire|personnel|ressource/.test(low(`${r.categorie || ''} ${r.libelle || ''} ${r.type || ''}`));

function readRhCache(farmId = 'default') {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`horizon_cache_rh_${farmId}`);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRhCache(farmId = 'default', rows = []) {
  if (typeof window === 'undefined' || !rows.length) return;
  try {
    window.localStorage.setItem(`horizon_cache_rh_${farmId}`, JSON.stringify(rows));
  } catch {
    /* cache non bloquant */
  }
}

export function useOperationsRessources(props = {}) {
  const farmId = props.farmId || props.farm?.id || 'default';
  const [directoryPeople, setDirectoryPeople] = useState(() => getRhDirectory().people || []);

  const rhCrud = useCrudModule('rh');
  const eqCrud = useCrudModule('equipements');
  const sensorCrud = useCrudModule('sensor_devices');
  const cameraCrud = useCrudModule('camera_devices');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const financesCrud = useCrudModule('finances');
  const docsCrud = useCrudModule('documents');
  const eventsCrud = useCrudModule('business_events');

  const periodFiltered = Boolean(props.periodFiltered);
  const crudTeam = rowsOf(props.equipe || props.rh, rhCrud, false);
  const cachedTeam = readRhCache(farmId);
  const directoryFallback = directoryPeople.length ? directoryPeople : (getRhDirectory().people || []);
  const team = crudTeam.length ? crudTeam : (cachedTeam.length ? cachedTeam : directoryFallback);

  const equipment = rowsOf(props.equipements, eqCrud, false);
  const sensors = rowsOf(props.sensorDevices, sensorCrud, false);
  const cameras = rowsOf(props.cameraDevices, cameraCrud, false);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const allDocuments = rowsOf(props.documents, docsCrud, periodFiltered);
  const documents = allDocuments.filter(isRhDoc);
  const tasks = rowsOf(props.tasks || props.taches, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);

  useEffect(() => {
    const sync = () => setDirectoryPeople(getRhDirectory().people || []);
    window.addEventListener('horizon-farm-rh-updated', sync);
    return () => window.removeEventListener('horizon-farm-rh-updated', sync);
  }, []);

  useEffect(() => {
    if (crudTeam.length) writeRhCache(farmId, crudTeam);
  }, [crudTeam, farmId]);

  const shared = useMemo(() => ({
    ...props,
    equipements: equipment,
    transactions,
    documents: allDocuments,
    tasks,
    taches: tasks,
    alertes,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,
    onCreateDocument: props.onCreateDocument || docsCrud.create,
    onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  }), [props, equipment, transactions, allDocuments, tasks, alertes, tasksCrud, alertsCrud, financesCrud, docsCrud, eventsCrud]);

  const smartProps = useMemo(() => ({
    ...shared,
    meteo: props.meteo,
    online: props.online,
    sensors,
    cameras,
    sensorLoading: sensorCrud.loading,
    cameraLoading: cameraCrud.loading,
    onCreateSensor: props.onCreateSensor || sensorCrud.create,
    onUpdateSensor: props.onUpdateSensor || sensorCrud.update,
    onDeleteSensor: props.onDeleteSensor || sensorCrud.remove,
    onRefreshSensors: props.onRefreshSensors || sensorCrud.refresh,
    onCreateCamera: props.onCreateCamera || cameraCrud.create,
    onUpdateCamera: props.onUpdateCamera || cameraCrud.update,
    onDeleteCamera: props.onDeleteCamera || cameraCrud.remove,
    onRefreshCameras: props.onRefreshCameras || cameraCrud.refresh,
  }), [shared, props, sensors, cameras, sensorCrud, cameraCrud]);

  const data = useMemo(() => {
    const costRows = transactions.filter(isRhCost);
    const equipmentRisk = equipment.filter(isRisk);
    const healthSnap = buildRhHealthSnapshot({ team, equipment, transactions, tasks, alertes });
    const coherenceRows = buildRhCoherenceRows(team, equipment, transactions, tasks, allDocuments);
    const maintenanceQueue = aggregateMaintenanceQueue(equipment, tasks);
    const payroll = computePayrollSummary(team);
    const pendingMaintenanceCount = maintenanceQueue.length + equipmentRisk.length;

    return {
      team,
      equipment,
      equipmentRisk,
      sensors,
      cameras,
      documents,
      costRows,
      costTotal: costRows.reduce((s, r) => s + amount(r), 0),
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      maintenanceQueue,
      payroll,
      pendingMaintenanceCount,
      staffCount: team.length,
      personnelBadgeCount: coherenceRows.filter((row) => row.type === 'affectation').length,
      registresBadgeCount: coherenceRows.filter((row) => row.type !== 'maintenance' && row.type !== 'affectation').length,
    };
  }, [team, equipment, sensors, cameras, documents, transactions, tasks, alertes, allDocuments]);

  const actionHandlers = useMemo(() => ({
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  }), [props, tasksCrud, alertsCrud, eventsCrud]);

  const rhProps = useMemo(() => ({
    ...shared,
    team: data.team,
    onRefresh: props.onRefreshRh || props.onRefresh,
    onCreateFinanceTransaction: shared.onCreateFinanceTransaction,
    onRefreshFinances: shared.onRefreshFinances,
    onCreateDocument: shared.onCreateDocument,
    onRefreshDocuments: shared.onRefreshDocuments,
    onCreateTask: shared.onCreateTask,
    onRefreshTasks: shared.onRefreshTasks,
    onCreateBusinessEvent: shared.onCreateBusinessEvent,
    onRefreshBusinessEvents: shared.onRefreshBusinessEvents,
  }), [shared, props, data.team]);

  const eqProps = useMemo(() => ({
    ...shared,
    rows: equipment,
    onCreate: props.onCreateEquipment || eqCrud.create,
    onUpdate: props.onUpdateEquipment || eqCrud.update,
    onDelete: props.onDeleteEquipment || eqCrud.remove,
    onRefresh: props.onRefreshEquipment || eqCrud.refresh,
  }), [shared, props, equipment, eqCrud]);

  const refresh = useCallback(async () => {
    await Promise.allSettled([
      rhCrud.refresh?.(),
      eqCrud.refresh?.(),
      tasksCrud.refresh?.(),
      financesCrud.refresh?.(),
      docsCrud.refresh?.(),
      props.onRefresh?.(),
    ]);
  }, [rhCrud, eqCrud, tasksCrud, financesCrud, docsCrud, props]);

  const loading = rhCrud.loading || eqCrud.loading;

  return {
    data,
    shared,
    smartProps,
    rhProps,
    eqProps,
    actionHandlers,
    refresh,
    loading,
    crud: { rhCrud, eqCrud, tasksCrud, financesCrud, docsCrud },
  };
}
