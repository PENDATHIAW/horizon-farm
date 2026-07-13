import {
  Egg,
  HeartPulse,
  MessageSquareText,
  Scale,
  ShoppingCart,
  Wheat,
} from 'lucide-react';
import { buildElevageCockpitKpis } from '../../utils/elevageCockpitKpis.js';
import { buildElevageExecutiveBrief } from '../../utils/elevageExecutiveBrief.js';
import ElevageStartupPanel from './ElevageStartupPanel.jsx';
import { ELEVAGE_ACTION_GRID, ELEVAGE_KPI_GRID, ElevageActionCard, ElevageStatCard } from './elevageUi.jsx';

export default function ElevageOverviewTab({
  data,
  showStartup,
  startupProgress,
  onSetTab,
  onNavigate,
  onOpenWorkflow,
}) {
  const kpis = buildElevageCockpitKpis({
    layingRateLabel: data.layingRateLabel,
    layingRateCalculable: data.layingRateCalculable,
    productionSnapshot: data.productionSnapshot,
    activityPnl: data.activityPnl,
    feedCost: data.feedCost,
    recentMortality: data.recentMortality,
    animals: data.animals,
    lots: data.lots,
  });
  const brief = buildElevageExecutiveBrief({
    healthScore: data.healthScore,
    healthLate: data.healthLate,
    recentMortality: data.recentMortality,
    layingRateCalculable: data.layingRateCalculable,
    layingRate: data.layingRate,
    lots: data.lots,
    feedLogs: data.feedLogs,
    productionSnapshot: data.productionSnapshot,
    activityPnl: data.activityPnl,
    healthFindings: data.healthFindings,
    reproduction: data.reproduction,
  });

  return (
    <div className="space-y-4">
      {showStartup ? (
        <ElevageStartupPanel
          progress={startupProgress}
          setTab={onSetTab}
          onNavigate={onNavigate}
          onOpenWorkflow={onOpenWorkflow}
        />
      ) : null}

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-normal text-horizon-dark">Vue d'ensemble</p>
          <h2 className="mt-1 text-lg font-semibold text-earth">Situation de l'élevage</h2>
        </div>
        <div className={ELEVAGE_KPI_GRID}>
          {kpis.map((kpi) => (
            <ElevageStatCard key={kpi.id} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border p-6 shadow-card ${brief.stable ? 'border-positive bg-positive-bg' : 'border-vigilance bg-vigilance-bg'}`}>
        <h2 className="flex items-center gap-2 text-base font-semibold text-earth">
          <MessageSquareText size={18} aria-hidden="true" />
          Brief exploitation
        </h2>
        <p className="mt-2 text-sm font-semibold text-earth">{brief.headline}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate">{brief.attention}</p>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-earth">Actions terrain</h2>
          <p className="mt-1 text-sm text-slate">Chaque action ouvre le formulaire métier officiel avant tout impact.</p>
        </div>
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard icon={Wheat} title="Distribuer l'aliment" text="Stock, coût et historique après validation." onClick={() => onOpenWorkflow?.('feeding')} />
          <ElevageActionCard icon={Egg} title="Enregistrer la ponte" text="Ramassage, casse et stock d'œufs." onClick={() => onOpenWorkflow?.('eggs')} />
          <ElevageActionCard icon={HeartPulse} title="Intervention santé" text="Soin, coût, preuve et rappel." onClick={() => onSetTab?.('Santé')} />
          <ElevageActionCard icon={Scale} title="Enregistrer une pesée" text="Poids et historique du lot ou de l'animal." onClick={() => onOpenWorkflow?.('weighing')} />
          <ElevageActionCard icon={ShoppingCart} title="Préparer une vente" text="Ouverture du parcours Commercial sans vente automatique." onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </section>

      {data.costAwareInsights?.length ? (
        <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-3">
          <h2 className="text-lg font-semibold text-earth">Points d'attention</h2>
          {data.costAwareInsights.slice(0, 4).map((insight, index) => (
            <div key={insight.id || insight.title || index} className="rounded-xl border border-line bg-card p-4 text-sm">
              <p className="font-semibold text-earth">{insight.title || 'Point à vérifier'}</p>
              {insight.description ? <p className="mt-1 text-slate">{insight.description}</p> : null}
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}
