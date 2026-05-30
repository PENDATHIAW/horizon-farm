import { useEffect, useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { readPeriodScope } from '../utils/periodScope';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { sanitizeDashboardMetric } from '../utils/dashboardWorkflows';
import { runErpHealthEngine, loadLastHealthEngineSnapshot } from '../services/erpHealthEngine';
import {
  buildDashboardSummary,
  DASHBOARD_MODULES,
  DASHBOARD_MODULE_LABELS,
  formatEggProductionDetail,
  formatEggProductionDelta,
  formatEncaisseDetail,
  formatEncaisseDelta,
  formatFarmHeadcountDetail,
  formatResultatDelta,
  formatResultatDetail,
  formatStockDetail,
} from './dashboard/dashboardMetrics';
import { navigateForDashboardAction, navigateForDashboardFinding } from './dashboard/dashboardNavigation';
import { dashboardGreeting } from './dashboard/dashboardGreeting';
import {
  DashboardGoalsHero,
  DashboardHealthStrip,
  DashboardKpi,
  DashboardModuleHeader,
  DashboardModuleNav,
  DashboardQuickActions,
  DashboardSnapshotCard,
  DashboardTodoRow,
} from './dashboard/DashboardShell.jsx';

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

function Summary({ summary, health, simple, navigate }) {
  const actions = summary.actions.slice(0, simple ? 4 : 8);
  const sideCards = [];

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

  return (
    <div className="space-y-5">
      <DashboardGoalsHero goal={summary.goal} onOpenVision={() => navigate('objectifs_croissance', { tab: 'Performance' })} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
        <DashboardKpi
          label="Encaissé"
          value={fmtCurrency(summary.encaisse)}
          detail={formatEncaisseDetail(summary.financePeriods)}
          delta={formatEncaisseDelta(summary.financePeriods)}
          tone="good"
          onClick={() => navigate('finance_pilotage', { tab: 'Trésorerie' })}
        />
        <DashboardKpi
          label="Résultat"
          value={fmtCurrency(summary.resultat)}
          detail={formatResultatDetail(summary.financePeriods)}
          delta={formatResultatDelta(summary.financePeriods)}
          tone={summary.resultat >= 0 ? 'good' : 'bad'}
          onClick={() => navigate('finance_pilotage', { tab: 'Trésorerie' })}
        />
        <DashboardKpi label="Créances" value={fmtCurrency(summary.receivable)} tone={summary.receivable ? 'warn' : 'good'} onClick={() => navigate('commercial', { tab: 'Clients' })} />
        <DashboardKpi
          label="Stock"
          value={fmtNumber(summary.stockSummary?.totalProducts ?? 0)}
          detail={formatStockDetail(summary.stockSummary)}
          tone={summary.stockSummary?.lowStockCount ? 'warn' : 'good'}
          onClick={() => navigate('achats_stock', { tab: 'Stock' })}
        />
        {(summary.eggProduction?.eggsAllTime > 0 || summary.eggProduction?.eggsPeriod > 0 || summary.headcount?.effectifPondeuses > 0) ? (
          <DashboardKpi
            label="Ponte"
            value={fmtNumber(summary.production)}
            detail={formatEggProductionDetail(summary.eggProduction)}
            delta={formatEggProductionDelta(summary.eggProduction)}
            tone="good"
            onClick={() => navigate('elevage', { tab: 'Production' })}
          />
        ) : null}
        <DashboardKpi label="Alertes" value={fmtNumber(summary.alertesOuvertes)} tone={summary.alertesOuvertes ? 'warn' : 'good'} onClick={() => navigate('activite_suivi', { tab: 'Alertes' })} />
        <DashboardKpi
          label="Effectifs"
          value={fmtNumber(summary.effectifs)}
          detail={formatFarmHeadcountDetail(summary.headcount)}
          onClick={() => navigate('elevage', { tab: 'Résumé' })}
        />
      </div>

      <DashboardQuickActions onNavigate={navigate} />
      <DashboardModuleNav modules={DASHBOARD_MODULES} onNavigate={navigate} />

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

      {!simple ? (
        <DashboardHealthStrip
          health={health}
          onNavigate={navigate}
          onOpenFinding={(finding) => navigateForDashboardFinding(finding, navigate)}
        />
      ) : null}
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
  const [tab, setTab] = useState('Résumé');
  const settings = useUiSettings();
  const periodScope = props.periodScope || readPeriodScope();
  const periodScopeKey = useMemo(() => JSON.stringify(periodScope), [periodScope]);
  const simple = settings.complexity !== 'expert';
  const dateTime = useMemo(formatDateTime, []);
  const greeting = useMemo(() => dashboardGreeting(props), [props.user, props.displayUser, props.userName, props.username]);

  const health = useMemo(() => {
    const report = runErpHealthEngine(buildHealthData(props));
    const snap = loadLastHealthEngineSnapshot();
    if (snap?.autoExecution) report.autoExecution = snap.autoExecution;
    if (snap?.counts?.ux != null && report.counts) report.counts.ux = snap.counts.ux;
    return report;
  }, [props.dataFingerprint]);

  const summary = useMemo(
    () => buildDashboardSummary(props, periodScope),
    [
      periodScopeKey,
      props.dataFingerprint,
      props.salesOrders,
      props.payments,
      props.transactions,
      props.productionLogs,
      props.stocks,
      props.taches,
      props.alertes,
      props.animaux,
      props.lotsData,
      props.cultures,
    ],
  );

  const toggleExpert = () => {
    const next = { ...settings, complexity: simple ? 'expert' : 'simple' };
    localStorage.setItem('horizon_farm_ui_settings', JSON.stringify(next));
    window.dispatchEvent(new CustomEvent('horizon-farm-ui-settings-changed', { detail: next }));
  };

  const navigate = (moduleKey, options) => {
    if (typeof props.onNavigate !== 'function') return;
    if (options?.tab) props.onNavigate(moduleKey, options);
    else props.onNavigate(moduleKey);
  };

  return (
    <div className="space-y-6">
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
        periodLabel={props.periodLabel}
      />

      {tab === 'Résumé' ? (
        <Summary summary={summary} health={health} simple={simple} navigate={navigate} />
      ) : (
        <GraphiquesSection props={props} navigate={navigate} periodFiltered={props.periodFiltered} />
      )}
    </div>
  );
}
