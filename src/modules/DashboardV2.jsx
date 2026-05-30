import { useEffect, useMemo, useState } from 'react';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import { readUiSettings } from '../utils/uiPreferences';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { sanitizeDashboardMetric } from '../utils/dashboardWorkflows';
import { runErpHealthEngine, loadLastHealthEngineSnapshot } from '../services/erpHealthEngine';
import {
  buildDashboardSummary,
  DASHBOARD_MODULES,
  DASHBOARD_MODULE_LABELS,
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
    sales_orders: props.salesOrders,
    payments: props.payments,
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

function Summary({ props, summary, health, simple, navigate }) {
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
  if (summary.stockBas > 0) {
    sideCards.push(
      <DashboardSnapshotCard
        key="stock"
        label="Stock sous seuil"
        value={`${fmtNumber(summary.stockBas)} produit(s)`}
        detail="Réapprovisionner"
        tone="warn"
        onClick={() => navigate('achats_stock', { tab: 'Stock' })}
      />,
    );
  }
  if (summary.production > 0) {
    sideCards.push(
      <DashboardSnapshotCard
        key="production"
        label="Production œufs"
        value={fmtNumber(summary.production)}
        detail="Suivi élevage"
        tone="good"
        onClick={() => navigate('elevage', { tab: 'Production' })}
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

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <DashboardKpi label="Encaissé" value={fmtCurrency(summary.encaisse)} tone="good" onClick={() => navigate('finance_pilotage', { tab: 'Trésorerie' })} />
        <DashboardKpi label="Résultat" value={fmtCurrency(summary.resultat)} tone={summary.resultat >= 0 ? 'good' : 'bad'} onClick={() => navigate('finance_pilotage', { tab: 'Trésorerie' })} />
        <DashboardKpi label="Créances" value={fmtCurrency(summary.receivable)} tone={summary.receivable ? 'warn' : 'good'} onClick={() => navigate('commercial', { tab: 'Clients' })} />
        <DashboardKpi label="Stocks bas" value={fmtNumber(summary.stockBas)} tone={summary.stockBas ? 'warn' : 'good'} onClick={() => navigate('achats_stock', { tab: 'Stock' })} />
        <DashboardKpi label="Alertes" value={fmtNumber(summary.alertesOuvertes)} tone={summary.alertesOuvertes ? 'warn' : 'good'} onClick={() => navigate('activite_suivi', { tab: 'Alertes' })} />
        <DashboardKpi label="Effectifs" value={fmtNumber(summary.effectifs)} onClick={() => navigate('elevage', { tab: 'Résumé' })} />
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
              label="Exploitation"
              value={`${fmtNumber(summary.effectifs)} sujet(s)`}
              detail="Tout est calme — consultez les modules métier."
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

function GraphiquesSection({ props, navigate }) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#9a6b12]">Graphiques</p>
        <h2 className="mt-1 text-lg font-black text-[#2f2415]">Évolution de l&apos;exploitation</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Commandes, trésorerie, production et alertes — vue mensuelle.</p>
        <button type="button" onClick={() => navigate('objectifs_croissance', { tab: 'Graphiques' })} className="mt-3 text-xs font-black text-[#9a6b12]">
          Vision détaillée →
        </button>
      </section>
      <ModuleGraphiquesTab moduleId="dashboard" {...props} onNavigate={props.onNavigate} />
    </div>
  );
}

export default function DashboardV2(props) {
  const [tab, setTab] = useState('Résumé');
  const settings = useUiSettings();
  const simple = settings.complexity !== 'expert';
  const dateTime = useMemo(formatDateTime, []);
  const greeting = useMemo(() => dashboardGreeting(props), [props.user, props.displayUser, props.userName, props.username]);

  const health = useMemo(() => {
    const report = runErpHealthEngine(buildHealthData(props));
    const snap = loadLastHealthEngineSnapshot();
    if (snap?.autoExecution) report.autoExecution = snap.autoExecution;
    if (snap?.counts?.ux != null && report.counts) report.counts.ux = snap.counts.ux;
    return report;
  }, [props]);

  const summary = useMemo(() => buildDashboardSummary(props), [props]);

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
      />

      {tab === 'Résumé' ? (
        <Summary props={props} summary={summary} health={health} simple={simple} navigate={navigate} />
      ) : (
        <GraphiquesSection props={props} navigate={navigate} />
      )}
    </div>
  );
}
