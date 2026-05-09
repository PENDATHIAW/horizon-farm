import { CheckCircle2, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const terminalStatuses = ['vendu_totalement', 'vendu', 'cloture', 'clôturé', 'termine', 'terminé', 'archive', 'supprime', 'supprimé', 'perdu'];
const idOf = (lot = {}) => String(lot.id || '').trim();
const lotName = (lot = {}) => lot.name || lot.nom || lot.id || 'Lot avicole';
const initialCount = (lot = {}) => toNumber(lot.initial_count ?? lot.effectif_initial ?? lot.effectif_depart ?? lot.nombre_initial);
const activeCount = (lot = {}) => Math.max(0, initialCount(lot) - toNumber(lot.mortality ?? lot.morts) - toNumber(lot.voles ?? lot.volés) - toNumber(lot.vendus) - toNumber(lot.reformes ?? lot.réformés) - toNumber(lot.autres_sorties ?? lot.sorties));
const ageDays = (lot = {}) => {
  const start = lot.date_debut || lot.entry_date || lot.date_entree;
  if (!start) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(start).getTime()) / 86400000));
};
const saleConfirmed = (lot = {}) => Boolean(lot.pret_vente_confirme || lot.ready_for_sale || lot.sale_ready || lot.pret_a_la_vente || ['pret_a_la_vente', 'pret_a_vendre', 'pret_a_vendre_reforme', 'a_reformer'].includes(String(lot.status || lot.statut || '').toLowerCase()));
const isActiveLot = (lot = {}) => idOf(lot) && activeCount(lot) > 0 && !terminalStatuses.includes(String(lot.status || lot.statut || '').toLowerCase());
const opportunityKey = (lot = {}) => `avicole:${idOf(lot)}`;

function readiness(lot = {}) {
  if (!isActiveLot(lot)) return { ready: false, label: 'Indisponible', reason: 'Aucun effectif actif' };
  if (saleConfirmed(lot)) return { ready: true, confirmed: true, label: 'Prêt confirmé', reason: 'Confirmation enregistrée' };
  const age = ageDays(lot);
  const weight = toNumber(lot.weight_avg ?? lot.average_weight);
  if (lot.type === 'Chair' && age >= 30 && weight >= 1.5) return { ready: true, label: 'Prêt recommandé', reason: `${age} jours · ${weight.toFixed(2)} kg` };
  if (lot.type === 'Chair' && age >= 30) return { ready: true, label: 'À confirmer', reason: `${age} jours · poids à vérifier` };
  if (age >= 540 || String(lot.status || '').includes('reformer')) return { ready: true, label: 'Réforme possible', reason: `${age} jours` };
  return { ready: false, label: 'Non prêt', reason: `${age} jours` };
}

function existingOpportunityFor(lot, opportunities = []) {
  const id = idOf(lot);
  return arr(opportunities).find((opp) => String(opp.opportunity_key || '') === opportunityKey(lot))
    || arr(opportunities).find((opp) => String(opp.source_module || '') === 'avicole' && String(opp.source_id || opp.related_id || '') === id);
}

export default function AvicoleSaleReadinessBridge({ rows = [], opportunities = [], onUpdate, onRefresh, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingId, setSavingId] = useState('');
  const candidates = useMemo(() => arr(rows)
    .filter(isActiveLot)
    .map((lot) => ({ lot, state: readiness(lot), existing: existingOpportunityFor(lot, opportunities) }))
    .filter(({ state, existing, lot }) => state.ready && (!state.confirmed || !existing || String(existing.status || existing.statut || '').toLowerCase() !== 'ouverte'))
    .slice(0, 6), [rows, opportunities]);

  const confirmReady = async (lot, state) => {
    const id = idOf(lot);
    if (!id) return toast.error('Lot invalide');
    try {
      setSavingId(id);
      const qty = activeCount(lot);
      const unitPrice = toNumber(lot.prix_vente_prevu || lot.prix_vente_estime || lot.sale_price || lot.prix_unitaire_vente);
      const patch = {
        status: 'pret_a_la_vente',
        statut: 'pret_a_la_vente',
        pret_vente_confirme: true,
        pret_a_la_vente: true,
        ready_for_sale: true,
        sale_ready: true,
        sale_ready_confirmed_at: lot.sale_ready_confirmed_at || now(),
      };
      await onUpdate?.(id, patch);
      const payload = {
        opportunity_key: opportunityKey(lot),
        source_module: 'avicole',
        source_type: 'lot_avicole',
        source_id: id,
        related_id: id,
        title: `Lot avicole prêt à vendre: ${lotName(lot)}`,
        product_name: `${lotName(lot)} · ${lot.type || 'Lot avicole'}`,
        quantity: qty,
        unit: 'tete',
        unit_price: unitPrice,
        estimated_amount: Math.max(0, qty * unitPrice),
        status: 'ouverte',
        statut: 'ouverte',
        priority: state.confirmed ? 'haute' : 'moyenne',
        notes: state.reason || state.label,
        created_from: 'avicole',
        updated_at: now(),
      };
      const existing = existingOpportunityFor(lot, opportunities);
      if (existing?.id && onUpdateOpportunity) await onUpdateOpportunity(existing.id, payload);
      else await onCreateOpportunity?.({ id: makeId('OPP'), ...payload, created_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'avicole', entity_type: 'lot_avicole', entity_id: id, title: `Opportunité vente ${lotName(lot)}`, description: payload.product_name, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
      toast.success('Lot prêt à vendre confirmé');
    } catch {
      toast.error('Confirmation vente impossible');
    } finally {
      setSavingId('');
    }
  };

  if (!candidates.length) return null;
  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Vente avicole</p>
          <h3 className="font-black text-[#2f2415]">Lots prêts à vendre ou à confirmer</h3>
          <p className="text-sm text-[#8a7456] mt-1">La confirmation met à jour le lot et crée l’opportunité visible dans Ventes.</p>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><Tag size={14} className="inline" /> {candidates.length} lot(s)</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
        {candidates.map(({ lot, state, existing }) => (
          <div key={idOf(lot)} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
            <p className="font-bold text-[#2f2415]">{lotName(lot)}</p>
            <p className="text-xs text-[#8a7456] mt-1">{state.label} · {state.reason}</p>
            <p className="text-xs text-[#8a7456] mt-1">{fmtNumber(activeCount(lot))} sujets · valeur estimée {fmtCurrency(activeCount(lot) * toNumber(lot.prix_vente_prevu || lot.prix_vente_estime || lot.sale_price))}</p>
            {existing ? <p className="text-xs text-emerald-700 mt-1">Opportunité existante : mise à jour</p> : null}
            <button type="button" disabled={savingId === idOf(lot)} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => confirmReady(lot, state)}><CheckCircle2 size={14} className="inline" /> {savingId === idOf(lot) ? 'Confirmation...' : 'Confirmer vente'}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
