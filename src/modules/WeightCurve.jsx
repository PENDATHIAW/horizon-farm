import { Scale, TrendingUp } from 'lucide-react';
import { weighingSeries } from '../utils/simulatedWeighings.js';

function sparkPoints(values, w = 100, h = 30, pad = 2) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const n = values.length;
  return values.map((v, i) => {
    const x = n > 1 ? (i / (n - 1)) * (w - pad * 2) + pad : w / 2;
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return [Number(x.toFixed(2)), Number(y.toFixed(2))];
  });
}

/**
 * Courbe de pesée d'un sujet (simulation) affichée dans sa fiche : poids actuel,
 * GMQ, gain total et la trajectoire semaine par semaine. Prête à accueillir de
 * vraies pesées (saisie manuelle ou balance 4G) — même forme { date, poids }.
 */
export default function WeightCurve({ target, mode = 'animaux' }) {
  const serie = weighingSeries(target, mode);
  if (!serie.points.length) return null;
  const values = serie.points.map((p) => p.poids);
  const pts = sparkPoints(values);
  const line = pts.map((p) => p.join(',')).join(' ');
  const area = `2,30 ${line} 98,30`;
  const [lx, ly] = pts[pts.length - 1];
  const gainUp = serie.gainTotal >= 0;

  return (
    <div className="border-b border-line bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <Scale size={13} className="text-horizon-dark" aria-hidden="true" />
        <p className="text-meta font-semibold uppercase tracking-normal text-slate">Courbe de pesée · simulation</p>
      </div>
      <div className="mt-2 flex flex-wrap items-end gap-x-5 gap-y-2">
        <div>
          <p className="text-meta text-slate">Poids actuel</p>
          <p className="text-2xl font-semibold leading-tight text-earth tabular-nums">{serie.last} <span className="text-sm font-medium text-slate">{serie.unit}</span></p>
        </div>
        <div>
          <p className="text-meta text-slate">GMQ</p>
          <p className="inline-flex items-center gap-1 text-base font-semibold text-earth tabular-nums">
            <TrendingUp size={14} className={gainUp ? 'text-positive' : 'text-urgent'} aria-hidden="true" />
            {serie.gmq} {serie.unit === 'kg' && mode === 'avicole' ? 'g/j' : `${serie.unit}/j`}
          </p>
        </div>
        <div>
          <p className="text-meta text-slate">Gain total</p>
          <p className={`text-base font-semibold tabular-nums ${gainUp ? 'text-positive' : 'text-urgent'}`}>{gainUp ? '+' : ''}{serie.gainTotal} {serie.unit}</p>
        </div>
        <div className="ml-auto min-w-[150px] flex-1">
          <svg viewBox="0 0 100 32" preserveAspectRatio="none" className="h-12 w-full text-leaf" aria-label="Courbe de poids">
            <polyline points={area} fill="currentColor" opacity="0.10" stroke="none" />
            <polyline points={line} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            <circle cx={lx} cy={ly} r="1.8" fill="currentColor" />
          </svg>
          <div className="flex justify-between">
            <span className="text-meta text-slate">{serie.points[0].label}</span>
            <span className="text-meta text-slate">{serie.points[serie.points.length - 1].label}</span>
          </div>
        </div>
      </div>
      <p className="mt-1.5 text-meta text-slate">Prête pour de vraies pesées : saisie manuelle ou balance 4G (même format {'{'} date, poids {'}'}).</p>
    </div>
  );
}
