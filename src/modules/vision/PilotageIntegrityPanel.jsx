import { AlertTriangle } from 'lucide-react';
import { navigateFromPilotageItem } from '../../utils/centreDecisionWorkflow.js';
import { navigateObjectifsTarget } from '../../utils/objectifsCroissanceNavigation.js';
import { Btn, Empty, Pill, Section } from './visionUtils';

export default function PilotageIntegrityPanel({ audit, onNavigate, compact = false }) {
  if (!audit?.gapCount) return null;
  const gaps = audit.gaps.slice(0, compact ? 4 : 12);

  const openGap = (gap) => {
    if (gap.type === 'KPI divergent') {
      navigateObjectifsTarget(onNavigate, 'financeur_chiffres');
      return;
    }
    if (gap.risk) {
      navigateFromPilotageItem(onNavigate, gap.risk);
      return;
    }
    if (gap.opportunity) {
      onNavigate?.('commercial', { tab: 'Opportunités' });
      return;
    }
    if (gap.task) {
      onNavigate?.('activite_suivi', { tab: 'Tâches' });
      return;
    }
    onNavigate?.('centre_ia', { tab: 'À traiter' });
  };

  return (
    <Section
      icon={AlertTriangle}
      title="Écarts pilotage détectés"
      action={onNavigate ? <Btn onClick={() => onNavigate('activite_suivi', { tab: 'Alertes' })}>Activité & Suivi</Btn> : null}
    >
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        <Pill tone={audit.kpiGaps ? 'warn' : 'good'}>{audit.kpiGaps} KPI</Pill>
        <Pill tone={audit.orphanActions ? 'warn' : 'good'}>{audit.orphanActions} action(s) sans source</Pill>
        <Pill tone={audit.orphanOpportunities ? 'warn' : 'good'}>{audit.orphanOpportunities} opportunité(s)</Pill>
        <Pill tone={audit.risksWithoutFollowUp ? 'bad' : 'good'}>{audit.risksWithoutFollowUp} risque(s) sans suivi</Pill>
      </div>
      <div className="space-y-2">
        {gaps.map((gap) => (
          <div key={gap.id} className="flex flex-col gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-[#2f2415]">{gap.type}{gap.label ? ` · ${gap.label}` : ''}</p>
              <p className="text-xs text-[#8a7456]">{gap.action || gap.risk?.title || gap.opportunity?.title || gap.task?.title || 'Vérifier la cohérence inter-modules'}</p>
              {gap.type === 'KPI divergent' ? (
                <p className="text-[10px] text-[#8a7456]">Centre/Objectifs : {gap.visionValue?.toLocaleString?.('fr-FR')} · Source métier : {gap.sharedValue?.toLocaleString?.('fr-FR')}</p>
              ) : null}
            </div>
            {onNavigate ? (
              <button type="button" onClick={() => openGap(gap)} className="rounded-lg border border-[#d6c3a0] px-2 py-1 text-xs font-black shrink-0">
                Corriger
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {audit.gapCount > gaps.length ? <Empty>{audit.gapCount - gaps.length} autre(s) écart(s) masqué(s) — traiter via les modules source.</Empty> : null}
    </Section>
  );
}
