import { Target } from 'lucide-react';
import { fmtCurrency } from '../../utils/format';

export default function ObjectifsActivitesPanel({ plan = {}, onNavigate }) {
  const activities = plan.goals?.activities || [];

  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Target size={15} /> Objectifs par activité</p>
        <h3 className="text-xl font-black text-[#2f2415] mt-1">Quelle activité pousse ou retarde la croissance ?</h3>
        <p className="text-sm text-[#8a7456] mt-1">Objectifs issus du BP officiel — œufs, poulets de chair, bovins et fumier.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {activities.map((activity) => (
          <div key={activity.activity} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <p className="text-xs font-black text-[#8a7456]">{activity.label}</p>
            <p className="text-2xl font-black text-[#2f2415] mt-1">{activity.attainment ?? 0}%</p>
            <p className="text-xs text-[#8a7456] mt-1">Objectif {fmtCurrency(activity.target)}</p>
            <p className="text-xs text-[#8a7456]">Réalisé {fmtCurrency(activity.realized)}</p>
            <p className="text-xs text-[#8a7456]">Reste {fmtCurrency(activity.remaining)}</p>
          </div>
        ))}
        {!activities.length ? (
          <div className="col-span-full rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">
            Aucun objectif par activité disponible pour le moment.
          </div>
        ) : null}
      </div>
      <button type="button" onClick={() => onNavigate?.('ventes')} className="text-xs font-black text-[#9a6b12]">
        Agir côté ventes →
      </button>
    </section>
  );
}
