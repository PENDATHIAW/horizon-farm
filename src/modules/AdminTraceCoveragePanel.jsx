import { ShieldCheck, UserCog } from 'lucide-react';
import { summarizeAdminTraceCoverage } from '../services/traceAuditFeedService';

export default function AdminTraceCoveragePanel({ events = [], auditLogs = [], onNavigate }) {
  const coverage = summarizeAdminTraceCoverage(events, auditLogs);
  if (!coverage.total && !auditLogs.length) return null;

  return (
    <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><UserCog size={15} /> Couverture admin & système</p>
          <h3 className="text-xl font-semibold text-earth mt-1">Actions sensibles et journal d’activité</h3>
          <p className="text-sm text-slate mt-1">Fusion des événements métier et des entrées audit_logs pour contrôler les actions admin.</p>
        </div>
        <div className={`rounded-2xl border p-3 text-sm ${coverage.missing.length ? 'border-vigilance bg-vigilance-bg text-horizon-dark' : 'border-positive bg-positive-bg text-positive'}`}>
          <ShieldCheck size={15} className="inline" /> {coverage.coverageRate}% sourcées · {coverage.total} action(s)
        </div>
      </div>
      {coverage.missing.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {coverage.missing.slice(0, 4).map((event) => (
            <div key={event.id || event.title} className="rounded-xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">
              <p className="font-semibold text-earth">{event.title}</p>
              <p className="text-xs mt-1">{event.module_source} · source à compléter</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-positive bg-positive-bg p-3 text-sm text-positive">Les actions admin visibles ont une source exploitable.</div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={() => onNavigate?.('gestion_systeme', { tab: 'Audit' })} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Ouvrir audit système</button>
      </div>
    </section>
  );
}
