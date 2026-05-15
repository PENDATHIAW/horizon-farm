import { Target, TrendingUp } from 'lucide-react';
import { buildGoalPerformance } from '../services/growthDecisionEngine';
import { fmtCurrency } from '../utils/format';

const activityFallback = {
  global: 'Global ferme',
  oeufs: 'Œufs / Pondeuses',
  poulets_chair: 'Poulets de chair',
  animaux: 'Animaux global',
  bovins: 'Bovins',
  ovins: 'Ovins',
  caprins: 'Caprins',
  cultures: 'Cultures',
  stock: 'Stock / Produits',
};

export default function ObjectivePerformanceCard({
  dataMap = {},
  activity = 'global',
  title = 'Objectif & Performance',
  compact = false,
  onNavigate,
}) {
  const performance = buildGoalPerformance(dataMap);
  const row = activity === 'global'
    ? performance.global
    : performance.activities.find((item) => item.activity === activity) || {
        label: activityFallback[activity] || activity,
        target: 0,
        realized: 0,
        attainment: 0,
        remaining: 0,
      };

  const target = row.monthTarget ?? row.target ?? 0;
  const realized = row.realized ?? 0;
  const attainment = row.attainment ?? 0;
  const remaining = row.remaining ?? Math.max(0, target - realized);
  const tone = attainment >= 90 ? 'emerald' : attainment >= 60 ? 'amber' : 'red';

  if (compact) {
    return (
      <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm min-w-0">
        <p className="text-[11px] uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
          <Target size={13} /> {title}
        </p>
        <h3 className="text-base font-black text-[#2f2415] mt-1 truncate">{row.label || activityFallback[activity] || activity}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Mini label="Objectif" value={fmtCurrency(target)} />
          <Mini label="Réalisé" value={fmtCurrency(realized)} />
          <Mini label="Taux" value={`${attainment}%`} tone={tone} />
          <Mini label="Reste" value={fmtCurrency(remaining)} tone={remaining > 0 ? 'amber' : 'emerald'} />
        </div>
        <button type="button" onClick={() => onNavigate?.('centre_ia')} className="mt-3 w-full rounded-xl bg-[#2f2415] px-3 py-2 text-[11px] font-black text-white hover:bg-[#3d2f1d]">
          Voir Centre décisionnel
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
            <Target size={14} /> {title}
          </p>
          <h3 className="text-lg font-black text-[#2f2415] mt-1">{row.label || activityFallback[activity] || activity}</h3>
          <p className="text-sm text-[#8a7456] mt-1">
            Objectif mensuel, CA réalisé, taux d’atteinte et reste à vendre.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1 xl:max-w-4xl">
          <Mini label="Objectif CA" value={fmtCurrency(target)} />
          <Mini label="Réalisé CA" value={fmtCurrency(realized)} />
          <Mini label="Taux" value={`${attainment}%`} tone={tone} />
          <Mini label="Reste" value={fmtCurrency(remaining)} tone={remaining > 0 ? 'amber' : 'emerald'} />
        </div>
      </div>

      <div className="mt-4 flex flex-col md:flex-row md:items-center justify-between gap-3 rounded-2xl bg-[#fffdf8] border border-[#eadcc2] p-3">
        <p className="text-sm text-[#7d6a4a] flex items-center gap-2">
          <TrendingUp size={15} className="text-[#c9a96a]" />
          Pour comprendre quoi vendre, quand investir et comment rattraper l’objectif, consulte le Centre décisionnel.
        </p>
        <button
          type="button"
          onClick={() => onNavigate?.('centre_ia')}
          className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]"
        >
          Voir Centre décisionnel
        </button>
      </div>
    </div>
  );
}

function Mini({ label, value, tone = 'neutral' }) {
  const toneClass = {
    neutral: 'text-[#2f2415]',
    emerald: 'text-emerald-600',
    amber: 'text-amber-600',
    red: 'text-red-600',
  }[tone] || 'text-[#2f2415]';

  return (
    <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] p-2 min-w-0">
      <p className="text-[10px] text-[#8a7456] truncate">{label}</p>
      <p className={`text-sm font-black mt-1 break-words ${toneClass}`}>{value}</p>
    </div>
  );
}
