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
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
      <p className="text-sm font-black text-[#2f2415]">{emoji} {label}</p>
      <p className="text-2xl font-black text-[#2f2415] mt-2">{fmtNumber(attainment)}% atteint</p>
      <p className="text-xs text-[#8a7456] mt-2">Objectif BP : {fmtCurrency(row?.target || 0)}</p>
      <p className="text-xs text-[#8a7456]">Réalisé : {fmtCurrency(row?.realized || 0)}</p>
      <p className="text-xs text-[#8a7456]">Reste à faire : {fmtCurrency(row?.remaining || 0)}</p>
    </div>
  );
}

function ObjectiveAutomationCard({ workflow }) {
  const progress = workflow?.progress || {};
  const simulation = workflow?.simulation || {};
  return (
    <div className="rounded-xl border border-[#eadcc2] bg-white p-3">
      <p className="text-xs font-black text-[#2f2415]">{simulation.activity || progress.source_indicator || 'Objectif'}</p>
      <p className="mt-1 text-lg font-black text-[#2f2415]">{fmtNumber(progress.attainment || 0)}%</p>
      <p className="text-xs text-[#8a7456]">Source : {progress.source_indicator || 'BP officiel'}</p>
      <p className="text-xs text-[#8a7456]">Reste : {fmtCurrency(progress.remaining || 0)}</p>
      <p className="text-xs text-[#8a7456]">Stock {fmtNumber(simulation.available_stock || 0)} / besoin {fmtNumber(simulation.stock_need || 0)}</p>
      <p className="text-xs text-[#8a7456]">Cash {fmtCurrency(simulation.available_cash || 0)} / besoin {fmtCurrency(simulation.cash_need || 0)}</p>
      {workflow?.alert ? <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-800">{workflow.alert.message}</p> : null}
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
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-3">
        <h3 className="text-lg font-black text-[#2f2415]">Le Réel vs Le Théorique</h3>
        <p className="text-sm text-[#8a7456]">
          Chiffre d&apos;affaires encaissé (Wave / Orange Money) comparé aux objectifs du Business Plan officiel.
        </p>
        {global ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-[10px] text-[#8a7456]">Objectif période</p>
              <p className="font-black text-lg">{fmtCurrency(global.monthTarget)}</p>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-[10px] text-[#8a7456]">Encaissé</p>
              <p className="font-black text-lg">{fmtCurrency(global.realized)}</p>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-[10px] text-[#8a7456]">Atteinte</p>
              <p className="font-black text-lg">{fmtNumber(global.attainment || 0)}%</p>
            </div>
            <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="text-[10px] text-[#8a7456]">Reste à faire</p>
              <p className="font-black text-lg">{fmtCurrency(global.remaining)}</p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Vos Objectifs par Activité</p>
          <h4 className="text-lg font-black text-[#2f2415] mt-1">Période en cours</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {MAIN_ACTIVITIES.map((item) => (
            <ActivityCard key={item.key} emoji={item.emoji} label={item.label} row={activityMap[item.key]} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Automatisation objectifs</p>
          <h4 className="text-lg font-black text-[#2f2415] mt-1">Progression calculée depuis les modules</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {growthObjectiveWorkflows.slice(0, 6).map((workflow) => (
            <ObjectiveAutomationCard key={workflow?.simulation?.activity || workflow?.progress?.source_indicator} workflow={workflow} />
          ))}
          {!growthObjectiveWorkflows.length ? <p className="text-sm text-[#8a7456]">Aucun objectif BP exploitable pour la période.</p> : null}
        </div>
      </section>

      <section className="rounded-3xl border border-emerald-200 bg-emerald-50/60 p-5 shadow-sm space-y-3">
        <div>
          <p className="text-sm font-black text-emerald-900">💩 La Mine d&apos;Or — Valorisation du Fumier</p>
          <p className="text-xs text-emerald-800 mt-1">
            Mis à jour lors des nettoyages de bâtiment enregistrés dans Élevage (biosécurité).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {FUMIER_ACTIVITIES.map((item) => {
            const row = activityMap[item.key];
            return (
              <div key={item.key} className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="text-xs font-black text-[#2f2415]">{item.label}</p>
                <p className="text-xl font-black text-emerald-800 mt-1">{fmtNumber(row?.attainment || 0)}%</p>
                <p className="text-xs text-[#8a7456]">Objectif BP : {fmtCurrency(row?.target || 0)}</p>
              </div>
            );
          })}
        </div>
        <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Santé' })} className="text-xs font-black text-emerald-800 underline">
          Enregistrer un nettoyage → Élevage Santé
        </button>
      </section>

      <CircularEconomyKpiPanel
        dataMap={dataMap}
        simulatedMode={isSimulatedDataModeEnabled()}
        showPlannedVsRealized
      />

      <details className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
        <summary className="cursor-pointer text-sm font-black text-[#2f2415]">Graphiques objectifs (optionnel)</summary>
        <div className="mt-4 border-t border-[#eadcc2] pt-4">
          <ObjectifsGraphiquesTab plan={chartPlan} />
        </div>
      </details>
    </div>
  );
}
