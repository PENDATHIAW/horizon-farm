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
  return <section className="rounded-2xl border border-line bg-white p-6 shadow-card"><h2 className="font-semibold text-earth">{title}</h2>{subtitle ? <p className="mt-1 text-sm text-slate">{subtitle}</p> : null}<div className="mt-4">{children}</div></section>;
}

function EquipmentRows({ items = [], transactions = [], showCost = false }) {
  return items.length ? (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[680px] text-sm">
        <thead><tr className="border-b border-line text-left text-xs uppercase text-slate"><th className="px-3 py-2">Équipement</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2">Achat</th>{showCost ? <th className="px-3 py-2">Coûts Finance</th> : null}<th className="px-3 py-2">Maintenance</th></tr></thead>
        <tbody>{items.map((item) => <tr key={item.id} className="border-b border-line/70"><td className="px-3 py-3 font-semibold text-earth">{nameOf(item)}</td><td className="px-3 py-3 text-slate">{item.type || item.categorie || '—'}</td><td className="px-3 py-3"><span className={`font-semibold ${statusOf(item) === 'panne' || statusOf(item) === 'hors_service' ? 'text-urgent' : statusOf(item) === 'maintenance' ? 'text-horizon-dark' : 'text-positive'}`}>{item.status || item.statut || 'Non renseigné'}</span></td><td className="px-3 py-3 text-slate">{String(item.purchase_date || item.date_achat || '—').slice(0, 10)}</td>{showCost ? <td className="px-3 py-3 font-semibold text-earth">{fmtCurrency(equipmentFinanceCosts(transactions, item.id))}</td> : null}<td className="px-3 py-3 text-slate">{String(item.maintenance_due || item.prochaine_maintenance || '—').slice(0, 10)}</td></tr>)}</tbody>
      </table>
    </div>
  ) : <p className="rounded-xl border border-line bg-card p-4 text-sm text-slate">Aucun équipement dans cette vue.</p>;
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
    const fundingSource = rows(props.bpFundingSources || props.fundingSources).find((row) => String(row.id) === String(payload.funding_source_id)) || { id: payload.funding_source_id };
    const workflow = buildEquipmentPurchaseWorkflow({ payload, supplier, fundingSource, date: payload.date_achat });
    if (!supplier.id || !fundingSource.id || !workflow.financeTransaction || !workflow.document?.file_url) throw new Error('Fournisseur, financement, dépense et preuve sont obligatoires pour une acquisition.');
    await props.onCreate?.(workflow.equipment);
    await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    await props.onCreateDocument?.(workflow.document);
    await props.onCreateTask?.(workflow.maintenanceTask);
    if (workflow.alert) await props.onCreateAlert?.(workflow.alert);
    await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([props.onRefresh?.(), props.onRefreshFinances?.(), props.onRefreshDocuments?.(), props.onRefreshTasks?.(), props.onRefreshAlertes?.(), props.onRefreshBusinessEvents?.()]);
  };

  const quickActionProps = {
    rows: equipment,
    tasks: rows(props.tasks),
    alertes: rows(props.alertes),
    transactions,
    documents,
    businessEvents: rows(props.businessEvents),
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
    <div className="space-y-6"><EquipementAcquisitionForm suppliers={rows(props.fournisseurs || props.suppliers)} fundingSources={rows(props.bpFundingSources || props.fundingSources)} onSubmit={createAcquisition} /><Panel title="Acquisitions enregistrées" subtitle="Chaque ligne conserve le lien vers sa dépense et sa preuve."><EquipmentRows items={equipment.filter((item) => item.purchase_date || item.date_achat)} transactions={transactions} showCost /></Panel></div>
  ) : tab === 'EquipmentBreakdownsView' ? (
    <div className="space-y-6"><EquipementsQuickActionsBridge {...quickActionProps} allowedActions={['panne']} /><Panel title="Équipements indisponibles" subtitle="Une panne critique ouvre une alerte, une tâche de maintenance et rend l’équipement indisponible."><EquipmentRows items={equipment.filter((item) => ['panne', 'hors_service'].includes(statusOf(item)))} /></Panel></div>
  ) : tab === 'EquipmentRepairsView' ? (
    <div className="space-y-6"><EquipementsQuickActionsBridge {...quickActionProps} allowedActions={['repair', 'maintenance']} /><Panel title="Suivi des réparations" subtitle="La remise en service exige une date, un résultat, un responsable et une validation explicite."><EquipmentRows items={equipment.filter((item) => ['panne', 'maintenance', 'operationnel'].includes(statusOf(item)))} /></Panel></div>
  ) : tab === 'EquipmentCostsAvailabilityView' ? (
    <div className="space-y-6"><Panel title="Coûts et disponibilité" subtitle="Les coûts sont lus depuis les transactions Finance liées; aucune somme parallèle n’est stockée ici."><div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="border-l-4 border-leaf bg-card p-3"><p className="text-xs text-slate">Disponibles</p><p className="text-xl font-semibold text-earth">{equipment.length - unavailable.length}</p></div><div className="border-l-4 border-urgent bg-card p-3"><p className="text-xs text-slate">Indisponibles</p><p className="text-xl font-semibold text-earth">{unavailable.length}</p></div><div className="border-l-4 border-horizon bg-card p-3"><p className="text-xs text-slate">Coûts Finance</p><p className="text-xl font-semibold text-earth">{fmtCurrency(equipment.reduce((sum, item) => sum + equipmentFinanceCosts(transactions, item.id), 0))}</p></div><div className="border-l-4 border-horizon-dark bg-card p-3"><p className="text-xs text-slate">Taux disponible</p><p className="text-xl font-semibold text-earth">{equipment.length ? Math.round(((equipment.length - unavailable.length) / equipment.length) * 100) : 0}%</p></div></div><EquipmentRows items={equipment} transactions={transactions} showCost /></Panel><EquipementsEvolution rows={equipment} tasks={rows(props.tasks)} transactions={transactions} /></div>
  ) : (
    <Panel title="Parc" subtitle="Machines, pompes, véhicules et équipements de production."><EquipmentRows items={equipment} /></Panel>
  );

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-line bg-white p-6 shadow-card"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-center gap-3"><Settings className="text-horizon-dark" size={24} /><div><p className="text-xs font-semibold uppercase text-horizon-dark">Ressources techniques</p><h1 className="text-2xl font-semibold text-earth">Équipements</h1><p className="text-sm text-slate">Parc, acquisitions, pannes, réparations et disponibilité.</p></div></div><div className="flex gap-3 text-sm"><span className="inline-flex items-center gap-1 font-semibold text-positive"><Gauge size={16} />{equipment.length - unavailable.length} disponibles</span>{unavailable.length ? <span className="inline-flex items-center gap-1 font-semibold text-urgent"><AlertTriangle size={16} />{unavailable.length} indisponibles</span> : <span className="inline-flex items-center gap-1 font-semibold text-slate"><Wrench size={16} />Aucune panne</span>}</div></div></header>
      <ModuleTabsBar moduleId="equipements" active={tab} onChange={setTab} tabBadges={{ pannes: equipment.filter((item) => statusOf(item) === 'panne').length, reparations: equipment.filter((item) => statusOf(item) === 'maintenance').length }} />
      {content}
    </div>
  );
}
