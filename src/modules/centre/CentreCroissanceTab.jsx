import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CentreRecommandationsTab from './CentreRecommandationsTab.jsx';
import DecisionHistoryPanel from '../DecisionHistoryPanel.jsx';
import VisionDecisionGraphiquesTab from '../vision/VisionDecisionGraphiquesTab.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const GROWTH_ACTIVITIES = ['oeufs', 'poulets_chair', 'bovins'];

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
 * Croissance & opportunités — objectifs, recommandations, ROI (sans calendrier ni urgences).
 */
export default function CentreCroissanceTab({
  plan = {},
  dataMap = {},
  onNavigate,
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
  const globalGoal = plan.goals?.global;
  const activities = (plan.goals?.activities || []).filter((row) => GROWTH_ACTIVITIES.includes(row.activity));

  return (
    <div className="space-y-4">
      {globalGoal ? (
        <section className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 shadow-sm flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-black text-[#2f2415]">Objectif mois {fmtNumber(globalGoal.attainment || 0)}%</span>
          <span className="text-[#7d6a4a]">CA <b>{fmtCurrency(globalGoal.realized)}</b> / {fmtCurrency(globalGoal.monthTarget)}</span>
          <span className="text-[#7d6a4a]">Reste <b>{fmtCurrency(globalGoal.remaining)}</b></span>
          {activities.map((row) => (
            <span key={row.activity} className="text-xs text-[#8a7456]">
              {row.label || row.activity} <b className="text-[#2f2415]">{row.attainment || 0}%</b>
            </span>
          ))}
          {onNavigate ? (
            <button type="button" onClick={() => onNavigate('objectifs_croissance', { tab: 'Rentabilité Lot & Cycle' })} className="text-xs font-black text-[#9a6b12] underline">
              Objectifs →
            </button>
          ) : null}
        </section>
      ) : null}

      <CentreRecommandationsTab plan={plan} onNavigate={onNavigate} />

      <DecisionHistoryPanel dataMap={dataMap} onNavigate={onNavigate} compact />

      <AccordionSection
        title="Graphiques"
        detail="Optionnel — production, marge et signaux."
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
