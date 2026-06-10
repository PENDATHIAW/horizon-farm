import { useEffect, useMemo, useState, useCallback } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis.js';
import { readUiSettings } from '../utils/uiPreferences';
import { readPeriodScope } from '../utils/periodScope';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { sanitizeDashboardMetric } from '../utils/dashboardWorkflows';
import { buildDashboardPilotageSuggestions } from '../utils/dashboardHeyHorizon.js';
import { getDashboardHealthReport } from './dashboard/dashboardHealthCache';
import {
  buildDashboardSummary,
  DASHBOARD_MODULES,
  DASHBOARD_MODULE_LABELS,
  formatCultureDetail,
  formatEggProductionDetail,
  formatEggProductionDelta,
  formatEncaisseDetail,
  formatEncaisseDelta,
  formatFarmHeadcountDetail,
  formatResultatDelta,
  formatResultatDetail,
  formatStockDetail,
} from './dashboard/dashboardMetrics';
import {
  buildDashboardInvestorReadiness,
  buildDashboardNarrative,
  buildDashboardPriorities,
  buildDashboardStartupJourney,
  buildDashboardWeatherReport,
  buildExploitationScore,
  buildFarmOverview,
} from './dashboard/dashboardPilotage';
import { navigateForDashboardAction, navigateForDashboardFinding } from './dashboard/dashboardNavigation';
import { dashboardGreeting } from './dashboard/dashboardGreeting';
import {
  buildActivityKpiCards,
  buildAdaptedAlertsPanel,
  buildAllFarmsDashboardContext,
  resolveQuickActionsForScope,
} from '../utils/farmConsolidation.js';
import {
  DashboardAllFarmsPanel,
  DashboardAllFarmsCompactPanel,
  DashboardActivityKpiStrip,
  DashboardAdaptedAlertsPanel,
  DashboardAdaptedQuickActions,
  FarmDemoModeBanner,
  FarmLocationGrid,
} from './dashboard/farmDashboardPanels.jsx';
import { isFarmDemoModeEnabled, setFarmDemoModeEnabled } from '../utils/farmDemoMode.js';
import { resolveDashboardTab } from '../utils/commercialNavigation.js';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import {
  DashboardGoalsHero,
  DashboardHealthStrip,
  DashboardHeyHorizonStrip,
  DashboardKpi,
  DashboardModuleHeader,
  DashboardModuleNav,
  DashboardQuickActions,
  DashboardSnapshotCard,
  DashboardStartupPanel,
  DashboardTodoRow,
  DashboardPrioritiesPanel,
  DashboardNarrativePanel,
  DashboardFarmOverviewPanel,
  DashboardExploitationScorePanel,
  DashboardExploitationScoreCompact,
  DashboardInvestorStrip,
  DashboardInvestorCompactStrip,
  DashboardWeatherStrip,
} from './dashboard/DashboardShell.jsx';
import { ESSENTIAL_KPI_LIMIT } from './dashboard/dashboardAccueilLayout.js';
import {
  buildPremiumExecutiveBrief,
  buildTemporalComparisons,
  buildExploitationDynamics,
  buildDashboardQuickQuestions,
  buildPresentationModeData,
  buildSingleFarmLocationCard,
  isSpeechSynthesisSupported,
} from './dashboard/dashboardV3.js';
import {
  DashboardPremiumBriefPanel,
  DashboardTemporalComparisonPanel,
  DashboardDynamicsScorePanel,
  DashboardHeyHorizonQuickAskStrip,
  DashboardPresentationOverlay,
  DashboardFarmLocationPremiumCard,
} from './dashboard/dashboardV3Panels.jsx';

const firstValue = (...values) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== '');
const formatDateTime = () => new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date());

function farmLocationOf(props = {}) {
  const farm = props.farm || props.ferme || props.farmProfile || props.farm_profile || {};
  const meteo = props.meteo || props.weather || {};
  const quartier = firstValue(farm.quartier, farm.neighborhood, farm.district, meteo.quartier, meteo.neighborhood, meteo.district);
  const ville = firstValue(farm.ville, farm.city, farm.localite, farm.locality, meteo.ville, meteo.city, meteo.localite, meteo.locality, meteo.location);
  const pays = firstValue(farm.pays, farm.country, meteo.pays, meteo.country);
  const parts = [quartier, ville, pays].filter(Boolean);
  return parts.length ? parts.join(', ') : firstValue(farm.location, farm.localisation, meteo.localisation, meteo.place, 'Ferme principale');
}

function displayUserOf(props = {}) {
  const user = props.user || props.currentUser || {};
  const raw = firstValue(props.displayUser, props.userName, props.username, user.user_metadata?.login, user.user_metadata?.name, user.email?.split('@')[0]);
  if (!raw) return 'Exploitant';
  const text = String(raw).trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function EssentialKpiGrid({ summary, navigate, className = '' }) {
  const stockCritical = summary.stockSummary?.lowStockCount ?? summary.stockBas ?? 0;
  const productionValue = summary.production > 0
    ? fmtNumber(summary.production)
    : summary.cultureSummary?.hasData
      ? `${fmtNumber(summary.cultureSummary.parcelCount)} parcelle(s)`
      : fmtNumber(summary.effectifs);

  const kpis = [
    {
      key: 'cashNet',
      label: 'Trésorerie disponible',
      value: fmtCurrency(summary.cashNet),
      detail: 'Disponibilité financière cumulée',
      scopeLabel: 'Cumul',
      tone: summary.cashNet >= 0 ? 'good' : 'bad',
      onClick: () => navigate('finance_pilotage', { tab: 'Trésorerie' }),
    },
    {
      key: 'ca',
      label: 'CA période',
      value: fmtCurrency(summary.ca),
      detail: 'Commandes sur la période ERP',
      scopeLabel: 'Période',
      tone: 'good',
      onClick: () => navigate('commercial', { tab: 'Graphiques' }),
    },
    {
      key: 'receivable',
      label: 'Créances à relancer',
      value: fmtCurrency(summary.receivable),
      detail: 'Reste à encaisser',
      scopeLabel: 'Cumul',
      tone: summary.receivable ? 'warn' : 'good',
      onClick: () => navigate('commercial', { tab: 'Clients' }),
    },
    {
      key: 'stock',
      label: 'Stock critique',
      value: fmtNumber(stockCritical),
      detail: formatStockDetail(summary.stockSummary),
      scopeLabel: 'Global',
      tone: stockCritical ? 'warn' : 'good',
      onClick: () => navigate('achats_stock', { tab: 'Stock' }),
    },
    {
      key: 'production',
      label: summary.cultureSummary?.hasData && !summary.production ? 'Production / cultures' : 'Production',
      value: productionValue,
      detail: summary.eggProduction?.eggsPeriod > 0
        ? formatEggProductionDetail(summary.eggProduction)
        : formatCultureDetail(summary.cultureSummary),
      scopeLabel: 'Période',
      tone: 'good',
      onClick: () => navigate(summary.cultureSummary?.hasData && !summary.production ? 'cultures' : 'elevage', {
        tab: summary.cultureSummary?.hasData && !summary.production ? 'Résumé' : 'Production',
      }),
    },
    {
      key: 'alertes',
      label: 'Alertes urgentes',
      value: fmtNumber(summary.alertesOuvertes),
      detail: summary.alertesOuvertes ? 'Consulter Activité & Suivi' : 'Aucune alerte ouverte',
      scopeLabel: 'Global',
      tone: summary.alertesOuvertes ? 'warn' : 'good',
      onClick: () => navigate('activite_suivi', { tab: 'Alertes' }),
    },
  ].slice(0, ESSENTIAL_KPI_LIMIT);

  return (
    <div className={`dashboard-v3-kpi-grid grid grid-cols-2 gap-3 lg:grid-cols-3 ${className}`}>
      {kpis.map((kpi) => (
        <DashboardKpi key={kpi.key} {...kpi} />
      ))}
    </div>
  );
}

function SecondaryKpiGrid({ summary, navigate }) {
  const items = [
    {
      key: 'openSales',
      show: true,
      props: {
        label: 'Ventes ouvertes',
        value: fmtNumber(summary.openSales),
        detail: 'Non clôturées',
        scopeLabel: 'Cumul',
        tone: summary.openSales ? 'warn' : 'good',
        onClick: () => navigate('commercial', { tab: 'Ventes' }),
      },
    },
    {
      key: 'encaisse',
      show: true,
      props: {
        label: 'Encaissé',
        value: fmtCurrency(summary.encaisse),
        detail: formatEncaisseDetail(summary.financePeriods),
        delta: formatEncaisseDelta(summary.financePeriods),
        scopeLabel: 'Période',
        tone: 'good',
        onClick: () => navigate('finance_pilotage', { tab: 'Trésorerie' }),
      },
    },
    {
      key: 'resultat',
      show: true,
      props: {
        label: 'Résultat',
        value: fmtCurrency(summary.resultat),
        detail: formatResultatDetail(summary.financePeriods),
        delta: formatResultatDelta(summary.financePeriods),
        scopeLabel: 'Période',
        tone: summary.resultat >= 0 ? 'good' : 'bad',
        onClick: () => navigate('finance_pilotage', { tab: 'Trésorerie' }),
      },
    },
    {
      key: 'cultures',
      show: summary.cultureSummary?.hasData,
      props: {
        label: 'Cultures',
        value: `${fmtNumber(summary.cultureSummary?.parcelCount ?? 0)} parcelle(s)`,
        detail: formatCultureDetail(summary.cultureSummary),
        scopeLabel: 'Global',
        tone: 'good',
        onClick: () => navigate('cultures', { tab: 'Résumé' }),
      },
    },
    {
      key: 'ponte',
      show: summary.eggProduction?.eggsAllTime > 0 || summary.eggProduction?.eggsPeriod > 0,
      props: {
        label: 'Ponte',
        value: fmtNumber(summary.production),
        detail: formatEggProductionDetail(summary.eggProduction),
        delta: formatEggProductionDelta(summary.eggProduction),
        scopeLabel: 'Période',
        tone: 'good',
        onClick: () => navigate('elevage', { tab: 'Production' }),
      },
    },
    {
      key: 'effectifs',
      show: true,
      props: {
        label: 'Effectifs',
        value: fmtNumber(summary.effectifs),
        detail: formatFarmHeadcountDetail(summary.headcount),
        scopeLabel: 'Global',
        onClick: () => navigate('elevage', { tab: 'Résumé' }),
      },
    },
  ].filter((row) => row.show);

  if (!items.length) return null;
  return (
    <div className="dashboard-v3-kpi-grid grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((row) => (
        <DashboardKpi key={row.key} {...row.props} />
      ))}
    </div>
  );
}

function useUiSettings() {
  const [settings, setSettings] = useState(readUiSettings);
  useEffect(() => {
    const handler = (event) => setSettings(event.detail || readUiSettings());
    window.addEventListener('horizon-farm-ui-settings-changed', handler);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener('horizon-farm-ui-settings-changed', handler);
      window.removeEventListener('storage', handler);
    };
  }, []);
  return settings;
}

function buildHealthData(props = {}) {
  return {
    sales_orders: props.salesOrdersAll || props.salesOrders,
    payments: props.paymentsAll || props.payments,
    finances: props.transactions,
    stock: props.stocks,
    animaux: props.animaux,
    avicole: props.lotsData || props.lots,
    sante: props.vaccins || props.sante,
    taches: props.taches,
    alertes_center: props.alertes,
    alimentation_logs: props.alimentationLogs,
    production_oeufs_logs: props.productionLogs,
    clients: props.clients,
    fournisseurs: props.fournisseurs,
  };
}

function Summary({
  summary,
  health,
  simple,
  navigate,
  onOpenAssistant,
  pilotage,
  weatherReport,
  onOpenPriority,
  activeFarm = null,
  allFarmsContext = null,
  activityKpiCards = [],
  quickActions = [],
  adaptedAlerts = [],
  onManageFarms,
  demoModeEnabled = false,
  onToggleDemoMode,
  v3 = null,
}) {
  const [presentationOpen, setPresentationOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [multiFarmsOpen, setMultiFarmsOpen] = useState(false);
  const [investorOpen, setInvestorOpen] = useState(false);
  const [heyHorizonOpen, setHeyHorizonOpen] = useState(false);
  const [exploitationOpen, setExploitationOpen] = useState(false);
  const [suiviOpen, setSuiviOpen] = useState(false);
  const speech = useSpeechSynthesis({ lang: 'fr-FR' });
  const speechSupported = isSpeechSynthesisSupported();
  const handleSpeak = useCallback((text) => {
    if (!text) return;
    speech.speak(text, { force: true });
  }, [speech]);

  const actions = summary.actions.slice(0, simple ? 4 : 8);
  const heyHorizonSuggestions = buildDashboardPilotageSuggestions(summary.actions, summary.goal);
  const sideCards = [];

  const briefPanel = v3?.brief ? (
    <DashboardPremiumBriefPanel
      brief={v3.brief}
      onSpeak={handleSpeak}
      speaking={speech.speaking}
      speechSupported={speechSupported}
      speechError={speech.lastError}
      onOpenPresentation={() => setPresentationOpen(true)}
    />
  ) : null;

  const presentationOverlay = (
    <DashboardPresentationOverlay
      open={presentationOpen}
      data={v3?.presentation}
      onClose={() => setPresentationOpen(false)}
      onNavigate={navigate}
    />
  );

  if (summary.startupMode) {
    return (
      <div className="space-y-5 dashboard-v2-mobile dashboard-v3-mobile">
        {presentationOverlay}
        {briefPanel}
        <DashboardStartupPanel onNavigate={navigate} journey={pilotage.startupJourney} />
        <DashboardPrioritiesPanel priorities={pilotage.priorities} onOpen={onOpenPriority} />
        {v3?.quickQuestions?.length ? (
          <DashboardHeyHorizonQuickAskStrip questions={v3.quickQuestions} onOpenAssistant={onOpenAssistant} onNavigate={navigate} />
        ) : null}
        <DashboardNarrativePanel narrative={pilotage.narrative} />
        <DashboardFarmOverviewPanel overview={pilotage.farmOverview} onNavigate={navigate} />
        <DashboardQuickActions onNavigate={navigate} />
        <DashboardModuleNav modules={DASHBOARD_MODULES} onNavigate={navigate} />
        {actions.length ? (
          <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <h2 className="text-sm font-black text-[#2f2415]">À traiter aujourd&apos;hui</h2>
            <div className="mt-3 space-y-2">
              {actions.map((action) => (
                <DashboardTodoRow
                  key={`${action.moduleKey}-${action.title}`}
                  title={sanitizeDashboardMetric(action.title, 'Action')}
                  detail={sanitizeDashboardMetric(action.detail, '')}
                  moduleLabel={DASHBOARD_MODULE_LABELS[action.moduleKey] || action.category || 'Ouvrir'}
                  tone={action.tone === 'red' ? 'red' : action.tone === 'amber' ? 'amber' : 'neutral'}
                  onOpen={() => navigateForDashboardAction(action, navigate)}
                />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    );
  }

  if (summary.receivable > 0) {
    sideCards.push(
      <DashboardSnapshotCard
        key="receivable"
        label="Créances clients"
        value={fmtCurrency(summary.receivable)}
        detail="Relancer depuis Commercial"
        tone="warn"
        onClick={() => navigate('commercial', { tab: 'Clients' })}
      />,
    );
  }
  if (summary.stockSummary?.totalProducts > 0) {
    sideCards.push(
      <DashboardSnapshotCard
        key="stock"
        label="Inventaire stock"
        value={`${fmtNumber(summary.stockSummary.totalProducts)} produit(s)`}
        detail={formatStockDetail(summary.stockSummary)}
        tone={summary.stockSummary.lowStockCount ? 'warn' : 'good'}
        onClick={() => navigate('achats_stock', { tab: 'Stock' })}
      />,
    );
  } else if (summary.stockBas > 0) {
    sideCards.push(
      <DashboardSnapshotCard
        key="stock-low"
        label="Stock sous seuil"
        value={`${fmtNumber(summary.stockBas)} produit(s)`}
        detail="Réapprovisionner"
        tone="warn"
        onClick={() => navigate('achats_stock', { tab: 'Stock' })}
      />,
    );
  }
  if (summary.tachesOuvertes > 0) {
    sideCards.push(
      <DashboardSnapshotCard
        key="tasks"
        label="Tâches ouvertes"
        value={fmtNumber(summary.tachesOuvertes)}
        detail="Activité & Suivi"
        tone="warn"
        onClick={() => navigate('activite_suivi', { tab: 'Tâches' })}
      />,
    );
  }

  const quickActionsBlock = quickActions.length
    ? <DashboardAdaptedQuickActions actions={quickActions} onNavigate={navigate} />
    : <DashboardQuickActions onNavigate={navigate} />;

  return (
    <div className="space-y-5 dashboard-v2-mobile dashboard-v3-mobile dashboard-accueil-root">
      {presentationOverlay}
      <FarmDemoModeBanner enabled={demoModeEnabled} onToggle={onToggleDemoMode} />

      <div className="flex flex-col gap-5 dashboard-accueil-primary">
        <div className="order-1">{briefPanel}</div>
        <div className="order-2">
          <DashboardPrioritiesPanel priorities={pilotage.priorities} onOpen={onOpenPriority} />
        </div>
        {!allFarmsContext ? (
          <div className="order-4 md:order-3">
            <EssentialKpiGrid summary={summary} navigate={navigate} />
          </div>
        ) : null}
        <div className="order-3 md:order-4">{quickActionsBlock}</div>
        <div className="order-5 space-y-3">
          <DashboardExploitationScoreCompact exploitation={pilotage.exploitation} onNavigate={navigate} />
          {allFarmsContext ? (
            <DashboardAllFarmsCompactPanel
              context={allFarmsContext}
              onExpand={() => setMultiFarmsOpen(true)}
              onManageFarms={onManageFarms}
            />
          ) : null}
          <DashboardInvestorCompactStrip
            investor={pilotage.investor}
            onNavigate={navigate}
            onExpand={() => setInvestorOpen(true)}
          />
        </div>
      </div>

      {(v3?.dynamics || v3?.comparisons?.length || adaptedAlerts.length) ? (
        <CollapsibleAdvancedSection
          eyebrow="Analyse"
          title="Analyse avancée"
          description="Comparaisons temporelles, dynamique et alertes détaillées."
          open={advancedOpen}
          onToggle={() => setAdvancedOpen((value) => !value)}
        >
          {v3?.dynamics ? <DashboardDynamicsScorePanel dynamics={v3.dynamics} /> : null}
          {v3?.comparisons?.length ? <DashboardTemporalComparisonPanel comparisons={v3.comparisons} /> : null}
          {adaptedAlerts.length ? <DashboardAdaptedAlertsPanel alerts={adaptedAlerts} /> : null}
        </CollapsibleAdvancedSection>
      ) : null}

      {allFarmsContext ? (
        <CollapsibleAdvancedSection
          eyebrow="Groupe"
          title="Multi-fermes"
          description="Consolidation, comparaison et localisation des fermes."
          open={multiFarmsOpen}
          onToggle={() => setMultiFarmsOpen((value) => !value)}
        >
          <DashboardAllFarmsPanel context={allFarmsContext} onNavigate={navigate} onManageFarms={onManageFarms} />
          {allFarmsContext.locationCards?.length ? (
            <FarmLocationGrid cards={allFarmsContext.locationCards} onNavigate={navigate} />
          ) : null}
        </CollapsibleAdvancedSection>
      ) : null}

      <CollapsibleAdvancedSection
        eyebrow="Financeurs"
        title="Investisseur"
        description="Score, checklist et préparation du dossier."
        open={investorOpen}
        onToggle={() => setInvestorOpen((value) => !value)}
      >
        <DashboardInvestorStrip investor={pilotage.investor} onNavigate={navigate} />
      </CollapsibleAdvancedSection>

      {(v3?.quickQuestions?.length || heyHorizonSuggestions.length) ? (
        <CollapsibleAdvancedSection
          eyebrow="Assistant"
          title="Hey Horizon"
          description="Questions rapides et suggestions de pilotage."
          open={heyHorizonOpen}
          onToggle={() => setHeyHorizonOpen((value) => !value)}
        >
          {v3?.quickQuestions?.length ? (
            <DashboardHeyHorizonQuickAskStrip
              questions={v3.quickQuestions}
              onOpenAssistant={onOpenAssistant}
              onNavigate={navigate}
              maxVisible={3}
              compact
            />
          ) : null}
          <DashboardHeyHorizonStrip suggestions={heyHorizonSuggestions} onNavigate={navigate} />
        </CollapsibleAdvancedSection>
      ) : null}

      <CollapsibleAdvancedSection
        eyebrow="Exploitation"
        title="Exploitation & objectifs"
        description="Synthèse narrative, activités, météo et objectifs."
        open={exploitationOpen}
        onToggle={() => setExploitationOpen((value) => !value)}
      >
        <DashboardNarrativePanel narrative={pilotage.narrative} />
        {!allFarmsContext && activityKpiCards.length ? (
          <DashboardActivityKpiStrip cards={activityKpiCards} farmName={activeFarm?.name} />
        ) : null}
        <DashboardFarmOverviewPanel overview={pilotage.farmOverview} onNavigate={navigate} />
        <DashboardWeatherStrip weather={weatherReport} />
        {v3?.locationCard ? <DashboardFarmLocationPremiumCard card={v3.locationCard} /> : null}
        <DashboardGoalsHero
          goal={summary.goal}
          onOpenVision={() => navigate('objectifs_croissance', { tab: 'Performance' })}
          onOpenAssistant={onOpenAssistant}
          onNavigate={navigate}
        />
        {!allFarmsContext ? <SecondaryKpiGrid summary={summary} navigate={navigate} /> : null}
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DashboardExploitationScorePanel exploitation={pilotage.exploitation} onNavigate={navigate} />
        </div>
      </CollapsibleAdvancedSection>

      <CollapsibleAdvancedSection
        eyebrow="Suivi"
        title="À traiter & modules"
        description="Actions du jour, raccourcis et pilotage IA détaillé."
        open={suiviOpen}
        onToggle={() => setSuiviOpen((value) => !value)}
      >
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <section className="lg:col-span-3 rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-black text-[#2f2415]">À traiter aujourd&apos;hui</h2>
                <p className="text-[11px] text-[#8a7456]">Une seule liste — argent, stock, santé, tâches.</p>
              </div>
              {summary.todoCount > actions.length ? (
                <button type="button" onClick={() => navigate('activite_suivi', { tab: 'Résumé' })} className="text-xs font-black text-[#9a6b12]">
                  Tout voir →
                </button>
              ) : null}
            </div>
            {actions.length ? (
              <div className="space-y-2">
                {actions.map((action) => (
                  <DashboardTodoRow
                    key={`${action.moduleKey}-${action.title}`}
                    title={sanitizeDashboardMetric(action.title, 'Action')}
                    detail={sanitizeDashboardMetric(action.detail, '')}
                    moduleLabel={DASHBOARD_MODULE_LABELS[action.moduleKey] || action.category || 'Ouvrir'}
                    tone={action.tone === 'red' ? 'red' : action.tone === 'amber' ? 'amber' : 'neutral'}
                    onOpen={() => navigateForDashboardAction(action, navigate)}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
                Rien d&apos;urgent — l&apos;exploitation est à jour.
              </div>
            )}
          </section>
          <div className="lg:col-span-2 space-y-4">
            {sideCards.length ? sideCards : (
              <DashboardSnapshotCard
                label="Effectifs"
                value={`${fmtNumber(summary.effectifs)} sujet(s)`}
                detail={formatFarmHeadcountDetail(summary.headcount)}
                tone="good"
                onClick={() => navigate('elevage', { tab: 'Résumé' })}
              />
            )}
          </div>
        </div>
        <DashboardModuleNav modules={DASHBOARD_MODULES} onNavigate={navigate} />
        {!simple ? (
          <DashboardHealthStrip
            health={health}
            onNavigate={navigate}
            onOpenFinding={(finding) => navigateForDashboardFinding(finding, navigate)}
          />
        ) : null}
      </CollapsibleAdvancedSection>
    </div>
  );
}

function GraphiquesSection({ props, navigate, periodFiltered }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Graphiques</p>
        <h2 className="mt-1 text-lg font-black text-[#2f2415]">Évolution de l&apos;exploitation</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Commandes, trésorerie, production et alertes — alignés sur la période ERP.</p>
        <button type="button" onClick={() => navigate('objectifs_croissance', { tab: 'Graphiques' })} className="mt-3 text-xs font-black text-[#9a6b12]">
          Vision détaillée →
        </button>
      </section>
      <ModuleGraphiquesTab moduleId="dashboard" periodFiltered={periodFiltered} {...props} onNavigate={props.onNavigate} />
    </div>
  );
}

export default function DashboardV2(props) {
  const {
    dataFingerprint,
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    transactionsAll,
    productionLogs,
    stocks,
    taches,
    alertes,
    animaux,
    lotsData,
    lots,
    cultures,
    documents,
    alimentationLogs,
    vaccins,
    sante,
    sensorDevices,
    cameraDevices,
    meteo,
    weatherLoading,
    businessPlans,
    investissements,
    farm,
    ferme,
    clients,
    fournisseurs,
    periodScope: periodScopeProp,
    periodLabel,
    periodFiltered,
    onNavigate,
    onOpenAssistant,
    user,
    displayUser,
    userName,
    username,
    farmScope = {},
    activeFarm = null,
    accessibleFarms = [],
    farmComparisonData = null,
    onManageFarms,
  } = props;

  const [demoModeEnabled, setDemoModeEnabled] = useState(() => isFarmDemoModeEnabled());
  useEffect(() => {
    const handler = (event) => setDemoModeEnabled(Boolean(event.detail?.enabled));
    window.addEventListener('horizon-farm-demo-mode-changed', handler);
    return () => window.removeEventListener('horizon-farm-demo-mode-changed', handler);
  }, []);

  const [tab, setTab] = useState(() => resolveDashboardTab(props.initialTab));
  useEffect(() => {
    if (props.initialTab) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- navigation pilotée par props.initialTab
      setTab(resolveDashboardTab(props.initialTab));
    }
  }, [props.initialTab]);
  const settings = useUiSettings();
  const periodScope = periodScopeProp || readPeriodScope();
  const simple = settings.complexity !== 'expert';
  const dateTime = useMemo(() => formatDateTime(), []);
  const greetingProps = useMemo(() => ({
    user,
    displayUser,
    userName,
    username,
  }), [user, displayUser, userName, username]);
  const greeting = useMemo(() => dashboardGreeting(greetingProps), [greetingProps]);

  const healthData = useMemo(
    () => buildHealthData({
      salesOrdersAll,
      salesOrders,
      paymentsAll,
      payments,
      transactions,
      stocks,
      animaux,
      lotsData,
      lots,
      vaccins,
      sante,
      taches,
      alertes,
      alimentationLogs,
      productionLogs,
      clients,
      fournisseurs,
    }),
    [
      salesOrdersAll,
      salesOrders,
      paymentsAll,
      payments,
      transactions,
      stocks,
      animaux,
      lotsData,
      lots,
      vaccins,
      sante,
      taches,
      alertes,
      alimentationLogs,
      productionLogs,
      clients,
      fournisseurs,
    ],
  );
  const health = useMemo(
    () => getDashboardHealthReport(dataFingerprint, () => healthData),
    [dataFingerprint, healthData],
  );

  const summaryProps = useMemo(() => ({
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    transactionsAll,
    stocks,
    taches,
    alertes,
    animaux,
    lotsData,
    lots,
    cultures,
    productionLogs,
    documents,
    alimentationLogs,
    vaccins,
    sante,
    sensorDevices,
    cameraDevices,
    meteo,
    weatherLoading,
    fournisseurs,
    businessPlans,
    investissements,
    farm,
    ferme,
    clients,
  }), [
    salesOrders,
    salesOrdersAll,
    payments,
    paymentsAll,
    transactions,
    transactionsAll,
    stocks,
    taches,
    alertes,
    animaux,
    lotsData,
    lots,
    cultures,
    productionLogs,
    documents,
    alimentationLogs,
    vaccins,
    sante,
    sensorDevices,
    cameraDevices,
    meteo,
    weatherLoading,
    fournisseurs,
    businessPlans,
    investissements,
    farm,
    ferme,
    clients,
  ]);
  const summary = useMemo(
    () => buildDashboardSummary(summaryProps, periodScope),
    [summaryProps, periodScope],
  );

  const pilotageProps = useMemo(() => ({
    ...summaryProps,
    salesOrdersAll: salesOrdersAll || salesOrders,
    paymentsAll: paymentsAll || payments,
    transactionsAll: transactionsAll || transactions,
  }), [summaryProps, salesOrdersAll, salesOrders, paymentsAll, payments, transactionsAll, transactions]);

  const pilotage = useMemo(() => ({
    priorities: buildDashboardPriorities(summary, pilotageProps, health),
    narrative: buildDashboardNarrative(summary, pilotageProps),
    startupJourney: buildDashboardStartupJourney(pilotageProps, summary),
    exploitation: buildExploitationScore(summary, health, pilotageProps),
    investor: buildDashboardInvestorReadiness(pilotageProps),
    farmOverview: buildFarmOverview(summary),
  }), [summary, pilotageProps, health]);

  const weatherReport = useMemo(
    () => buildDashboardWeatherReport(meteo, weatherLoading),
    [meteo, weatherLoading],
  );

  const comparisonSource = useMemo(() => farmComparisonData || {
    salesOrdersAll: salesOrdersAll || salesOrders,
    paymentsAll: paymentsAll || payments,
    transactionsAll: transactionsAll || transactions,
    stocks,
    alertes,
    taches,
    animaux,
    lotsData: lotsData || lots,
    cultures,
    productionLogs,
    businessPlans,
    investissements,
    sensorDevices,
    cameraDevices,
    meteo,
    accessibleFarms,
  }, [
    farmComparisonData,
    salesOrdersAll,
    salesOrders,
    paymentsAll,
    payments,
    transactionsAll,
    transactions,
    stocks,
    alertes,
    taches,
    animaux,
    lotsData,
    lots,
    cultures,
    productionLogs,
    businessPlans,
    investissements,
    sensorDevices,
    cameraDevices,
    meteo,
    accessibleFarms,
  ]);

  const allFarmsContext = useMemo(() => {
    if (farmScope?.mode !== 'all') return null;
    return buildAllFarmsDashboardContext(accessibleFarms, comparisonSource);
  }, [farmScope?.mode, accessibleFarms, comparisonSource]);

  const activityKpiCards = useMemo(() => {
    if (farmScope?.mode === 'all' || !activeFarm?.id) return [];
    return buildActivityKpiCards(activeFarm, summary, comparisonSource);
  }, [farmScope?.mode, activeFarm, summary, comparisonSource]);

  const quickActions = useMemo(
    () => resolveQuickActionsForScope(activeFarm, farmScope, accessibleFarms),
    [activeFarm, farmScope, accessibleFarms],
  );

  const adaptedAlerts = useMemo(
    () => buildAdaptedAlertsPanel(activeFarm, farmScope, comparisonSource, allFarmsContext),
    [activeFarm, farmScope, comparisonSource, allFarmsContext],
  );

  const v3 = useMemo(() => {
    const comparisons = buildTemporalComparisons(pilotageProps);
    const dynamics = buildExploitationDynamics(summary, comparisons, pilotageProps);
    const brief = buildPremiumExecutiveBrief({
      displayName: displayUserOf(props),
      summary,
      priorities: pilotage.priorities,
      farmScope,
      activeFarm,
      accessibleFarms,
      demoMode: demoModeEnabled,
      dynamics,
      props: pilotageProps,
    });
    const locationCard = farmScope?.mode !== 'all' && activeFarm?.id
      ? buildSingleFarmLocationCard(activeFarm, { ...summary, exploitationScore: pilotage.exploitation?.score }, meteo, adaptedAlerts)
      : null;
    const quickQuestions = buildDashboardQuickQuestions(farmScope, accessibleFarms, {
      ...pilotageProps,
      activeFarm,
    });
    const presentation = buildPresentationModeData({
      displayName: displayUserOf(props),
      summary,
      pilotage,
      brief,
      comparisons,
      dynamics,
      farmScope,
      activeFarm,
      accessibleFarms,
      allFarmsContext,
      demoMode: demoModeEnabled,
      locationCard,
    });
    return { brief, comparisons, dynamics, quickQuestions, locationCard, presentation };
  }, [
    summary,
    pilotage,
    pilotageProps,
    farmScope,
    activeFarm,
    accessibleFarms,
    allFarmsContext,
    demoModeEnabled,
    meteo,
    adaptedAlerts,
  ]);

  const openPriority = (item) => {
    if (item.finding) {
      navigateForDashboardFinding(item.finding, navigate);
      return;
    }
    if (item.moduleKey) {
      navigate(item.moduleKey, item.tab ? { tab: item.tab } : undefined);
      return;
    }
    if (item.action) navigateForDashboardAction(item.action, navigate);
  };

  const toggleExpert = () => {
    const next = { ...settings, complexity: simple ? 'expert' : 'simple' };
    localStorage.setItem('horizon_farm_ui_settings', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('horizon-farm-ui-settings-changed', { detail: next }));
  };

  const navigate = (moduleKey, options) => {
    if (typeof onNavigate !== 'function') return;
    if (options?.tab) onNavigate(moduleKey, options);
    else onNavigate(moduleKey);
  };

  return (
    <div className="space-y-6 dashboard-v2-root">
      <style>{`
        @media (max-width: 640px) {
          .dashboard-v2-mobile .grid.grid-cols-2 { grid-template-columns: 1fr; }
          .dashboard-v3-mobile .dashboard-v3-kpi-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .dashboard-accueil-primary .dashboard-v3-kpi-grid > *:nth-child(n+5) { display: none; }
          .dashboard-v2-mobile .text-xl { font-size: 1.15rem; }
          .dashboard-v2-mobile .text-2xl { font-size: 1.35rem; }
          .dashboard-v2-mobile .text-3xl { font-size: 1.5rem; }
        }
      `}</style>
      <DashboardModuleHeader
        tab={tab}
        setTab={setTab}
        displayUser={displayUserOf(props)}
        greeting={greeting}
        location={farmLocationOf(props)}
        dateTime={dateTime}
        healthScore={health.score}
        badges={{ todo: summary.todoCount }}
        simple={simple}
        onToggleExpert={toggleExpert}
        onNavigate={navigate}
        periodLabel={periodLabel}
      />

      {tab === 'Résumé' ? (
        <Summary
          summary={summary}
          health={health}
          simple={simple}
          navigate={navigate}
          onOpenAssistant={onOpenAssistant}
          pilotage={pilotage}
          weatherReport={weatherReport}
          onOpenPriority={openPriority}
          activeFarm={activeFarm}
          allFarmsContext={allFarmsContext}
          activityKpiCards={activityKpiCards}
          quickActions={quickActions}
          adaptedAlerts={adaptedAlerts}
          onManageFarms={onManageFarms}
          demoModeEnabled={demoModeEnabled}
          onToggleDemoMode={() => {
            setFarmDemoModeEnabled(false);
            setDemoModeEnabled(false);
            window.location.reload();
          }}
          v3={v3}
        />
      ) : (
        <GraphiquesSection props={props} navigate={navigate} periodFiltered={periodFiltered} />
      )}
    </div>
  );
}
