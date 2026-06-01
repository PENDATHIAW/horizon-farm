import { Bell, BrainCircuit, Wrench, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../components/module/ModuleListHub.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createMaintenanceTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import { getRhDirectory } from '../utils/rhDirectory';
import { aggregateMaintenanceQueue, buildRhCoherenceRows, buildRhHealthSnapshot, computePayrollSummary } from './rh/rhVisionHelpers.js';
import RHPeopleTeams from './RHPeopleTeams.jsx';
import EquipementsV2 from './EquipementsV2.jsx';
import RhPayrollFinanceSyncPanel from './RhPayrollFinanceSyncPanel.jsx';
import SmartFarm from './SmartFarm.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const low = (v) => String(v || '').toLowerCase();
const n = (v = 0) => Number(v || 0);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.cout ?? r.cost);
const isRisk = (r = {}) => ['panne', 'maintenance', 'hors_service', 'offline', 'hors_ligne'].includes(low(r.status || r.statut || r.etat)) || r.online === false;
const isRhDoc = (r = {}) => /rh|equipe|équipe|equipement|maintenance|ressource/.test(low(`${r.module_source || ''} ${r.type || ''} ${r.categorie || ''} ${r.title || ''}`));
const isRhCost = (r = {}) => /equipement|maintenance|rh|salaire|personnel|ressource/.test(low(`${r.categorie || ''} ${r.libelle || ''} ${r.type || ''}`));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Section({ icon: Icon, title, children, action }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{action}</div>{children}</section>;
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="rh" active={active} onChange={onChange} />;
}

function RhIaPanel({ findings = [], predictions = [], onApply, busyId, setTab }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Surveillance IA ressources">
      <p className="mb-3 text-sm text-[#8a7456]">Équipements, maintenance, affectations équipe, coûts RH et documents croisés.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setTab(f.equipment_id ? 'Maintenance' : 'Affectations')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Voir</button>
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : 'Créer tâche'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><b>{p.title}</b><p className="text-xs text-[#8a7456]">{p.description}</p></div>
        ))}
      </div>
    </Section>
  );
}

function CoherencePanel({ rows = [], onApply, busyId, setTab }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab(row.type === 'maintenance' ? 'Maintenance' : row.type === 'affectation' ? 'Affectations' : row.type === 'preuve' ? 'Documents' : 'Coûts')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}

function MaintenanceQueuePanel({ queue = [], onSchedule, busyId, setTab }) {
  if (!queue.length) return null;
  return (
    <Section icon={Wrench} title="Maintenance prioritaire">
      {queue.slice(0, 6).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab('Équipements')} className="text-left"><b className="text-[#2f2415]">{row.name}</b><p className="text-xs text-[#8a7456]">{row.status}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => onSchedule?.(row)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === row.id ? '…' : 'Créer tâche'}</button>
        </div>
      ))}
    </Section>
  );
}

function Summary({ data, setTab, onApply, onSchedule, busyId, payrollHandlers = {} }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé RH" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <Stat label="Équipe active" value={fmtNumber(data.payroll.headcount)} tone="good" />
        <Stat label="Masse salariale" value={fmtCurrency(data.payroll.gross)} tone="warn" />
        <Stat label="Équipements" value={fmtNumber(data.equipment.length)} />
        <Stat label="Maintenance" value={fmtNumber(data.equipmentRisk.length)} tone={data.equipmentRisk.length ? 'warn' : 'good'} />
        <Stat label="Coûts liés" value={fmtCurrency(data.costTotal)} tone="warn" />
        <Stat label="Signaux IA" value={fmtNumber(data.healthFindings.length)} tone={data.healthFindings.length ? 'warn' : 'good'} />
        <Stat label="Documents" value={fmtNumber(data.documents.length)} />
      </div>
      <RhIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} setTab={setTab} />
      <RhPayrollFinanceSyncPanel team={data.team} transactions={data.transactions} {...payrollHandlers} />
      <MaintenanceQueuePanel queue={data.maintenanceQueue} onSchedule={onSchedule} busyId={busyId} setTab={setTab} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} setTab={setTab} />
      <Section icon={Bell} title="Parcours ressources">
        <p className="text-sm text-[#8a7456]">Équipements, maintenance, affectations, coûts et documents interconnectés avec finance et activité.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <button type="button" onClick={() => { emitHorizonForm('equipements', 'equipment_action', 'Maintenance équipement', { date: new Date().toISOString().slice(0, 10), action_type: 'maintenance' }); setTab('Équipements'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Maintenance</b><p className="mt-1 text-sm text-[#8a7456]">Panne ou entretien.</p></button>
          {['Équipements', 'Maintenance', 'Affectations', 'Coûts', 'Documents'].map((label) => (
            <button key={label} type="button" onClick={() => setTab(label)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">{label}</button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function MaintenanceHub({ data, setTab, smartProps, onSchedule, busyId }) {
  return (
    <div className="space-y-5">
      <ModuleListHub
        title="Maintenance & pannes"
        intro="Équipements en maintenance, hors service ou capteurs offline."
        stats={[
          { label: 'À maintenir', value: fmtNumber(data.equipmentRisk.length), tone: data.equipmentRisk.length ? 'warn' : 'good' },
          { label: 'Sans tâche', value: fmtNumber(data.maintenanceQueue.length), tone: data.maintenanceQueue.length ? 'warn' : 'good' },
          { label: 'Équipements', value: fmtNumber(data.equipment.length) },
          { label: 'Capteurs', value: fmtNumber(data.sensors.length) },
        ]}
        rows={data.equipmentRisk.map((row) => ({
          id: row.id,
          title: row.nom || row.name || row.libelle || 'Équipement',
          detail: `${row.status || row.statut || row.etat || '—'} · maintenance`,
          value: row.type || row.categorie || 'Équipement',
          onClick: () => setTab('Équipements'),
        }))}
        emptyLabel="Aucun équipement en maintenance."
      />
      <MaintenanceQueuePanel queue={data.maintenanceQueue} onSchedule={onSchedule} busyId={busyId} setTab={setTab} />
      <SmartFarm {...smartProps} />
    </div>
  );
}

function CostsHub({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Coûts ressources"
      intro="Dépenses liées aux équipements, maintenance et personnel."
      stats={[
        { label: 'Coût total', value: fmtCurrency(data.costTotal), tone: 'warn' },
        { label: 'Masse salariale', value: fmtCurrency(data.payroll.gross), tone: 'warn' },
        { label: 'Mouvements', value: fmtNumber(data.costRows.length) },
        { label: 'Équipe', value: fmtNumber(data.team.length) },
      ]}
      rows={data.costRows.map((row) => ({
        id: row.id,
        title: row.libelle || row.title || 'Coût',
        detail: `${row.date || row.created_at || '—'} · ${row.categorie || row.type || 'Charge'}`,
        value: fmtCurrency(amount(row)),
        module: 'finance_pilotage',
      }))}
      emptyLabel="Aucun coût ressource enregistré."
      onNavigate={onNavigate}
    />
  );
}

function DocumentsHub({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Documents ressources"
      intro="Contrats, fiches équipements, maintenance et pièces RH."
      stats={[
        { label: 'Documents', value: fmtNumber(data.documents.length) },
        { label: 'Équipements', value: fmtNumber(data.equipment.length) },
        { label: 'Équipe', value: fmtNumber(data.team.length) },
        { label: 'Maintenance', value: fmtNumber(data.equipmentRisk.length), tone: data.equipmentRisk.length ? 'warn' : 'good' },
      ]}
      rows={data.documents.map((row) => ({
        id: row.id || row.title,
        title: row.title || row.nom || row.name || 'Document',
        detail: `${row.type || row.categorie || 'Doc'} · ${row.module_source || 'Ressources'}`,
        module: 'documents_rapports',
      }))}
      emptyLabel="Aucun document ressource."
      onNavigate={onNavigate}
    />
  );
}

export default function OperationsRessourcesRecoveredModule(props) {
  const [tab, setTab] = useState('Résumé');
  const [busyId, setBusyId] = useState(null);
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

  useEffect(() => {
    const sync = () => setDirectoryPeople(getRhDirectory().people || []);
    window.addEventListener('horizon-farm-rh-updated', sync);
    return () => window.removeEventListener('horizon-farm-rh-updated', sync);
  }, []);

  const crudTeam = rowsOf(props.equipe || props.rh, rhCrud, false);
  const team = crudTeam.length ? crudTeam : directoryPeople;
  const equipment = rowsOf(props.equipements, eqCrud, false);
  const sensors = rowsOf(props.sensorDevices, sensorCrud, false);
  const cameras = rowsOf(props.cameraDevices, cameraCrud, false);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const allDocuments = rowsOf(props.documents, docsCrud, periodFiltered);
  const documents = allDocuments.filter(isRhDoc);
  const tasks = rowsOf(props.tasks || props.taches, tasksCrud, false);
  const alertes = rowsOf(props.alertes, alertsCrud, false);

  const shared = {
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
  };

  const smartProps = {
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
  };

  const data = useMemo(() => {
    const costRows = transactions.filter(isRhCost);
    const equipmentRisk = equipment.filter(isRisk);
    const healthSnap = buildRhHealthSnapshot({ team, equipment, transactions, tasks, alertes });
    const coherenceRows = buildRhCoherenceRows(team, equipment, transactions, tasks, allDocuments);
    const maintenanceQueue = aggregateMaintenanceQueue(equipment, tasks);
    const payroll = computePayrollSummary(team);
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
    };
  }, [team, equipment, sensors, cameras, documents, transactions, tasks, alertes, allDocuments]);

  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  };

  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else { toast.success('Onglet ouvert'); setTab('Maintenance'); }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const scheduleMaintenance = async (row) => {
    setBusyId(row.id);
    try {
      await createMaintenanceTask({
        equipmentName: row.name,
        equipmentId: row.id,
        statusLabel: row.status,
        handlers: actionHandlers,
      });
      toast.success(`Tâche maintenance créée pour ${row.name}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const rhProps = {
    ...shared,
    onRefresh: props.onRefreshRh || props.onRefresh,
    onCreateFinanceTransaction: shared.onCreateFinanceTransaction,
    onRefreshFinances: shared.onRefreshFinances,
    onCreateDocument: shared.onCreateDocument,
    onRefreshDocuments: shared.onRefreshDocuments,
    onCreateTask: shared.onCreateTask,
    onRefreshTasks: shared.onRefreshTasks,
    onCreateBusinessEvent: shared.onCreateBusinessEvent,
    onRefreshBusinessEvents: shared.onRefreshBusinessEvents,
  };
  const eqProps = { ...shared, rows: equipment, onCreate: props.onCreateEquipment || eqCrud.create, onUpdate: props.onUpdateEquipment || eqCrud.update, onDelete: props.onDeleteEquipment || eqCrud.remove, onRefresh: props.onRefreshEquipment || eqCrud.refresh };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Ressources</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Opérations & Ressources</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Équipements, maintenance, affectations — cohérence IA coûts et ressources.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} onApply={applyFinding} onSchedule={scheduleMaintenance} busyId={busyId} payrollHandlers={{
        onCreateFinanceTransaction: shared.onCreateFinanceTransaction,
        onCreateDocument: shared.onCreateDocument,
        onCreateBusinessEvent: shared.onCreateBusinessEvent,
        onRefreshFinances: shared.onRefreshFinances,
        onRefreshDocuments: shared.onRefreshDocuments,
        onRefreshBusinessEvents: shared.onRefreshBusinessEvents,
      }} />
        : tab === 'Équipements' ? <EquipementsV2 {...eqProps} />
          : tab === 'Maintenance' ? <MaintenanceHub data={data} setTab={setTab} smartProps={smartProps} onSchedule={scheduleMaintenance} busyId={busyId} />
            : tab === 'Affectations' ? <RHPeopleTeams {...rhProps} />
              : tab === 'Coûts' ? <CostsHub data={data} onNavigate={props.onNavigate} />
                : tab === 'Documents' ? <DocumentsHub data={data} onNavigate={props.onNavigate} />
                  : <ModuleGraphiquesTab moduleId="rh" periodFiltered={periodFiltered} equipements={equipment} transactions={transactions} onNavigate={props.onNavigate} />}
    </div>
  );
}
