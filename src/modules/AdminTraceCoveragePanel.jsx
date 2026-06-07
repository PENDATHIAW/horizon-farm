import { ShieldCheck, UserCog } from 'lucide-react';
import { summarizeAdminTraceCoverage } from '../services/traceAuditFeedService';

export default function AdminTraceCoveragePanel({ events = [], auditLogs = [], onNavigate }) {
  const coverage = summarizeAdminTraceCoverage(events, auditLogs);
  if (!coverage.total && !auditLogs.length) return null;

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><UserCog size={15} /> Couverture admin & système</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Actions sensibles et journal d’activité</h3>
          <p className="text-sm text-[#8a7456] mt-1">Fusion des événements métier et des entrées audit_logs pour contrôler les actions admin.</p>
        </div>
        <div className={`rounded-2xl border p-3 text-sm ${coverage.missing.length ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <ShieldCheck size={15} className="inline" /> {coverage.coverageRate}% sourcées · {coverage.total} action(s)
        </div>
      </div>
      {coverage.missing.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {coverage.missing.slice(0, 4).map((event) => (
            <div key={event.id || event.title} className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="font-black text-[#2f2415]">{event.title}</p>
              <p className="text-xs mt-1">{event.module_source} · source à compléter</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Les actions admin visibles ont une source exploitable.</div>
      )}
      <div className="flex justify-end">
        <button type="button" onClick={() => onNavigate?.('gestion_systeme', { tab: 'Audit' })} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ouvrir audit système</button>
      </div>
    </section>
  );
}
