import { ArrowRight, Beef, CalendarRange, Drumstick, Egg } from 'lucide-react';
import { useMemo } from 'react';
import { PRODUCTION_QUESTIONS } from '../../services/productionStrategicAnswers.js';
import { fmtNumber } from '../../utils/format';
import { launchProductionQuestion } from '../../utils/productionNavigation.js';
import { buildCycleOverview, daysUntil, mortalityRate } from '../elevage/cycleSummary.js';
import { Btn, Empty, Row, Section, TabIntro, VisionKpi } from './visionUtils';

const TYPE_LABEL = { chair: 'Chair J+40', bovins: 'Bovin J+90', pondeuses: 'Pondeuse J+510' };
const priorityClass = {
  haute: 'border-red-200 bg-red-50 text-red-700',
  moyenne: 'border-amber-200 bg-amber-50 text-amber-700',
  basse: 'border-sky-200 bg-sky-50 text-sky-700',
};

function cycleStatusLabel(targetDate) {
  const days = daysUntil(targetDate);
  if (days == null) return 'À planifier';
  if (days < 0) return `Retard ${Math.abs(days)} j`;
  if (days <= 10) return `≤ ${days} j`;
  return `Dans ${days} j`;
}

export default function VisionCyclesTab({
  dataMap = {},
  lots = [],
  animaux = [],
  productionLogs = [],
  onNavigate,
}) {
  const overview = useMemo(
    () => buildCycleOverview({ lots, animaux, productionLogs, dataMap }),
    [lots, animaux, productionLogs, dataMap],
  );

  const openElevageCycles = (extra = {}) => onNavigate?.('elevage', { tab: 'Cycles', ...extra });

  return (
    <div className="space-y-5">
      <TabIntro
        title="Synthèse cycles production"
        detail="Vue décisionnelle du Centre — calendrier détaillé, saisies et filières dans Élevage → Cycles. Objectifs & Croissance couvre la performance financière, pas le pilotage bande par bande."
        action={onNavigate ? (
          <Btn onClick={() => openElevageCycles()}>
            Élevage → Cycles <ArrowRight size={14} className="inline ml-1" aria-hidden="true" />
          </Btn>
        ) : null}
      />

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a] leading-relaxed">
        <b className="text-[#2f2415]">Répartition des rôles</b>
        <ul className="mt-2 space-y-1 list-disc pl-5">
          <li><b>Centre décisionnel · Cycles</b> — signaux, décisions IA, questions stratégiques (liens rapides).</li>
          <li><b>Élevage · Cycles</b> — échéances, calendrier chair/bovins/pondeuses, actions terrain.</li>
          <li><b>Objectifs & Croissance</b> — performance, prévisions financières, plans BP (sans calendrier opérationnel).</li>
        </ul>
      </div>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <VisionKpi label="Échéances ≤10 j" value={fmtNumber(overview.dueSoonCount)} tone={overview.dueSoonCount ? 'warn' : 'good'} onClick={() => openElevageCycles()} />
        <VisionKpi label="En retard" value={fmtNumber(overview.lateCount)} tone={overview.lateCount ? 'bad' : 'good'} onClick={() => openElevageCycles()} />
        <VisionKpi label="Décisions IA" value={fmtNumber(overview.decisions.length)} tone={overview.decisions.length ? 'warn' : 'neutral'} onClick={() => openElevageCycles()} />
        <VisionKpi label="Prochaine date" value={overview.nextTarget} tone="neutral" onClick={() => openElevageCycles()} />
      </div>

      <Section icon={CalendarRange} title="Échéances prioritaires (30 j)" action={onNavigate ? <Btn onClick={() => openElevageCycles()}>Calendrier complet</Btn> : null}>
        {overview.priorityRows.length ? overview.priorityRows.slice(0, 6).map((row, idx) => (
          <Row
            key={`${row.id || row.label}-${row.targetDate}-${idx}`}
            title={row.label}
            detail={`${TYPE_LABEL[row.type] || row.type} · entrée ${row.startDate || '—'}`}
            value={cycleStatusLabel(row.targetDate)}
            tone={daysUntil(row.targetDate) != null && daysUntil(row.targetDate) < 0 ? 'bad' : daysUntil(row.targetDate) != null && daysUntil(row.targetDate) <= 10 ? 'warn' : 'good'}
            onClick={() => openElevageCycles()}
          />
        )) : (
          <Empty>
            Aucune échéance calculée. Complétez les dates d&apos;entrée sur Avicole ou Animaux, puis ouvrez le calendrier opérationnel.
            {onNavigate ? (
              <button type="button" onClick={() => openElevageCycles()} className="mt-3 rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white">
                Élevage → Cycles
              </button>
            ) : null}
          </Empty>
        )}
      </Section>

      {overview.mortalityAlerts.length ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <b>Mortalité élevée :</b>{' '}
          {overview.mortalityAlerts.map((lot) => `${lot.name || lot.nom || lot.id} (${mortalityRate(lot)} %)`).join(' · ')}
          {onNavigate ? (
            <button type="button" onClick={() => onNavigate('elevage', { tab: 'Transformation' })} className="ml-2 font-black underline">
              Transformation
            </button>
          ) : null}
        </div>
      ) : null}

      <Section icon={CalendarRange} title="Décisions recommandées (IA cycles)">
        {overview.decisions.length ? (
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            {overview.decisions.slice(0, 6).map((decision) => (
              <article key={decision.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-black text-[#2f2415] leading-tight break-words">{decision.title}</p>
                  <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-black uppercase ${priorityClass[decision.priority] || priorityClass.moyenne}`}>
                    {decision.priority}
                  </span>
                </div>
                <p className="text-xs text-[#8a7456]">Cible : {decision.targetDate || 'à planifier'}</p>
                <p className="text-sm text-[#7d6a4a] leading-relaxed break-words">{decision.recommendation}</p>
                <button type="button" onClick={() => openElevageCycles()} className="text-xs font-black text-[#9a6b12] underline">
                  Exécuter dans Élevage → Cycles
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty>Aucune décision cycle en attente. Le moteur analyse les bandes actives en continu.</Empty>
        )}
      </Section>

      <Section icon={Egg} title="Questions stratégiques" action={onNavigate ? <Btn onClick={() => openElevageCycles()}>Analyser dans Élevage</Btn> : null}>
        <p className="mb-3 text-sm text-[#8a7456]">Réponses détaillées et calendrier dans Élevage — ici, raccourcis vers les bonnes questions.</p>
        <div className="flex flex-wrap gap-2">
          {PRODUCTION_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => launchProductionQuestion({ questionId: q.id, onNavigate })}
              className="rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1.5 text-left text-xs font-black text-[#2f2415] hover:bg-[#dcfce7]"
            >
              {q.label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Avicole' })} className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415]">
            <Drumstick size={14} aria-hidden="true" /> Avicole
          </button>
          <button type="button" onClick={() => onNavigate?.('elevage', { tab: 'Animaux' })} className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415]">
            <Beef size={14} aria-hidden="true" /> Animaux
          </button>
          <button type="button" onClick={() => onNavigate?.('objectifs_croissance', { tab: 'Performance' })} className="inline-flex items-center gap-1 rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#2f2415]">
            Objectifs & Croissance
          </button>
        </div>
      </Section>
    </div>
  );
}
