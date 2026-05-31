import { CheckCircle2, Package, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const now = () => new Date().toISOString();
const today = () => now().slice(0, 10);
const clean = (value) => String(value || '').trim();
const productName = (row = {}) => row.produit || row.nom || row.name || row.id || 'Stock';
const categoryOf = (row = {}) => clean(row.categorie || row.category).toLowerCase();
const activityOf = (row = {}) => clean(row.activite_liee || row.activity || row.module_lie).toLowerCase();
const unitPriceOf = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price ?? row.prix_vente_unitaire);
const quantityOf = (row = {}) => toNumber(row.quantite ?? row.quantity);
const opportunityKey = (row = {}) => `stock:${clean(row.id)}`;
const terminalStatuses = ['epuise', 'épuisé', 'bloque', 'bloqué', 'perime', 'périmé', 'retourne', 'retourné', 'a_retourner', 'non_conforme'];
const sellableCategories = ['recolte', 'produit_fini', 'produits_recoltes', 'vente', 'fumier'];

function isFumierStock(row = {}) {
  const text = `${categoryOf(row)} ${activityOf(row)} ${clean(row.produit || row.name).toLowerCase()}`;
  return text.includes('fumier');
}

function isSellableStock(row = {}) {
  const status = clean(row.statut || row.stock_status || row.status).toLowerCase();
  if (!row.id || quantityOf(row) <= 0 || terminalStatuses.includes(status)) return false;
  return isFumierStock(row)
    || sellableCategories.some((value) => categoryOf(row).includes(value))
    || activityOf(row) === 'vente'
    || Boolean(row.vendable || row.pret_a_la_vente || row.ready_for_sale || row.sale_ready);
}

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
        title: `Stock vendable: ${productName(row)}`,
        product_name: productName(row),
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
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: existing?.id ? 'opportunite_vente_mise_a_jour' : 'opportunite_vente_creee', module_source: 'stock', entity_type: 'stock', entity_id: row.id, title: `Opportunité vente ${productName(row)}`, description: `${fmtNumber(qty)} ${row.unite || ''} · ${fmtCurrency(qty * unitPrice)}`, event_date: today(), severity: 'info', saisies_evitees: 2 });
      await Promise.allSettled([onRefresh?.(), onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
      toast.success(existing ? 'Opportunité stock mise à jour' : 'Opportunité stock créée');
    } catch {
      toast.error('Opportunité stock impossible');
    } finally {
      setSavingId('');
    }
  };

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Stock vendable</p>
          <h3 className="font-black text-[#2f2415]">Produits disponibles vers Ventes</h3>
          <p className="text-sm text-[#8a7456] mt-1">Un stock vendable peut devenir une opportunité de vente sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><Tag size={14} className="inline" /> {candidates.length} source(s)</div>
      </div>
      {candidates.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
          {candidates.map(({ row, existing }) => {
            const qty = quantityOf(row);
            const unitPrice = unitPriceOf(row);
            return (
              <div key={row.id} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
                <p className="font-bold text-[#2f2415]"><Package size={14} className="inline" /> {productName(row)}</p>
                <p className="text-xs text-[#8a7456] mt-1">{fmtNumber(qty)} {row.unite || ''} disponibles</p>
                <p className="text-xs text-[#8a7456] mt-1">Valeur estimée : <b>{fmtCurrency(qty * unitPrice)}</b></p>
                {existing ? <p className="text-xs text-emerald-700 mt-1">Opportunité existante : mise à jour</p> : null}
                <button type="button" disabled={savingId === row.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => createOpportunity(row)}><CheckCircle2 size={14} className="inline" /> {savingId === row.id ? 'Création...' : 'Créer opportunité'}</button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]"><CheckCircle2 size={14} className="inline" /> Aucun stock vendable à convertir.</div>
      )}
    </div>
  );
}
