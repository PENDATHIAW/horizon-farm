import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CentreRecommandationsTab from './CentreRecommandationsTab.jsx';
import DecisionHistoryPanel from '../DecisionHistoryPanel.jsx';
import VisionDecisionGraphiquesTab from '../vision/VisionDecisionGraphiquesTab.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const GROWTH_ACTIVITIES = ['oeufs', 'poulets_chair', 'bovins'];

function ActivityGoalCard({ row = {}, onNavigate }) {
  const attainment = Number(row.attainment || 0);
  const tone = attainment >= 100 ? 'border-emerald-200 bg-emerald-50' : attainment >= 60 ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50';

  return (
    <article className={`rounded-2xl border p-4 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="font-black text-[#2f2415] text-sm">{row.label || row.activity}</p>
        <span className="rounded-full border border-current px-2 py-0.5 text-[10px] font-black uppercase">{attainment}%</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#7d6a4a]">
        <span>Objectif : <b>{fmtCurrency(row.target)}</b></span>
        <span>Réalisé : <b>{fmtCurrency(row.realized)}</b></span>
        <span>Reste : <b>{fmtCurrency(row.remaining)}</b></span>
      </div>
      {onNavigate && row.activity === 'oeufs' ? (
        <button type="button" onClick={() => onNavigate('elevage', { tab: 'Avicole' })} className="mt-2 text-xs font-black text-[#9a6b12] underline">Élevage → Avicole</button>
      ) : null}
      {onNavigate && row.activity === 'poulets_chair' ? (
        <button type="button" onClick={() => onNavigate('elevage', { tab: 'Cycles' })} className="mt-2 text-xs font-black text-[#9a6b12] underline">Élevage → Cycles chair</button>
      ) : null}
      {onNavigate && row.activity === 'bovins' ? (
        <button type="button" onClick={() => onNavigate('elevage', { tab: 'Animaux' })} className="mt-2 text-xs font-black text-[#9a6b12] underline">Élevage → Animaux</button>
      ) : null}
    </article>
  );
}

function AccordionSection({ title, detail, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-5 text-left">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">{title}</p>
          {detail ? <p className="mt-1 text-sm text-[#8a7456]">{detail}</p> : null}
        </div>
        {open ? <ChevronUp size={18} className="shrink-0 text-[#8a7456]" /> : <ChevronDown size={18} className="shrink-0 text-[#8a7456]" />}
      </button>
      {open ? <div className="border-t border-[#eadcc2] p-5 pt-4">{children}</div> : null}
    </section>
  );
}

/**
 * Moteur de croissance & opportunités — recommandations, objectifs par activité, ROI historique, graphiques.
 */
export default function CentreCroissanceTab({
  plan = {},
  dataMap = {},
  onNavigate,
  onSwitchTab,
  lots,
  animaux,
  cultures,
  transactions,
  stocks,
  alimentationLogs,
  productionLogs,
  salesOrders,
  payments,
  sante,
  businessEvents,
  fournisseurs,
  marketPrices,
}) {
  const [graphOpen, setGraphOpen] = useState(false);
  const activities = (plan.goals?.activities || []).filter((row) => GROWTH_ACTIVITIES.includes(row.activity));
  const globalGoal = plan.goals?.global;

  return (
    <div className="space-y-5">
      {globalGoal ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
          <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Objectif mois</p>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-2xl font-black text-[#2f2415]">{fmtNumber(globalGoal.attainment || 0)}%</p>
              <p className="text-xs text-[#8a7456]">atteint · reste {fmtCurrency(globalGoal.remaining)}</p>
            </div>
            <div className="text-sm text-[#7d6a4a]">
              CA mois <b>{fmtCurrency(globalGoal.realized)}</b> / {fmtCurrency(globalGoal.monthTarget)}
            </div>
            {onNavigate ? (
              <button type="button" onClick={() => onNavigate('objectifs_croissance', { tab: 'Rentabilité Lot & Cycle' })} className="text-xs font-black text-[#9a6b12] underline">
                Objectifs & Croissance →
              </button>
            ) : null}
          </div>
        </section>
      ) : null}

      {activities.length ? (
        <section className="space-y-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-[#9a6b12] font-black">Fiches activité</p>
            <h3 className="text-lg font-black text-[#2f2415] mt-1">Œufs · chair · bovins</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activities.map((row) => (
              <ActivityGoalCard key={row.activity} row={row} onNavigate={onNavigate} />
            ))}
          </div>
        </section>
      ) : null}

      <CentreRecommandationsTab plan={plan} onNavigate={onNavigate} onSwitchTab={onSwitchTab} />

      <DecisionHistoryPanel dataMap={dataMap} onNavigate={onNavigate} />

      <AccordionSection
        title="Graphiques décisionnels"
        detail="Courbes production, marge et signaux — optionnel, pour creuser une recommandation."
        open={graphOpen}
        onToggle={() => setGraphOpen((v) => !v)}
      >
        <VisionDecisionGraphiquesTab
          lots={lots}
          animaux={animaux}
          cultures={cultures}
          clients={dataMap.clients}
          transactions={transactions}
          stocks={stocks}
          alimentationLogs={alimentationLogs}
          productionLogs={productionLogs}
          salesOrders={salesOrders}
          payments={payments}
          sante={sante}
          businessEvents={businessEvents}
          fournisseurs={fournisseurs}
          marketPrices={marketPrices}
          onNavigate={onNavigate}
        />
      </AccordionSection>
    </div>
  );
}
