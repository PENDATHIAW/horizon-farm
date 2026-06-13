import { AlertTriangle, Beef, Building2, CalendarRange, CheckCircle2, Drumstick, Egg, ShoppingCart } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import ProductionQuestionsPanel from '../../components/ProductionQuestionsPanel.jsx';
import { emitHorizonForm } from '../../services/formModalManager';
import { buildStrategicDecisionPlan } from '../../services/strategicDecisionEngine.js';
import { getNextFestivals, festivalLabelList } from '../../services/marketEventCalendar.js';
import { fmtNumber } from '../../utils/format';
import {
  buildCycleAlertsForPanel,
  buildCycleV1Kpis,
} from '../../utils/cycleMetrics.js';
import { buildCycleOverview, daysUntil, mortalityRate } from './cycleSummary.js';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageSection, ElevageStatCard } from './elevageUi.jsx';
import { isAllFarmsScope } from '../../utils/farmScope.js';

const today = () => new Date().toISOString().slice(0, 10);

const TYPE_META = {
  chair: { label: 'Poulets chair', icon: Drumstick, action: 'Préparer vente chair (J+40)', tab: 'Transformation' },
  bovins: { label: 'Bovin / embouche', icon: Beef, action: 'Préparer vente ou renouvellement (J+90)', tab: 'Transformation' },
  pondeuses: { label: 'Pondeuses', icon: Egg, action: 'Surveiller ponte et réforme (J+510)', tab: 'Lots & bandes' },
};

function CycleStatusBadge({ targetDate }) {
  const days = daysUntil(targetDate);
  if (days == null) return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-800">À planifier</span>;
  if (days < 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-black text-red-800">En retard ({Math.abs(days)} j)</span>;
  if (days <= 10) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">Dans {days} j</span>;
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">Dans {days} j</span>;
}

function FarmScopeBadge({ farmScopeLabel = '', farmScope = {}, farmFiltered = false }) {
  const allFarms = isAllFarmsScope(farmScope);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-900">
        <Building2 size={13} aria-hidden="true" />
        {farmScopeLabel || (allFarms ? 'Toutes les fermes' : 'Ferme active')}
      </span>
      {allFarms ? (
        <span className="text-xs text-[#8a7456]">Vue consolidée — stratégie groupe via Centre décisionnel.</span>
      ) : farmFiltered ? (
        <span className="text-xs text-[#8a7456]">Données filtrées pour la ferme sélectionnée.</span>
      ) : (
        <span className="text-xs text-amber-800">Filtre ferme non actif — vérifiez le sélecteur global.</span>
      )}
    </div>
  );
}

function PriorityTable({ rows, setTab }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-[#d6c3a0] bg-[#fffdf8] p-6 text-center text-sm text-[#8a7456]">
        Aucun cycle calculé pour l&apos;instant. Ajoutez des lots ou animaux avec une <b>date d&apos;entrée</b> pour voir les ventes J+40 / J+90 et la surveillance pondeuse.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#2f2415] text-white">
          <tr>
            <th className="px-3 py-2.5 text-left font-black">Entité / cycle</th>
            <th className="px-3 py-2.5 text-left font-black">Entrée</th>
            <th className="px-3 py-2.5 text-left font-black">Date cible</th>
            <th className="px-3 py-2.5 text-right font-black">Qté</th>
            <th className="px-3 py-2.5 text-left font-black">Action</th>
            <th className="px-3 py-2.5 text-left font-black">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const meta = TYPE_META[row.type] || TYPE_META.chair;
            const Icon = meta.icon;
            return (
              <tr key={`${row.id || row.label}-${row.targetDate}-${idx}`} className="border-t border-[#eadcc2]">
                <td className="px-3 py-2.5 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon size={15} className="mt-0.5 shrink-0 text-[#9a6b12]" aria-hidden="true" />
                    <div className="min-w-0">
                      <b className="block text-[#2f2415] break-words">{row.label}</b>
                      <p className="text-xs text-[#8a7456]">{meta.label} · J+{row.cycleDays}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-[#7d6a4a] whitespace-nowrap">{row.startDate || '—'}</td>
                <td className="px-3 py-2.5 font-black text-[#9a6b12] whitespace-nowrap">{row.targetDate || '—'}</td>
                <td className="px-3 py-2.5 text-right font-black text-[#2f2415] whitespace-nowrap">{fmtNumber(row.quantity || 0)}</td>
                <td className="px-3 py-2.5 text-xs text-[#7d6a4a] break-words max-w-[12rem]">{meta.action}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <CycleStatusBadge targetDate={row.targetDate} />
                  {setTab ? (
                    <button type="button" onClick={() => setTab(meta.tab)} className="ml-2 text-[11px] font-black text-[#9a6b12] underline">
                      Ouvrir
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CycleAlertsList({ alerts = [], onNavigate }) {
  if (!alerts.length) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        <CheckCircle2 size={15} className="inline mr-1" aria-hidden="true" />
        Aucune alerte cycle urgente — les rappels J+40 / J+90 sont synchronisés avec le centre Alertes.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {alerts.slice(0, 8).map((alert) => (
        <div
          key={alert.id || alert.title}
          className={`rounded-xl border p-3 text-sm ${alert.severity === 'critique' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
        >
          <p className="font-black">{alert.title}</p>
          <p className="mt-1 text-xs leading-relaxed">{alert.message}</p>
        </div>
      ))}
      {onNavigate ? (
        <button
          type="button"
          onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })}
          className="text-xs font-black text-[#9a6b12] underline"
        >
          Ouvrir toutes les alertes ERP →
        </button>
      ) : null}
    </div>
  );
}

export default function ElevageCyclesPanel({
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  alertes = [],
  onNavigate,
  setTab,
  farmScopeLabel = '',
  farmScope = {},
  farmFiltered = false,
  initialProductionQuestion = null,
  meteo,
}) {
  const enrichedDataMap = useMemo(
    () => ({
      ...dataMap,
      lots,
      avicole: lots,
      animaux,
      production_oeufs_logs: productionLogs,
      productionLogs,
    }),
    [dataMap, lots, animaux, productionLogs],
  );

  const strategicPlan = useMemo(() => {
    try {
      return buildStrategicDecisionPlan(enrichedDataMap, { meteo: meteo || dataMap.meteo });
    } catch {
      return {};
    }
  }, [enrichedDataMap, meteo, dataMap.meteo]);

  const v1Kpis = useMemo(
    () => buildCycleV1Kpis({ lots, animaux, productionLogs, dataMap: enrichedDataMap, strategicPlan }),
    [lots, animaux, productionLogs, enrichedDataMap, strategicPlan],
  );

  const {
    activeAnimals,
    activeLots,
    layers,
    broilers,
    priorityRows,
    mortalityAlerts,
    warningCount,
    cycleDays,
  } = v1Kpis.overview;

  const cycleAlerts = useMemo(
    () => buildCycleAlertsForPanel({ lots: activeLots, animaux: activeAnimals, alertes }),
    [activeLots, activeAnimals, alertes],
  );

  const upcomingFestivals = getNextFestivals(new Date(), enrichedDataMap, 3);
  const festivalLine = festivalLabelList(upcomingFestivals).join(', ') || 'Magal, Gamou, fin d\'année';

  const cycleNavigate = (module, opts) => {
    if (module === 'elevage' && opts?.tab && setTab) {
      setTab(opts.tab);
      return;
    }
    if (module === 'avicole' && setTab) {
      setTab('Lots & bandes');
      return;
    }
    if (module === 'animaux' && setTab) {
      setTab('Lots & bandes');
      return;
    }
    onNavigate?.(module, opts);
  };

  useEffect(() => {
    if (initialProductionQuestion) {
      window.dispatchEvent(
        new CustomEvent('horizon-production-question', {
          detail: { questionId: initialProductionQuestion, moduleId: 'elevage' },
        }),
      );
    }
  }, [initialProductionQuestion]);

  return (
    <div className="space-y-5">
      <ElevageSection
        title="Cycles & bandes"
        subtitle={`Centre opérationnel — chair J+${cycleDays.chair}, bovins J+${cycleDays.bovins}, réforme pondeuses J+${cycleDays.pondeusesReformWatch}. Stratégie marché : Centre décisionnel.`}
      >
        <FarmScopeBadge farmScopeLabel={farmScopeLabel} farmScope={farmScope} farmFiltered={farmFiltered} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mt-3">
          {warningCount ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={15} className="inline mr-1" aria-hidden="true" />
              {warningCount} point(s) cycle à traiter (retards, échéances ≤10 j, mortalité élevée).
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 size={15} className="inline mr-1" aria-hidden="true" />
              Calendrier maîtrisé — aucune échéance urgente.
            </div>
          )}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('centre_ia', { tab: 'Saisons & marchés' })}
              className="shrink-0 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
            >
              Centre décisionnel → Saisons & marchés
            </button>
          ) : null}
        </div>

        <div className={ELEVAGE_STAT_GRID}>
          <ElevageStatCard label="Échéances ≤10 j" value={fmtNumber(v1Kpis.dueSoonCount)} tone={v1Kpis.dueSoonCount ? 'warn' : 'good'} />
          <ElevageStatCard label="Cycles en retard" value={fmtNumber(v1Kpis.lateCount)} tone={v1Kpis.lateCount ? 'bad' : 'good'} />
          <ElevageStatCard
            label="Prochaine sortie"
            value={v1Kpis.nextExitDate === '—' ? '—' : `${v1Kpis.nextExitDate}`}
            tone={v1Kpis.lateCount ? 'warn' : 'neutral'}
          />
          <ElevageStatCard label="Lots actifs" value={fmtNumber(v1Kpis.activeLotsCount)} tone="good" />
          <ElevageStatCard
            label="Taux de ponte (7 j)"
            value={v1Kpis.layingRateLabel}
            tone={v1Kpis.layingRateCalculable ? 'good' : 'warn'}
          />
          <ElevageStatCard
            label="Blocage lancement"
            value={v1Kpis.launchBlockLabel}
            tone={v1Kpis.launchBlocked ? 'bad' : 'good'}
          />
        </div>
        {v1Kpis.nextExitLabel !== '—' ? (
          <p className="text-xs text-[#8a7456] mt-2">
            Prochaine sortie : <b className="text-[#2f2415]">{v1Kpis.nextExitLabel}</b>
          </p>
        ) : null}
      </ElevageSection>

      <ElevageSection title="Alertes cycles" subtitle="Rappels J+40 / J+90 / réforme — source AlertesCenter, affichés ici pour action terrain.">
        <CycleAlertsList alerts={cycleAlerts} onNavigate={onNavigate} />
      </ElevageSection>

      <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-[#2f2415] text-sm flex items-center gap-2">
          <CalendarRange size={16} className="text-[#9a6b12]" />
          Stratégie lancement (synthèse) — fêtes : {festivalLine}
        </summary>
        <div className="mt-3 space-y-2 text-sm text-[#7d6a4a]">
          {v1Kpis.launchBlocked ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-900">
              <b>Lancement suspendu ou à risque :</b>
              <ul className="mt-1 list-disc pl-4 text-xs">
                {v1Kpis.launch.messages.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-900 text-xs">
              Aucun blocage BFR ou vide sanitaire détecté pour ce scope. Calendrier marché complet → Centre décisionnel.
            </p>
          )}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('centre_ia', { tab: 'Saisons & marchés' })}
              className="rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white"
            >
              Ouvrir Saisons & marchés (Centre IA)
            </button>
          ) : null}
        </div>
      </details>

      <ElevageSection title="Planification — actions" subtitle="Pas de création directe ici : planifier ouvre Avicole/Animaux pré-rempli (une seule création officielle).">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard
            icon={Drumstick}
            title="Planifier lot chair"
            text="Ouvre Avicole avec formulaire lot chair pré-rempli — pas de double création."
            onClick={() => {
              setTab?.('Lots & bandes');
              window.setTimeout(() => {
                emitHorizonForm('avicole', 'lot_create', 'Planifier bande chair', { type_lot: 'chair', date_entree: today(), planning_only: true });
              }, 120);
            }}
          />
          <ElevageActionCard
            icon={Egg}
            title="Planifier bande pondeuse"
            text="Ouvre Avicole avec bande pondeuse pré-remplie."
            onClick={() => {
              setTab?.('Lots & bandes');
              window.setTimeout(() => {
                emitHorizonForm('avicole', 'lot_create', 'Planifier bande pondeuse', { type_lot: 'pondeuse', date_entree: today(), planning_only: true });
              }, 120);
            }}
          />
          <ElevageActionCard
            icon={Beef}
            title="Planifier embouche"
            text="Ouvre Animaux — fiche bovin avec date d'entrée J+90."
            onClick={() => {
              setTab?.('Lots & bandes');
              window.setTimeout(() => {
                emitHorizonForm('animaux', 'animal_create', 'Planifier embouche', { date: today(), espece: 'Bovin', planning_only: true });
              }, 120);
            }}
          />
          <ElevageActionCard icon={ShoppingCart} title="Préparer vente" text="Commercial pré-rempli — validation humaine obligatoire." onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
        {v1Kpis.lateCount > 0 ? (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
            <b>{v1Kpis.lateCount} lot(s)/cycle(s) en retard</b> — prioriser les lignes en retard dans le tableau ci-dessous.
          </p>
        ) : null}
      </ElevageSection>

      <details className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Météo & croissance (prévision)</summary>
        <div className="mt-3 text-sm text-[#7d6a4a]">
          {meteo?.temperature != null || meteo?.temp != null ? (
            <p>
              Température actuelle : <b>{meteo.temperature ?? meteo.temp}°</b>
              {meteo.humidity != null ? ` · Humidité ${meteo.humidity}%` : ''}
              {meteo.conditions ? ` · ${meteo.conditions}` : ''}
            </p>
          ) : (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
              Données météo non disponibles pour cette ferme — connectez Smart Farm ou vérifiez le module Centre IA.
            </p>
          )}
        </div>
      </details>

      <ElevageSection title="Échéances prioritaires (30 jours)" subtitle="Vue unifiée chair, bovins et réforme pondeuses — triée par date cible.">
        <PriorityTable rows={priorityRows} setTab={setTab} />
      </ElevageSection>

      {mortalityAlerts.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Mortalité élevée sur lot(s) :</b>{' '}
          {mortalityAlerts.map((lot) => `${lot.name || lot.nom || lot.id} (${mortalityRate(lot)} %)`).join(' · ')}
          {' — '}
          <button type="button" onClick={() => setTab?.('Transformation')} className="font-black underline">
            Voir Transformation
          </button>
          {' · '}
          <button type="button" onClick={() => setTab?.('Santé')} className="font-black underline">
            Santé
          </button>
        </div>
      ) : null}

      <ProductionQuestionsPanel
        dataMap={{ ...enrichedDataMap, lots: activeLots, animaux: activeAnimals, productionLogs }}
        onNavigate={cycleNavigate}
      />
    </div>
  );
}
