import { CheckCircle2, PackagePlus, Sprout, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value) => String(value || '').trim();
const cultureName = (row = {}) => row.nom || row.culture || row.type || row.id || 'Culture';
const parcelName = (row = {}) => row.parcelle_code || row.parcelle_nom || row.parcelle || 'Parcelle non renseignée';
const harvestQty = (row = {}) => toNumber(row.quantite_disponible ?? row.quantite_recoltee ?? row.harvested_qty ?? row.production_disponible);
const soldQty = (row = {}) => toNumber(row.quantite_vendue ?? row.sold_qty ?? row.vendue);
const availableQty = (row = {}) => Math.max(0, harvestQty(row) - soldQty(row));
const unitOf = (row = {}) => row.unite_recolte || row.unite_production || row.unite || 'kg';
const unitPriceOf = (row = {}) => {
  const direct = toNumber(row.prix_vente_unitaire || row.prix_vente_kg || row.prix_unitaire_estime || row.prix_unitaire);
  if (direct > 0) return direct;
  const revenue = toNumber(row.revenu_reel || row.revenu_estime);
  const qty = harvestQty(row);
  return qty > 0 ? Math.round(revenue / qty) : 0;
};
const isSellable = (row = {}) => {
  const status = clean(row.statut || row.status || '').toLowerCase();
  return availableQty(row) > 0 && !['perdu', 'annule', 'annulé', 'archive', 'vendu'].includes(status);
};
const opportunityKey = (row = {}) => `cultures:${clean(row.id)}`;
function existingOpportunityFor(row, opportunities = []) {
  const id = clean(row.id);
  return arr(opportunities).find((opp) => clean(opp.opportunity_key) === opportunityKey(row))
    || arr(opportunities).find((opp) => clean(opp.source_module) === 'cultures' && clean(opp.source_id || opp.related_id) === id);
}

export default function CulturesSaleOpportunityBridge({ rows = [], opportunities = [], onUpdate, onRefresh, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingId, setSavingId] = useState('');
  const candidates = useMemo(() => arr(rows)
    .filter(isSellable)
    .map((row) => ({ row, existing: existingOpportunityFor(row, opportunities) }))
    .filter(({ existing }) => !existing || !['ouverte', 'active'].includes(clean(existing.status || existing.statut).toLowerCase()))
    .slice(0, 8), [rows, opportunities]);

  const createOrUpdateOpportunity = async (row) => {
    if (!row?.id) return toast.error('Culture invalide');
    if (!onCreateOpportunity) return toast.error('Création opportunité indisponible');
    try {
      setSavingId(row.id);
      const qty = availableQty(row);
      const unitPrice = unitPriceOf(row);
      const payload = {
        opportunity_key: opportunityKey(row),
        source_module: 'cultures',
        source_type: 'culture',
        source_id: row.id,
        related_id: row.id,
        title: `Récolte vendable: ${cultureName(row)}`,
        product_name: `${cultureName(row)} · ${parcelName(row)}`,
        quantity: qty,
        unit: unitOf(row),
        unit_price: unitPrice,
        estimated_amount: Math.max(0, qty * unitPrice),
        status: 'ouverte',
        statut: 'ouverte',
        priority: 'moyenne',
        notes: `Récolte disponible ${fmtNumber(qty)} ${unitOf(row)}`,
        created_from: 'cultures',
        updated_at: now(),
      };
      const existing = existingOpportunityFor(row, opportunities);
      if (existing?.id && onUpdateOpportunity) await onUpdateOpportunity(existing.id, payload);
      else await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: now() });
      await onUpdate?.(row.id, {
        vendable: true,
        pret_a_la_vente: true,
        ready_for_sale: true,
        sale_ready: true,
        sale_ready_confirmed_at: row.sale_ready_confirmed_at || now(),
        last_sale_opportunity_at: now(),
      });
      await onCreateBusinessEvent?.({
        id: makeId('EVT'),
        event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee',
        module_source: 'cultures',
        entity_type: 'culture',
        entity_id: row.id,
        title: `Opportunité vente ${cultureName(row)}`,
        description: `${fmtNumber(qty)} ${unitOf(row)} · ${fmtCurrency(qty * unitPrice)}`,
        event_date: today(),
        severity: 'info',
        saisies_evitees: 2,
      });
      await Promise.allSettled([onRefresh?.(), onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
      toast.success('Opportunité culture créée');
    } catch {
      toast.error('Opportunité culture impossible');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Cultures vendables</p>
          <h3 className="font-black text-[#2f2415]">Récoltes disponibles vers Ventes</h3>
          <p className="text-sm text-[#8a7456] mt-1">Une récolte disponible peut devenir une opportunité puis une commande sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><Sprout size={14} className="inline" /> {candidates.length} source(s)</div>
      </div>
      {candidates.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {candidates.map(({ row, existing }) => {
            const qty = availableQty(row);
            const unitPrice = unitPriceOf(row);
            return (
              <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                <p className="font-bold text-[#2f2415]"><PackagePlus size={14} className="inline" /> {cultureName(row)}</p>
                <p className="text-xs text-[#8a7456] mt-1">{parcelName(row)} · {fmtNumber(qty)} {unitOf(row)}</p>
                <p className="text-xs text-[#8a7456] mt-1">Valeur estimée : <b>{fmtCurrency(qty * unitPrice)}</b></p>
                {existing ? <p className="text-xs text-emerald-700 mt-1">Opportunité existante : mise à jour</p> : null}
                <button type="button" disabled={savingId === row.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => createOrUpdateOpportunity(row)}><CheckCircle2 size={14} className="inline" /> {savingId === row.id ? 'Création...' : 'Créer opportunité'}</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><Tag size={14} className="inline" /> Aucune récolte vendable à convertir.</div>
      )}
    </div>
  );
}
