import { MessageSquareQuote } from 'lucide-react';
import CollapsibleAdvancedSection from '../../components/CollapsibleAdvancedSection.jsx';
import { buildElevageCockpitKpis } from '../../utils/elevageCockpitKpis.js';
import { buildElevageExecutiveBrief } from '../../utils/elevageExecutiveBrief.js';
import { ELEVAGE_KPI_GRID } from './elevageUi.jsx';
import ElevageStartupPanel from './ElevageStartupPanel.jsx';
import ElevageActivityPnlPanel from './ElevageActivityPnlPanel.jsx';
import ElevageProfitabilityKpis from './ElevageProfitabilityKpis.jsx';
import ElevageInsightPanel from './ElevageInsightPanel.jsx';

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return (
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 min-h-[72px]">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className={`mt-1 text-lg sm:text-xl font-black leading-tight ${cls}`}>{value}</p>
    </div>
  );
}

function ActionCard({ title, text, onClick }) {
  return (
    <button type="button" onClick={onClick} className="min-h-[48px] rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:bg-[#dcfce7]">
      <b className="text-[#2f2415]">{title}</b>
      <p className="mt-1 text-sm text-[#8a7456]">{text}</p>
    </button>
  );
}

export default function ElevageSummaryCockpit({
  data,
  setTab,
  onApply,
  busyId,
  onNavigate,
  onOpenWorkflow,
  showStartup,
  startupProgress,
  advancedOpen,
  onToggleAdvanced,
  profitabilityOpen,
  onToggleProfitability,
  onExport,
  findingsPanel,
}) {
  const cockpitKpis = buildElevageCockpitKpis({
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
    <div className="space-y-5">
      {showStartup ? <ElevageStartupPanel progress={startupProgress} setTab={setTab} onNavigate={onNavigate} onOpenWorkflow={onOpenWorkflow} /> : null}

      <section className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-[#2f2415]">Cockpit dirigeant</h2>
        <div className={ELEVAGE_KPI_GRID}>
          {cockpitKpis.map((kpi) => (
            <Stat key={kpi.id} label={kpi.label} value={kpi.value} tone={kpi.tone} />
          ))}
        </div>
      </section>

      <section className={`rounded-3xl border p-5 shadow-sm space-y-2 ${brief.stable ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
        <h3 className="flex items-center gap-2 text-sm font-black text-[#2f2415]">
          <MessageSquareQuote size={18} aria-hidden="true" />
          Brief Assistant
        </h3>
        <p className="text-sm font-bold text-[#2f2415]">{brief.headline}</p>
        <p className="text-sm leading-relaxed text-[#7d6a4a]">{brief.attention}</p>
      </section>

      <section className="hidden md:block rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2f2415]">Actions terrain</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <ActionCard title="Distribution aliment" text="Workflow officiel — décrémente le stock." onClick={() => onOpenWorkflow?.('feeding')} />
          <ActionCard title="Ramassage œufs" text="Draft possible par voix — validation humaine." onClick={() => onOpenWorkflow?.('eggs')} />
          <ActionCard title="Mortalité lot" text="Impact effectif et alertes." onClick={() => onOpenWorkflow?.('mortality')} />
          <ActionCard title="Intervention santé" text="Preuve, stock, coût, rappel." onClick={() => onOpenWorkflow?.('health')} />
          <ActionCard title="Pesée" text="Historique poids lot ou animal." onClick={() => onOpenWorkflow?.('weighing')} />
          <ActionCard title="Préparer vente" text="Commercial — jamais automatique." onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
      </section>

      <CollapsibleAdvancedSection
        eyebrow="Analyse"
        title="P&L, rentabilité filières, signaux IA"
        description="Sections secondaires — repliées par défaut."
        open={advancedOpen}
        onToggle={onToggleAdvanced}
      >
        <ElevageInsightPanel insights={data.costAwareInsights} onApplyFinding={onApply} onNavigate={onNavigate} busyId={busyId} />
        <ElevageActivityPnlPanel pnl={data.activityPnl} onExport={onExport} />
        <ElevageProfitabilityKpis
          pondeuseLots={data.pondeuseLots}
          chairLots={data.chairLots}
          bovins={data.bovins}
          context={data.marginContext}
          open={profitabilityOpen}
          onToggle={onToggleProfitability}
        />
        {findingsPanel}
      </CollapsibleAdvancedSection>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2f2415]">Parcours métier</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <ActionCard title="Cycles" text="Planification seule." onClick={() => setTab('Cycles')} />
          <ActionCard title="Production" text="Performances." onClick={() => setTab('Production')} />
          <ActionCard title="Transformation" text="Vivant → produit." onClick={() => setTab('Transformation')} />
          <ActionCard title="Alimentation" text="Rations & distributions." onClick={() => setTab('Alimentation')} />
          <ActionCard title="Reproduction" text="Naissances." onClick={() => setTab('Reproduction')} />
          <ActionCard title="Santé" text="Vétérinaire." onClick={() => setTab('Santé')} />
        </div>
      </section>
    </div>
  );
}
