import { ArrowDown, ArrowUp } from 'lucide-react';

const HIDDEN_HELPER_TEXTS = new Set([
  'Jamais > 100%',
  'Base effectif disponible',
  'Donnees coherentes',
  'Données cohérentes',
]);

export default function KpiCard({ icon: Icon, label, value, sub, color, trend, onClick, title }) {
  const displaySub = sub && !HIDDEN_HELPER_TEXTS.has(String(sub).trim());
  const clickable = typeof onClick === 'function';

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={!clickable}
      className={`group w-full text-left bg-white/90 border border-[#eadcc2] rounded-3xl p-5 flex flex-col gap-3 shadow-sm hover:border-[#c9a96a] hover:shadow-md transition-all ${clickable ? 'cursor-pointer hover:-translate-y-0.5' : 'cursor-default'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ring-1 ring-white/60 shadow-sm ${color}`}>
          {Icon ? <Icon size={19} /> : null}
        </div>
        {trend !== undefined ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-black ${trend >= 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {trend >= 0 ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-2xl font-black tracking-tight text-[#2f2415]">{value}</div>
        <div className="text-xs font-bold uppercase tracking-wide text-[#8a7456] mt-1">{label}</div>
        {displaySub ? <div className="text-xs text-[#8a7456]/80 mt-1 leading-relaxed">{sub}</div> : null}
      </div>
    </button>
  );
}
