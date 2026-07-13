import { ArrowDown, ArrowUp } from 'lucide-react';

const HIDDEN_HELPER_TEXTS = new Set([
  'Jamais > 100%',
  'Base effectif disponible',
  'Donnees coherentes',
  'Données cohérentes',
]);

function KpiCardContent({ icon: Icon, label, value, sub, color, trend, clickable }) {
  const displaySub = sub && !HIDDEN_HELPER_TEXTS.has(String(sub).trim());

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ring-1 ring-white/60 shadow-card ${color}`}>
          {Icon ? <Icon size={19} aria-hidden="true" /> : null}
        </div>
        {trend !== undefined ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-meta font-semibold ${trend >= 0 ? 'bg-positive-bg text-positive border border-positive' : 'bg-urgent-bg text-urgent border border-urgent'}`}>
            {trend >= 0 ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
            {Math.abs(trend)}%
          </span>
        ) : null}
      </div>
      <div>
        <div className="text-2xl font-semibold tracking-normal text-earth break-words">{value}</div>
        <div className="text-xs font-semibold uppercase tracking-normal text-slate mt-1">{label}</div>
        {displaySub ? <div className="text-xs text-slate/80 mt-1 leading-relaxed">{sub}</div> : null}
        {clickable ? <div className="mt-3 text-xs font-semibold text-horizon-dark">Voir détails →</div> : null}
      </div>
    </>
  );
}

export default function KpiCard({ icon, label, value, sub, color, trend, onClick, title }) {
  const clickable = typeof onClick === 'function';
  const className = `group w-full text-left bg-white/90 border border-line rounded-3xl p-6 flex flex-col gap-3 shadow-card transition-all ${clickable ? 'cursor-pointer hover:-translate-y-0.5 hover:border-horizon hover:shadow-float focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-horizon/30' : ''}`;

  if (clickable) {
    return (
      <button type="button" onClick={onClick} title={title || label} aria-label={title || label} className={className}>
        <KpiCardContent icon={icon} label={label} value={value} sub={sub} color={color} trend={trend} clickable />
      </button>
    );
  }

  return (
    <div title={title} className={className}>
      <KpiCardContent icon={icon} label={label} value={value} sub={sub} color={color} trend={trend} clickable={false} />
    </div>
  );
}
