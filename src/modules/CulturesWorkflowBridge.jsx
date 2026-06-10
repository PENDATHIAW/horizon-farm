import { AlertTriangle, CalendarClock, CheckCircle2, PackagePlus, Sprout, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { calculateCultureMetrics } from '../utils/businessCalculations';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const cultureName = (row = {}) => row.nom || row.type || row.id || 'Culture';
const parcelName = (row = {}) => row.parcelle_code || row.parcelle_nom || row.parcelle || 'Parcelle non renseignée';
const campaignName = (row = {}) => row.campagne || row.saison || row.date_debut_campagne || 'Campagne non renseignée';
const healthScore = (row = {}) => toNumber(row.score_sante ?? row.health_score ?? calculateCultureMetrics(row).healthScore ?? 100);
const expectedHarvest = (row = {}) => toNumber(row.quantite_prevue ?? row.production_prevue ?? row.expected_yield);
const harvestedQty = (row = {}) => toNumber(row.quantite_recoltee ?? row.harvested_qty);
const losses = (row = {}) => toNumber(row.pertes ?? row.losses);
const costOf = (row = {}) => toNumber(row.cout_total_reel) || calculateCultureMetrics(row).costTotal || toNumber(row.budget_prevu);
const revenueOf = (row = {}) => toNumber(row.revenu_reel || row.revenu_estime || calculateCultureMetrics(row).revenueEstimated);
const marginOf = (row = {}) => revenueOf(row) - costOf(row);

function daysUntil(date) {
  if (!date) return null;
  const diff = (new Date(date) - new Date()) / 86400000;
  if (!Number.isFinite(diff)) return null;
  return Math.ceil(diff);
}

function riskForCulture(row = {}) {
  const score = healthScore(row);
  const harvestIn = daysUntil(row.date_recolte_prevue);
  const statut = String(row.statut || '').toLowerCase();
  const expected = expectedHarvest(row);
  const harvested = harvestedQty(row);
  const loss = losses(row);
  const reasons = [];
  if (score > 0 && score < 80) reasons.push(`score santé ${score.toFixed(0)}%`);
  if (statut === 'perdu') reasons.push('culture perdue');
  if (loss > 0) reasons.push(`${fmtNumber(loss)} pertes`);
  if (harvestIn !== null && harvestIn <= 7 && harvestIn >= 0 && harvested <= 0) reasons.push(`récolte dans ${harvestIn} jour(s)`);
  if (expected > 0 && harvested > 0 && harvested < expected * 0.7) reasons.push('récolte sous objectif');
  return {
    score,
    harvestIn,
    expected,
    harvested,
    loss,
    reasons,
    risky: reasons.length > 0,
    high: score < 65 || statut === 'perdu' || loss > expected * 0.25,
    readyToHarvest: harvestIn !== null && harvestIn <= 7 && harvestIn >= -3 && harvested <= 0,
  };
}

export default function CulturesWorkflowBridge({ rows = [], onUpdate, onRefresh }) {
  const alertesCrud = useCrudModule('alertes_center');
  const tachesCrud = useCrudModule('taches');
  const eventsCrud = useCrudModule('business_events');
  const cultures = arr(rows);
  const risks = cultures.map((row) => ({ row, risk: riskForCulture(row) })).filter((item) => item.risk.risky).slice(0, 6);
  const ready = cultures.map((row) => ({ row, risk: riskForCulture(row) })).filter((item) => item.risk.readyToHarvest).slice(0, 6);
  const totalExpected = cultures.reduce((sum, row) => sum + expectedHarvest(row), 0);
  const totalHarvested = cultures.reduce((sum, row) => sum + harvestedQty(row), 0);
  const totalMargin = cultures.reduce((sum, row) => sum + marginOf(row), 0);

  const createRiskFollowUp = async (row, risk) => {
    try {
      const taskId = makeId('TSK');
      const reason = risk.reasons.join(' · ') || 'Culture à suivre';
      await tachesCrud.create?.({
        id: taskId,
        title: `Suivi culture — ${cultureName(row)}`,
        module_lie: 'cultures',
        related_id: row.id,
        due_date: today(),
        priority: risk.high ? 'haute' : 'moyenne',
        status: 'a_faire',
        checklist: risk.readyToHarvest ? 'Vérifier maturité; Organiser récolte; Préparer stockage; Documenter quantité' : 'Contrôler parcelle; Vérifier eau/intrants; Noter action; Recontrôler',
        source_module: 'cultures',
        source_record_id: row.id,
      });
      await alertesCrud.create?.({
        id: makeId('ALT'),
        title: `Culture à suivre: ${cultureName(row)}`,
        message: reason,
        module_source: 'cultures',
        entity_type: 'culture',
        entity_id: row.id,
        severity: risk.high ? 'warning' : 'info',
        status: 'nouvelle',
        action_recommandee: risk.readyToHarvest ? 'Préparer la récolte et le stockage.' : 'Contrôler la parcelle et documenter l’action.',
      });
      await eventsCrud.create?.({
        id: makeId('EVT'),
        event_type: risk.readyToHarvest ? 'culture_recolte_a_preparer' : 'suivi_culture',
        module_source: 'cultures',
        entity_type: 'culture',
        entity_id: row.id,
        title: `Suivi culture ${cultureName(row)}`,
        description: reason,
        event_date: today(),
        severity: risk.high ? 'warning' : 'info',
        linked_task_id: taskId,
        saisies_evitees: 3,
      });
      await onUpdate?.(row.id, { last_followup_at: now(), last_followup_task_id: taskId, statut_suivi: risk.high ? 'a_risque' : 'a_suivre' });
      await Promise.allSettled([tachesCrud.refresh?.(), alertesCrud.refresh?.(), eventsCrud.refresh?.(), onRefresh?.()]);
      toast.success('Suivi culture créé');
    } catch (error) {
      toast.error(error.message || 'Suivi culture impossible');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Cultures connectées</p>
          <h3 className="font-black text-[#2f2415]">Récoltes, risques, stock et suivi</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <Box icon={Sprout} label="Prévu" value={fmtNumber(totalExpected)} />
          <Box icon={PackagePlus} label="Récolté" value={fmtNumber(totalHarvested)} />
          <Box icon={AlertTriangle} label="Risques" value={risks.length} />
          <Box icon={TrendingUp} label="Marge" value={fmtCurrency(totalMargin)} />
        </div>
      </div>

      {ready.length ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="font-bold text-emerald-800 mb-2"><CalendarClock size={14} className="inline" /> Récoltes à préparer</p>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
            {ready.map(({ row, risk }) => (
              <div key={row.id} className="rounded-xl border border-emerald-200 bg-white p-3">
                <p className="font-bold text-[#2f2415]">{cultureName(row)}</p>
                <p className="text-xs text-[#8a7456] mt-1">{parcelName(row)} · prévu {fmtNumber(risk.expected)}</p>
                <p className="mt-2 text-xs text-emerald-800">Récolte → onglet <b>Récoltes</b> (workflow officiel).</p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {risks.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
          {risks.map(({ row, risk }) => (
            <div key={row.id} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
              <p className="font-bold text-[#2f2415]"><AlertTriangle size={14} className="inline text-amber-600" /> {cultureName(row)}</p>
              <p className="text-xs text-[#8a7456] mt-1">{risk.reasons.join(' · ')}</p>
              <button type="button" className="mt-3 text-sm font-bold text-emerald-700" onClick={() => createRiskFollowUp(row, risk)}>Créer suivi</button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucune culture à risque détectée.</div>
      )}
    </div>
  );
}

function Box({ icon: Icon, label, value }) {
  return <div className="rounded-xl bg-[#fffdf8] border border-[#eadcc2] px-3 py-2 min-w-[96px]"><Icon size={14} className="text-[#9a6b12]" /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span></div>;
}
