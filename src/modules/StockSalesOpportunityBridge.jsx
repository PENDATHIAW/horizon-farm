import { CheckCircle2, Package, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import {
  isSellableStock,
  productNameOf,
  quantityOf,
  unitPriceOf,
} from '../utils/sellableStock.js';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const clean = (value) => String(value || '').trim();
const opportunityKey = (row = {}) => `stock:${clean(row.id)}`;

function existingOpportunityFor(row, opportunities = []) {
  const id = clean(row.id);
  return arr(opportunities).find((opp) => clean(opp.opportunity_key) === opportunityKey(row))
    || arr(opportunities).find((opp) => clean(opp.source_module) === 'stock' && clean(opp.source_id || opp.related_id) === id);
}

export default function StockSalesOpportunityBridge({ rows = [], opportunities = [], onUpdate, onRefresh, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents }) {
  const [savingId, setSavingId] = useState('');
  const candidates = useMemo(() => arr(rows)
    .filter(isSellableStock)
    .map((row) => ({ row, existing: existingOpportunityFor(row, opportunities) }))
    .filter(({ existing }) => !existing || !['ouverte', 'active'].includes(clean(existing.status || existing.statut).toLowerCase()))
    .slice(0, 8), [rows, opportunities]);

  const createOpportunity = async (row) => {
    if (!row?.id) return toast.error('Stock invalide');
    if (!onCreateOpportunity) return toast.error('Création opportunité indisponible');
    try {
      setSavingId(row.id);
      const qty = quantityOf(row);
      const unitPrice = unitPriceOf(row);
      const payload = {
        opportunity_key: opportunityKey(row),
        source_module: 'stock',
        source_type: 'stock',
        source_id: row.id,
        related_id: row.id,
        title: `Stock vendable: ${productNameOf(row)}`,
        product_name: productNameOf(row),
        quantity: qty,
        unit: row.unite || row.unit || 'unite',
        unit_price: unitPrice,
        estimated_amount: Math.max(0, qty * unitPrice),
        status: 'ouverte',
        statut: 'ouverte',
        priority: 'moyenne',
        notes: `Stock disponible ${fmtNumber(qty)} ${row.unite || ''}`,
        created_from: 'stock',
        updated_at: now(),
      };
      const existing = existingOpportunityFor(row, opportunities);
      if (existing?.id && onUpdateOpportunity) await onUpdateOpportunity(existing.id, payload);
      else await onCreateOpportunity({ id: makeId('OPP'), ...payload, created_at: now() });
      await onUpdate?.(row.id, { vendable: true, pret_a_la_vente: true, ready_for_sale: true, sale_ready: true, last_sale_opportunity_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Opportunité vente ${productNameOf(row)}`, description: `${fmtNumber(qty)} ${row.unite || ''} · ${fmtCurrency(qty * unitPrice)}`, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
      toast.success(existing ? 'Opportunité stock mise à jour' : 'Opportunité stock créée');
    } catch {
      toast.error('Opportunité stock impossible');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="rounded-2xl border border-line bg-white p-6 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-normal text-slate">Stock vendable</p>
          <h3 className="font-semibold text-earth">Produits disponibles vers Ventes</h3>
          <p className="text-sm text-slate mt-1">Un stock vendable peut devenir une opportunité de vente sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-slate"><Tag size={14} className="inline" /> {candidates.length} source(s)</div>
      </div>
      {candidates.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {candidates.map(({ row, existing }) => {
            const qty = quantityOf(row);
            const unitPrice = unitPriceOf(row);
            return (
              <div key={row.id} className="rounded-xl border border-line bg-card p-3">
                <p className="font-semibold text-earth"><Package size={14} className="inline" /> {productNameOf(row)}</p>
                <p className="text-xs text-slate mt-1">{fmtNumber(qty)} {row.unite || ''} disponibles</p>
                <p className="text-xs text-slate mt-1">Valeur estimée : <b>{fmtCurrency(qty * unitPrice)}</b></p>
                {existing ? <p className="text-xs text-positive mt-1">Opportunité existante : mise à jour</p> : null}
                <button type="button" disabled={savingId === row.id} className="mt-3 text-sm font-semibold text-positive disabled:opacity-60" onClick={() => createOpportunity(row)}><CheckCircle2 size={14} className="inline" /> {savingId === row.id ? 'Création...' : 'Créer opportunité'}</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-card p-3 text-sm text-slate"><CheckCircle2 size={14} className="inline" /> Aucun stock vendable à convertir.</div>
      )}
    </div>
  );
}
