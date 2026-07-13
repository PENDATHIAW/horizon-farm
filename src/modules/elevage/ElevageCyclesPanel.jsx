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
import {  daysUntil, mortalityRate } from './cycleSummary.js';
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
  if (days == null) return <span className="rounded-full bg-neutral-bg px-2 py-1 text-xs font-semibold text-neutral">À planifier</span>;
  if (days < 0) return <span className="rounded-full bg-urgent-bg px-2 py-1 text-xs font-semibold text-urgent">En retard ({Math.abs(days)} j)</span>;
  if (days <= 10) return <span className="rounded-full bg-vigilance-bg px-2 py-1 text-xs font-semibold text-horizon-dark">Dans {days} j</span>;
  return <span className="rounded-full bg-positive-bg px-2 py-1 text-xs font-semibold text-positive">Dans {days} j</span>;
}

function FarmScopeBadge({ farmScopeLabel = '', farmScope = {}, farmFiltered = false }) {
  const allFarms = isAllFarmsScope(farmScope);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-2 rounded-full border border-positive bg-positive-bg px-3 py-1 text-xs font-semibold text-positive">
        <Building2 size={13} aria-hidden="true" />
        {farmScopeLabel || (allFarms ? 'Toutes les fermes' : 'Ferme active')}
      </span>
      {allFarms ? (
        <span className="text-xs text-slate">Vue consolidée — stratégie groupe via Centre décisionnel.</span>
      ) : farmFiltered ? (
        <span className="text-xs text-slate">Données filtrées pour la ferme sélectionnée.</span>
      ) : (
        <span className="text-xs text-horizon-dark">Filtre ferme non actif — vérifiez le sélecteur global.</span>
      )}
    </div>
  );
}

function PriorityTable({ rows, setTab }) {
  if (!rows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-card p-6 text-center text-sm text-slate">
        Aucun cycle calculé pour l&apos;instant. Ajoutez des lots ou animaux avec une <b>date d&apos;entrée</b> pour voir les ventes J+40 / J+90 et la surveillance pondeuse.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-line bg-card">
      <table className="min-w-full text-sm">
        <thead className="bg-earth text-white">
          <tr>
            <th className="px-3 py-3 text-left font-semibold">Entité / cycle</th>
            <th className="px-3 py-3 text-left font-semibold">Entrée</th>
            <th className="px-3 py-3 text-left font-semibold">Date cible</th>
            <th className="px-3 py-3 text-right font-semibold">Qté</th>
            <th className="px-3 py-3 text-left font-semibold">Action</th>
            <th className="px-3 py-3 text-left font-semibold">Statut</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const meta = TYPE_META[row.type] || TYPE_META.chair;
            const Icon = meta.icon;
            return (
              <tr key={`${row.id || row.label}-${row.targetDate}-${idx}`} className="border-t border-line">
                <td className="px-3 py-3 min-w-0">
                  <div className="flex items-start gap-2 min-w-0">
                    <Icon size={15} className="mt-1 shrink-0 text-horizon-dark" aria-hidden="true" />
                    <div className="min-w-0">
                      <b className="block text-earth break-words">{row.label}</b>
                      <p className="text-xs text-slate">{meta.label} · J+{row.cycleDays}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 text-slate whitespace-nowrap">{row.startDate || '—'}</td>
                <td className="px-3 py-3 font-semibold text-horizon-dark whitespace-nowrap">{row.targetDate || '—'}</td>
                <td className="px-3 py-3 text-right font-semibold text-earth whitespace-nowrap">{fmtNumber(row.quantity || 0)}</td>
                <td className="px-3 py-3 text-xs text-slate break-words max-w-[12rem]">{meta.action}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <CycleStatusBadge targetDate={row.targetDate} />
                  {setTab ? (
                    <button type="button" onClick={() => setTab(meta.tab)} className="ml-2 text-meta font-semibold text-horizon-dark underline">
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
      <div className="rounded-2xl border border-positive bg-positive-bg p-4 text-sm text-positive">
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
          className={`rounded-xl border p-3 text-sm ${alert.severity === 'critique' ? 'border-urgent bg-urgent-bg text-urgent' : 'border-vigilance bg-vigilance-bg text-horizon-dark'}`}
        >
          <p className="font-semibold">{alert.title}</p>
          <p className="mt-1 text-xs leading-relaxed">{alert.message}</p>
        </div>
      ))}
      {onNavigate ? (
        <button
          type="button"
          onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })}
          className="text-xs font-semibold text-horizon-dark underline"
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
    <div className="space-y-6">
      <ElevageSection
        title="Cycles & bandes"
        subtitle={`Centre opérationnel — chair J+${cycleDays.chair}, bovins J+${cycleDays.bovins}, réforme pondeuses J+${cycleDays.pondeusesReformWatch}. Stratégie marché : Centre décisionnel.`}
      >
        <FarmScopeBadge farmScopeLabel={farmScopeLabel} farmScope={farmScope} farmFiltered={farmFiltered} />

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mt-3">
          {warningCount ? (
            <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark">
              <AlertTriangle size={15} className="inline mr-1" aria-hidden="true" />
              {warningCount} point(s) cycle à traiter (retards, échéances ≤10 j, mortalité élevée).
            </div>
          ) : (
            <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive">
              <CheckCircle2 size={15} className="inline mr-1" aria-hidden="true" />
              Calendrier maîtrisé — aucune échéance urgente.
            </div>
          )}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('centre_ia', { tab: 'Saisons & marchés' })}
              className="shrink-0 rounded-xl border border-line bg-card px-3 py-2 text-xs font-semibold text-earth hover:bg-positive-bg"
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
          <p className="text-xs text-slate mt-2">
            Prochaine sortie : <b className="text-earth">{v1Kpis.nextExitLabel}</b>
          </p>
        ) : null}
      </ElevageSection>

      <ElevageSection title="Alertes cycles" subtitle="Rappels J+40 / J+90 / réforme — source AlertesCenter, affichés ici pour action terrain.">
        <CycleAlertsList alerts={cycleAlerts} onNavigate={onNavigate} />
      </ElevageSection>

      <details className="rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold text-earth text-sm flex items-center gap-2">
          <CalendarRange size={16} className="text-horizon-dark" />
          Stratégie lancement (synthèse) — fêtes : {festivalLine}
        </summary>
        <div className="mt-3 space-y-2 text-sm text-slate">
          {v1Kpis.launchBlocked ? (
            <div className="rounded-xl border border-urgent bg-urgent-bg p-3 text-urgent">
              <b>Lancement suspendu ou à risque :</b>
              <ul className="mt-1 list-disc pl-4 text-xs">
                {v1Kpis.launch.messages.map((msg) => (
                  <li key={msg}>{msg}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="rounded-xl border border-positive bg-positive-bg p-3 text-positive text-xs">
              Aucun blocage BFR ou vide sanitaire détecté pour ce scope. Calendrier marché complet → Centre décisionnel.
            </p>
          )}
          {onNavigate ? (
            <button
              type="button"
              onClick={() => onNavigate('centre_ia', { tab: 'Saisons & marchés' })}
              className="rounded-xl bg-earth px-3 py-2 text-xs font-semibold text-white"
            >
              Ouvrir Saisons & marchés (Centre décisionnel)
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
          <ElevageActionCard icon={ShoppingCart} title="Préparer vente" text="Commercial pré-rempli — à confirmer avant enregistrement." onClick={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
        </div>
        {v1Kpis.lateCount > 0 ? (
          <p className="mt-3 rounded-xl border border-urgent bg-urgent-bg px-3 py-2 text-sm text-urgent">
            <b>{v1Kpis.lateCount} lot(s)/cycle(s) en retard</b> — prioriser les lignes en retard dans le tableau ci-dessous.
          </p>
        ) : null}
      </ElevageSection>

      <details className="rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-semibold text-sm text-earth">Météo & croissance (prévision)</summary>
        <div className="mt-3 text-sm text-slate">
          {meteo?.temperature != null || meteo?.temp != null ? (
            <p>
              Température actuelle : <b>{meteo.temperature ?? meteo.temp}°</b>
              {meteo.humidity != null ? ` · Humidité ${meteo.humidity}%` : ''}
              {meteo.conditions ? ` · ${meteo.conditions}` : ''}
            </p>
          ) : (
            <p className="rounded-xl border border-vigilance bg-vigilance-bg px-3 py-2 text-horizon-dark">
              Données météo non disponibles pour cette ferme — connectez Smart Farm ou vérifiez le module Centre décisionnel.
            </p>
          )}
        </div>
      </details>

      <ElevageSection title="Échéances prioritaires (30 jours)" subtitle="Vue unifiée chair, bovins et réforme pondeuses — triée par date cible.">
        <PriorityTable rows={priorityRows} setTab={setTab} />
      </ElevageSection>

      {mortalityAlerts.length ? (
        <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark">
          <b>Mortalité élevée sur lot(s) :</b>{' '}
          {mortalityAlerts.map((lot) => `${lot.name || lot.nom || lot.id} (${mortalityRate(lot)} %)`).join(' · ')}
          {' — '}
          <button type="button" onClick={() => setTab?.('Transformation')} className="font-semibold underline">
            Voir Transformation
          </button>
          {' · '}
          <button type="button" onClick={() => setTab?.('Santé')} className="font-semibold underline">
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
