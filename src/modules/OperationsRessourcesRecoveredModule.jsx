import { LayoutDashboard, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../components/module/ModuleListHub.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber } from '../utils/format';
import RHV2 from './RHV2.jsx';
import EquipementsV2 from './EquipementsV2.jsx';
import SmartFarm from './SmartFarm.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const low = (v) => String(v || '').toLowerCase();
const n = (v = 0) => Number(v || 0);
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.cout ?? r.cost);
const isRisk = (r = {}) => ['panne', 'maintenance', 'hors_service', 'offline', 'hors_ligne'].includes(low(r.status || r.statut || r.etat)) || r.online === false;
const isRhDoc = (r = {}) => /rh|equipe|équipe|equipement|maintenance|ressource/.test(low(`${r.module_source || ''} ${r.type || ''} ${r.categorie || ''} ${r.title || ''}`));
const isRhCost = (r = {}) => /equipement|maintenance|rh|salaire|personnel|ressource/.test(low(`${r.categorie || ''} ${r.libelle || ''} ${r.type || ''}`));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="rh" active={active} onChange={onChange} />;
}
function Summary({ data, setTab }) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        <Stat label="Équipe" value={data.team.length} />
        <Stat label="Équipements" value={data.equipment.length} />
        <Stat label="Maintenance" value={data.equipmentRisk.length} tone={data.equipmentRisk.length ? 'warn' : 'good'} />
        <Stat label="Coûts liés" value={fmtCurrency(data.costTotal)} tone="warn" />
        <Stat label="Documents" value={data.documents.length} />
        <Stat label="Capteurs" value={data.sensors.length} />
      </div>
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2f2415]">Ressources & équipements</h2>
        <p className="mt-2 text-sm text-[#8a7456]">Équipements, maintenance, affectations RH, coûts, documents et graphiques de suivi.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {['Équipements', 'Maintenance', 'Affectations', 'Coûts', 'Documents', 'Graphiques'].map((label) => (
            <button key={label} type="button" onClick={() => setTab(label)} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">{label}</button>
          ))}
        </div>
      </section>
    </div>
  );
}
function MaintenanceHub({ data, setTab, smartProps }) {
  return (
    <div className="space-y-5">
      <ModuleListHub
        title="Maintenance & pannes"
        intro="Équipements en maintenance, hors service ou capteurs offline."
        stats={[
          { label: 'À maintenir', value: fmtNumber(data.equipmentRisk.length), tone: data.equipmentRisk.length ? 'warn' : 'good' },
          { label: 'Équipements', value: fmtNumber(data.equipment.length) },
          { label: 'Capteurs', value: fmtNumber(data.sensors.length) },
          { label: 'Caméras', value: fmtNumber(data.cameras.length) },
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
        { label: 'Mouvements', value: fmtNumber(data.costRows.length) },
        { label: 'Équipements', value: fmtNumber(data.equipment.length) },
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
  const rhCrud = useCrudModule('rh');
  const eqCrud = useCrudModule('equipements');
  const sensorCrud = useCrudModule('sensor_devices');
  const cameraCrud = useCrudModule('camera_devices');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const financesCrud = useCrudModule('finances');
  const docsCrud = useCrudModule('documents');
  const eventsCrud = useCrudModule('business_events');
  const team = rowsOf(props.equipe || props.rh, rhCrud);
  const equipment = rowsOf(props.equipements, eqCrud);
  const sensors = rowsOf(props.sensorDevices, sensorCrud);
  const cameras = rowsOf(props.cameraDevices, cameraCrud);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud);
  const documents = rowsOf(props.documents, docsCrud).filter(isRhDoc);
  const shared = { ...props, equipements: equipment, transactions, documents: rowsOf(props.documents, docsCrud), tasks: rowsOf(props.tasks || props.taches, tasksCrud), taches: rowsOf(props.tasks || props.taches, tasksCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const smartProps = { ...shared, meteo: props.meteo, online: props.online, sensors, cameras, sensorLoading: sensorCrud.loading, cameraLoading: cameraCrud.loading, onCreateSensor: props.onCreateSensor || sensorCrud.create, onUpdateSensor: props.onUpdateSensor || sensorCrud.update, onDeleteSensor: props.onDeleteSensor || sensorCrud.remove, onRefreshSensors: props.onRefreshSensors || sensorCrud.refresh, onCreateCamera: props.onCreateCamera || cameraCrud.create, onUpdateCamera: props.onUpdateCamera || cameraCrud.update, onDeleteCamera: props.onDeleteCamera || cameraCrud.remove, onRefreshCameras: props.onRefreshCameras || cameraCrud.refresh };
  const data = useMemo(() => {
    const costRows = transactions.filter(isRhCost);
    return {
      team,
      equipment,
      equipmentRisk: equipment.filter(isRisk),
      sensors,
      cameras,
      documents,
      costRows,
      costTotal: costRows.reduce((s, r) => s + amount(r), 0),
    };
  }, [team, equipment, sensors, cameras, documents, transactions]);
  const rhProps = { ...shared, rows: team, onCreate: props.onCreateRh || rhCrud.create, onUpdate: props.onUpdateRh || rhCrud.update, onDelete: props.onDeleteRh || rhCrud.remove, onRefresh: props.onRefreshRh || rhCrud.refresh };
  const eqProps = { ...shared, rows: equipment, onCreate: props.onCreateEquipment || eqCrud.create, onUpdate: props.onUpdateEquipment || eqCrud.update, onDelete: props.onDeleteEquipment || eqCrud.remove, onRefresh: props.onRefreshEquipment || eqCrud.refresh };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Ressources</p>
        <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Opérations & Ressources</h1>
        <p className="mt-1 text-sm text-[#8a7456]">Équipements, maintenance, affectations, coûts, documents et graphiques.</p>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Résumé' ? <Summary data={data} setTab={setTab} />
        : tab === 'Équipements' ? <EquipementsV2 {...eqProps} />
          : tab === 'Maintenance' ? <MaintenanceHub data={data} setTab={setTab} smartProps={smartProps} />
            : tab === 'Affectations' ? <RHV2 {...rhProps} />
              : tab === 'Coûts' ? <CostsHub data={data} onNavigate={props.onNavigate} />
                : tab === 'Documents' ? <DocumentsHub data={data} onNavigate={props.onNavigate} />
                  : <ModuleGraphiquesTab moduleId="rh" equipements={equipment} transactions={transactions} onNavigate={props.onNavigate} />}
    </div>
  );
}
