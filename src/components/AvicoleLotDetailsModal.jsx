import toast from 'react-hot-toast';
import BaseModal from '../modals/BaseModal';
import Badge from './Badge';
import Btn from './Btn';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { calculateLotMetrics } from '../utils/businessCalculations';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { computeAvicoleLivingTarget } from '../services/avicoleLivingTargets';
import { buildPondeuseProductionProfile, saleOpportunityGuard } from '../services/growthProjectionService';
import { PondeuseProductionPanel, SaleOpportunityGuardPanel, WeightProjectionPanel } from './GrowthProjectionPanel';

const Field = ({ label, value, children }) => (
  <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#2f2415] break-words">{children || value || '-'}</div>
  </div>
);

const Section = ({ title, children, note }) => (
  <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
    <h3 className="text-sm font-black text-[#2f2415] mb-1">{title}</h3>
    {note ? <p className="mb-3 text-xs text-[#8a7456]">{note}</p> : null}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);

const today = () => new Date().toISOString().slice(0, 10);
const activeCount = (lot = {}) => Number(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count ?? lot.effectif ?? 0) || 0;
const deadCount = (lot = {}) => Number(lot.mortality ?? lot.morts ?? lot.deces ?? 0) || 0;
const sickCount = (lot = {}) => Number(lot.malades ?? lot.sick_count ?? 0) || 0;
const isPondeuse = (lot = {}) => String(lot.type || '').toLowerCase().includes('pondeuse');
const existingOpportunityFor = (lot = {}, opportunities = []) => opportunities.find((opp) => String(opp.source_id || opp.entity_id || opp.related_id || '') === String(lot.id) && !['converti', 'converted', 'annule', 'annulé', 'ignore', 'ignoré', 'perdu', 'cloture', 'clôturé'].some((status) => String(opp.status || opp.statut || '').toLowerCase().includes(status)));

function livingAsProjection(living) {
  return {
    status: living.status,
    label: living.status?.replaceAll('_', ' ') || 'Suivi en cours',
    currentWeight: living.currentWeight || 0,
    targetWeight: living.livingTarget || living.defaultTargetWeight || 0,
    projectedWeight: living.projectedWeight || 0,
    targetDays: living.targetDays || 45,
    gainPerDay: living.adaptiveGainPerDay || living.realGainPerDay || 0,
    action: living.action,
    history: living.history || [],
  };
}

export default function AvicoleLotDetailsModal({
  open,
  onClose,
  lot,
  productionLogs = [],
  alimentationLogs = [],
  opportunities = [],
  onCreateOpportunity,
  onUpdateOpportunity,
  onRefreshOpportunities,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
  onNavigate,
}) {
  if (!lot) {
    return <BaseModal open={open} onClose={onClose} title="Fiche lot avicole"><p className="text-[#8a7456]">Aucun lot sélectionné.</p></BaseModal>;
  }

  const layer = isPondeuse(lot);
  const decision = buildAvicoleLotDecision(lot, productionLogs);
  const metrics = calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });
  const guard = saleOpportunityGuard(lot, 'lot_avicole', opportunities);
  const livingTarget = computeAvicoleLivingTarget(lot, productionLogs);
  const growthProjection = livingAsProjection(livingTarget);
  const ponteProfile = buildPondeuseProductionProfile(lot, productionLogs);
  const active = activeCount(lot);
  const existingOpportunity = existingOpportunityFor(lot, opportunities);

  const confirmOpportunity = async () => {
    if (!onCreateOpportunity && !onUpdateOpportunity) {
      toast.error('Création opportunité non disponible pour ce module');
      return;
    }
    const title = layer ? `Réforme / vente pondeuses : ${lot.name || lot.id}` : `Poulets de chair prêts : ${lot.name || lot.id}`;
    const unitPrice = Number(lot.prix_vente_estime || lot.prix_unitaire_vente || (layer ? 2500 : 3500)) || 0;
    const payload = {
      opportunity_key: `avicole:${lot.id}`,
      source_module: 'avicole',
      source_type: layer ? 'lot_pondeuses' : 'lot_chair',
      source_id: lot.id,
      related_id: lot.id,
      title,
      product_name: `${lot.name || lot.id} · ${lot.type || 'Avicole'}`,
      quantity: active,
      unit: layer ? 'sujet reforme' : 'sujet',
      unit_price: unitPrice,
      estimated_amount: active * unitPrice,
      status: 'ouverte',
      statut: 'ouverte',
      priority: decision.priority || 'moyenne',
      notes: `${decision.decision || 'Opportunité confirmée'} · ${livingTarget.action}`,
      created_from: 'avicole_lot_details',
      updated_at: new Date().toISOString(),
    };
    try {
      if (existingOpportunity?.id && onUpdateOpportunity) {
        await onUpdateOpportunity(existingOpportunity.id, payload);
        toast.success('Opportunité existante mise à jour');
      } else if (!existingOpportunity?.id && onCreateOpportunity) {
        await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: new Date().toISOString() });
        toast.success('Opportunité de vente créée');
      } else {
        toast.error('Opportunité existante détectée, mais modification indisponible');
        return;
      }
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existingOpportunity?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: lot.id, title, description: payload.notes, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
    } catch (error) {
      toast.error(error.message || 'Création opportunité impossible');
    }
  };

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche ${layer ? 'pondeuses' : 'poulets de chair'} · ${lot.name || lot.id}`}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#d6c3a0] bg-[#2f2415] p-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-[#c9a96a]">{layer ? 'Lot pondeuses' : 'Lot poulets de chair'}</p>
          <h2 className="mt-1 text-2xl font-black">{lot.name || lot.id}</h2>
          <p className="mt-1 text-sm text-[#f4e6c8]">{lot.type || 'Type non renseigné'} · {active} sujet(s) actif(s)</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge status={lot.status || 'actif'} /><Badge status={lot.health_status || 'sain'} /><span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-[#f4e6c8]">{livingTarget.status?.replaceAll('_', ' ') || decision.decision}</span></div>
        </div>

        <Section title="Situation du lot" note="Lecture opérationnelle. Les coûts et alertes sont calculés depuis les journaux liés, pas saisis ici.">
          <Field label="Effectif initial" value={fmtNumber(lot.initial_count || lot.effectif_initial || 0)} />
          <Field label="Effectif actif" value={fmtNumber(active)} />
          <Field label="Morts" value={fmtNumber(deadCount(lot))} />
          <Field label="Malades / à surveiller" value={fmtNumber(sickCount(lot))} />
          <Field label="Date entrée" value={lot.date_debut || lot.entry_date || '-'} />
          <Field label="Phase" value={lot.phase || '-'} />
        </Section>

        {layer ? (
          <>
            <PondeuseProductionPanel profile={ponteProfile} />
            <Section title="Objectif ponte vivant" note="Objectif calculé selon âge du lot, effectif actif, historique des ramassages, casses et baisse éventuelle de ponte.">
              <Field label="Objectif initial" value={`${livingTarget.objectiveInitial || 0}%`} />
              <Field label="Objectif âge" value={`${livingTarget.ageExpectedPct || 0}%`} />
              <Field label="Objectif vivant" value={`${livingTarget.livingObjectivePct || 0}%`} />
              <Field label="Taux réel récent" value={`${livingTarget.realLayingPct || 0}%`} />
              <Field label="Œufs attendus / jour" value={fmtNumber(livingTarget.expectedEggsDay || 0)} />
              <Field label="Œufs réels / jour" value={fmtNumber(livingTarget.recentDailyEggs || 0)} />
              <Field label="Écart / jour" value={`${livingTarget.gapEggsDay >= 0 ? '+' : ''}${fmtNumber(livingTarget.gapEggsDay || 0)} œufs`} />
              <Field label="Action IA" value={livingTarget.action} />
            </Section>
          </>
        ) : (
          <>
            <WeightProjectionPanel title="Objectif poids vivant & vente" projection={growthProjection} />
            <Section title="Objectif poids vivant chair" note="L’objectif se recalcule après chaque pesée selon le gain moyen réel du lot.">
              <Field label="Poids moyen actuel" value={livingTarget.currentWeight ? `${livingTarget.currentWeight} kg` : 'À renseigner via suivi'} />
              <Field label="Objectif initial" value={`${livingTarget.defaultTargetWeight || 0} kg`} />
              <Field label="Objectif vivant" value={`${livingTarget.livingTarget || 0} kg`} />
              <Field label="Projection J45" value={`${livingTarget.projectedWeight || 0} kg`} />
              <Field label="Gain réel / jour" value={`${livingTarget.realGainPerDay || 0} kg/j`} />
              <Field label="Prochaine pesée" value={livingTarget.nextWeighingDate || '-'} />
              <Field label="Statut" value={livingTarget.status?.replaceAll('_', ' ') || '-'} />
              <Field label="Action IA" value={livingTarget.action} />
            </Section>
          </>
        )}

        <SaleOpportunityGuardPanel guard={guard} />
        <div className="flex flex-wrap gap-2 rounded-2xl border border-[#eadcc2] bg-white p-3">
          <Btn small onClick={confirmOpportunity}>{existingOpportunity ? 'Mettre à jour opportunité' : 'Confirmer opportunité de vente'}</Btn>
          <Btn small variant="outline" onClick={() => onNavigate?.('ventes')}>Voir opportunités / ventes</Btn>
        </div>

        <Section title="Décision IA" note="Décision affichée, à valider par l’utilisateur avant création d’opportunité.">
          <Field label="Décision" value={decision.decision} />
          <Field label="Priorité" value={decision.priority || '-'} />
          <Field label="Prochaine action" value={decision.nextWeighingDate || decision.reformStart || livingTarget.nextWeighingDate || '-'} />
          <Field label="Poids / ponte attendu" value={decision.expectedWeight ? `${decision.expectedWeight} kg` : decision.expectedEggsDay ? `${fmtNumber(decision.expectedEggsDay)} œufs/j` : livingTarget.expectedEggsDay ? `${fmtNumber(livingTarget.expectedEggsDay)} œufs/j` : '-'} />
        </Section>

        <Section title="Coûts & performance calculés" note="Alimentation calculée depuis les logs alimentation. Production calculée depuis les journaux. Les coûts santé ne sont pas saisis dans le lot.">
          <Field label="Coût achat bande" value={fmtCurrency(lot.cout_total_achat || lot.purchase_cost || 0)} />
          <Field label="Alimentation calculée" value={fmtCurrency(metrics.feedingCost || 0)} />
          <Field label="Coût total calculé" value={fmtCurrency(metrics.totalCost || 0)} />
          <Field label="Marge estimée / réelle" value={fmtCurrency(metrics.marginEstimated || metrics.marginReal || 0)} />
        </Section>
      </div>
    </BaseModal>
  );
}
