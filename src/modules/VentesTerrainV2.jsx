import { CreditCard, FileText, Plus, RefreshCw, ShoppingCart, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const WALK_IN = 'client_passage';
const paymentMethods = [{ value: 'especes', label: 'Espèces' }, { value: 'wave', label: 'Wave' }, { value: 'orange_money', label: 'Orange Money' }, { value: 'virement', label: 'Virement' }, { value: 'cheque', label: 'Chèque' }];
const productTypes = { lot_avicole: 'Avicole', animal: 'Animal', stock: 'Stock vendable', culture: 'Culture / récolte', autre: 'Autre vente' };
const internalStockWords = ['aliment', 'vaccin', 'medicament', 'médicament', 'antibiotique', 'desinfectant', 'désinfectant', 'veterinaire', 'vétérinaire'];
const clientName = (clients = [], id) => id === WALK_IN ? 'Client de passage' : arr(clients).find((c) => String(c.id) === String(id))?.nom || arr(clients).find((c) => String(c.id) === String(id))?.name || id || 'Client';
const isSellableStock = (stock = {}) => stock.is_sellable === true || stock.vendable === true || !internalStockWords.some((word) => norm(`${stock.produit || ''} ${stock.nom || ''} ${stock.categorie || ''}`).includes(norm(word)));
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.type_lot || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isPondeuseLot = (lot = {}) => lotText(lot).includes('pondeuse') || lotText(lot).includes('ponte') || lotText(lot).includes('oeuf') || lotText(lot).includes('œuf');
const lotActiveCount = (lot = {}) => num(lot.current_count ?? lot.effectif_actuel ?? lot.active_count ?? lot.effectif_restant ?? lot.initial_count ?? lot.effectif_initial);
const defaultUnitForType = (type) => type === 'animal' ? 'tête' : type === 'culture' ? 'kg' : type === 'lot_avicole' ? 'tête' : 'unité';
const orderAmount = (order = {}) => num(order.montant_total ?? order.total ?? order.amount);
const paymentAmount = (payment = {}) => num(payment.montant_paye ?? payment.montant ?? payment.amount);
const paidForOrder = (order, payments = []) => Math.max(num(order.montant_paye), arr(payments).filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(order.id)).reduce((sum, p) => sum + paymentAmount(p), 0));

function buildOptions(type, props) {
  if (type === 'lot_avicole') return arr(props.lots).filter((lot) => !['vendu', 'termine', 'terminé', 'perdu'].includes(norm(lot.status || lot.statut))).map((lot) => ({ value: lot.id, label: `${lot.id} · ${isPondeuseLot(lot) ? 'Œufs / pondeuses' : 'Poulets chair'} · ${lotActiveCount(lot)} disponible(s)`, qty: lotActiveCount(lot), price: num(lot.prix_vente_prevu ?? lot.prix_unitaire_vente ?? lot.prix_tablette ?? lot.prix_plateau), name: isPondeuseLot(lot) ? `Œufs · ${lot.name || lot.nom || lot.id}` : `${lot.id} · Poulets chair`, unit: isPondeuseLot(lot) ? 'tablette' : 'tête', sale_kind: isPondeuseLot(lot) ? 'oeufs_tablettes' : 'chair' })).filter((o) => o.qty > 0);
  if (type === 'animal') return arr(props.animaux).filter((a) => !['vendu', 'mort', 'vole', 'volé'].includes(norm(a.status || a.statut))).map((a) => ({ value: a.id, label: `${a.id} · ${a.name || a.type || a.espece || 'Animal'}`, qty: 1, price: num(a.prix_vente_estime || a.sale_price || a.prix_vente), name: a.name || a.nom || a.id, unit: 'tête', sale_kind: 'animal' }));
  if (type === 'stock') return arr(props.stocks).filter((s) => num(s.quantite) > 0 && isSellableStock(s)).map((s) => ({ value: s.id, label: `${s.produit || s.nom || s.id} · ${s.quantite} ${s.unite || ''}`, qty: num(s.quantite), price: num(s.prixunit || s.prixUnit || s.prix_unitaire), name: s.produit || s.nom || s.id, unit: s.unite || 'unité', sale_kind: 'stock' }));
  if (type === 'culture') return arr(props.cultures).filter((c) => num(c.quantite_disponible ?? c.quantite_recoltee) > 0).map((c) => ({ value: c.id, label: `${c.culture || c.nom || c.id} · ${c.quantite_disponible ?? c.quantite_recoltee} ${c.unite || 'kg'}`, qty: num(c.quantite_disponible ?? c.quantite_recoltee), price: num(c.prix_vente_kg), name: c.culture || c.nom || c.id, unit: c.unite || 'kg', sale_kind: 'culture' }));
  return [];
}

function SaleModal({ props, onClose, onDone }) {
  const [form, setForm] = useState({ date: today(), client_id: '', source_type: 'lot_avicole', source_id: '', product_name: '', quantity: 1, unit: 'tête', unit_price: 0, payment_status: 'paye', paid_amount: '', payment_method: 'especes', fulfillment_mode: 'recupere', invoice_issued: true, notes: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const options = useMemo(() => buildOptions(form.source_type, props), [form.source_type, props]);
  const selected = options.find((o) => String(o.value) === String(form.source_id));
  const total = Math.max(0, num(form.quantity) * num(form.unit_price));
  const paid = form.payment_status === 'paye' ? total : form.payment_status === 'partiel' ? num(form.paid_amount) : 0;
  const remaining = Math.max(0, total - paid);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const changeType = (type) => setForm((prev) => ({ ...prev, source_type: type, source_id: '', product_name: '', quantity: 1, unit: defaultUnitForType(type), unit_price: 0 }));
  const changeSource = (id) => { const option = options.find((o) => String(o.value) === String(id)); setForm((prev) => ({ ...prev, source_id: id, product_name: option?.name || '', unit: option?.unit || defaultUnitForType(prev.source_type), unit_price: option?.price || 0, quantity: prev.source_type === 'animal' ? 1 : 1 })); };

  const submit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    if (!form.client_id) return setError('Choisis un client ou Client de passage.');
    if (form.client_id === WALK_IN && form.payment_status !== 'paye') return setError('Client de passage autorisé uniquement pour une vente payée totalement. Pour crédit ou paiement partiel, choisis un client réel.');
    if (!form.date) return setError('Date obligatoire.');
    if (form.source_type !== 'autre' && !form.source_id) return setError('Choisis le produit vendu.');
    if (!form.product_name) return setError('Libellé produit obligatoire.');
    if (num(form.quantity) <= 0) return setError('Quantité invalide.');
    if (form.source_type !== 'autre' && selected && num(form.quantity) > num(selected.qty)) return setError(`Quantité disponible : ${selected.qty} ${form.unit}.`);
    if (num(form.unit_price) <= 0) return setError('Prix unitaire obligatoire.');
    if (form.payment_status === 'partiel' && (paid <= 0 || paid >= total)) return setError('Pour un paiement partiel, le montant payé doit être inférieur au total et supérieur à 0.');

    try {
      setSaving(true);
      const orderId = makeId('CMD');
      const invoiceId = form.invoice_issued ? makeId('FAC') : '';
      const paymentId = paid > 0 ? makeId('PAY') : '';
      const transactionId = paid > 0 ? makeId('TRX') : '';
      const realClientId = form.client_id === WALK_IN ? '' : form.client_id;
      const productName = form.product_name;
      const orderPayload = { id: orderId, date: form.date, client_id: realClientId, client_type: form.client_id === WALK_IN ? 'passage' : 'client', client_label: clientName(props.clients, form.client_id), type_document: 'commande', statut_commande: 'livre', statut_livraison: form.fulfillment_mode === 'livraison' ? 'livre' : 'recupere', fulfillment_mode: form.fulfillment_mode, statut_paiement: form.payment_status, montant_ht: total, montant_total: total, montant_paye: paid, reste_a_payer: remaining, moyen_paiement: paid > 0 ? form.payment_method : '', payment_method: paid > 0 ? form.payment_method : '', invoice_id: invoiceId, invoice_status: form.invoice_issued ? 'emise' : 'non_emise', facture_emise: form.invoice_issued, source_type: form.source_type, source_module: form.source_type === 'lot_avicole' ? 'avicole' : form.source_type, source_id: form.source_id || null, product_name: productName, source_label: productName, quantity: num(form.quantity), unit: form.unit, unite: form.unit, sale_kind: selected?.sale_kind || form.source_type, unit_price: num(form.unit_price), notes: form.notes || null };
      await props.onCreate?.(orderPayload);
      await props.onCreateItem?.({ id: makeId('CMDI'), order_id: orderId, source_type: form.source_type, source_module: orderPayload.source_module, source_id: form.source_id || null, product_name: productName, quantity: num(form.quantity), unit: form.unit, unite: form.unit, unit_price: num(form.unit_price), total, line_total: total, sale_kind: orderPayload.sale_kind, available_quantity_snapshot: selected?.qty ?? null });
      await applySourceImpact({ props, form, total, selected });
      await props.onCreateDelivery?.({ id: makeId('LIV'), order_id: orderId, date_livraison: form.date, statut: 'livre', mode_livraison: form.fulfillment_mode, fulfillment_mode: form.fulfillment_mode, destinataire: clientName(props.clients, form.client_id) });
      if (form.invoice_issued) {
        await props.onCreateInvoice?.({ id: invoiceId, order_id: orderId, numero_facture: `FAC-${orderId.slice(-6)}`, date_facture: form.date, montant_total: total, statut: 'emise', invoice_status: 'emise' });
        await props.onCreateDocument?.({ id: makeId('DOC'), title: `Facture FAC-${orderId.slice(-6)}`, document_category: 'facture', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, related_id: orderId, invoice_id: invoiceId, status: 'emise', amount: total });
      }
      if (paid > 0) {
        await props.onCreatePayment?.({ id: paymentId, order_id: orderId, sale_id: orderId, source_record_id: orderId, client_id: realClientId, invoice_id: invoiceId, date_paiement: form.date, date: form.date, montant: paid, montant_paye: paid, amount: paid, moyen_paiement: form.payment_method, mode_paiement: form.payment_method, statut: 'paye' });
        await props.onCreateFinanceTransaction?.({ id: transactionId, type: 'entree', libelle: `${remaining > 0 ? 'Acompte' : 'Encaissement'} ${orderId} - ${clientName(props.clients, form.client_id)}`, montant: paid, date: form.date, categorie: 'Vente', module_lie: 'ventes', related_id: orderId, vente_id: orderId, client_id: realClientId, statut: remaining > 0 ? 'partiel' : 'paye', source_module: 'ventes', source_record_id: orderId, source_type: form.source_type, source_id: form.source_id || '', invoice_id: invoiceId, payment_id: paymentId, moyen_paiement: form.payment_method });
      }
      if (remaining > 0) await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Créance client ${orderId} - ${clientName(props.clients, form.client_id)}`, montant: remaining, date: form.date, categorie: 'Creance client', module_lie: 'ventes', related_id: orderId, vente_id: orderId, client_id: realClientId, statut: 'impaye', reste_a_payer: remaining, source_module: 'ventes', source_record_id: orderId });
      await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'vente_directe', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, title: `Vente ${productName} - ${fmtCurrency(total)}`, description: `${clientName(props.clients, form.client_id)} · ${form.payment_status}`, amount: total, event_date: form.date, linked_sale_id: orderId, linked_invoice_id: invoiceId || null, linked_transaction_id: transactionId || null, source_type: form.source_type, source_id: form.source_id || '', sale_kind: selected?.sale_kind || form.source_type, severity: 'info' });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshInvoices?.(), props.onRefreshPayments?.(), props.onRefreshDocuments?.(), props.onRefreshFinances?.(), props.onRefreshBusinessEvents?.(), props.onRefreshStocks?.(), props.onRefreshLots?.(), props.onRefreshAnimals?.(), props.onRefreshCultures?.()]);
      onDone?.(orderId);
    } catch (error) {
      setError(error.message || 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="w-full max-w-2xl max-h-[94vh] overflow-y-auto rounded-3xl border border-[#eadcc2] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#eadcc2] p-5"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Vente terrain</p><h2 className="text-xl font-black text-[#2f2415]">Saisir une vente complète</h2><p className="text-sm text-[#8a7456] mt-1">Client, produit, paiement, facture, livraison et impacts sont créés ensemble.</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><form onSubmit={submit} className="p-5 space-y-4">{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}<div className="grid grid-cols-2 md:grid-cols-5 gap-2">{Object.entries(productTypes).map(([key, label]) => <button key={key} type="button" onClick={() => changeType(key)} className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-black ${form.source_type === key ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'}`}>{label}</button>)}</div>{form.source_type !== 'autre' ? <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">Produit vendu *</span><select value={form.source_id} onChange={(e) => changeSource(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"><option value="">— sélectionner —</option>{options.map((o) => <option key={`${o.value}-${o.sale_kind}`} value={o.value}>{o.label}</option>)}</select>{selected ? <span className="text-xs text-[#8a7456]">Disponible : {selected.qty} {selected.unit}</span> : null}</label> : null}<Input label="Libellé produit vendu *" value={form.product_name} onChange={(v) => set('product_name', v)} /><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Input label="Quantité *" type="number" value={form.quantity} onChange={(v) => set('quantity', v)} disabled={form.source_type === 'animal'} /><Input label="Unité" value={form.unit} onChange={(v) => set('unit', v)} disabled={form.source_type === 'animal'} /><Input label="Prix unitaire *" type="number" value={form.unit_price} onChange={(v) => set('unit_price', v)} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Client *" value={form.client_id} onChange={(v) => set('client_id', v)} options={[{ value: WALK_IN, label: 'Client de passage — paiement comptant uniquement' }, ...arr(props.clients).map((c) => ({ value: c.id, label: c.nom || c.name || c.id }))]} empty="Choisir un client" /><Input label="Date *" type="date" value={form.date} onChange={(v) => set('date', v)} /></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Select label="Paiement" value={form.payment_status} onChange={(v) => set('payment_status', v)} options={[{ value: 'paye', label: 'Payé totalement' }, { value: 'partiel', label: 'Paiement partiel' }, { value: 'non_paye', label: 'Crédit / à encaisser' }]} />{form.payment_status === 'partiel' ? <Input label="Montant payé" type="number" value={form.paid_amount} onChange={(v) => set('paid_amount', v)} /> : null}{form.payment_status !== 'non_paye' ? <Select label="Moyen paiement" value={form.payment_method} onChange={(v) => set('payment_method', v)} options={paymentMethods} /> : null}</div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Retrait / livraison" value={form.fulfillment_mode} onChange={(v) => set('fulfillment_mode', v)} options={[{ value: 'recupere', label: 'Récupéré sur place' }, { value: 'livraison', label: 'Livré au client' }]} /><Select label="Facture" value={form.invoice_issued ? 'emise' : 'non_emise'} onChange={(v) => set('invoice_issued', v === 'emise')} options={[{ value: 'emise', label: 'Facture émise automatiquement' }, { value: 'non_emise', label: 'Pas de facture' }]} /></div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Total</p><p className="text-2xl font-black text-emerald-700">{fmtCurrency(total)}</p><p className="text-xs text-emerald-700">Payé : {fmtCurrency(paid)} · Reste : {fmtCurrency(remaining)}</p></div><label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">Notes</span><textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" /></label><div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="min-h-[44px] rounded-xl border border-[#eadcc2] px-4 py-2 text-sm font-bold text-[#8a7456]">Annuler</button><button type="submit" disabled={saving} className="min-h-[44px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Enregistrement...' : 'Enregistrer la vente'}</button></div></form></div></div>;
}

function Input({ label, value, onChange, type = 'text', disabled = false }) { return <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">{label}</span><input disabled={disabled} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm disabled:opacity-60" /></label>; }
function Select({ label, value, onChange, options = [], empty }) { return <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">{label}</span><select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm">{empty !== undefined ? <option value="">{empty}</option> : null}{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>; }

async function applySourceImpact({ props, form, total, selected }) {
  const qty = num(form.quantity);
  if (!form.source_id || form.source_type === 'autre' || qty <= 0) return;
  if (form.source_type === 'stock') { const stock = arr(props.stocks).find((s) => String(s.id) === String(form.source_id)); if (stock) await props.onUpdateStock?.(form.source_id, { quantite: Math.max(0, num(stock.quantite) - qty), last_sale_id: form.source_id }); }
  if (form.source_type === 'lot_avicole') { const lot = arr(props.lots).find((l) => String(l.id) === String(form.source_id)); if (!lot) return; const current = lotActiveCount(lot); const next = Math.max(0, current - qty); await props.onUpdateLot?.(form.source_id, { current_count: next, vendus: num(lot.vendus) + qty, status: next === 0 ? 'vendu' : 'vendu_partiellement', derniere_vente: form.date, sale_kind: selected?.sale_kind }); }
  if (form.source_type === 'animal') await props.onUpdateAnimal?.(form.source_id, { status: 'vendu', date_vente: form.date, sale_price: total, prix_vente_reel: total, client_id: form.client_id === WALK_IN ? null : form.client_id });
  if (form.source_type === 'culture') { const culture = arr(props.cultures).find((c) => String(c.id) === String(form.source_id)); if (culture) await props.onUpdateCulture?.(form.source_id, { quantite_disponible: Math.max(0, num(culture.quantite_disponible ?? culture.quantite_recoltee) - qty), revenu_reel: num(culture.revenu_reel) + total }); }
}

export default function VentesTerrainV2(props) {
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const payments = arr(props.paymentsList || props.payments);
  const orders = arr(props.rows);
  const ca = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const cash = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
  const rest = Math.max(0, ca - cash);
  const done = (orderId) => { setModal(false); setToast(`Vente ${orderId} enregistrée`); setTimeout(() => setToast(''), 3500); };
  return <div className="space-y-5 p-4 md:p-6">{toast ? <div className="fixed right-4 top-4 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xl">{toast}</div> : null}<div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h1 className="text-xl font-black text-[#2f2415]">Ventes terrain</h1><p className="text-sm text-[#8a7456]">Vente complète : client explicite, produit, paiement, facture, livraison et impacts automatiques.</p></div><div className="flex gap-2"><button type="button" onClick={props.onRefresh} className="min-h-[44px] rounded-xl border border-[#eadcc2] px-3 py-2 text-xs font-bold text-[#8a7456]"><RefreshCw size={13} className="inline" /> Actualiser</button><button type="button" onClick={() => setModal(true)} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"><Plus size={13} className="inline" /> Nouvelle vente</button></div></div><div className="grid grid-cols-2 md:grid-cols-3 gap-3"><Kpi icon={ShoppingCart} label="CA ventes" value={fmtCurrency(ca)} /><Kpi icon={CreditCard} label="Encaissé" value={fmtCurrency(cash)} /><Kpi icon={FileText} label="Créances" value={fmtCurrency(rest)} /></div>{modal ? <SaleModal props={props} onClose={() => setModal(false)} onDone={done} /> : null}</div>;
}
function Kpi({ icon: Icon, label, value }) { return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><Icon size={17} className="text-[#9a6b12]" /><p className="mt-2 text-xs text-[#8a7456]">{label}</p><p className="text-lg font-black text-[#2f2415]">{value}</p></div>; }
