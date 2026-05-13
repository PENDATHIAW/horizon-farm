import { AlertTriangle, CheckCircle2, GitBranch, History, Wifi } from 'lucide-react';
import AuditLogs from './AuditLogs.jsx';
import Sync from './Sync.jsx';
import { auditErpInterconnections } from '../utils/interconnectionAudit';

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

function InterconnectionAudit({ dataMap = {} }) {
  const audit = auditErpInterconnections(dataMap);
  return <ModuleSection icon={GitBranch} title="Audit interconnexions ERP" subtitle="Matrice des flux entre modules : ventes, finance, stock, santé, alertes, tâches, documents et traçabilité.">
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
      <div className={`rounded-2xl border p-4 ${audit.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}><p className="text-xs uppercase tracking-wide text-[#8a7456]">Statut global</p><p className={`mt-2 text-xl font-black ${audit.ok ? 'text-emerald-700' : 'text-amber-800'}`}>{audit.ok ? 'Cohérent' : 'À vérifier'}</p></div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Flux audités</p><p className="mt-2 text-xl font-black text-[#2f2415]">{audit.flows.length}</p></div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs uppercase tracking-wide text-[#8a7456]">Points détectés</p><p className="mt-2 text-xl font-black text-[#2f2415]">{audit.issueCount}</p></div>
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4"><p className="text-xs uppercase tracking-wide text-red-700">Critiques</p><p className="mt-2 text-xl font-black text-red-700">{audit.criticalCount}</p></div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {audit.flows.map((flow) => <FlowCard key={flow.id} flow={flow} />)}
    </div>

    {audit.ok ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune référence orpheline ou incohérence métier détectée dans les modules actifs.</div> : <div className="overflow-x-auto rounded-2xl border border-amber-200"><table className="min-w-full text-sm"><thead><tr className="border-b border-amber-100 bg-amber-50 text-left text-xs uppercase text-amber-800"><th className="py-2 px-3">Flux</th><th className="py-2 px-3">Module</th><th className="py-2 px-3">Ligne</th><th className="py-2 px-3">Cible</th><th className="py-2 px-3">Message</th></tr></thead><tbody>{audit.issues.slice(0, 40).map((issue, index) => <tr key={`${issue.module}-${issue.row_id}-${index}`} className="border-b border-amber-100"><td className="py-2 px-3 text-xs font-bold text-[#8a7456]">{audit.flows.find((flow) => flow.id === issue.flow)?.label || issue.flow || 'Flux ERP'}</td><td className="py-2 px-3 font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {issue.module}</td><td className="py-2 px-3">{issue.row_id || '—'}</td><td className="py-2 px-3">{issue.linked_id || '—'}</td><td className="py-2 px-3 text-[#8a7456]">{issue.message}</td></tr>)}</tbody></table>{audit.issues.length > 40 ? <p className="p-3 text-xs text-[#8a7456]">{audit.issues.length - 40} autre(s) point(s) masqué(s). Corriger les critiques en priorité.</p> : null}</div>}
  </ModuleSection>;
}

export default function SyncActivityCenter(props) {
  return <div className="space-y-6 sync-activity-mobile">
    <style>{`@media (max-width: 640px){.sync-activity-mobile .rounded-2xl{border-radius:18px}.sync-activity-mobile table{font-size:12px}.sync-activity-mobile th,.sync-activity-mobile td{padding-left:10px!important;padding-right:10px!important}.sync-activity-mobile .text-2xl{font-size:1.35rem}.sync-activity-mobile .grid{gap:.75rem}.sync-activity-mobile .overflow-x-auto{max-width:100vw}}`}</style>
    <InterconnectionAudit dataMap={props.dataMap} />
    <ModuleSection icon={Wifi} title="Synchronisation & offline" subtitle="File locale, backup, synchronisation, conflits et données disponibles hors ligne.">
      <Sync {...props} embedded />
    </ModuleSection>
    <ModuleSection icon={History} title="Activité, audit et sécurité" subtitle="Actions utilisateurs, événements métier, traces sensibles et journal système.">
      <AuditLogs rows={props.auditLogs || []} loading={props.auditLoading} onRefresh={props.onRefreshAuditLogs} onNavigate={props.onNavigate} />
    </ModuleSection>
  </div>;
}
