import BaseModal from '../modals/BaseModal';
import Badge from './Badge';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { calculateLotMetrics } from '../utils/businessCalculations';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { buildPondeuseProductionProfile, projectGrowth, saleOpportunityGuard } from '../services/growthProjectionService';
import { PondeuseProductionPanel, SaleOpportunityGuardPanel, WeightProjectionPanel } from './GrowthProjectionPanel';

const Field = ({ label, value, children }) => (
  <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2">
    <p className="text-[11px] uppercase tracking-wide text-[#8a7456]">{label}</p>
    <div className="mt-1 text-sm font-semibold text-[#2f2415] break-words">{children || value || '-'}</div>
  </div>
);

const Section = ({ title, children }) => (
  <section className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
    <h3 className="text-sm font-black text-[#2f2415] mb-3">{title}</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>
  </section>
);

const activeCount = (lot = {}) => Number(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count ?? lot.effectif ?? 0) || 0;
const deadCount = (lot = {}) => Number(lot.mortality ?? lot.morts ?? lot.deces ?? 0) || 0;
const sickCount = (lot = {}) => Number(lot.malades ?? lot.sick_count ?? 0) || 0;
const isPondeuse = (lot = {}) => String(lot.type || '').toLowerCase().includes('pondeuse');

export default function AvicoleLotDetailsModal({ open, onClose, lot, productionLogs = [], alimentationLogs = [], opportunities = [] }) {
  if (!lot) {
    return <BaseModal open={open} onClose={onClose} title="Fiche lot avicole"><p className="text-[#8a7456]">Aucun lot sélectionné.</p></BaseModal>;
  }

  const decision = buildAvicoleLotDecision(lot, productionLogs);
  const metrics = calculateLotMetrics({ lot, feedingLogs: alimentationLogs, productionLogs });
  const guard = saleOpportunityGuard(lot, 'lot_avicole', opportunities);
  const targetDays = Number(lot.duree_cycle_valeur || 45) || 45;
  const growthProjection = projectGrowth(lot, { targetDays, targetWeight: Number(lot.poids_objectif_vente || lot.target_weight || 1.5) || 1.5 });
  const ponteProfile = buildPondeuseProductionProfile(lot, productionLogs);
  const active = activeCount(lot);

  return (
    <BaseModal open={open} onClose={onClose} title={`Fiche lot · ${lot.name || lot.id}`}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#d6c3a0] bg-[#2f2415] p-4 text-white">
          <p className="text-xs uppercase tracking-[0.2em] text-[#c9a96a]">Lot avicole</p>
          <h2 className="mt-1 text-2xl font-black">{lot.name || lot.id}</h2>
          <p className="mt-1 text-sm text-[#f4e6c8]">{lot.type || 'Type non renseigné'} · {active} sujet(s) actif(s)</p>
          <div className="mt-3 flex flex-wrap gap-2"><Badge status={lot.status || 'actif'} /><Badge status={lot.health_status || 'sain'} /><span className="rounded-full bg-white/10 border border-white/10 px-3 py-1 text-xs text-[#f4e6c8]">{decision.decision}</span></div>
        </div>

        <Section title="Situation du lot">
          <Field label="Effectif initial" value={fmtNumber(lot.initial_count || lot.effectif_initial || 0)} />
          <Field label="Effectif actif" value={fmtNumber(active)} />
          <Field label="Morts" value={fmtNumber(deadCount(lot))} />
          <Field label="Malades" value={fmtNumber(sickCount(lot))} />
          <Field label="Date entrée" value={lot.date_debut || lot.entry_date || '-'} />
          <Field label="Phase" value={lot.phase || '-'} />
        </Section>

        {isPondeuse(lot) ? <PondeuseProductionPanel profile={ponteProfile} /> : <WeightProjectionPanel title="Projection poids moyen & vente" projection={growthProjection} />}
        <SaleOpportunityGuardPanel guard={guard} />

        <Section title="Décision IA">
          <Field label="Décision" value={decision.decision} />
          <Field label="Priorité" value={decision.priority || '-'} />
          <Field label="Prochaine pesée / action" value={decision.nextWeighingDate || decision.reformStart || '-'} />
          <Field label="Poids / ponte attendu" value={decision.expectedWeight ? `${decision.expectedWeight} kg` : decision.expectedEggsDay ? `${fmtNumber(decision.expectedEggsDay)} œufs/j` : '-'} />
        </Section>

        <Section title="Coûts & performance">
          <Field label="Coût achat" value={fmtCurrency(lot.cout_total_achat || lot.purchase_cost || 0)} />
          <Field label="Coût alimentation" value={fmtCurrency(metrics.feedingCost || 0)} />
          <Field label="Coût total" value={fmtCurrency(metrics.totalCost || 0)} />
          <Field label="Marge estimée / réelle" value={fmtCurrency(metrics.marginEstimated || metrics.marginReal || 0)} />
        </Section>
      </div>
    </BaseModal>
  );
}
