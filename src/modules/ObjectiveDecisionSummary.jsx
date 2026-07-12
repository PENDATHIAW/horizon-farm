import { ArrowRight, CalendarDays, Target, Zap } from 'lucide-react';
import { fmtCurrency, fmtNumber } from '../utils/format';

function toneForCoverage(status) {
  if (status === 'couvert') return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  if (status === 'partiel') return 'border-amber-200 bg-amber-50 text-amber-800';
  return 'border-red-200 bg-red-50 text-red-800';
}

export default function ObjectiveDecisionSummary({ plan, onNavigate }) {
  const recommendations = plan?.recommendations || [];
  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Zap size={15} /> Demande, couverture & actions</p>
          <h3 className="text-xl font-black text-[#2f2415] mt-1">Ce que les objectifs exigent réellement</h3>
          <p className="text-sm text-[#8a7456] mt-1">Cette synthèse montre si la ferme peut couvrir la demande prévue ou s’il faut vendre, précommander, investir ou sécuriser une deadline.</p>
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_decisionnel')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white hover:bg-[#3d2f1d] flex items-center gap-2">
          Voir Centre décisionnel <ArrowRight size={14} />
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        {recommendations.slice(0, 6).map((item) => (
          <div key={item.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wider font-black text-[#8a7456]">{item.activity}</p>
                <h4 className="font-black text-[#2f2415] mt-1 line-clamp-2">{item.title}</h4>
              </div>
              <span className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${toneForCoverage(item.coverage_status)}`}>{item.coverage_status || 'inconnu'}</span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Mini icon={Target} label="Demande" value={item.demand_level || '—'} />
              <Mini icon={Zap} label="Couverture" value={`${item.coverage_rate || 0}%`} />
              <Mini icon={CalendarDays} label="Date cible" value={item.target_date || '—'} />
              <Mini icon={CalendarDays} label="Deadline" value={item.latest_start || '—'} />
            </div>

            <div className="mt-3 rounded-xl bg-white border border-[#eadcc2] p-3 text-xs text-[#7d6a4a]">
              <p>Écart : <b className="text-[#2f2415]">{fmtNumber(item.gap_units || 0)} unité(s)</b></p>
              <p>Valeur à couvrir : <b className="text-[#2f2415]">{fmtCurrency(item.gap_revenue || 0)}</b></p>
            </div>

            <p className="mt-3 text-xs text-[#7d6a4a] line-clamp-3">{item.recommendation}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={() => onNavigate?.('centre_decisionnel')} className="rounded-xl border border-[#d6c3a0] px-2 py-2 text-[11px] font-black text-[#7d6a4a] hover:border-emerald-400 hover:text-emerald-700">Reco détaillée</button>
              <button type="button" onClick={() => onNavigate?.('investissements')} className="rounded-xl bg-[#f6c453] px-2 py-2 text-[11px] font-black text-[#2f2415] hover:bg-[#ffe08a]">BP / Investir</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Mini({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 min-w-0"><Icon size={13} className="text-[#9a6b12]" /><p className="mt-1 text-[10px] text-[#8a7456]">{label}</p><p className="text-xs font-black text-[#2f2415] truncate">{value}</p></div>;
}
