import { ArrowRight, Package, Users } from 'lucide-react';
import ObjectiveDecisionSummary from '../ObjectiveDecisionSummary.jsx';
import { fmtCurrency } from '../../utils/format';
import { Btn, Empty, Section } from './visionUtils.jsx';

export default function VisionObjectifsPanels({ plan, onNavigate }) {
  const activities = plan?.goals?.activities || [];
  const global = plan?.goals?.global || {};

  return (
    <div className="space-y-6">
      <Section icon={Users} title="Objectifs par activité">
        {activities.length ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {activities.map((activity) => (
              <div key={activity.activity} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
                <p className="text-xs font-black text-[#8a7456]">{activity.label}</p>
                <p className="mt-1 text-2xl font-black text-[#2f2415]">{activity.attainment ?? 0}%</p>
                <p className="mt-1 text-xs text-[#8a7456]">Objectif {fmtCurrency(activity.target)}</p>
                <p className="text-xs text-[#8a7456]">Réalisé {fmtCurrency(activity.realized)}</p>
                <p className="text-xs text-[#8a7456]">Reste {fmtCurrency(activity.remaining)}</p>
              </div>
            ))}
          </div>
        ) : (
          <Empty>Aucun objectif par activité disponible pour le moment.</Empty>
        )}
        {global.monthTarget ? (
          <p className="mt-3 text-sm text-[#8a7456]">
            Objectif mensuel global : <b className="text-[#2f2415]">{fmtCurrency(global.monthTarget)}</b>
            {' · '}
            Réalisé {fmtCurrency(global.realized)} ({global.attainment ?? 0}%)
          </p>
        ) : null}
      </Section>

      <ObjectiveDecisionSummary plan={plan} onNavigate={onNavigate} />

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2">
              <Package size={15} /> Fidélisation, fournisseurs & stock
            </p>
            <h3 className="mt-1 text-xl font-black text-[#2f2415]">Sécuriser clients, dettes et intrants</h3>
            <p className="mt-1 text-sm text-[#8a7456]">
              Relances clients, paiements fournisseurs et seuils stock alimentent la marge et la trésorerie.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {onNavigate ? (
              <>
                <Btn onClick={() => onNavigate('commercial', { tab: 'Clients & créances' })}>Clients & fidélisation</Btn>
                <Btn onClick={() => onNavigate('achats_stock', { tab: 'Fournisseurs' })}>Fournisseurs</Btn>
                <Btn onClick={() => onNavigate('achats_stock', { tab: 'Stock' })}>Stock</Btn>
              </>
            ) : null}
          </div>
        </div>
        <button
          type="button"
          onClick={() => onNavigate?.('centre_decisionnel', { tab: 'À traiter' })}
          className="inline-flex items-center gap-2 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-4 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
        >
          Voir actions Centre décisionnel <ArrowRight size={14} />
        </button>
      </section>
    </div>
  );
}
