import { Truck, CheckCircle2, PackageCheck } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { buildSaleAssetPatch, cleanPatchForWrite } from '../services/saleAssetPatchService';
import { deliveryQuantity, enrichSalesOrderStatus } from '../utils/salesStatuses';
import { fmtNumber, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const label = (row = {}) => row.product_name || row.produit || row.libelle || row.title || row.id || 'Commande';
const sourceId = (row = {}) => row.source_id || row.product_id || row.entity_id || row.asset_id || row.stock_id || row.lot_id || row.animal_id || row.culture_id;
const sourceType = (row = {}) => String(row.source_type || row.type_vente || row.product_type || row.source_module || row.module_lie || '').toLowerCase();

function Field({ label, children }) { return <label className="text-xs font-bold text-[#8a7456] space-y-1"><span>{label}</span>{children}</label>; }
function Input(props) { return <input {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function Select(props) { return <select {...props} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-sm text-[#2f2415] outline-none focus:border-[#9a6b12]" />; }
function findAsset(activity, id, props) {
  const key = String(activity || '').toLowerCase();
  if (key.includes('animal')) return arr(props.animaux).find((row) => String(row.id) === String(id) || String(row.tag) === String(id));
  if (key.includes('avicole') || key.includes('lot')) return arr(props.lots).find((row) => String(row.id) === String(id));
  if (key.includes('culture')) return arr(props.cultures).find((row) => String(row.id) === String(id));
  return arr(props.stocks).find((row) => String(row.id) === String(id));
}
async function updateSourceAsset(activity, id, order, deliveredQty, props) {
  if (!id || deliveredQty <= 0) return;
  const baseAsset = findAsset(activity, id, props) || {};
  const patch = buildSaleAssetPatch({ ...baseAsset, ...order, quantite: deliveredQty, quantity: deliveredQty, source_id: id, stock_id: id }, activity);
  const finalPatch = cleanPatchForWrite(patch || {});
  if (activity.includes('animal')) return props.onUpdateAnimal?.(id, finalPatch);
  if (activity.includes('culture')) return props.onUpdateCulture?.(id, finalPatch);
  if (activity.includes('avicole') || activity.includes('lot')) return props.onUpdateLot?.(id, finalPatch);
  return props.onUpdateStock?.(id, finalPatch);
}

export default function SalesDeliveryControl(props) {
  const payments = arr(props.paymentsList || props.payments);
  const rows = useMemo(() => arr(props.rows).map((order) => enrichSalesOrderStatus(order, payments)), [props.rows, payments]);
  const openDeliveries = rows.filter((order) => !['livree', 'annulee'].includes(order.statut_livraison));
  const [form, setForm] = useState({ order_id: '', quantite_livree: '', date_livraison: today(), livreur: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const selected = openDeliveries.find((order) => String(order.id) === String(form.order_id));
  const q = selected ? deliveryQuantity(selected) : { ordered: 0, delivered: 0, remaining: 0 };
  const deliverQty = Math.min(q.remaining, toNumber(form.quantite_livree || q.remaining));
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const choose = (id) => { const order = openDeliveries.find((item) => String(item.id) === String(id)); const next = order ? deliveryQuantity(order) : { remaining: '' }; setForm((prev) => ({ ...prev, order_id: id, quantite_livree: next.remaining || '' })); };
  const submit = async () => {
    if (saving) return;
    if (!selected) return toast.error('Choisir une commande à livrer');
    if (deliverQty <= 0) return toast.error('Quantité à livrer invalide');
    if (deliverQty > q.remaining) return toast.error('Quantité supérieure au reste à livrer');
    try {
      setSaving(true);
      const nextDelivered = q.delivered + deliverQty;
      const nextRemaining = Math.max(0, q.ordered - nextDelivered);
      const deliveryStatus = nextRemaining <= 0 ? 'livree' : 'partielle';
      const orderStatus = nextRemaining <= 0 ? 'livree' : 'livree_partielle';
      const source = sourceId(selected);
      const activity = sourceType(selected) || 'stock';
      await updateSourceAsset(activity, source, selected, deliverQty, props);
      await props.onUpdate?.(selected.id, {
        quantite_livree: nextDelivered,
        delivered_qty: nextDelivered,
        reste_a_livrer: nextRemaining,
        statut_livraison: deliveryStatus,
        delivery_status: deliveryStatus,
        statut_commande: orderStatus,
        order_status: orderStatus,
        derniere_livraison_at: form.date_livraison || today(),
        last_delivery_qty: deliverQty,
        livreur: form.livreur,
        livraison_notes: form.notes,
      });
      await props.onCreateBusinessEvent?.({ id: makeId('DLV'), event_type: 'livraison_vente', module_source: 'ventes', entity_type: 'sales_order', entity_id: selected.id, title: `Livraison ${label(selected)}`, description: `${fmtNumber(deliverQty)} livré(s), reste ${fmtNumber(nextRemaining)}`, event_date: form.date_livraison || today(), severity: 'info', source_id: source, source_type: activity, saisies_evitees: 2 });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshBusinessEvents?.(), props.onRefreshStocks?.()]);
      toast.success(nextRemaining <= 0 ? 'Commande livrée totalement' : 'Livraison partielle enregistrée');
      setForm({ order_id: '', quantite_livree: '', date_livraison: today(), livreur: '', notes: '' });
    } catch (error) { toast.error(error.message || 'Livraison impossible'); } finally { setSaving(false); }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Truck size={20} /> Livraisons commandes</p><p className="mt-1 text-sm text-[#8a7456]">Suit les livraisons partielles ou complètes sans confondre paiement et livraison.</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm text-[#7d6a4a]"><b>{openDeliveries.length}</b> commande(s) à préparer/livrer</div></div>
    <div className="grid grid-cols-1 md:grid-cols-6 gap-2 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3"><Field label="Commande"><Select value={form.order_id} onChange={(e) => choose(e.target.value)}><option value="">Choisir</option>{openDeliveries.map((order) => <option key={order.id} value={order.id}>{label(order)} · reste {fmtNumber(order.reste_a_livrer)}</option>)}</Select></Field><Field label="Qté à livrer"><Input type="number" min="0" value={form.quantite_livree} onChange={(e) => set('quantite_livree', e.target.value)} /></Field><Field label="Date"><Input type="date" value={form.date_livraison} onChange={(e) => set('date_livraison', e.target.value)} /></Field><Field label="Livreur"><Input value={form.livreur} onChange={(e) => set('livreur', e.target.value)} /></Field><Field label="Notes"><Input value={form.notes} onChange={(e) => set('notes', e.target.value)} /></Field><div className="flex items-end"><button type="button" disabled={saving} onClick={submit} className="w-full rounded-xl bg-[#2f2415] text-white px-4 py-2 text-sm font-bold disabled:opacity-60"><PackageCheck size={14} className="inline" /> {saving ? 'Livraison...' : 'Enregistrer'}</button></div></div>
    {selected ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Commandé : <b>{fmtNumber(q.ordered)}</b> · déjà livré : <b>{fmtNumber(q.delivered)}</b> · reste : <b>{fmtNumber(q.remaining)}</b> · après action : <b>{fmtNumber(Math.max(0, q.remaining - deliverQty))}</b></div> : null}
  </section>;
}
