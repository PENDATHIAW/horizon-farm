import { CheckCircle2, CreditCard, Eye, FileText, Plus, RefreshCw, ShoppingCart, TrendingUp, Truck, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const paymentMethods = [
  { value: 'especes', label: 'Espèces' },
  { value: 'wave', label: 'Wave' },
  { value: 'orange_money', label: 'Orange Money' },
  { value: 'virement', label: 'Virement' },
  { value: 'cheque', label: 'Chèque' },
];
const productTypes = {
  lot_avicole: 'Lot avicole',
  animal: 'Animal',
  stock: 'Stock vendable',
  culture: 'Culture / récolte',
  autre: 'Autre vente',
};
const unitsByType = { lot_avicole: 'tête', animal: 'tête', stock: 'unité', culture: 'kg', autre: 'unité' };
const internalStockWords = ['aliment', 'vaccin', 'médicament', 'medicament', 'antibiotique', 'désinfectant', 'desinfectant', 'vétérinaire', 'veterinaire'];
const isSellableStock = (stock = {}) => {
  if (stock.is_sellable === true || stock.vendable === true) return true;
  const text = `${stock.produit || ''} ${stock.nom || ''} ${stock.categorie || ''} ${stock.category || ''}`.toLowerCase();
  return !internalStockWords.some((word) => text.includes(word));
};
const clientName = (clients = [], id) => arr(clients).find((c) => String(c.id) === String(id))?.nom || arr(clients).find((c) => String(c.id) === String(id))?.name || id || 'Client non renseigné';
const paymentAmount = (payment = {}) => Number(payment.montant_paye ?? payment.montant ?? payment.amount ?? 0) || 0;
const orderAmount = (order = {}) => Number(order.montant_total ?? order.total ?? order.amount ?? 0) || 0;
const paidForOrder = (order, payments = []) => Math.max(Number(order.montant_paye || 0), arr(payments).filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(order.id)).reduce((sum, p) => sum + paymentAmount(p), 0));

function FichePopup({ type, item, onClose }) {
  if (!item) return null;
  const rows = Object.entries(item).slice(0, 14);
  return <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"><div className="w-full max-w-sm rounded-2xl border border-[#eadcc2] bg-white p-4 shadow-2xl"><div className="flex items-center justify-between"><p className="font-black text-[#2f2415]">Fiche {productTypes[type] || type}</p><button type="button" onClick={onClose}><X size={16} /></button></div><div className="mt-3 max-h-80 overflow-auto space-y-1 text-xs">{rows.map(([k, v]) => <div key={k} className="flex justify-between gap-3 border-b border-[#eadcc2]/60 py-1"><span className="font-bold text-[#8a7456]">{k}</span><span className="text-right text-[#2f2415]">{String(v ?? '—')}</span></div>)}</div></div></div>;
}

function buildOptions(type, props) {
  if (type === 'lot_avicole') return arr(props.lots).filter((l) => !['vendu', 'termine', 'terminé', 'perdu'].includes(String(l.status || l.statut || '').toLowerCase())).map((l) => ({ value: l.id, item: l, label: `${l.id} · ${l.name || l.batch_name || l.type || 'Lot'} · ${Number(l.current_count ?? l.initial_count ?? 0)} sujets`, qty: Number(l.current_count ?? l.initial_count ?? 0), price: Number(l.prix_vente_prevu || 0), name: `${l.id} ${l.type || 'lot'}` }));
  if (type === 'animal') return arr(props.animaux).filter((a) => !['vendu', 'mort', 'vole', 'volé'].includes(String(a.status || '').toLowerCase())).map((a) => ({ value: a.id, item: a, label: `${a.id} · ${a.name || a.type || 'Animal'}`, qty: 1, price: Number(a.prix_vente_estime || a.sale_price || a.purchase_cost || 0), name: a.name || a.id }));
  if (type === 'stock') return arr(props.stocks).filter((s) => Number(s.quantite || 0) > 0 && isSellableStock(s)).map((s) => ({ value: s.id, item: s, label: `${s.produit || s.nom || s.id} · ${s.quantite} ${s.unite || ''}`, qty: Number(s.quantite || 0), price: Number(s.prixunit || s.prixUnit || s.prix_unitaire || 0), name: s.produit || s.nom || s.id, unit: s.unite || 'unité' }));
  if (type === 'culture') return arr(props.cultures).filter((c) => Number(c.quantite_disponible ?? c.quantite_recoltee ?? 0) > 0).map((c) => ({ value: c.id, item: c, label: `${c.culture || c.nom || c.id} · ${c.quantite_disponible ?? c.quantite_recoltee} ${c.unite || 'kg'}`, qty: Number(c.quantite_disponible ?? c.quantite_recoltee ?? 0), price: Number(c.prix_vente_kg || 0), name: c.culture || c.nom || c.id, unit: c.unite || 'kg' }));
  return [];
}

function getAvailable(type, sourceId, props) {
  const option = buildOptions(type, props).find((o) => String(o.value) === String(sourceId));
  if (type === 'autre') return Infinity;
  return option?.qty || 0;
}

function getSourceLabel(type, sourceId, props) {
  return buildOptions(type, props).find((o) => String(o.value) === String(sourceId))?.name || sourceId || '';
}

function SimpleSaleModal({ props, prefill, onClose, onDone }) {
  const initialType = prefill?.source_type === 'lot' ? 'lot_avicole' : (prefill?.source_type || 'lot_avicole');
  const [form, setForm] = useState({
    date: today(),
    client_id: prefill?.client_id || '',
    source_type: initialType,
    source_id: prefill?.source_id || '',
    product_name: prefill?.product_name || '',
    quantity: prefill?.quantity || 1,
    unit_price: prefill?.unit_price || 0,
    discount: 0,
    payment_status: 'paye',
    paid_amount: '',
    payment_method: 'especes',
    fulfillment_mode: 'recupere',
    delivery_fee: 0,
    invoice_issued: true,
    notes: prefill?.notes || '',
  });
  const [fiche, setFiche] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const options = useMemo(() => buildOptions(form.source_type, props), [form.source_type, props]);
  const selected = options.find((o) => String(o.value) === String(form.source_id));
  const available = form.source_type === 'autre' ? Infinity : (selected?.qty || 0);
  const deliveryFee = form.fulfillment_mode === 'livraison' ? Number(form.delivery_fee || 0) : 0;
  const productTotal = Math.max(0, Number(form.quantity || 0) * Number(form.unit_price || 0) - Number(form.discount || 0));
  const grandTotal = productTotal + deliveryFee;
  const paidAmount = form.payment_status === 'paye' ? grandTotal : form.payment_status === 'partiel' ? Number(form.paid_amount || 0) : 0;
  const remaining = Math.max(0, grandTotal - paidAmount);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changeType = (type) => setForm((prev) => ({ ...prev, source_type: type, source_id: '', product_name: '', quantity: 1, unit_price: 0 }));
  const changeSource = (id) => {
    const option = options.find((o) => String(o.value) === String(id));
    setForm((prev) => ({ ...prev, source_id: id, product_name: option?.name || '', unit_price: option?.price || 0, quantity: prev.source_type === 'animal' ? 1 : (prefill?.quantity || prev.quantity || 1) }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setError('');
    if (!form.date) return setError('Date obligatoire.');
    if (form.source_type !== 'autre' && !form.source_id) return setError('Choisis le produit vendu.');
    if (Number(form.quantity || 0) <= 0) return setError('Quantité invalide.');
    if (form.source_type !== 'autre' && Number(form.quantity) > available) return setError(`Quantité disponible : ${available}.`);
    if (form.source_type === 'animal' && Number(form.quantity) !== 1) return setError('Un animal se vend à l’unité.');
    if (form.payment_status === 'partiel' && (paidAmount <= 0 || paidAmount >= grandTotal)) return setError('Pour un paiement partiel, le montant doit être inférieur au total et supérieur à 0.');
    try {
      setSaving(true);
      const orderId = makeId('CMD');
      const invoiceId = form.invoice_issued ? makeId('FAC') : '';
      const deliveryId = makeId('LIV');
      const paymentId = paidAmount > 0 ? makeId('PAY') : '';
      const transactionId = paidAmount > 0 ? makeId('TRX') : '';
      const productName = form.product_name || getSourceLabel(form.source_type, form.source_id, props) || 'Produit vendu';
      const orderPayload = {
        id: orderId,
        date: form.date,
        client_id: form.client_id || null,
        type_document: 'commande',
        statut_commande: 'livre',
        statut_livraison: form.fulfillment_mode === 'livraison' ? 'livre' : 'recupere',
        fulfillment_mode: form.fulfillment_mode,
        statut_paiement: form.payment_status,
        montant_ht: productTotal,
        remise: Number(form.discount || 0),
        frais_livraison: deliveryFee,
        delivery_fee: deliveryFee,
        montant_total: grandTotal,
        montant_paye: paidAmount,
        reste_a_payer: remaining,
        moyen_paiement: paidAmount > 0 ? form.payment_method : '',
        payment_method: paidAmount > 0 ? form.payment_method : '',
        invoice_id: invoiceId,
        invoice_status: form.invoice_issued ? 'emise' : 'non_emise',
        facture_emise: form.invoice_issued,
        source_type: form.source_type,
        source_id: form.source_id || null,
        source_label: productName,
        product_name: productName,
        quantity: Number(form.quantity),
        unit_price: Number(form.unit_price),
        notes: form.notes || null,
        opportunity_id: prefill?.opportunity_id || '',
      };
      await props.onCreate?.(orderPayload);
      await props.onCreateItem?.({ id: makeId('CMDI'), order_id: orderId, source_type: form.source_type, source_id: form.source_id || null, item_type: form.source_type, product_name: productName, label: productName, quantity: Number(form.quantity), unit: selected?.unit || unitsByType[form.source_type] || 'unité', unit_price: Number(form.unit_price), discount: Number(form.discount || 0), total: productTotal, line_total: productTotal, available_quantity_snapshot: form.source_type === 'autre' ? null : getAvailable(form.source_type, form.source_id, props) });
      await applySourceImpact({ props, orderId, form, total: productTotal });
      await props.onCreateDelivery?.({ id: deliveryId, order_id: orderId, date_livraison: form.date, statut: 'livre', mode_livraison: form.fulfillment_mode, fulfillment_mode: form.fulfillment_mode, frais_livraison: deliveryFee, destinataire: clientName(props.clients, form.client_id), notes: form.fulfillment_mode === 'livraison' ? 'Livré le jour de la vente' : 'Récupéré par le client' });
      if (form.invoice_issued) {
        await props.onCreateInvoice?.({ id: invoiceId, order_id: orderId, numero_facture: `FAC-${orderId.slice(-6)}`, date_facture: form.date, montant_total: grandTotal, statut: 'emise', invoice_status: 'emise' });
        await props.onCreateDocument?.({ id: makeId('DOC'), title: `Facture FAC-${orderId.slice(-6)}`, document_category: 'facture', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, related_id: orderId, invoice_id: invoiceId, status: 'emise', amount: grandTotal });
      }
      if (paidAmount > 0) {
        await props.onCreatePayment?.({ id: paymentId, order_id: orderId, sale_id: orderId, source_record_id: orderId, client_id: form.client_id || '', invoice_id: invoiceId, date_paiement: form.date, date: form.date, montant: paidAmount, montant_paye: paidAmount, amount: paidAmount, moyen_paiement: form.payment_method, mode_paiement: form.payment_method, statut: 'paye', notes: remaining > 0 ? 'Paiement partiel saisi avec la vente' : 'Paiement complet saisi avec la vente' });
        await props.onCreateFinanceTransaction?.({ id: transactionId, type: 'entree', libelle: `${remaining > 0 ? 'Acompte' : 'Encaissement'} ${orderId} - ${clientName(props.clients, form.client_id)}`, montant: paidAmount, date: form.date, categorie: 'Vente', module_lie: 'ventes', related_id: orderId, vente_id: orderId, client_id: form.client_id || '', statut: remaining > 0 ? 'partiel' : 'paye', source_module: 'ventes', source_record_id: orderId, source_type: form.source_type, source_id: form.source_id || '', invoice_id: invoiceId, payment_id: paymentId, moyen_paiement: form.payment_method });
      }
      if (remaining > 0) {
        await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Créance client ${orderId} - ${clientName(props.clients, form.client_id)}`, montant: remaining, date: form.date, categorie: 'Creance client', module_lie: 'ventes', related_id: orderId, vente_id: orderId, client_id: form.client_id || '', statut: 'impaye', reste_a_payer: remaining, source_module: 'ventes', source_record_id: orderId });
      }
      await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'vente_directe', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, title: `Vente ${productName} - ${fmtCurrency(grandTotal)}`, description: `${form.fulfillment_mode === 'livraison' ? 'Livré' : 'Récupéré'} · facture ${form.invoice_issued ? 'émise' : 'non émise'} · paiement ${form.payment_status}`, amount: grandTotal, event_date: form.date, linked_sale_id: orderId, linked_invoice_id: invoiceId || null, linked_transaction_id: transactionId || null, severity: 'info' });
      if (prefill?.opportunity_id && !String(prefill.opportunity_id).startsWith('auto-')) await props.onUpdateOpportunity?.(prefill.opportunity_id, { status: 'converti', converted_sale_id: orderId, converted_at: new Date().toISOString() });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshInvoices?.(), props.onRefreshPayments?.(), props.onRefreshDocuments?.(), props.onRefreshFinances?.(), props.onRefreshBusinessEvents?.(), props.onRefreshOpportunities?.(), props.onRefreshStocks?.(), props.onRefreshLots?.(), props.onRefreshAnimals?.(), props.onRefreshCultures?.()]);
      onDone?.(orderId);
    } catch (error) {
      setError(error.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border border-[#eadcc2] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#eadcc2] p-5"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Vente terrain</p><h2 className="text-xl font-black text-[#2f2415]">Saisir une vente en une seule fois</h2><p className="text-sm text-[#8a7456] mt-1">Commande, paiement, facture, retrait/livraison et traçabilité sont créés ensemble.</p></div><button type="button" onClick={onClose}><X size={18} /></button></div><form onSubmit={submit} className="p-5 space-y-4">{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}<div className="grid grid-cols-2 md:grid-cols-5 gap-2">{Object.entries(productTypes).map(([key, label]) => <button key={key} type="button" onClick={() => changeType(key)} className={`rounded-xl border px-3 py-2 text-xs font-black ${form.source_type === key ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'}`}>{label}</button>)}</div>{form.source_type !== 'autre' ? <div><label className="text-xs font-bold text-[#8a7456]">Produit vendu *</label><div className="flex gap-2 mt-1"><select value={form.source_id} onChange={(e) => changeSource(e.target.value)} className="flex-1 rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"><option value="">— sélectionner —</option>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>{selected ? <button type="button" onClick={() => setFiche(selected.item)} className="rounded-xl border border-[#eadcc2] px-3"><Eye size={15} /></button> : null}</div>{form.source_id ? <p className="mt-1 text-xs text-[#8a7456]">Disponible : <b>{available}</b></p> : null}</div> : null}<Input label="Libellé produit vendu" value={form.product_name} onChange={(v) => set('product_name', v)} /><div className="grid grid-cols-3 gap-3"><Input label="Quantité" type="number" value={form.quantity} onChange={(v) => set('quantity', v)} disabled={form.source_type === 'animal'} /><Input label="Prix unitaire" type="number" value={form.unit_price} onChange={(v) => set('unit_price', v)} /><Input label="Remise" type="number" value={form.discount} onChange={(v) => set('discount', v)} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Client" value={form.client_id} onChange={(v) => set('client_id', v)} options={arr(props.clients).map((c) => ({ value: c.id, label: c.nom || c.name || c.id }))} empty="Client de passage / non renseigné" /><Input label="Date" type="date" value={form.date} onChange={(v) => set('date', v)} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Retrait / livraison" value={form.fulfillment_mode} onChange={(v) => set('fulfillment_mode', v)} options={[{ value: 'recupere', label: 'Récupéré sur place' }, { value: 'livraison', label: 'Livré au client' }]} />{form.fulfillment_mode === 'livraison' ? <Input label="Frais de livraison" type="number" value={form.delivery_fee} onChange={(v) => set('delivery_fee', v)} /> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm text-[#8a7456]">Aucun frais de livraison</div>}</div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Select label="Paiement commande" value={form.payment_status} onChange={(v) => set('payment_status', v)} options={[{ value: 'paye', label: 'Payé totalement' }, { value: 'partiel', label: 'Paiement partiel' }, { value: 'non_paye', label: 'Non payé / à encaisser' }]} />{form.payment_status === 'partiel' ? <Input label="Montant payé" type="number" value={form.paid_amount} onChange={(v) => set('paid_amount', v)} /> : null}{form.payment_status !== 'non_paye' ? <Select label="Moyen paiement" value={form.payment_method} onChange={(v) => set('payment_method', v)} options={paymentMethods} /> : null}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Facture" value={form.invoice_issued ? 'emise' : 'non_emise'} onChange={(v) => set('invoice_issued', v === 'emise')} options={[{ value: 'emise', label: 'Facture émise automatiquement' }, { value: 'non_emise', label: 'Pas de facture pour cette vente' }]} /><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Total à payer</p><p className="text-2xl font-black text-emerald-700">{fmtCurrency(grandTotal)}</p><p className="text-xs text-emerald-700">Payé : {fmtCurrency(paidAmount)} · Reste : {fmtCurrency(remaining)}</p></div></div><label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">Notes</span><textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#eadcc2] px-4 py-2 text-sm font-bold text-[#8a7456]">Annuler</button><button type="submit" disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer la vente'}</button></div></form></div>{fiche ? <FichePopup type={form.source_type} item={fiche} onClose={() => setFiche(null)} /> : null}</div>;
}

function Input({ label, value, onChange, type = 'text', disabled = false }) {
  return <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">{label}</span><input disabled={disabled} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm disabled:opacity-60" /></label>;
}
function Select({ label, value, onChange, options = [], empty }) {
  return <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">{label}</span><select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm">{empty !== undefined ? <option value="">{empty}</option> : null}{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}

async function applySourceImpact({ props, orderId, form, total }) {
  const qty = Number(form.quantity || 0);
  if (!form.source_id || form.source_type === 'autre' || qty <= 0) return;
  if (form.source_type === 'stock') {
    const stock = arr(props.stocks).find((s) => String(s.id) === String(form.source_id));
    if (stock) await props.onUpdateStock?.(form.source_id, { quantite: Math.max(0, Number(stock.quantite || 0) - qty) });
  }
  if (form.source_type === 'lot_avicole') {
    const lot = arr(props.lots).find((l) => String(l.id) === String(form.source_id));
    if (lot) {
      const current = Number(lot.current_count ?? lot.initial_count ?? 0);
      const next = Math.max(0, current - qty);
      await props.onUpdateLot?.(form.source_id, { current_count: next, vendus: Number(lot.vendus || 0) + qty, status: next === 0 ? 'vendu' : 'vendu_partiellement' });
    }
  }
  if (form.source_type === 'animal') await props.onUpdateAnimal?.(form.source_id, { status: 'vendu', date_vente: form.date, sale_price: total, prix_vente_reel: total, client_id: form.client_id || null });
  if (form.source_type === 'culture') {
    const culture = arr(props.cultures).find((c) => String(c.id) === String(form.source_id));
    if (culture) await props.onUpdateCulture?.(form.source_id, { quantite_disponible: Math.max(0, Number(culture.quantite_disponible ?? culture.quantite_recoltee ?? 0) - qty), revenu_reel: Number(culture.revenu_reel || 0) + total });
  }
}

function buildAutoOpportunities(props) {
  const opps = [];
  arr(props.lots).filter((l) => String(l.type || l.type_lot || '').toLowerCase().includes('chair')).forEach((lot) => {
    const effectif = Number(lot.current_count || lot.initial_count || 0);
    if (effectif > 0) opps.push({ id: `auto-lot-${lot.id}`, isAuto: true, title: `Lot ${lot.id} prêt à vendre`, source_type: 'lot_avicole', source_id: lot.id, quantity: effectif, unit: 'tête', estimated_value: effectif * Number(lot.prix_vente_prevu || 0), description: `Effectif disponible : ${effectif}` });
  });
  arr(props.stocks).filter((s) => Number(s.quantite || 0) > 0 && isSellableStock(s)).slice(0, 8).forEach((s) => opps.push({ id: `auto-stock-${s.id}`, isAuto: true, title: `${s.produit || s.nom || s.id} disponible`, source_type: 'stock', source_id: s.id, quantity: Number(s.quantite || 0), unit: s.unite || 'unité', estimated_value: Number(s.quantite || 0) * Number(s.prixunit || s.prix_unitaire || 0), description: `Stock disponible : ${s.quantite} ${s.unite || ''}` }));
  arr(props.cultures).filter((c) => Number(c.quantite_disponible ?? c.quantite_recoltee ?? 0) > 0).forEach((c) => opps.push({ id: `auto-culture-${c.id}`, isAuto: true, title: `${c.culture || c.nom || c.id} disponible`, source_type: 'culture', source_id: c.id, quantity: Number(c.quantite_disponible ?? c.quantite_recoltee ?? 0), unit: c.unite || 'kg', estimated_value: Number(c.quantite_disponible ?? c.quantite_recoltee ?? 0) * Number(c.prix_vente_kg || 0), description: 'Récolte disponible' }));
  return opps;
}

export default function VentesTerrain(props) {
  const [modal, setModal] = useState(null);
  const [prefill, setPrefill] = useState(null);
  const [toast, setToast] = useState('');
  const payments = arr(props.paymentsList || props.payments);
  const orders = arr(props.rows);
  const opportunities = useMemo(() => [...buildAutoOpportunities(props), ...arr(props.opportunities).filter((o) => o.status !== 'converti')], [props]);
  const ca = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const cash = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
  const rest = Math.max(0, ca - cash);
  const openSale = (opp = null) => {
    setPrefill(opp ? { opportunity_id: opp.id, source_type: opp.source_type, source_id: opp.source_id, product_name: getSourceLabel(opp.source_type, opp.source_id, props) || opp.title, quantity: opp.quantity || 1, unit_price: opp.quantity ? Math.round(Number(opp.estimated_value || 0) / Math.max(1, Number(opp.quantity))) : Number(opp.estimated_value || 0), notes: opp.description || '' } : null);
    setModal('sale');
  };
  const done = (orderId) => { setModal(null); setPrefill(null); setToast(`Vente ${orderId} enregistrée`); setTimeout(() => setToast(''), 3500); };
  return <div className="space-y-5 p-4 md:p-6">{toast ? <div className="fixed right-4 top-4 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xl">{toast}</div> : null}<div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h1 className="text-xl font-black text-[#2f2415]">Ventes terrain</h1><p className="text-sm text-[#8a7456]">Une vente saisie = commande, paiement, retrait/livraison, facture et traçabilité alignés.</p></div><div className="flex gap-2"><button type="button" onClick={props.onRefresh} className="rounded-xl border border-[#eadcc2] px-3 py-2 text-xs font-bold text-[#8a7456]"><RefreshCw size={13} className="inline" /> Actualiser</button><button type="button" onClick={() => openSale(null)} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"><Plus size={13} className="inline" /> Nouvelle vente</button></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-3"><Kpi icon={ShoppingCart} label="CA ventes" value={fmtCurrency(ca)} /><Kpi icon={CreditCard} label="Encaissé" value={fmtCurrency(cash)} /><Kpi icon={FileText} label="Reste" value={fmtCurrency(rest)} /><Kpi icon={TrendingUp} label="Opportunités" value={opportunities.length} /></div><section className="rounded-3xl border border-[#eadcc2] bg-white p-5 space-y-3"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Opportunités</p><h3 className="font-black text-[#2f2415]">Transformer en vente seulement si le client achète</h3></div></div>{opportunities.length ? <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">{opportunities.slice(0, 8).map((opp) => <div key={opp.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 flex justify-between gap-3"><div><p className="font-black text-[#2f2415]">{opp.title}</p><p className="text-xs text-[#8a7456] mt-1">{opp.description}</p><p className="text-xs text-[#8a7456] mt-1">Qté {opp.quantity} {opp.unit} · valeur {fmtCurrency(opp.estimated_value || 0)}</p></div><button type="button" onClick={() => openSale(opp)} className="shrink-0 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white">Vendre</button></div>)}</div> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#8a7456]">Aucune opportunité à convertir.</div>}</section><section className="rounded-3xl border border-[#eadcc2] bg-white p-5 space-y-3"><p className="font-black text-[#2f2415]">Ventes récentes</p><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="text-xs uppercase text-[#8a7456]"><tr><th className="px-3 py-2 text-left">Commande</th><th className="px-3 py-2 text-left">Client</th><th className="px-3 py-2 text-left">Produit</th><th className="px-3 py-2 text-left">Retrait</th><th className="px-3 py-2 text-left">Facture</th><th className="px-3 py-2 text-right">Total</th><th className="px-3 py-2 text-right">Reste</th></tr></thead><tbody>{orders.slice(0, 14).map((order) => { const paid = paidForOrder(order, payments); const total = orderAmount(order); return <tr key={order.id} className="border-t border-[#eadcc2]"><td className="px-3 py-2 font-bold text-[#2f2415]">{order.id}</td><td className="px-3 py-2 text-[#7d6a4a]">{clientName(props.clients, order.client_id)}</td><td className="px-3 py-2 text-[#7d6a4a]">{order.product_name || order.source_label || order.source_id || '—'}</td><td className="px-3 py-2 text-[#7d6a4a]">{order.fulfillment_mode === 'livraison' ? 'Livré' : order.fulfillment_mode === 'recupere' ? 'Récupéré' : order.statut_livraison || '—'}</td><td className="px-3 py-2 text-[#7d6a4a]">{order.facture_emise || order.invoice_status === 'emise' ? 'Émise' : 'Non émise'}</td><td className="px-3 py-2 text-right font-bold text-[#2f2415]">{fmtCurrency(total)}</td><td className="px-3 py-2 text-right font-bold text-red-600">{fmtCurrency(Math.max(0, total - paid))}</td></tr>; })}{!orders.length ? <tr><td colSpan={7} className="px-3 py-8 text-center text-[#8a7456]">Aucune vente enregistrée.</td></tr> : null}</tbody></table></div></section>{modal === 'sale' ? <SimpleSaleModal props={props} prefill={prefill} onClose={() => setModal(null)} onDone={done} /> : null}</div>;
}

function Kpi({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><Icon size={16} className="text-[#9a6b12]" /><p className="mt-2 text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415]">{value}</p></div>;
}
