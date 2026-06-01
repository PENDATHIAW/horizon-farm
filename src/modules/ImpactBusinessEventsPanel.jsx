import { AlertTriangle, CheckCircle2, Layers } from 'lucide-react';
import { useMemo } from 'react';
import { auditBusinessImpactEvents, normalizeBusinessImpactEvent } from '../services/impactBusinessEventService.js';
import { fmtCurrency } from '../utils/format.js';

const levelTone = (level = '') => {
  if (level === 'critique') return 'border-red-200 bg-red-50 text-red-800';
  if (level === 'eleve') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-emerald-200 bg-emerald-50 text-emerald-800';
};

export default function ImpactBusinessEventsPanel({ businessEvents = [], onNavigate }) {
  const audit = useMemo(() => auditBusinessImpactEvents(businessEvents), [businessEvents]);
  const recent = useMemo(() => businessEvents.slice(0, 12).map(normalizeBusinessImpactEvent), [businessEvents]);

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]">
            <Layers size={14} /> Impacts structurés
          </p>
          <h3 className="mt-3 text-xl font-black text-[#2f2415]">Événements métier mesurables</h3>
          <p className="mt-1 text-sm text-[#8a7456]">Score structuration {audit.score}/100 · module, niveau, montant et action recommandée.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('activite_suivi', { tab: 'Traçabilité' })} className="rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-3 text-sm font-black text-[#2f2415]">Voir traçabilité</button>
      </div>
      {audit.unstructured.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 space-y-2">
          <p className="font-black text-amber-900 flex items-center gap-2"><AlertTriangle size={16} /> {audit.unstructured.length} événement(s) encore libres</p>
          {audit.unstructured.slice(0, 6).map((row) => (
            <div key={row.id} className="rounded-xl border border-amber-100 bg-white px-3 py-2 text-sm">
              <b className="text-[#2f2415]">{row.title}</b>
              <p className="text-xs text-[#8a7456]">{row.module} · {row.amount > 0 ? fmtCurrency(row.amount) : 'montant à renseigner'}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-800">
          <CheckCircle2 size={14} className="inline" /> Impacts métier structurés.
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
        {recent.map((row) => (
          <div key={row.id} className={`rounded-xl border p-3 text-sm ${levelTone(row.level)}`}>
            <b className="text-[#2f2415]">{row.title}</b>
            <p className="text-xs mt-1">{row.module} · {row.level}{row.amount > 0 ? ` · ${fmtCurrency(row.amount)}` : ''}</p>
            {row.action ? <p className="text-xs mt-1 opacity-80">Action : {row.action}</p> : null}
          </div>
        ))}
      </div>
    </section>
  );
}
