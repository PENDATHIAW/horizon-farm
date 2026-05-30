import { Camera, LayoutDashboard, UserCog, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import useCrudModule from '../hooks/useCrudModule';
import RHV2 from './RHV2.jsx';
import EquipementsV2 from './EquipementsV2.jsx';
import SmartFarm from './SmartFarm.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const rowsOf = (provided, crud) => arr(provided).length ? arr(provided) : arr(crud?.rows);
const low = (v) => String(v || '').toLowerCase();
const isRisk = (r = {}) => ['panne', 'maintenance', 'hors_service', 'offline', 'hors_ligne'].includes(low(r.status || r.statut || r.etat)) || r.online === false;

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'warn' ? 'text-amber-600' : tone === 'good' ? 'text-emerald-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange }) {
  const tabs = [['Résumé', LayoutDashboard], ['Équipe', UserCog], ['Équipements', Wrench], ['Smart Farm', Camera]];
  return <div className="overflow-x-auto"><div className="flex min-w-max gap-2 rounded-2xl border border-[#d6c3a0] bg-white p-2">{tabs.map(([tab, Icon]) => <button key={tab} type="button" onClick={() => onChange(tab)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${active === tab ? 'bg-[#22c55e] text-[#052e16]' : 'text-[#8a7456] hover:bg-[#fffdf8] hover:text-[#2f2415]'}`}><Icon size={16} />{tab}</button>)}</div></div>;
}
function Summary({ data, setTab }) {
  return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-5"><Stat label="Équipe" value={data.team.length} /><Stat label="Équipements" value={data.equipment.length} /><Stat label="Maintenance" value={data.equipmentRisk.length} tone={data.equipmentRisk.length ? 'warn' : 'good'} /><Stat label="Capteurs" value={data.sensors.length} /><Stat label="Caméras" value={data.cameras.length} /></div><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">Workflows ressources récupérés</h2><p className="mt-2 text-sm text-[#8a7456]">RH, équipements, maintenance, achats équipements, pannes, coûts, tâches, alertes, capteurs, caméras et sécurité terrain sont conservés via les anciens moteurs riches.</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3"><button type="button" onClick={() => setTab('Équipe')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">Équipe</button><button type="button" onClick={() => setTab('Équipements')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">Équipements</button><button type="button" onClick={() => setTab('Smart Farm')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left font-black text-[#2f2415]">Smart Farm</button></div></section></div>;
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
  const data = useMemo(() => ({ team, equipment, equipmentRisk: equipment.filter(isRisk), sensors, cameras }), [team, equipment, sensors, cameras]);
  const shared = { ...props, equipements: equipment, transactions: rowsOf(props.transactions || props.finances, financesCrud), documents: rowsOf(props.documents, docsCrud), tasks: rowsOf(props.tasks || props.taches, tasksCrud), taches: rowsOf(props.tasks || props.taches, tasksCrud), alertes: rowsOf(props.alertes, alertsCrud), onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || docsCrud.create, onRefreshDocuments: props.onRefreshDocuments || docsCrud.refresh, onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: props.onNavigate };
  const rhProps = { ...shared, rows: team, onCreate: props.onCreateRh || rhCrud.create, onUpdate: props.onUpdateRh || rhCrud.update, onDelete: props.onDeleteRh || rhCrud.remove, onRefresh: props.onRefreshRh || rhCrud.refresh };
  const eqProps = { ...shared, rows: equipment, onCreate: props.onCreateEquipment || eqCrud.create, onUpdate: props.onUpdateEquipment || eqCrud.update, onDelete: props.onDeleteEquipment || eqCrud.remove, onRefresh: props.onRefreshEquipment || eqCrud.refresh };
  const smartProps = { ...shared, meteo: props.meteo, online: props.online, sensors, cameras, sensorLoading: sensorCrud.loading, cameraLoading: cameraCrud.loading, onCreateSensor: props.onCreateSensor || sensorCrud.create, onUpdateSensor: props.onUpdateSensor || sensorCrud.update, onDeleteSensor: props.onDeleteSensor || sensorCrud.remove, onRefreshSensors: props.onRefreshSensors || sensorCrud.refresh, onCreateCamera: props.onCreateCamera || cameraCrud.create, onUpdateCamera: props.onUpdateCamera || cameraCrud.update, onDeleteCamera: props.onDeleteCamera || cameraCrud.remove, onRefreshCameras: props.onRefreshCameras || cameraCrud.refresh };
  return <div className="space-y-6"><section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Ressources</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Opérations & Ressources</h1><p className="mt-1 text-sm text-[#8a7456]">Équipe, équipements, maintenance, capteurs, caméras et sécurité terrain.</p></section><Tabs active={tab} onChange={setTab} />{tab === 'Résumé' ? <Summary data={data} setTab={setTab} /> : tab === 'Équipe' ? <RHV2 {...rhProps} /> : tab === 'Équipements' ? <EquipementsV2 {...eqProps} /> : <SmartFarm {...smartProps} />}</div>;
}
