import { CheckCircle2, RefreshCw, ShoppingCart, Tag } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { deriveSalesOpportunities, isOpenSalesOpportunity, salesOpportunityAmount, salesOpportunityKey } from '../utils/salesOpportunityDerivation';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const clean = (value) => String(value || '').trim();

function sourceKey(row = {}) {
  return `${clean(row.source_module || row.created_from || row.module_source)}:${clean(row.source_id || row.related_id || row.entity_id)}`;
}

function orderLinkedToOpportunity(order = {}, opp = {}) {
  const oppId = clean(opp.id);
  const key = salesOpportunityKey(opp);
  const orderKey = `${clean(order.source_module || order.created_from || order.module_source)}:${clean(order.source_id || order.related_id || order.entity_id)}`;
  return clean(order.opportunity_id) === oppId
    || clean(order.source_opportunity_id) === oppId
    || clean(order.opportunity_key) === key
    || (key && orderKey === key)
    || (sourceKey(opp) && orderKey === sourceKey(opp));
}

function quantityOf(opp = {}) {
  return Math.max(1, toNumber(opp.quantity ?? opp.quantite ?? 1));
}

function unitPriceOf(opp = {}) {
  const qty = quantityOf(opp);
  const price = toNumber(opp.unit_price ?? opp.prix_unitaire ?? opp.prix_vente ?? 0);
  if (price > 0) return price;
  return Math.round(salesOpportunityAmount(opp) / Math.max(1, qty));
}

function labelOf(opp = {}) {
  return opp.title || opp.product_name || opp.nom || opp.name || opp.id || 'Opportunité';
}

function sourceLabel(opp = {}) {
  const source = clean(opp.source_module || opp.created_from || opp.module_source || 'vente');
  if (source === 'animaux') return 'Animal';
  if (source === 'avicole') return 'Avicole';
  if (source === 'cultures') return 'Culture';
  if (source === 'stock') return 'Stock';
  return source;
}

export default function SalesOpportunitiesBridge({
  opportunities = [], rows = [], clients = [], lots = [], animaux = [], cultures = [], stocks = [],
  onCreate, onRefresh, onCreateOpportunity, onUpdateOpportunity, onRefreshOpportunities, onCreateBusinessEvent, onRefreshBusinessEvents,
}) {
  const [savingId, setSavingId] = useState('');
  const active = useMemo(() => deriveSalesOpportunities({ opportunities, lots, animaux, cultures, stocks })
    .filter(isOpenSalesOpportunity)
    .map((opp) => ({ opp, order: arr(rows).find((order) => orderLinkedToOpportunity(order, opp)) }))
    .slice(0, 12), [opportunities, lots, animaux, cultures, stocks, rows]);

  const persistDerivedOpportunity = async (opp) => {
    if (!opp.is_derived) return opp;
    const payload = { ...opp, id: makeId('OPP'), is_derived: false, created_at: now(), updated_at: now() };
    await onCreateOpportunity?.(payload);
    return payload;
  };

  const convertToOrder = async (inputOpp) => {
    if (!inputOpp?.id) return toast.error('Opportunité invalide');
    const existing = arr(rows).find((order) => orderLinkedToOpportunity(order, inputOpp));
    if (existing) return toast.success('Commande déjà créée pour cette opportunité');
    try {
      setSavingId(inputOpp.id);
      const opp = await persistDerivedOpportunity(inputOpp);
      const quantity = quantityOf(opp);
      const unitPrice = unitPriceOf(opp);
      const total = Math.max(0, salesOpportunityAmount(opp) || quantity * unitPrice);
      const sourceModule = clean(opp.source_module || opp.created_from || opp.module_source || 'opportunites');
      const sourceId = clean(opp.source_id || opp.related_id || opp.entity_id || opp.id);
      const orderId = makeId('CMD');
      await onCreate?.({
        id: orderId,
        date: today(),
        client_id: clean(opp.client_id),
        opportunity_id: opp.id,
        source_opportunity_id: opp.id,
        opportunity_key: salesOpportunityKey(opp),
        source_module: sourceModule,
        source_type: clean(opp.source_type || sourceModule),
        source_id: sourceId,
        related_id: sourceId,
        product_name: opp.product_name || labelOf(opp),
        quantity,
        unit: opp.unit || opp.unite || 'unite',
        unit_price: unitPrice,
        montant_total: total,
        total,
        montant_paye: 0,
        reste_a_payer: total,
        statut_commande: 'enregistree',
        statut_paiement: 'non_paye',
        notes: opp.notes || `Commande créée depuis opportunité ${opp.id}`,
        created_from: 'sales_opportunity',
        created_at: now(),
      });
      await onUpdateOpportunity?.(opp.id, { status: 'convertie', statut: 'convertie', converted_order_id: orderId, converted_at: now() });
      await onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'opportunite_convertie_commande', module_source: 'ventes', entity_type: 'sales_opportunity', entity_id: opp.id, title: `Commande créée depuis ${labelOf(opp)}`, description: `${sourceLabel(opp)} · ${fmtCurrency(total)}`, event_date: today(), severity: 'info', linked_order_id: orderId, saisies_evitees: 4 });
      await Promise.allSettled([onRefresh?.(), onRefreshOpportunities?.(), onRefreshBusinessEvents?.()]);
      toast.success('Commande créée depuis l’opportunité');
    } catch {
      toast.error('Conversion opportunité impossible');
    } finally {
      setSavingId('');
    }
  };

  if (!active.length) return null;

  return (
    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-5 space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Opportunités de vente</p>
          <h3 className="font-black text-[#2f2415]">Sources prêtes à vendre</h3>
          <p className="text-sm text-[#8a7456] mt-1">Animaux, lots avicoles, cultures ou stocks confirmés peuvent devenir une commande sans ressaisie.</p>
        </div>
        <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#7d6a4a]"><Tag size={14} className="inline" /> {active.length} opportunité(s)</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
        {active.map(({ opp, order }) => {
          const total = salesOpportunityAmount(opp);
          const client = arr(clients).find((c) => clean(c.id) === clean(opp.client_id));
          return (
            <div key={opp.id || salesOpportunityKey(opp)} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3">
              <p className="font-bold text-[#2f2415]"><ShoppingCart size={14} className="inline" /> {labelOf(opp)}</p>
              <p className="text-xs text-[#8a7456] mt-1">{sourceLabel(opp)} · {fmtNumber(quantityOf(opp))} {opp.unit || opp.unite || ''}{opp.is_derived ? ' · détectée' : ''}</p>
              <p className="text-xs text-[#8a7456] mt-1">Valeur estimée : <b>{fmtCurrency(total)}</b></p>
              <p className="text-xs text-[#8a7456] mt-1">Client : {client?.nom || client?.name || opp.client_id || 'à renseigner'}</p>
              {order ? <p className="mt-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={14} className="inline" /> Commande {order.id}</p> : (
                <button type="button" disabled={savingId === opp.id} className="mt-3 text-sm font-bold text-emerald-700 disabled:opacity-60" onClick={() => convertToOrder(opp)}>
                  {savingId === opp.id ? <RefreshCw size={14} className="inline animate-spin" /> : <CheckCircle2 size={14} className="inline" />} Créer commande
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
