import { AlertTriangle, Gauge, Settings, Wrench } from 'lucide-react';
import { useCallback, useState } from 'react';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { resolveModuleTab } from '../config/moduleTabs/index.js';
import { fmtCurrency } from '../utils/format.js';
import { buildEquipmentPurchaseWorkflow, equipmentFinanceCosts } from '../utils/equipmentWorkflows.js';
import EquipementAcquisitionForm from './equipements/EquipementAcquisitionForm.jsx';
import EquipementsEvolution from './EquipementsEvolution.jsx';
import EquipementsQuickActionsBridge from './EquipementsQuickActionsBridge.jsx';

const rows = (value) => (Array.isArray(value) ? value : []);
const nameOf = (row = {}) => row.name || row.nom || row.libelle || row.id || 'Équipement';
const statusOf = (row = {}) => String(row.status || row.statut || '').toLowerCase();
const resolveTab = (value) => resolveModuleTab('equipements', value)?.component || 'EquipmentFleetView';

function Panel({ title, subtitle, children }) {
  return <section className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="font-black text-[#2f2415]">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}<div className="mt-4">{children}</div></section>;
}

function EquipmentRows({ items = [], transactions = [], showCost = false }) {
  return items.length ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead><tr className="border-b border-[#eadcc2] text-left text-xs uppercase text-[#8a7456]"><th className="px-3 py-2">Équipement</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Achat</th>{showCost ? <th className="px-3 py-2">Coûts Finance</th> : null}<th className="px-3 py-2">Maintenance</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} className="border-b border-[#eadcc2]/70"><td className="px-3 py-3 font-black text-[#2f2415]">{nameOf(item)}</td><td className="px-3 py-3 text-[#6f6048]">{item.type || item.categorie || '—'}</td><td className="px-3 py-3"><span className={`font-bold ${statusOf(item) === 'panne' || statusOf(item) === 'hors_service' ? 'text-red-700' : statusOf(item) === 'maintenance' ? 'text-amber-700' : 'text-emerald-700'}`}>{item.status || item.statut || 'Non renseigné'}</span></td><td className="px-3 py-3 text-[#6f6048]">{String(item.purchase_date || item.date_achat || '—').slice(0, 10)}</td>{showCost ? <td className="px-3 py-3 font-black text-[#2f2415]">{fmtCurrency(equipmentFinanceCosts(transactions, item.id))}</td> : null}<td className="px-3 py-3 text-[#6f6048]">{String(item.maintenance_due || item.prochaine_maintenance || '—').slice(0, 10)}</td></tr>)}</tbody>
      </table>
    </div>
  ) : <p className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucun équipement dans cette vue.</p>;
}

export default function EquipementsOperationalModule(props) {
  const controlled = Boolean(props.onTabChange);
  const onTabChange = props.onTabChange;
  const [internalTab, setInternalTab] = useState(() => resolveTab(props.initialTab));
  const tab = controlled ? resolveTab(props.initialTab) : internalTab;
  const equipment = rows(props.rows);
  const transactions = rows(props.transactions || props.finances);
  const documents = rows(props.documents);
  const unavailable = equipment.filter((item) => ['panne', 'hors_service', 'maintenance'].includes(statusOf(item)));

  const setTab = useCallback((value) => {
    const resolved = resolveTab(value);
    if (controlled) onTabChange?.(value || resolved);
    else setInternalTab(resolved);
  }, [controlled, onTabChange]);

  const createAcquisition = async (payload) => {
    const supplier = rows(props.fournisseurs || props.suppliers).find((row) => String(row.id) === String(payload.fournisseur_id)) || {};
    const workflow = buildEquipmentPurchaseWorkflow({ payload, supplier, date: payload.date_achat });
    if (!workflow.financeTransaction || !workflow.document?.file_url) throw new Error('Dépense et preuve obligatoires pour une acquisition.');
    await props.onCreate?.(workflow.equipment);
    await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    await props.onCreateDocument?.(workflow.document);
    await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.(), props.onRefreshDocuments?.(), props.onRefreshBusinessEvents?.()]);
  };

  const quickActionProps = {
    rows: equipment,
    tasks: rows(props.tasks),
    alertes: rows(props.alertes),
    transactions,
    documents,
    onUpdate: props.onUpdate,
    onRefresh: props.onRefresh,
    onCreateTask: props.onCreateTask,
    onUpdateTask: props.onUpdateTask,
    onRefreshTasks: props.onRefreshTasks,
    onCreateAlert: props.onCreateAlert,
    onUpdateAlert: props.onUpdateAlert,
    onRefreshAlertes: props.onRefreshAlertes,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction,
    onRefreshFinances: props.onRefreshFinances,
    onCreateDocument: props.onCreateDocument,
    onRefreshDocuments: props.onRefreshDocuments,
    onCreateBusinessEvent: props.onCreateBusinessEvent,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents,
  };

  const content = tab === 'EquipmentAcquisitionsView' ? (
    <div className="space-y-5"><EquipementAcquisitionForm suppliers={rows(props.fournisseurs || props.suppliers)} onSubmit={createAcquisition} /><Panel title="Acquisitions enregistrées" subtitle="Chaque ligne conserve le lien vers sa dépense et sa preuve."><EquipmentRows items={equipment.filter((item) => item.purchase_date || item.date_achat)} transactions={transactions} showCost /></Panel></div>
  ) : tab === 'EquipmentBreakdownsView' ? (
    <div className="space-y-5"><EquipementsQuickActionsBridge {...quickActionProps} allowedActions={['panne']} /><Panel title="Équipements indisponibles" subtitle="Une panne critique ouvre une alerte, une tâche de maintenance et rend l’équipement indisponible."><EquipmentRows items={equipment.filter((item) => ['panne', 'hors_service'].includes(statusOf(item)))} /></Panel></div>
  ) : tab === 'EquipmentRepairsView' ? (
    <div className="space-y-5"><EquipementsQuickActionsBridge {...quickActionProps} allowedActions={['repair', 'maintenance']} /><Panel title="Suivi des réparations" subtitle="La remise en service exige une date, un résultat, un responsable et une validation explicite."><EquipmentRows items={equipment.filter((item) => ['panne', 'maintenance', 'operationnel'].includes(statusOf(item)))} /></Panel></div>
  ) : tab === 'EquipmentCostsAvailabilityView' ? (
    <div className="space-y-5"><Panel title="Coûts et disponibilité" subtitle="Les coûts sont lus depuis les transactions Finance liées; aucune somme parallèle n’est stockée ici."><div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="border-l-4 border-[#22c55e] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Disponibles</p><p className="text-xl font-black text-[#2f2415]">{equipment.length - unavailable.length}</p></div><div className="border-l-4 border-red-500 bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Indisponibles</p><p className="text-xl font-black text-[#2f2415]">{unavailable.length}</p></div><div className="border-l-4 border-[#c9a96a] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Coûts Finance</p><p className="text-xl font-black text-[#2f2415]">{fmtCurrency(equipment.reduce((sum, item) => sum + equipmentFinanceCosts(transactions, item.id), 0))}</p></div><div className="border-l-4 border-[#9a6b12] bg-[#fffdf8] p-3"><p className="text-xs text-[#8a7456]">Taux disponible</p><p className="text-xl font-black text-[#2f2415]">{equipment.length ? Math.round(((equipment.length - unavailable.length) / equipment.length) * 100) : 0}%</p></div></div><EquipmentRows items={equipment} transactions={transactions} showCost /></Panel><EquipementsEvolution rows={equipment} tasks={rows(props.tasks)} transactions={transactions} /></div>
  ) : (
    <Panel title="Parc" subtitle="Machines, pompes, véhicules et équipements de production."><EquipmentRows items={equipment} /></Panel>
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><Settings className="text-[#9a6b12]" size={24} /><div><p className="text-xs font-black uppercase text-[#9a6b12]">Ressources techniques</p><h1 className="text-2xl font-black text-[#2f2415]">Équipements</h1><p className="text-sm text-[#8a7456]">Parc, acquisitions, pannes, réparations et disponibilité.</p></div></div><div className="flex gap-3 text-sm"><span className="inline-flex items-center gap-1 font-bold text-emerald-700"><Gauge size={16} />{equipment.length - unavailable.length} disponibles</span>{unavailable.length ? <span className="inline-flex items-center gap-1 font-bold text-red-700"><AlertTriangle size={16} />{unavailable.length} indisponibles</span> : <span className="inline-flex items-center gap-1 font-bold text-[#8a7456]"><Wrench size={16} />Aucune panne</span>}</div></div></header>
      <ModuleTabsBar moduleId="equipements" active={tab} onChange={setTab} tabBadges={{ pannes: equipment.filter((item) => statusOf(item) === 'panne').length, reparations: equipment.filter((item) => statusOf(item) === 'maintenance').length }} />
      {content}
    </div>
  );
}
