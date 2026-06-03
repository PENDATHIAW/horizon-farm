import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, GitBranch, History, Wifi, Wrench } from 'lucide-react';
import AuditLogs from './AuditLogs.jsx';
import Sync from './Sync.jsx';
import { auditErpInterconnections } from '../utils/interconnectionAudit';
import { buildSyncRepairTask, routeForSyncIssue, syncIssueActionLabel, syncIssueReadableTitle } from '../utils/syncAuditWorkflows';

const ignoredKey = 'horizon_farm_ignored_interconnection_issues';
const today = () => new Date().toISOString().slice(0, 10);
const issueKey = (issue = {}) => `${issue.flow || 'erp'}:${issue.module || 'module'}:${issue.row_id || 'row'}:${issue.linked_id || ''}:${issue.message || ''}`;
const readIgnored = () => { try { return new Set(JSON.parse(localStorage.getItem(ignoredKey) || '[]').map(String)); } catch { return new Set(); } };
const writeIgnored = (set) => { try { localStorage.setItem(ignoredKey, JSON.stringify([...set])); } catch { /* noop */ } };
const amountOf = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant ?? 0) || 0;
const paymentAmount = (row = {}) => Number(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0) || 0;
const saleIdOf = (row = {}) => String(row.order_id || row.sale_id || row.source_record_id || row.related_id || row.commande_id || '').trim();
const makeRepairId = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function statusClass(status) {
  if (status === 'critique') return 'border-red-200 bg-red-50 text-red-700';
  if (status === 'a_verifier') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
}
function statusLabel(status) { if (status === 'critique') return 'Urgent'; if (status === 'a_verifier') return 'À revoir'; return 'OK'; }

function FlowCard({ flow }) {
  return <div className={`rounded-2xl border p-4 ${statusClass(flow.status)}`}>
    <div className="flex items-start justify-between gap-2"><div><p className="font-black">{flow.label}</p><p className="mt-1 text-xs opacity-80">{flow.issueCount} point(s) à regarder · {flow.criticalCount} urgent(s)</p></div><span className="rounded-full bg-white/60 px-2 py-1 text-xs font-black">{statusLabel(flow.status)}</span></div>
    <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold">Voir ce qui est vérifié</summary><ul className="mt-2 list-disc pl-4 space-y-1">{flow.checks.map((check) => <li key={check}>{check}</li>)}</ul></details>
  </div>;
}

function repairLabel(issue = {}) {
  return syncIssueActionLabel(issue);
}
function canRepair(issue = {}, props = {}) { const label = repairLabel(issue); if (label === 'Mettre à jour la vente') return Boolean(props.onUpdateSalesOrder); if (label === 'Fermer l’opportunité') return Boolean(props.onUpdateOpportunity); if (label === 'Créer preuve / facture') return Boolean(props.onCreateDocument); if (label === 'Créer une tâche') return Boolean(props.onCreateTask); return Boolean(props.onCreateAlert); }

async function createRepairTrace(props, issue, title) {
  await props.onCreateBusinessEvent?.({ id: makeRepairId('EVT'), event_type: 'audit_interconnexion_repare', module_source: 'sync_activity', entity_type: issue.module || 'erp_issue', entity_id: issue.row_id || issue.linked_id || issue.flow || 'audit', title, description: issue.message || 'Action effectuée depuis les vérifications', event_date: today(), severity: issue.severity || 'info', saisies_evitees: 1 });
  await props.onRefreshBusinessEvents?.();
}

async function repairIssue(issue, props) {
  const label = repairLabel(issue);
  const dataMap = props.dataMap || {};
  if (label === 'Mettre à jour la vente') {
    const order = (dataMap.sales_orders || []).find((row) => String(row.id) === String(issue.row_id));
    if (!order) throw new Error('Vente introuvable');
    const payments = (dataMap.payments || []).filter((payment) => saleIdOf(payment) === String(order.id));
    const paid = payments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
    const total = amountOf(order);
    const remaining = Math.max(0, total - paid);
    await props.onUpdateSalesOrder?.(order.id, { montant_paye: paid, reste_a_payer: remaining, statut_paiement: remaining <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye', statut_commande: paid > 0 ? (order.statut_commande || order.status || 'confirme') : (order.statut_commande || order.status || 'brouillon') });
    await props.onRefreshSalesOrders?.();
    await createRepairTrace(props, issue, `Vente mise à jour: ${order.id}`);
    return 'Vente mise à jour';
  }
  if (label === 'Fermer l’opportunité') {
    await props.onUpdateOpportunity?.(issue.row_id, { status: 'convertie', statut: 'convertie', closed_at: new Date().toISOString() });
    await props.onRefreshOpportunities?.();
    await createRepairTrace(props, issue, `Opportunité fermée: ${issue.row_id}`);
    return 'Opportunité fermée';
  }
  if (label === 'Créer preuve / facture') {
    await props.onCreateDocument?.({ id: makeRepairId('DOC'), title: `Preuve / facture à compléter`, document_category: 'preuve_facture', module_source: issue.module || 'sync_activity', entity_type: issue.module || 'erp_issue', entity_id: issue.row_id || issue.linked_id || '', related_id: issue.linked_id || issue.row_id || '', notes: issue.message || 'Preuve créée depuis les vérifications.', status: 'a_completer' });
    await props.onRefreshDocuments?.();
    await createRepairTrace(props, issue, 'Preuve / facture créée');
    return 'Preuve / facture créée';
  }
  if (label === 'Créer une tâche') {
    await props.onCreateTask?.(buildSyncRepairTask(issue, { id: makeRepairId('TASK'), date: today(), actionKey: issueKey(issue) }));
    await props.onRefreshTasks?.();
    await createRepairTrace(props, issue, 'Tâche créée');
    return 'Tâche créée';
  }
  await props.onCreateAlert?.({ id: makeRepairId('ALERT'), title: 'Point à vérifier', message: issue.message || 'Un point demande ton attention.', module_source: issue.module || 'sync_activity', entity_type: issue.module || 'erp_issue', entity_id: issue.row_id || issue.linked_id || '', severity: issue.severity === 'critical' ? 'critique' : 'warning', status: 'nouvelle', action_recommandee: 'Vérifier et corriger ce point.' });
  await props.onRefreshAlertes?.();
  await createRepairTrace(props, issue, 'Alerte créée');
  return 'Alerte créée';
}

function IssueActions({ issue, props, onIgnored }) {
  const [busy, setBusy] = useState(null);
  const guidedActions = getGuidedRepairActions(issue, props);
  const fallbackLabel = repairLabel(issue);
  const fallbackAvailable = canRepair(issue, props);
  const runGuided = async (action) => {
    try {
      setBusy(action.id);
      const result = await executeGuidedRepairAction(issue, action.id, props);
      await createRepairTrace(props, issue, result);
      await props.onRefreshAll?.();
      toast.success(result);
    } catch (error) {
      toast.error(error.message || 'Action impossible');
    } finally {
      setBusy(null);
    }
  };
  const runFallback = async () => {
    try {
      setBusy('fallback');
      const result = await repairIssue(issue, props);
      await props.onRefreshAll?.();
      toast.success(result);
    } catch (error) {
      toast.error(error.message || 'Action impossible');
    } finally {
      setBusy(null);
    }
  };
  return <div className="flex flex-wrap gap-1">
    {guidedActions.length ? guidedActions.map((action) => (
      <button key={action.id} type="button" disabled={busy === action.id} onClick={() => runGuided(action)} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 disabled:opacity-40">
        <Wrench size={12} className="inline" /> {busy === action.id ? 'Action...' : action.label}
      </button>
    )) : (
      <button type="button" disabled={!fallbackAvailable || busy === 'fallback'} onClick={runFallback} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 disabled:opacity-40">
        <Wrench size={12} className="inline" /> {busy === 'fallback' ? 'Action...' : fallbackLabel}
      </button>
    )}
    <button type="button" onClick={() => props.onNavigate?.(routeForSyncIssue(issue))} className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-black text-sky-700">Ouvrir source</button>
    <button type="button" disabled={Boolean(busy)} onClick={() => onIgnored(issue)} className="rounded-full border border-[#eadcc2] bg-white px-2 py-1 text-[11px] font-black text-[#8a7456] disabled:opacity-40">Masquer</button>
  </div>;
}

function InterconnectionAudit(props) {
  const { dataMap = {} } = props;
  const [ignored, setIgnored] = useState(readIgnored);
  const audit = auditErpInterconnections(dataMap);
  const visibleIssues = useMemo(() => audit.issues.filter((issue) => !ignored.has(issueKey(issue))), [audit.issues, ignored]);
  const visibleAudit = { ...audit, issues: visibleIssues, issueCount: visibleIssues.length, criticalCount: visibleIssues.filter((issue) => issue.severity === 'critical').length };
  const ignoreIssue = async (issue) => { const next = new Set(ignored); next.add(issueKey(issue)); setIgnored(next); writeIgnored(next); await createRepairTrace(props, issue, 'Point masqué'); toast.success('Point masqué'); };
  const restoreIgnored = () => { setIgnored(new Set()); writeIgnored(new Set()); toast.success('Points masqués réaffichés'); };
  return <ModuleSection icon={GitBranch} title="Vérifications importantes" subtitle="Un résumé simple des points qui demandent ton attention.">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div className={`rounded-2xl border p-4 ${visibleAudit.issueCount === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">État général</p><p className={`mt-2 text-xl font-black ${visibleAudit.issueCount === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>{visibleAudit.issueCount === 0 ? 'Tout va bien' : 'À revoir'}</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Vérifications</p><p className="mt-2 text-xl font-black text-[#2f2415]">{audit.flows.length}</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">À regarder</p><p className="mt-2 text-xl font-black text-[#2f2415]">{visibleAudit.issueCount}</p></div><div className="rounded-2xl border border-red-100 bg-red-50 p-4"><p className="text-xs uppercase tracking-wide text-red-700">Urgents</p><p className="mt-2 text-xl font-black text-red-700">{visibleAudit.criticalCount}</p></div></div>
    {ignored.size ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><span>{ignored.size} point(s) masqué(s).</span><button type="button" onClick={restoreIgnored} className="rounded-full border border-[#d6c3a0] px-3 py-1 text-xs font-bold text-[#2f2415]">Réafficher</button></div> : null}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{audit.flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}</div>
    {visibleAudit.issueCount === 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucun point important à corriger pour le moment.</div> : <div className="overflow-x-auto rounded-2xl border border-amber-200"><table className="min-w-full text-sm"><thead><tr className="border-b border-amber-100 bg-amber-50 text-left text-xs uppercase text-amber-800"><th className="py-2 px-3">Sujet</th><th className="py-2 px-3">Espace</th><th className="py-2 px-3">Élément</th><th className="py-2 px-3">Lien</th><th className="py-2 px-3">Détail</th><th className="py-2 px-3">Actions</th></tr></thead><tbody>{visibleAudit.issues.slice(0, 40).map((issue, index) => <tr key={`${issue.module}-${issue.row_id}-${index}`} className="border-b border-amber-100"><td className="py-2 px-3 text-xs font-bold text-[#8a7456]">{audit.flows.find((flow) => flow.id === issue.flow)?.label || issue.flow || 'À vérifier'}</td><td className="py-2 px-3 font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {issue.module}</td><td className="py-2 px-3">{issue.row_id || '—'}</td><td className="py-2 px-3">{issue.linked_id || '—'}</td><td className="py-2 px-3 text-[#8a7456]">{syncIssueReadableTitle(issue)}</td><td className="py-2 px-3"><IssueActions issue={issue} props={props} onIgnored={ignoreIssue} /></td></tr>)}</tbody></table>{visibleAudit.issues.length > 40 ? <p className="p-3 text-xs text-[#8a7456]">{visibleAudit.issues.length - 40} autre(s) point(s) masqué(s). Traite d’abord les urgents.</p> : null}</div>}
  </ModuleSection>;
}

export default function SyncActivityCenter(props) {
  return <div className="space-y-6 sync-activity-mobile"><style>{`@media (max-width: 640px){.sync-activity-mobile .rounded-2xl{border-radius:18px}.sync-activity-mobile table{font-size:12px}.sync-activity-mobile th,.sync-activity-mobile td{padding-left:10px!important;padding-right:10px!important}.sync-activity-mobile .text-2xl{font-size:1.35rem}.sync-activity-mobile .grid{gap:.75rem}.sync-activity-mobile .overflow-x-auto{max-width:100vw}}`}</style><InterconnectionAudit {...props} /><ModuleSection icon={Wifi} title="Connexion & envoi" subtitle="Sauvegarde, connexion et actions en attente."><Sync {...props} embedded /></ModuleSection><ModuleSection icon={History} title="Activité récente" subtitle="Historique des actions importantes."><AuditLogs rows={props.auditLogs || []} loading={props.auditLoading} onRefresh={props.onRefreshAuditLogs} onNavigate={props.onNavigate} /></ModuleSection></div>;
}
