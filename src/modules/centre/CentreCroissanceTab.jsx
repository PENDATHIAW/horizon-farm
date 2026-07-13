import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import CentreRecommandationsTab from './CentreRecommandationsTab.jsx';
import DecisionHistoryPanel from '../DecisionHistoryPanel.jsx';
import VisionDecisionGraphiquesTab from '../vision/VisionDecisionGraphiquesTab.jsx';
import { fmtCurrency, fmtNumber } from '../../utils/format';

const GROWTH_ACTIVITIES = ['oeufs', 'poulets_chair', 'bovins'];

function AccordionSection({ title, detail, open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-line bg-card shadow-card">
      <button type="button" onClick={onToggle} className="flex w-full items-start justify-between gap-3 p-6 text-left">
        <div>
          <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">{title}</p>
          {detail ? <p className="mt-1 text-sm text-slate">{detail}</p> : null}
        </div>
        {open ? <ChevronUp size={18} className="shrink-0 text-slate" /> : <ChevronDown size={18} className="shrink-0 text-slate" />}
      </button>
      {open ? <div className="border-t border-line p-6 pt-4">{children}</div> : null}
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
        <section className="rounded-2xl border border-line bg-white px-4 py-3 shadow-card flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="font-semibold text-earth">Objectif mois {fmtNumber(globalGoal.attainment || 0)}%</span>
          <span className="text-slate">CA <b>{fmtCurrency(globalGoal.realized)}</b> / {fmtCurrency(globalGoal.monthTarget)}</span>
          <span className="text-slate">Reste <b>{fmtCurrency(globalGoal.remaining)}</b></span>
          {activities.map((row) => (
            <span key={row.activity} className="text-xs text-slate">
              {row.label || row.activity} <b className="text-earth">{row.attainment || 0}%</b>
            </span>
          ))}
          {onNavigate ? (
            <button type="button" onClick={() => onNavigate('objectifs_croissance', { tab: 'Suivi du Business Plan' })} className="text-xs font-semibold text-horizon-dark underline">
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
