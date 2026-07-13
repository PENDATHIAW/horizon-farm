import { LineChart } from 'lucide-react';
import { toNumber } from '../utils/format';

export default function AnimalWeightCurve({ history = [], target = 0, title = "Courbe d'évolution du poids" }) {
  const points = history.filter((row) => toNumber(row.poids) > 0);
  if (points.length < 2) {
    return (
      <div className="rounded-2xl border border-line bg-card p-6 text-center text-sm text-slate">
        Ajoute au moins deux pesées pour afficher une courbe fiable.
      </div>
    );
  }

  const values = points.map((row) => toNumber(row.poids)).concat(target > 0 ? [target] : []);
  const min = Math.min(...values) * 0.96;
  const max = Math.max(...values) * 1.04;
  const w = 640;
  const h = 220;
  const pad = 32;
  const x = (index) => pad + (index * (w - pad * 2)) / Math.max(1, points.length - 1);
  const y = (value) => h - pad - ((value - min) / Math.max(1, max - min)) * (h - pad * 2);
  const path = points.map((row, index) => `${index ? 'L' : 'M'} ${x(index)} ${y(toNumber(row.poids))}`).join(' ');
  const targetY = target > 0 ? y(target) : null;

  return (
    <div className="rounded-2xl border border-line bg-white p-4">
      <p className="font-semibold text-earth flex items-center gap-2 mb-3">
        <LineChart size={16} />
        {title}
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56" role="img" aria-label={title}>
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--hf-line)" />
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--hf-line)" />
        {targetY ? <line x1={pad} y1={targetY} x2={w - pad} y2={targetY} stroke="var(--hf-horizon)" strokeDasharray="6 6" /> : null}
        <path d={path} fill="none" stroke="var(--hf-ink)" strokeWidth="4" strokeLinecap="round" />
        {points.map((row, index) => (
          <g key={`${row.date}-${index}`}>
            <circle cx={x(index)} cy={y(toNumber(row.poids))} r="5" fill="var(--hf-ink)" />
            <text x={x(index)} y={y(toNumber(row.poids)) - 10} textAnchor="middle" fontSize="12" fill="var(--hf-ink)">
              {toNumber(row.poids)}kg
            </text>
            <text x={x(index)} y={h - 10} textAnchor="middle" fontSize="11" fill="var(--hf-slate)">
              {String(row.date).slice(5)}
            </text>
          </g>
        ))}
      </svg>
      {target > 0 ? <p className="mt-2 text-xs text-slate">Ligne pointillée : objectif {target} kg</p> : null}
    </div>
  );
}

