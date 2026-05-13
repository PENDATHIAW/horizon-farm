import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, CheckCircle2, GitBranch, History, Wifi, Wrench } from 'lucide-react';
import AuditLogs from './AuditLogs.jsx';
import Sync from './Sync.jsx';
import { auditErpInterconnections } from '../utils/interconnectionAudit';

const ignoredKey = 'horizon_farm_ignored_interconnection_issues';
const today = () => new Date().toISOString().slice(0, 10);
const issueKey = (issue = {}) => `${issue.flow || 'erp'}:${issue.module || 'module'}:${issue.row_id || 'row'}:${issue.linked_id || ''}:${issue.message || ''}`;
const readIgnored = () => {
  try { return new Set(JSON.parse(localStorage.getItem(ignoredKey) || '[]').map(String)); } catch { return new Set(); }
};
const writeIgnored = (set) => {
  try { localStorage.setItem(ignoredKey, JSON.stringify([...set])); } catch { /* noop */ }
};
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

function statusLabel(status) {
  if (status === 'critique') return 'Critique';
  if (status === 'a_verifier') return 'À vérifier';
  return 'OK';
}

function FlowCard({ flow }) {
  return <div className={`rounded-2xl border p-4 ${statusClass(flow.status)}`}>
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="font-black">{flow.label}</p>
        <p className="mt-1 text-xs opacity-80">{flow.activeTargets}/{flow.totalTargets} modules actifs · couverture {flow.coverage}%</p>
      </div>
      <span className="rounded-full bg-white/60 px-2 py-1 text-xs font-black">{statusLabel(flow.status)}</span>
    </div>
    <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
      <div className="rounded-xl bg-white/60 p-2"><b>{flow.issueCount}</b><br />point(s)</div>
      <div className="rounded-xl bg-white/60 p-2"><b>{flow.criticalCount}</b><br />critique(s)</div>
    </div>
    <details className="mt-3 text-xs">
      <summary className="cursor-pointer font-bold">Contrôles attendus</summary>
      <ul className="mt-2 list-disc pl-4 space-y-1">{flow.checks.map((check) => <li key={check}>{check}</li>)}</ul>
    </details>
  </div>;
}

function repairLabel(issue = {}) {
  if (issue.module === 'sales_orders' && String(issue.message || '').toLowerCase().includes('statut')) return 'Recalculer statut';
  if (issue.module === 'sales_opportunities') return 'Fermer opportunité';
  if (issue.module === 'documents' || String(issue.message || '').toLowerCase().includes('preuve') || String(issue.message || '').toLowerCase().includes('document')) return 'Créer justificatif';
  if (issue.module === 'stock' || issue.module === 'alertes_center') return 'Créer tâche';
  return 'Créer alerte';
}

function canRepair(issue = {}, props = {}) {
  const label = repairLabel(issue);
  if (label === 'Recalculer statut') return Boolean(props.onUpdateSalesOrder);
  if (label === 'Fermer opportunité') return Boolean(props.onUpdateOpportunity);
  if (label === 'Créer justificatif') return Boolean(props.onCreateDocument);
  if (label === 'Créer tâche') return Boolean(props.onCreateTask);
  return Boolean(props.onCreateAlert);
}

async function createRepairTrace(props, issue, title) {
  await props.onCreateBusinessEvent?.({
    id: makeRepairId('EVT'),
    event_type: 'audit_interconnexion_repare',
    module_source: 'sync_activity',
    entity_type: issue.module || 'erp_issue',
    entity_id: issue.row_id || issue.linked_id || issue.flow || 'audit',
    title,
    description: issue.message || 'Action de réparation ERP',
    event_date: today(),
    severity: issue.severity || 'info',
    saisies_evitees: 1,
  });
  await props.onRefreshBusinessEvents?.();
}

async function repairIssue(issue, props) {
  const label = repairLabel(issue);
  const dataMap = props.dataMap || {};

  if (label === 'Recalculer statut') {
    const order = (dataMap.sales_orders || []).find((row) => String(row.id) === String(issue.row_id));
    if (!order) throw new Error('Commande introuvable');
    const payments = (dataMap.payments || []).filter((payment) => saleIdOf(payment) === String(order.id));
    const paid = payments.reduce((sum, payment) => sum + paymentAmount(payment), 0);
    const total = amountOf(order);
    const remaining = Math.max(0, total - paid);
    const patch = {
      montant_paye: paid,
      reste_a_payer: remaining,
      statut_paiement: remaining <= 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye',
      statut_commande: paid > 0 ? (order.statut_commande || order.status || 'confirme') : (order.statut_commande || order.status || 'brouillon'),
    };
    await props.onUpdateSalesOrder?.(order.id, patch);
    await props.onRefreshSalesOrders?.();
    await createRepairTrace(props, issue, `Statut vente recalculé: ${order.id}`);
    return 'Statut vente recalculé';
  }

  if (label === 'Fermer opportunité') {
    await props.onUpdateOpportunity?.(issue.row_id, { status: 'convertie', statut: 'convertie', closed_at: new Date().toISOString() });
    await props.onRefreshOpportunities?.();
    await createRepairTrace(props, issue, `Opportunité fermée: ${issue.row_id}`);
    return 'Opportunité fermée';
  }

  if (label === 'Créer justificatif') {
    await props.onCreateDocument?.({
      id: makeRepairId('DOC'),
      title: `Justificatif à compléter — ${issue.module || 'ERP'}`,
      document_category: 'justificatif',
      module_source: issue.module || 'sync_activity',
      entity_type: issue.module || 'erp_issue',
      entity_id: issue.row_id || issue.linked_id || '',
      related_id: issue.linked_id || issue.row_id || '',
      notes: issue.message || 'Justificatif créé depuis audit interconnexions.',
      status: 'a_completer',
    });
    await props.onRefreshDocuments?.();
    await createRepairTrace(props, issue, `Justificatif créé depuis audit: ${issue.module}`);
    return 'Fiche justificatif créée';
  }

  if (label === 'Créer tâche') {
    await props.onCreateTask?.({
      id: makeRepairId('TASK'),
      title: `Corriger: ${issue.module || 'interconnexion ERP'}`,
      module_lie: issue.module || 'sync_activity',
      entity_type: issue.module || 'erp_issue',
      related_id: issue.row_id || issue.linked_id || '',
      due_date: today(),
      priority: issue.severity === 'critical' ? 'critique' : 'haute',
      status: 'a_faire',
      notes: issue.message || 'Tâche créée depuis audit interconnexions.',
      source_module: 'sync_activity',
      source_record_id: issue.row_id || issue.linked_id || issue.flow || '',
      action_key: issueKey(issue),
    });
    await props.onRefreshTasks?.();
    await createRepairTrace(props, issue, `Tâche créée depuis audit: ${issue.module}`);
    return 'Tâche créée';
  }

  await props.onCreateAlert?.({
    id: makeRepairId('ALERT'),
    title: `Interconnexion à corriger: ${issue.module || 'ERP'}`,
    message: issue.message || 'Point détecté par audit interconnexions.',
    module_source: issue.module || 'sync_activity',
    entity_type: issue.module || 'erp_issue',
    entity_id: issue.row_id || issue.linked_id || '',
    severity: issue.severity === 'critical' ? 'critique' : 'warning',
    status: 'nouvelle',
    action_recommandee: 'Vérifier et corriger le lien ERP détecté par l’audit.',
  });
  await props.onRefreshAlertes?.();
  await createRepairTrace(props, issue, `Alerte créée depuis audit: ${issue.module}`);
  return 'Alerte créée';
}

function IssueActions({ issue, props, onIgnored }) {
  const [busy, setBusy] = useState(false);
  const available = canRepair(issue, props);
  const label = repairLabel(issue);
  const runRepair = async () => {
    try {
      setBusy(true);
      const result = await repairIssue(issue, props);
      await props.onRefreshAll?.();
      toast.success(result);
    } catch (error) {
      toast.error(error.message || 'Réparation impossible');
    } finally {
      setBusy(false);
    }
  };
  return <div className="flex flex-wrap gap-1">
    <button type="button" disabled={!available || busy} onClick={runRepair} className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 disabled:opacity-40"><Wrench size={12} className="inline" /> {busy ? 'Action...' : label}</button>
    <button type="button" disabled={busy} onClick={() => onIgnored(issue)} className="rounded-full border border-[#eadcc2] bg-white px-2 py-1 text-[11px] font-black text-[#8a7456] disabled:opacity-40">Ignorer</button>
  </div>;
}

function InterconnectionAudit(props) {
  const { dataMap = {} } = props;
  const [ignored, setIgnored] = useState(readIgnored);
  const audit = auditErpInterconnections(dataMap);
  const visibleIssues = useMemo(() => audit.issues.filter((issue) => !ignored.has(issueKey(issue))), [audit.issues, ignored]);
  const visibleAudit = { ...audit, issues: visibleIssues, issueCount: visibleIssues.length, criticalCount: visibleIssues.filter((issue) => issue.severity === 'critical').length, warningCount: visibleIssues.filter((issue) => issue.severity !== 'critical').length };
  const ignoreIssue = async (issue) => {
    const next = new Set(ignored);
    next.add(issueKey(issue));
    setIgnored(next);
    writeIgnored(next);
    await createRepairTrace(props, issue, `Point audit ignoré: ${issue.module || issue.flow}`);
    toast.success('Point marqué comme ignoré');
  };
  const restoreIgnored = () => {
    setIgnored(new Set());
    writeIgnored(new Set());
    toast.success('Points ignorés réaffichés');
  };

  return <ModuleSection icon={GitBranch} title="Audit interconnexions ERP" subtitle="Matrice des flux entre modules : ventes, finance, stock, santé, alertes, tâches, documents et traçabilité.">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className={`rounded-2xl border p-4 ${visibleAudit.issueCount === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">Statut global</p><p className={`mt-2 text-xl font-black ${visibleAudit.issueCount === 0 ? 'text-emerald-700' : 'text-amber-800'}`}>{visibleAudit.issueCount === 0 ? 'Cohérent' : 'À vérifier'}</p></div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Flux audités</p><p className="mt-2 text-xl font-black text-[#2f2415]">{audit.flows.length}</p></div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Points visibles</p><p className="mt-2 text-xl font-black text-[#2f2415]">{visibleAudit.issueCount}</p></div>
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4"><p className="text-xs uppercase tracking-wide text-red-700">Critiques</p><p className="mt-2 text-xl font-black text-red-700">{visibleAudit.criticalCount}</p></div>
    </div>

    {ignored.size ? <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><span>{ignored.size} point(s) ignoré(s) localement.</span><button type="button" onClick={restoreIgnored} className="rounded-full border border-[#d6c3a0] px-3 py-1 text-xs font-bold text-[#2f2415]">Réafficher</button></div> : null}

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {audit.flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
    </div>

    {visibleAudit.issueCount === 0 ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune référence orpheline ou incohérence métier visible dans les modules actifs.</div> : <div className="overflow-x-auto rounded-2xl border border-amber-200"><table className="min-w-full text-sm"><thead><tr className="border-b border-amber-100 bg-amber-50 text-left text-xs uppercase text-amber-800"><th className="py-2 px-3">Flux</th><th className="py-2 px-3">Module</th><th className="py-2 px-3">Ligne</th><th className="py-2 px-3">Cible</th><th className="py-2 px-3">Message</th><th className="py-2 px-3">Actions</th></tr></thead><tbody>{visibleAudit.issues.slice(0, 40).map((issue, index) => <tr key={`${issue.module}-${issue.row_id}-${index}`} className="border-b border-amber-100"><td className="py-2 px-3 text-xs font-bold text-[#8a7456]">{audit.flows.find((flow) => flow.id === issue.flow)?.label || issue.flow || 'Flux ERP'}</td><td className="py-2 px-3 font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {issue.module}</td><td className="py-2 px-3">{issue.row_id || '—'}</td><td className="py-2 px-3">{issue.linked_id || '—'}</td><td className="py-2 px-3 text-[#8a7456]">{issue.message}</td><td className="py-2 px-3"><IssueActions issue={issue} props={props} onIgnored={ignoreIssue} /></td></tr>)}</tbody></table>{visibleAudit.issues.length > 40 ? <p className="p-3 text-xs text-[#8a7456]">{visibleAudit.issues.length - 40} autre(s) point(s) masqué(s). Corriger les critiques en priorité.</p> : null}</div>}
  </ModuleSection>;
}

export default function SyncActivityCenter(props) {
  return <div className="space-y-6 sync-activity-mobile">
    <style>{`@media (max-width: 640px){.sync-activity-mobile .rounded-2xl{border-radius:18px}.sync-activity-mobile table{font-size:12px}.sync-activity-mobile th,.sync-activity-mobile td{padding-left:10px!important;padding-right:10px!important}.sync-activity-mobile .text-2xl{font-size:1.35rem}.sync-activity-mobile .grid{gap:.75rem}.sync-activity-mobile .overflow-x-auto{max-width:100vw}}`}</style>
    <InterconnectionAudit {...props} />
    <ModuleSection icon={Wifi} title="Synchronisation & offline" subtitle="File locale, backup, synchronisation, conflits et données disponibles hors ligne.">
      <Sync {...props} embedded />
    </ModuleSection>
    <ModuleSection icon={History} title="Activité, audit et sécurité" subtitle="Actions utilisateurs, événements métier, traces sensibles et journal système.">
      <AuditLogs rows={props.auditLogs || []} loading={props.auditLoading} onRefresh={props.onRefreshAuditLogs} onNavigate={props.onNavigate} />
    </ModuleSection>
  </div>;
}
