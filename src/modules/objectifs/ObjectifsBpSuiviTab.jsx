import { fmtCurrency, fmtNumber } from '../../utils/format';
import { applyEncaissementsToGoals } from './objectifsBpEncaissements.js';
import CircularEconomyKpiPanel from '../../components/greenpreneurs/CircularEconomyKpiPanel.jsx';
import { isSimulatedDataModeEnabled } from '../../utils/uiPreferences.js';
import ObjectifsGraphiquesTab from './ObjectifsGraphiquesTab.jsx';

const MAIN_ACTIVITIES = [
  { key: 'poulets_chair', emoji: '🍗', label: 'Poulets de Chair' },
  { key: 'oeufs', emoji: '🥚', label: 'Œufs / Pondeuses' },
  { key: 'animaux', emoji: '🐂', label: 'Bovins & Animaux' },
];

const FUMIER_ACTIVITIES = [
  { key: 'fumier_pondeuses', label: 'Fumier Pondeuses' },
  { key: 'fumier_chair', label: 'Fumier Chair' },
  { key: 'fumier_bovins', label: 'Fumier Bœufs' },
];

function ActivityCard({ emoji, label, row }) {
  const attainment = row?.attainment ?? 0;
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-sm font-semibold text-earth">{emoji} {label}</p>
      <p className="text-2xl font-semibold text-earth mt-2">{fmtNumber(attainment)}% atteint</p>
      <p className="text-xs text-slate mt-2">Objectif BP : {fmtCurrency(row?.target || 0)}</p>
      <p className="text-xs text-slate">Réalisé : {fmtCurrency(row?.realized || 0)}</p>
      <p className="text-xs text-slate">Reste à faire : {fmtCurrency(row?.remaining || 0)}</p>
    </div>
  );
}

function ObjectiveAutomationCard({ workflow }) {
  const progress = workflow?.progress || {};
  const simulation = workflow?.simulation || {};
  return (
    <div className="rounded-xl border border-line bg-white p-3">
      <p className="text-xs font-semibold text-earth">{simulation.activity || progress.source_indicator || 'Objectif'}</p>
      <p className="mt-1 text-lg font-semibold text-earth">{fmtNumber(progress.attainment || 0)}%</p>
      <p className="text-xs text-slate">Source : {progress.source_indicator || 'BP officiel'}</p>
      <p className="text-xs text-slate">Reste : {fmtCurrency(progress.remaining || 0)}</p>
      <p className="text-xs text-slate">Stock {fmtNumber(simulation.available_stock || 0)} / besoin {fmtNumber(simulation.stock_need || 0)}</p>
      <p className="text-xs text-slate">Cash {fmtCurrency(simulation.available_cash || 0)} / besoin {fmtCurrency(simulation.cash_need || 0)}</p>
      {workflow?.alert ? <p className="mt-2 rounded-lg border border-vigilance bg-vigilance-bg px-2 py-1 text-xs font-semibold text-horizon-dark">{workflow.alert.message}</p> : null}
    </div>
  );
}

export default function ObjectifsBpSuiviTab({
  plan = {},
  dataMap = {},
  chartPlan = {},
  growthObjectiveWorkflows = [],
  onNavigate,
}) {
  const goals = applyEncaissementsToGoals(plan.goals || {}, dataMap);
  const global = goals.global;
  const activityMap = Object.fromEntries((goals.activities || []).map((row) => [row.activity, row]));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-3">
        <h3 className="text-lg font-semibold text-earth">Le Réel vs Le Théorique</h3>
        <p className="text-sm text-slate">
          Chiffre d&apos;affaires encaissé (Wave / Orange Money) comparé aux objectifs du Business Plan officiel.
        </p>
        {global ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="text-meta text-slate">Objectif période</p>
              <p className="font-semibold text-lg">{fmtCurrency(global.monthTarget)}</p>
            </div>
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="text-meta text-slate">Encaissé</p>
              <p className="font-semibold text-lg">{fmtCurrency(global.realized)}</p>
            </div>
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="text-meta text-slate">Atteinte</p>
              <p className="font-semibold text-lg">{fmtNumber(global.attainment || 0)}%</p>
            </div>
            <div className="rounded-xl border border-line bg-card p-3">
              <p className="text-meta text-slate">Reste à faire</p>
              <p className="font-semibold text-lg">{fmtCurrency(global.remaining)}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold">Vos Objectifs par Activité</p>
          <h4 className="text-lg font-semibold text-earth mt-1">Période en cours</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MAIN_ACTIVITIES.map((item) => (
            <ActivityCard key={item.key} emoji={item.emoji} label={item.label} row={activityMap[item.key]} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate font-semibold">Automatisation objectifs</p>
          <h4 className="text-lg font-semibold text-earth mt-1">Progression calculée depuis les modules</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {growthObjectiveWorkflows.slice(0, 6).map((workflow) => (
            <ObjectiveAutomationCard key={workflow?.simulation?.activity || workflow?.progress?.source_indicator} workflow={workflow} />
          ))}
          {!growthObjectiveWorkflows.length ? <p className="text-sm text-slate">Aucun objectif BP exploitable pour la période.</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-positive bg-positive-bg p-6 shadow-card space-y-3">
        <div>
          <p className="text-sm font-semibold text-positive">💩 La Mine d&apos;Or — Valorisation du Fumier</p>
          <p className="text-xs text-positive mt-1">
            Mis à jour lors des nettoyages de bâtiment enregistrés dans Élevage (biosécurité).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FUMIER_ACTIVITIES.map((item) => {
            const row = activityMap[item.key];
            return (
              <div key={item.key} className="rounded-xl border border-positive bg-white p-3">
                <p className="text-xs font-semibold text-earth">{item.label}</p>
                <p className="text-xl font-semibold text-positive mt-1">{fmtNumber(row?.attainment || 0)}%</p>
                <p className="text-xs text-slate">Objectif BP : {fmtCurrency(row?.target || 0)}</p>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Santé' })} className="text-xs font-semibold text-positive underline">
          Enregistrer un nettoyage → Élevage Santé
        </button>
      </section>

      <CircularEconomyKpiPanel
        dataMap={dataMap}
        simulatedMode={isSimulatedDataModeEnabled()}
        showPlannedVsRealized
      />

      <details className="rounded-3xl border border-line bg-card p-6 shadow-card">
        <summary className="cursor-pointer text-sm font-semibold text-earth">Graphiques objectifs (optionnel)</summary>
        <div className="mt-4 border-t border-line pt-4">
          <ObjectifsGraphiquesTab plan={chartPlan} />
        </div>
      </details>
    </div>
  );
}
