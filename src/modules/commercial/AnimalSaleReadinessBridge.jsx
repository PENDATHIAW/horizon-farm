import { CheckCircle2, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../../utils/format';
import { makeId } from '../../utils/ids';
import { getAnimalSaleReadiness } from '../../utils/animalSalePricing';
import { findSaleOpportunity, isSaleReady, saleOpportunityKey, saleReadyPatch } from '../../utils/saleReadiness';

const arr = (value) => (Array.isArray(value) ? value : []);
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const idOf = (row = {}) => String(row.id || '').trim();
const animalName = (row = {}) => row.name || row.nom || row.boucle_numero || row.id || 'Animal';
const isClosed = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'sorti'].some((word) => String(row.status || row.statut || '').toLowerCase().includes(word));

function readiness(animal = {}) {
  const state = getAnimalSaleReadiness({ animal, metrics: { totalCost: toNumber(animal.cout_total ?? animal.total_cost) } });
  if (isClosed(animal)) return { ready: false, label: 'Indisponible', reason: 'Animal sorti du cheptel' };
  if (isSaleReady(animal)) return { ready: true, confirmed: true, label: 'Prêt confirmé', reason: 'Confirmation enregistrée', state };
  if (state.recommended) return { ready: true, label: 'Prêt recommandé', reason: `${state.currentWeight || '-'} kg / objectif ${state.targetWeight || '-'} kg`, state };
  if (state.status === 'presque_pret') return { ready: true, label: 'Presque prêt', reason: `Progression ${state.targetProgress}%`, state };
  return { ready: false, label: 'Non prêt', reason: `Progression ${state.targetProgress}%`, state };
}

export default function AnimalSaleReadinessBridge({
  rows = [],
  opportunities = [],
  onUpdate,
  onRefresh,
  onCreateOpportunity,
  onUpdateOpportunity,
  onRefreshOpportunities,
  onCreateBusinessEvent,
  onRefreshBusinessEvents,
}) {
  const [savingId, setSavingId] = useState('');
  const candidates = useMemo(() => arr(rows)
    .filter((row) => !isClosed(row))
    .map((animal) => ({ animal, state: readiness(animal), existing: findSaleOpportunity({ sourceModule: 'animaux', id: idOf(animal), opportunities }) }))
    .filter(({ state, existing }) => state.ready && (!state.confirmed || !existing || String(existing.status || existing.statut || '').toLowerCase() !== 'ouverte'))
    .slice(0, 6), [rows, opportunities]);

  const confirmReady = async (animal, state) => {
    const id = idOf(animal);
    if (!id) return toast.error('Animal invalide');
    try {
      setSavingId(id);
      const pricing = state.state || getAnimalSaleReadiness({ animal });
      const unitPrice = toNumber(animal.prix_vente_estime || animal.prix_kg_estime || pricing.recommendedSalePrice);
      const patch = saleReadyPatch(animal, {
        poids_objectif: pricing.targetWeight,
        poids_actuel: pricing.currentWeight,
        prix_vente_estime: pricing.recommendedSalePrice || unitPrice,
      });
      await onUpdate?.(id, patch);
      const payload = {
        opportunity_key: saleOpportunityKey('animaux', id),
        source_module: 'animaux',
        source_type: 'animal',
        source_id: id,
        related_id: id,
        title: `Animal prêt à vendre: ${animalName(animal)}`,
        product_name: `${animalName(animal)} · ${animal.espece || animal.type || 'Cheptel'}`,
        quantity: 1,
        unit: 'tete',
        unit_price: unitPrice,
        estimated_amount: Math.max(0, unitPrice),
        status: 'ouverte',
        statut: 'ouverte',
        priority: state.confirmed ? 'haute' : 'moyenne',
        notes: `${state.reason || state.label} · prix recommandé ${fmtCurrency(pricing.recommendedSalePrice || unitPrice)}`,
        created_from: 'animaux',
        updated_at: now(),
      };
      const existing = findSaleOpportunity({ sourceModule: 'animaux', id, opportunities });
      if (existing?.id && onUpdateOpportunity) await onUpdateOpportunity(existing.id, payload);
      else await onCreateOpportunity?.({ id: makeId('OPP'), ...payload, created_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'animaux', entity_type: 'animal', entity_id: id, title: `Opportunité vente ${animalName(animal)}`, description: payload.product_name, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
      toast.success('Animal prêt à vendre confirmé');
    } catch {
      toast.error('Confirmation vente impossible');
    } finally {
      setSavingId('');
    }
  };

  if (!candidates.length) return null;
  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">Vente cheptel</p>
          <h3 className="font-semibold text-earth">Animaux prêts à vendre ou à confirmer</h3>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate"><Tag size={14} className="inline" /> {candidates.length} tête(s)</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {candidates.map(({ animal, state, existing }) => (
          <div key={idOf(animal)} className="rounded-xl border border-line bg-card p-3">
            <p className="font-semibold text-earth">{animalName(animal)}</p>
            <p className="text-xs text-slate mt-1">{state.label} · {state.reason}</p>
            <p className="text-xs text-slate mt-1">Poids {fmtNumber(state.state?.currentWeight || animal.poids || 0)} kg</p>
            {existing ? <p className="text-xs text-positive mt-1">Opportunité existante : mise à jour</p> : null}
            <button type="button" disabled={savingId === idOf(animal)} className="mt-3 text-sm font-semibold text-positive disabled:opacity-60" onClick={() => confirmReady(animal, state)}>
              <CheckCircle2 size={14} className="inline" /> {savingId === idOf(animal) ? 'Confirmation...' : 'Confirmer vente'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
