import { useState } from 'react';
import { AlertTriangle, CheckCircle2, CreditCard, FileText, HeartPulse, Package, ShieldCheck } from 'lucide-react';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency } from '../utils/format';
import { buildImpactImprovementTask, buildImpactMissingProofWorkflow, buildImpactRiskFollowUp } from '../utils/impactWorkflows';
import ImpactBusinessShell from './ImpactBusinessShell.jsx';

const fallbackRows = (provided, crud) => provided?.length ? provided : crud.rows;
const arr = (value) => Array.isArray(value) ? value : [];
const amount = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? 0) || 0;
const paid = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.amount ?? row.montant ?? 0) || 0;
const remaining = (row = {}) => Math.max(0, Number(row.reste_a_payer ?? row.remaining_amount ?? row.amount_due ?? (amount(row) - paid(row)) ?? 0) || 0);
const low = (value = '') => String(value || '').toLowerCase();
const closedStatuses = ['termine', 'terminé', 'done', 'fermee', 'fermée', 'traitee', 'traitée', 'resolue', 'résolue'];

function priorityStats(props = {}) {
  const salesOrders = arr(props.salesOrders || props.sales_orders);
  const stocks = arr(props.stocks || props.stock);
  const sante = arr(props.sante || props.vaccins);
  const alertes = arr(props.alertes || props.alertes_center);
  const taches = arr(props.taches || props.tasks);
  const transactions = arr(props.transactions || props.finances);
  const receivable = salesOrders.reduce((sum, row) => sum + remaining(row), 0);
  const stockCritical = stocks.filter((row) => Number(row.seuil || 0) > 0 && Number(row.quantite || 0) <= Number(row.seuil || 0)).length;
  const healthLate = sante.filter((row) => ['retard', 'en retard', 'a_faire', 'à faire'].some((term) => low(row.statut || row.status).includes(term))).length;
  const openAlerts = alertes.filter((row) => !closedStatuses.includes(low(row.status || row.statut || 'nouvelle'))).length;
  const openTasks = taches.filter((row) => !closedStatuses.includes(low(row.status || row.statut))).length;
  const expenses = transactions.filter((row) => ['sortie', 'depense', 'dépense', 'charge', 'achat'].some((term) => low(`${row.type || ''} ${row.categorie || ''}`).includes(term))).reduce((sum, row) => sum + amount(row), 0);
  return { receivable, stockCritical, healthLate, openAlerts, openTasks, expenses };
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 min-w-[105px] ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><Icon size={14} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}
function BusinessImpactPriority({ data, onNavigate, onCreateTask, onCreateAlert, onCreateBusinessEvent, onRefreshTasks, onRefreshAlertes, onRefreshBusinessEvents }) {
  const [message, setMessage] = useState('');
  const priorities = [
    data.receivable > 0 ? { label: `Récupérer ${fmtCurrency(data.receivable)} encore à encaisser.`, module: 'clients', cta: 'Créer tâche relance', priority: 'haute' } : null,
    data.stockCritical > 0 ? { label: `Sécuriser ${data.stockCritical} stock(s) sous seuil.`, module: 'stock', cta: 'Créer tâche stock', priority: 'haute', risk: true } : null,
    data.healthLate > 0 ? { label: `Rattraper ${data.healthLate} soin(s), vaccin(s) ou suivi(s) santé.`, module: 'sante', cta: 'Créer tâche santé', priority: 'haute', risk: true } : null,
    data.openAlerts > 0 ? { label: `Traiter ${data.openAlerts} alerte(s) ouverte(s).`, module: 'alertes', cta: 'Ouvrir alertes', navigateOnly: true } : null,
    data.openTasks > 0 ? { label: `Clôturer ou réaliser ${data.openTasks} tâche(s) ouverte(s).`, module: 'taches', cta: 'Ouvrir tâches', navigateOnly: true } : null,
  ].filter(Boolean);
  const createAction = async (item) => {
    if (item.navigateOnly) {
      onNavigate?.(item.module);
      return;
    }
    const task = buildImpactImprovementTask({ indicator: item.label, module: item.module, reason: 'Priorité détectée dans Impact & Valeur.', priority: item.priority });
    await onCreateTask?.(task);
    if (item.risk) {
      const followUp = buildImpactRiskFollowUp({ riskTitle: item.label, module: item.module, severity: item.priority === 'critique' ? 'critique' : 'warning' });
      await onCreateAlert?.(followUp.alert);
      await onCreateBusinessEvent?.(followUp.event);
      await onRefreshAlertes?.();
      await onRefreshBusinessEvents?.();
    } else {
      await onCreateBusinessEvent?.({ id: `EVT-IMP-${Date.now()}`, event_type: 'action_impact_creee', module_source: 'impact_business', entity_type: item.module, entity_id: task.source_record_id, title: task.title, description: task.notes, event_date: new Date().toISOString().slice(0, 10), severity: 'info', linked_task_id: task.id });
      await onRefreshBusinessEvents?.();
    }
    await onRefreshTasks?.();
    setMessage(`Action créée : ${task.title}`);
  };
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Impact à traiter maintenant</p><h3 className="font-black text-[#2f2415]">Pertes, risques et valeur à sécuriser</h3><p className="text-sm text-[#8a7456] mt-1">Ce module sert à comprendre la valeur réelle de la ferme, pas à générer les documents officiels.</p></div><div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm"><Mini icon={CreditCard} label="À encaisser" value={fmtCurrency(data.receivable)} danger={data.receivable > 0} /><Mini icon={Package} label="Stocks seuil" value={data.stockCritical} danger={data.stockCritical > 0} /><Mini icon={HeartPulse} label="Santé" value={data.healthLate} danger={data.healthLate > 0} /><Mini icon={AlertTriangle} label="Alertes" value={data.openAlerts} danger={data.openAlerts > 0} /><Mini icon={ShieldCheck} label="Tâches" value={data.openTasks} danger={data.openTasks > 0} /></div></div>{priorities.length ? <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">{priorities.slice(0, 6).map((item) => <div key={item.label} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={14} className="inline" /> {item.label}<div className="mt-3 flex gap-2"><button type="button" onClick={() => createAction(item)} className="rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white">{item.cta}</button><button type="button" onClick={() => onNavigate?.(item.module)} className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-xs font-black text-amber-800">Ouvrir source</button></div></div>)}</div> : <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Aucun impact critique immédiat à traiter.</div>}{message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={15} className="inline" /> {message}</div> : null}</section>;
}
function FinanceurReadiness({ data, onNavigate, onCreateTask, onCreateDocument, onCreateBusinessEvent, onRefreshTasks, onRefreshDocuments, onRefreshBusinessEvents }) {
  const [message, setMessage] = useState('');
  const checks = [
    { label: 'Business Plan', ok: arr(data.businessPlans).length > 0, detail: 'BP disponible pour générer un dossier.' },
    { label: 'Preuves / documents', ok: arr(data.documents).length > 0, detail: 'Justificatifs, photos, factures ou preuves à joindre.' },
    { label: 'Ventes / encaissements', ok: arr(data.salesOrders || data.sales_orders).length > 0 || arr(data.payments).length > 0, detail: 'Historique utile pour rassurer un financeur.' },
    { label: 'Risques suivis', ok: arr(data.alertes || data.alertes_center).length > 0 || arr(data.taches || data.tasks).length > 0, detail: 'Alertes et tâches montrent le pilotage terrain.' },
  ];
  const score = checks.filter((item) => item.ok).length;
  const createProof = async (item) => {
    const workflow = buildImpactMissingProofWorkflow({ module: 'impact_business', title: item.label, reason: item.detail });
    await onCreateDocument?.(workflow.document);
    await onCreateTask?.(workflow.task);
    await onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([onRefreshDocuments?.(), onRefreshTasks?.(), onRefreshBusinessEvents?.()]);
    setMessage(`Preuve à compléter créée : ${item.label}`);
  };
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><FileText size={15} /> Préparation financeur</p><h3 className="text-xl font-black text-[#2f2415] mt-1">La ferme est-elle prête à présenter un dossier ?</h3><p className="text-sm text-[#8a7456] mt-1">Ici on vérifie la solidité. La génération du PDF se fait dans Rapports.</p></div><div className={`rounded-2xl border p-4 text-center ${score >= 3 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}><b className="block text-2xl">{score}/4</b><span className="text-xs font-bold">préparation</span></div></div><div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">{checks.map((item) => <div key={item.label} className={`rounded-2xl border p-3 ${item.ok ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><b className="text-[#2f2415]">{item.label}</b><p className="text-xs text-[#8a7456] mt-1">{item.detail}</p><p className={`mt-2 text-xs font-black ${item.ok ? 'text-emerald-700' : 'text-amber-700'}`}>{item.ok ? 'OK' : 'À compléter'}</p>{!item.ok ? <button type="button" onClick={() => createProof(item)} className="mt-3 rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white">Créer preuve à compléter</button> : null}</div>)}</div>{message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={15} className="inline" /> {message}</div> : null}<div className="flex justify-end"><button type="button" onClick={() => onNavigate?.('rapports')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">Générer le dossier dans Rapports</button></div></section>;
}

export default function ImpactBusiness(props) {
  const culturesCrud = useCrudModule('cultures');
  const clientsCrud = useCrudModule('clients');
  const fournisseursCrud = useCrudModule('fournisseurs');
  const equipementsCrud = useCrudModule('equipements');
  const investissementsCrud = useCrudModule('investissements');
  const businessPlansCrud = useCrudModule('business_plans');
  const bpInvestmentLinesCrud = useCrudModule('bp_investment_lines');
  const bpRecurringCostsCrud = useCrudModule('bp_recurring_costs');
  const bpRevenueProjectionsCrud = useCrudModule('bp_revenue_projections');
  const bpFundingSourcesCrud = useCrudModule('bp_funding_sources');
  const bpLinksCrud = useCrudModule('bp_links');
  const bpRisksCrud = useCrudModule('bp_risks');
  const salesOrderItemsCrud = useCrudModule('sales_order_items');
  const deliveriesCrud = useCrudModule('deliveries');
  const invoicesCrud = useCrudModule('invoices');
  const salesOpportunitiesCrud = useCrudModule('sales_opportunities');
  const sensorDevicesCrud = useCrudModule('sensor_devices');
  const cameraDevicesCrud = useCrudModule('camera_devices');
  const auditLogsCrud = useCrudModule('audit_logs');
  const rapportsCrud = useCrudModule('rapports');
  const veterinairesCrud = useCrudModule('veterinaires');
  const alimentationLogsCrud = useCrudModule('alimentation_logs');
  const productionOeufsLogsCrud = useCrudModule('production_oeufs_logs');
  const mergedProps = { ...props, cultures: fallbackRows(props.cultures, culturesCrud), clients: fallbackRows(props.clients, clientsCrud), fournisseurs: fallbackRows(props.fournisseurs, fournisseursCrud), equipements: fallbackRows(props.equipements, equipementsCrud), investissements: fallbackRows(props.investissements, investissementsCrud), businessPlans: fallbackRows(props.businessPlans, businessPlansCrud), bpInvestmentLines: fallbackRows(props.bpInvestmentLines, bpInvestmentLinesCrud), bpRecurringCosts: fallbackRows(props.bpRecurringCosts, bpRecurringCostsCrud), bpRevenueProjections: fallbackRows(props.bpRevenueProjections, bpRevenueProjectionsCrud), bpFundingSources: fallbackRows(props.bpFundingSources, bpFundingSourcesCrud), bpLinks: fallbackRows(props.bpLinks, bpLinksCrud), bpRisks: fallbackRows(props.bpRisks, bpRisksCrud), orderItems: fallbackRows(props.orderItems, salesOrderItemsCrud), salesOrderItems: fallbackRows(props.salesOrderItems, salesOrderItemsCrud), deliveriesList: fallbackRows(props.deliveriesList, deliveriesCrud), deliveries: fallbackRows(props.deliveries, deliveriesCrud), invoicesList: fallbackRows(props.invoicesList, invoicesCrud), invoices: fallbackRows(props.invoices, invoicesCrud), opportunities: fallbackRows(props.opportunities, salesOpportunitiesCrud), salesOpportunities: fallbackRows(props.salesOpportunities, salesOpportunitiesCrud), sensors: fallbackRows(props.sensors, sensorDevicesCrud), sensorDevices: fallbackRows(props.sensorDevices, sensorDevicesCrud), cameras: fallbackRows(props.cameras, cameraDevicesCrud), cameraDevices: fallbackRows(props.cameraDevices, cameraDevicesCrud), auditLogs: fallbackRows(props.auditLogs, auditLogsCrud), audit_logs: fallbackRows(props.audit_logs, auditLogsCrud), rapports: fallbackRows(props.rapports, rapportsCrud), reports: fallbackRows(props.reports, rapportsCrud), veterinaires: fallbackRows(props.veterinaires, veterinairesCrud), vets: fallbackRows(props.vets, veterinairesCrud), alimentationLogs: fallbackRows(props.alimentationLogs, alimentationLogsCrud), productionLogs: props.productionLogs?.length ? props.productionLogs : productionOeufsLogsCrud.rows };
  return <div className="space-y-6"><BusinessImpactPriority data={priorityStats(mergedProps)} onNavigate={props.onNavigate} onCreateTask={props.onCreateTask} onCreateAlert={props.onCreateAlert} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshTasks={props.onRefreshTasks} onRefreshAlertes={props.onRefreshAlertes} onRefreshBusinessEvents={props.onRefreshBusinessEvents} /><FinanceurReadiness data={mergedProps} onNavigate={props.onNavigate} onCreateTask={props.onCreateTask} onCreateDocument={props.onCreateDocument} onCreateBusinessEvent={props.onCreateBusinessEvent} onRefreshTasks={props.onRefreshTasks} onRefreshDocuments={props.onRefreshDocuments} onRefreshBusinessEvents={props.onRefreshBusinessEvents} /><ImpactBusinessShell {...mergedProps} /></div>;
}
