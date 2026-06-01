import { AlertTriangle, Beef, Bird, CheckCircle2, Drumstick, Egg, ShoppingCart } from 'lucide-react';
import { useMemo } from 'react';
import ProductionQuestionsPanel from '../../components/ProductionQuestionsPanel.jsx';
import { emitHorizonForm } from '../../services/formModalManager';
import ProductionCycleDecisionPanel from '../ProductionCycleDecisionPanel.jsx';
import { fmtNumber } from '../../utils/format';
import { buildCycleOverview, daysUntil, mortalityRate } from './cycleSummary.js';
import { ELEVAGE_ACTION_GRID, ELEVAGE_STAT_GRID, ElevageActionCard, ElevageSection, ElevageStatCard } from './elevageUi.jsx';

const today = () => new Date().toISOString().slice(0, 10);

const TYPE_META = {
  chair: { label: 'Poulets chair', icon: Drumstick, action: 'Préparer vente chair (J+40)', tab: 'Transformation' },
  bovins: { label: 'Bovin / embouche', icon: Beef, action: 'Préparer vente ou renouvellement (J+90)', tab: 'Transformation' },
  pondeuses: { label: 'Pondeuses', icon: Egg, action: 'Surveiller ponte et réforme (J+510)', tab: 'Production' },
};

function CycleStatusBadge({ targetDate }) {
  const days = daysUntil(targetDate);
  if (days == null) return <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-black text-sky-800">À planifier</span>;
  if (days < 0) return <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-black text-red-800">En retard ({Math.abs(days)} j)</span>;
  if (days <= 10) return <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-black text-amber-800">Dans {days} j</span>;
  return <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-black text-emerald-700">Dans {days} j</span>;
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

export default function ElevageCyclesPanel({
  dataMap,
  lots = [],
  animaux = [],
  productionLogs = [],
  onNavigate,
  setTab,
}) {
  const overview = useMemo(
    () => buildCycleOverview({ lots, animaux, productionLogs, dataMap }),
    [lots, animaux, productionLogs, dataMap],
  );

  const {
    activeAnimals,
    activeLots,
    layers,
    broilers,
    priorityRows,
    mortalityAlerts,
    nextTarget,
    lateCount,
    dueSoonCount,
    warningCount,
    cycleDays,
    decisions,
  } = overview;

  const cycleNavigate = (module, opts) => {
    if (module === 'elevage' && opts?.tab && setTab) {
      setTab(opts.tab);
      return;
    }
    if (module === 'avicole' && setTab) {
      setTab('Avicole');
      return;
    }
    if (module === 'animaux' && setTab) {
      setTab('Animaux');
      return;
    }
    onNavigate?.(module, opts);
  };

  return (
    <div className="space-y-5">
      <ElevageSection
        title="Cycles & bandes"
        subtitle={`Pilotage opérationnel — chair J+${cycleDays.chair}, bovins J+${cycleDays.bovins}, réforme pondeuses J+${cycleDays.pondeusesReformWatch}. Synthèse décisionnelle et performance financière : Centre décisionnel et Objectifs & Croissance.`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
            <button type="button" onClick={() => onNavigate('centre_ia', { tab: 'Cycles' })} className="shrink-0 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]">
              Centre décisionnel → Cycles
            </button>
          ) : null}
        </div>

        <div className={ELEVAGE_STAT_GRID}>
          <ElevageStatCard label="Lots actifs" value={fmtNumber(activeLots.length)} tone="good" />
          <ElevageStatCard label="Animaux actifs" value={fmtNumber(activeAnimals.length)} />
          <ElevageStatCard label="Échéances ≤10 j" value={fmtNumber(dueSoonCount)} tone={dueSoonCount ? 'warn' : 'good'} />
          <ElevageStatCard label="En retard" value={fmtNumber(lateCount)} tone={lateCount ? 'bad' : 'good'} />
          <ElevageStatCard label="Prochaine échéance" value={nextTarget} tone={lateCount ? 'warn' : 'neutral'} />
          <ElevageStatCard label="Pondeuses actives" value={fmtNumber(layers.length)} tone="good" />
          <ElevageStatCard label="Décisions IA" value={fmtNumber(decisions.length)} tone={decisions.length ? 'warn' : 'neutral'} />
        </div>
      </ElevageSection>

      <ElevageSection title="Actions rapides" subtitle="Lancer une bande, préparer une vente ou consulter les fiches sources.">
        <div className={ELEVAGE_ACTION_GRID}>
          <ElevageActionCard
            icon={Drumstick}
            title="+ Lot chair"
            text="Créer une bande poulets de chair avec date d'entrée."
            onClick={() => emitHorizonForm('avicole', 'lot_create', 'Nouvelle bande chair', { type_lot: 'chair', date_entree: today() })}
          />
          <ElevageActionCard
            icon={Egg}
            title="+ Bande pondeuse"
            text="Lancer ou renouveler une bande pondeuse."
            onClick={() => emitHorizonForm('avicole', 'lot_create', 'Nouvelle bande pondeuse', { type_lot: 'pondeuse', date_entree: today() })}
          />
          <ElevageActionCard
            icon={Beef}
            title="+ Bovin / embouche"
            text="Enregistrer un animal avec date d'entrée pour le cycle J+90."
            onClick={() => emitHorizonForm('animaux', 'animal_create', 'Nouveau bovin', { date: today(), espece: 'Bovin' })}
          />
          <ElevageActionCard icon={ShoppingCart} title="Préparer vente" text="Opportunités et commandes commerciales." onClick={() => onNavigate?.('ventes')} />
          <ElevageActionCard icon={Bird} title="Fiches Avicole" text={`${broilers.length} chair · ${layers.length} pondeuses actives.`} onClick={() => setTab?.('Avicole')} />
          <ElevageActionCard icon={Beef} title="Fiches Animaux" text={`${activeAnimals.length} tête(s) suivie(s).`} onClick={() => setTab?.('Animaux')} />
        </div>
      </ElevageSection>

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

      <ProductionQuestionsPanel dataMap={{ ...dataMap, lots: activeLots, animaux: activeAnimals, productionLogs }} onNavigate={cycleNavigate} />

      <ProductionCycleDecisionPanel
        dataMap={{ ...dataMap, lots: activeLots, animaux: activeAnimals, productionLogs }}
        lots={activeLots}
        animaux={activeAnimals}
        productionLogs={productionLogs}
        onNavigate={cycleNavigate}
        embedInElevage
      />
    </div>
  );
}
