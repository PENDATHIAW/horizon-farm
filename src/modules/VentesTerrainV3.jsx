import { CheckCircle2, CreditCard, FileText, PackageCheck, Plus, RefreshCw, ShoppingCart, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';
import { buildSaleFormFromDraft } from '../utils/saleFormDraft';
import {
  buildCommercialSaleRecords,
  commitCommercialSale,
  prepareCommercialSaleCommit,
  SALE_PRODUCT_TYPES,
  validateCommercialSaleForm,
} from '../utils/commercialSaleWorkflow';
import { DELIVERY_HINT, isMeatStock, saleSourceHint } from '../utils/saleSourceHints';
import useWorkflowSubmit from '../hooks/useWorkflowSubmit';
import { buildSellableStockSaleOptions } from '../utils/sellableStock.js';
import {
  applyCommercialDiscounts,
  buildPricingSummary,
  enrichSaleFormWithClientPricing,
} from '../utils/commercialPricing.js';
import { unitsForProductType, unitLabel, normalizeCommercialUnit } from '../utils/commercialUnits.js';
import { buildLineMargin } from '../utils/commercialMargin.js';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const WALK_IN = 'client_passage';
const paymentMethods = [{ value: 'especes', label: 'Espèces' }, { value: 'wave', label: 'Wave' }, { value: 'orange_money', label: 'Orange Money' }, { value: 'virement', label: 'Virement' }, { value: 'cheque', label: 'Chèque' }];
const productTypes = { lot_avicole: 'Lot avicole', animal: 'Animal', stock: 'Stock', culture: 'Culture / récolte', service: 'Prestation / service', autre: 'Autre vente' };
const clientName = (clients = [], id) => id === WALK_IN ? 'Client de passage' : arr(clients).find((c) => String(c.id) === String(id))?.nom || arr(clients).find((c) => String(c.id) === String(id))?.name || id || 'Client';
const clientRow = (clients = [], id) => arr(clients).find((c) => String(c.id) === String(id)) || null;
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.type_lot || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isPondeuseLot = (lot = {}) => ['pondeuse', 'ponte', 'oeuf', 'œuf'].some((word) => lotText(lot).includes(word));
const lotActiveCount = (lot = {}) => num(lot.current_count ?? lot.effectif_actuel ?? lot.active_count ?? lot.effectif_restant ?? lot.initial_count ?? lot.effectif_initial);
const defaultUnitForType = (type) => normalizeCommercialUnit('', type === 'lot_avicole' ? 'lot_avicole' : type);
const orderAmount = (order = {}) => num(order.montant_total ?? order.total ?? order.amount);
const paymentAmount = (payment = {}) => num(payment.montant_paye ?? payment.montant ?? payment.amount);
const paidForOrder = (order, payments = []) => Math.max(num(order.montant_paye), arr(payments).filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(order.id)).reduce((sum, p) => sum + paymentAmount(p), 0));
const deliveryStatus = (mode) => mode === 'a_livrer' ? 'a_livrer' : mode === 'livraison' ? 'livre' : 'recupere';
const orderStatus = (mode) => mode === 'a_livrer' ? 'en_preparation' : 'livre';
const deliveryModeNeedsFee = (mode) => mode === 'livraison' || mode === 'a_livrer';
const EGGS_PER_TABLET = 30;

const STEPS = [
  { key: 'product', title: 'Produit', icon: PackageCheck },
  { key: 'client', title: 'Client', icon: UserRound },
  { key: 'delivery', title: 'Livraison', icon: FileText },
  { key: 'payment', title: 'Paiement', icon: CreditCard },
  { key: 'summary', title: 'Résumé', icon: CheckCircle2 },
];

const defaultForm = () => ({
  date: today(), client_id: WALK_IN, source_type: 'lot_avicole', source_id: '', product_name: '',
  quantity: 1, unit: 'tête', unit_price: 0, discount_pct: 0, discount_amount: 0, payment_status: 'paye', paid_amount: '', payment_method: 'especes',
  fulfillment_mode: 'recupere', delivery_fee: 0, invoice_issued: true, notes: '', opportunity_id: '', lines: [],
});

function buildOptions(type, props) {
  if (type === 'lot_avicole') return arr(props.lots).filter((lot) => !['vendu', 'termine', 'terminé', 'perdu'].includes(norm(lot.status || lot.statut))).map((lot) => ({ value: lot.id, label: `${lot.id} · ${isPondeuseLot(lot) ? 'Œufs / pondeuses' : 'Poulets chair'} · ${lotActiveCount(lot)} disponible(s)`, qty: lotActiveCount(lot), price: num(lot.prix_vente_prevu ?? lot.prix_unitaire_vente ?? lot.prix_tablette ?? lot.prix_plateau), name: isPondeuseLot(lot) ? `Œufs · ${lot.name || lot.nom || lot.id}` : `${lot.id} · Poulets chair`, unit: isPondeuseLot(lot) ? 'tablette' : 'tête', sale_kind: isPondeuseLot(lot) ? 'oeufs_tablettes' : 'chair' })).filter((o) => o.qty > 0);
  if (type === 'animal') return arr(props.animaux).filter((a) => !['vendu', 'mort', 'vole', 'volé'].includes(norm(a.status || a.statut))).map((a) => ({ value: a.id, label: `${a.id} · ${a.name || a.type || a.espece || 'Animal'}`, qty: 1, price: num(a.prix_vente_estime || a.sale_price || a.prix_vente), name: a.name || a.nom || a.id, unit: 'tête', sale_kind: 'animal' }));
  if (type === 'stock') return buildSellableStockSaleOptions(props.stocks, { meatChecker: isMeatStock });
  if (type === 'service') return [];
  if (type === 'culture') return arr(props.cultures).filter((c) => num(c.quantite_disponible ?? c.quantite_recoltee) > 0).map((c) => ({ value: c.id, label: `${c.culture || c.nom || c.id} · ${c.quantite_disponible ?? c.quantite_recoltee} ${c.unite || 'kg'}`, qty: num(c.quantite_disponible ?? c.quantite_recoltee), price: num(c.prix_vente_kg), name: c.culture || c.nom || c.id, unit: c.unite || 'kg', sale_kind: 'culture' }));
  return [];
}

function SourceHintBanner({ hint }) {
  if (!hint) return null;
  const cls = hint.tone === 'warn' ? 'border-amber-200 bg-amber-50 text-amber-900' : hint.tone === 'info' ? 'border-sky-200 bg-sky-50 text-sky-900' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
  return <div className={`rounded-xl border px-3 py-3 text-sm ${cls}`}><p className="font-black text-xs uppercase tracking-wide">{hint.title}</p><p className="mt-1 leading-relaxed">{hint.text}</p></div>;
}
function Input({ label, value, onChange, type = 'text', disabled = false }) {
  return <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">{label}</span><input disabled={disabled} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm disabled:opacity-60" /></label>;
}
function Select({ label, value, onChange, options = [], empty }) {
  return <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">{label}</span><select value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm">{empty !== undefined ? <option value="">{empty}</option> : null}{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select></label>;
}
function Kpi({ icon: Icon, label, value }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-white p-4"><Icon size={17} className="text-[#9a6b12]" /><p className="mt-2 text-xs text-[#8a7456]">{label}</p><p className="text-lg font-black text-[#2f2415]">{value}</p></div>;
}
function Stepper({ step }) {
  const current = STEPS[step];
  const Icon = current.icon;
  return <div className="space-y-2"><div className="flex items-center justify-between rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 md:hidden"><div className="flex items-center gap-2"><Icon size={16} className="text-[#9a6b12]" /><div><p className="text-[10px] font-black uppercase tracking-widest text-[#8a7456]">Étape {step + 1} / {STEPS.length}</p><p className="text-sm font-black text-[#2f2415]">{current.title}</p></div></div><div className="h-2 w-20 overflow-hidden rounded-full bg-[#eadcc2]"><div className="h-full rounded-full bg-[#2f2415] transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} /></div></div><div className="hidden md:grid md:grid-cols-5 md:gap-1 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-2">{STEPS.map((item, index) => { const StepIcon = item.icon; const active = index === step; const done = index < step; return <div key={item.key} className={`rounded-xl px-2 py-2 text-center text-[10px] font-black ${active ? 'bg-[#2f2415] text-white' : done ? 'bg-emerald-50 text-emerald-700' : 'text-[#8a7456]'}`}><StepIcon size={14} className="mx-auto mb-1" />{item.title}</div>; })}</div></div>;
}
function ImpactSummary({ form, selected, clients, productTotal, deliveryFee, grandTotal, paid, remaining }) {
  const impacts = [
    'Vente créée avec client, produit, quantité et prix.',
    deliveryFee > 0 ? `Frais de livraison enregistrés : ${fmtCurrency(deliveryFee)} (visibles au suivi des ventes et dans la marge).` : deliveryModeNeedsFee(form.fulfillment_mode) ? 'Livraison choisie : pense à renseigner les frais si le client paie la livraison.' : 'Retrait sur place : aucun frais de livraison.',
    paid > 0 ? 'Paiement créé et entrée finance automatique enregistrée une seule fois.' : 'Créance client créée : aucun encaissement immédiat.',
    remaining > 0 ? 'Reste à payer visible en créance et relance possible.' : 'Aucune créance si paiement total.',
    form.client_id !== WALK_IN ? 'Fiche client mise à jour (CA, créance, dernière commande).' : 'Client de passage : pas de fiche client mise à jour.',
    form.source_type !== 'autre' ? 'Stock, lot, animal ou culture mis à jour selon la source vendue.' : 'Vente hors source : aucun stock/effectif décrémenté.',
    form.invoice_issued ? 'Facture et document de preuve créés automatiquement.' : 'Facture non créée : à ajouter plus tard si nécessaire.',
    form.fulfillment_mode === 'a_livrer' ? 'Tâche de livraison créée dans Activité & Suivi.' : 'Livraison/retrait marqué immédiatement.',
    'Événement métier créé pour traçabilité, rapports et Centre IA.',
  ];
  return <div className="space-y-3"><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs uppercase tracking-widest font-black text-emerald-700">Résumé avant validation</p><p className="mt-1 text-2xl font-black text-emerald-800">{fmtCurrency(grandTotal)}</p><p className="text-sm text-emerald-800">Produits : {fmtCurrency(productTotal)}{deliveryFee > 0 ? ` · Livraison : ${fmtCurrency(deliveryFee)}` : ''}</p><p className="text-sm text-emerald-800">Payé : {fmtCurrency(paid)} · Reste : {fmtCurrency(remaining)}</p><p className="mt-2 text-sm text-emerald-800">Produit : <b>{form.product_name || selected?.name || '-'}</b> · Client : <b>{clientName(clients, form.client_id)}</b></p></div><div className="grid grid-cols-1 md:grid-cols-2 gap-2">{impacts.map((impact) => <div key={impact} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]"><CheckCircle2 size={14} className="inline text-emerald-600" /> {impact}</div>)}</div></div>;
}

export function SaleModal({ props, onClose, onDone, prefill = null }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => (prefill ? { ...defaultForm(), ...buildSaleFormFromDraft(prefill, props) } : defaultForm()));
  const [error, setError] = useState('');
  const { submit: workflowSubmit, busy: workflowBusy } = useWorkflowSubmit();
  const options = useMemo(() => buildOptions(form.source_type, props), [form.source_type, props]);
  const selected = options.find((o) => String(o.value) === String(form.source_id));
  const selectedClient = clientRow(props.clients, form.client_id);
  const pricing = useMemo(() => buildPricingSummary(form, {
    client: form.client_id !== WALK_IN ? selectedClient : null,
    sourceRow: selected?.sourceRow || selected,
  }), [form, selected, selectedClient]);
  const linePricing = useMemo(() => applyCommercialDiscounts({
    unitPrice: form.unit_price,
    quantity: form.quantity,
    discountPct: form.discount_pct,
    discountAmount: form.discount_amount,
  }), [form.unit_price, form.quantity, form.discount_pct, form.discount_amount]);
  const lineMargin = useMemo(() => buildLineMargin({
    source_type: form.source_type,
    source_id: form.source_id,
    product_name: form.product_name,
    quantity: form.quantity,
    unit_price: form.unit_price,
    discount_pct: form.discount_pct,
    discount_amount: form.discount_amount,
    line_total: linePricing.lineTotal,
    sourceRow: selected?.sourceRow || selected,
  }, { stocks: props.stocks, lots: props.lots, cultures: props.cultures, animaux: props.animaux }), [form, linePricing.lineTotal, selected, props.stocks, props.lots, props.cultures, props.animaux]);
  const unitOptions = useMemo(() => unitsForProductType(form.source_type).map((u) => ({ value: u, label: unitLabel(u) })), [form.source_type]);
  const productTotal = linePricing.lineTotal;
  const deliveryFee = deliveryModeNeedsFee(form.fulfillment_mode) ? Math.max(0, num(form.delivery_fee)) : 0;
  const grandTotal = productTotal + deliveryFee;
  const paid = form.payment_status === 'paye' ? grandTotal : form.payment_status === 'partiel' ? num(form.paid_amount) : 0;
  const remaining = Math.max(0, grandTotal - paid);
  const sourceHint = saleSourceHint({ sourceType: form.source_type, selected: selected?.sourceRow || selected, unit: form.unit });
  useEffect(() => {
    if (!prefill || !form.source_id) return;
    const option = buildOptions(form.source_type, props).find((row) => String(row.value) === String(form.source_id));
    if (!option) return;
    setForm((prev) => ({
      ...prev,
      product_name: prev.product_name || option.name || '',
      unit: option.unit || prev.unit,
      unit_price: prev.unit_price > 0 ? prev.unit_price : option.price || 0,
    }));
  }, [prefill, form.source_id, form.source_type, props]);
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const setFulfillment = (mode) => setForm((prev) => ({ ...prev, fulfillment_mode: mode, delivery_fee: deliveryModeNeedsFee(mode) ? prev.delivery_fee : 0 }));
  const changeType = (type) => setForm((prev) => ({ ...prev, source_type: type, source_id: '', product_name: '', quantity: 1, unit: defaultUnitForType(type), unit_price: 0 }));
  const changeSource = (id) => {
    const option = options.find((o) => String(o.value) === String(id));
    const base = {
      source_id: id,
      product_name: option?.name || '',
      unit: option?.unit || defaultUnitForType(form.source_type),
      unit_price: option?.price || 0,
      quantity: 1,
    };
    const enriched = enrichSaleFormWithClientPricing(base, {
      client: form.client_id !== WALK_IN ? selectedClient : null,
      sourceRow: option?.sourceRow || option,
    });
    setForm((prev) => ({ ...prev, ...enriched }));
  };
  useEffect(() => {
    if (form.client_id === WALK_IN || !form.source_id) return;
    const option = options.find((o) => String(o.value) === String(form.source_id));
    if (!option) return;
    const enriched = enrichSaleFormWithClientPricing(form, {
      client: selectedClient,
      sourceRow: option?.sourceRow || option,
    });
    if (enriched.unit_price !== form.unit_price || enriched.discount_pct !== form.discount_pct) {
      setForm((prev) => ({ ...prev, unit_price: enriched.unit_price, discount_pct: enriched.discount_pct ?? prev.discount_pct, discount_amount: enriched.discount_amount ?? prev.discount_amount }));
    }
  }, [form.client_id, form.source_id, options, selectedClient]);
  const validateStep = (targetStep = step) => {
    if (targetStep >= 0) {
      if (form.source_type !== SALE_PRODUCT_TYPES.OTHER && form.source_type !== SALE_PRODUCT_TYPES.SERVICE && !form.source_id) {
        return 'Choisis le produit vendu.';
      }
      if (!form.product_name) return 'Libellé produit obligatoire.';
      if (form.source_type !== SALE_PRODUCT_TYPES.OTHER && form.source_type !== SALE_PRODUCT_TYPES.SERVICE && selected && num(form.quantity) > num(selected.qty)) {
        return `Quantité disponible : ${selected.qty} ${form.unit}.`;
      }
    }
    if (targetStep >= 1) {
      if (!form.client_id) return 'Choisis un client ou Client de passage.';
      if (!form.date) return 'Date obligatoire.';
    }
    if (targetStep >= 3) {
      const msg = validateCommercialSaleForm(form, {
        walkInOnlyPaid: true,
        farmScope: props.farmScope,
        accessibleFarms: props.accessibleFarms,
        activeFarm: props.activeFarm,
        stocks: props.stocks,
        lots: props.lots,
        cultures: props.cultures,
        animaux: props.animaux,
      });
      if (msg) return msg;
    }
    return '';
  };
  const next = () => { const message = validateStep(step); if (message) { setError(message); return; } setError(''); setStep((value) => Math.min(STEPS.length - 1, value + 1)); };
  const prev = () => { setError(''); setStep((value) => Math.max(0, value - 1)); };

  const submit = async (event) => {
    event.preventDefault();
    if (workflowBusy) return;
    const message = validateStep(3);
    if (message) { setError(message); return; }
    try {
      const orderId = makeId('CMD');
      const saleKey = `sale:${orderId}:${form.client_id}:${form.date}`;
      const result = await workflowSubmit(saleKey, async () => {
      const clientLabel = clientName(props.clients, form.client_id);
      const { records } = prepareCommercialSaleCommit({
        form,
        orderId,
        clientLabel,
        selectedMeta: selected,
        farmScope: props.farmScope,
        accessibleFarms: props.accessibleFarms,
        activeFarm: props.activeFarm,
      });
      await commitCommercialSale(records, {
        onCreateOrder: props.onCreate,
        onCreateItem: props.onCreateItem,
        onUpdateItem: props.onUpdateItem,
        onCreateDelivery: props.onCreateDelivery,
        onCreateInvoice: props.onCreateInvoice,
        onCreateDocument: props.onCreateDocument,
        onCreatePayment: props.onCreatePayment,
        onCreateBusinessEvent: props.onCreateBusinessEvent,
        onRefreshWorkflow: props.onRefreshWorkflow,
        onUpdateStock: props.onUpdateStock,
        onUpdateLot: props.onUpdateLot,
        onUpdateAnimal: props.onUpdateAnimal,
        onUpdateCulture: props.onUpdateCulture,
        onCreateFinanceTransaction: props.onCreateFinanceTransaction,
        onUpdateFinanceTransaction: props.onUpdateFinanceTransaction,
        onUpdateClient: props.onUpdateClient,
        onCreateTask: props.onCreateTask,
        onCreateAlert: props.onCreateAlert,
        onUpdateOpportunity: props.onUpdateOpportunity,
        onCreateTrace: props.onCreateTrace,
        opportunities: props.opportunities || [],
        existingTraces: props.traces || props.tracabilite || [],
      }, {
        form,
        clientLabel,
        selected,
        stocks: props.stocks,
        lots: props.lots,
        cultures: props.cultures,
        animaux: props.animaux,
        clients: props.clients,
        salesOrders: props.rows,
        payments: props.paymentsList || props.payments,
        transactions: props.transactions || [],
        tasks: props.tasks || props.existingTasks || [],
        alertes: props.alertes || [],
        sideEffectHandlers: {
          onUpdateStock: props.onUpdateStock,
          onUpdateLot: props.onUpdateLot,
          onUpdateAnimal: props.onUpdateAnimal,
          onUpdateCulture: props.onUpdateCulture,
          onUpdateItem: props.onUpdateItem,
          onCreateFinanceTransaction: props.onCreateFinanceTransaction,
          onUpdateFinanceTransaction: props.onUpdateFinanceTransaction,
          onUpdateClient: props.onUpdateClient,
          onCreateTask: props.onCreateTask,
          onCreateAlert: props.onCreateAlert,
          onUpdateOpportunity: props.onUpdateOpportunity,
          onCreateTrace: props.onCreateTrace,
          opportunities: props.opportunities || [],
          existingTraces: props.traces || props.tracabilite || [],
        },
      });
      onDone?.(orderId);
      });
      if (result?.skipped && result.reason === 'in_flight') return;
    } catch (err) { setError(err.message || 'Enregistrement impossible.'); }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"><div className="w-full max-w-3xl max-h-[94vh] overflow-y-auto rounded-3xl border border-[#eadcc2] bg-white shadow-2xl"><div className="flex items-start justify-between border-b border-[#eadcc2] p-5"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Nouvelle vente</p><h2 className="text-xl font-black text-[#2f2415]">{STEPS[step].title}</h2><p className="text-sm text-[#8a7456] mt-1">Renseigne la vente puis valide.</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><form onSubmit={submit} className="p-5 space-y-4"><Stepper step={step} />{error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
    {step === 0 ? <div className="space-y-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{Object.entries(productTypes).map(([key, label]) => <button key={key} type="button" onClick={() => changeType(key)} className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-black ${form.source_type === key ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#eadcc2] bg-[#fffdf8] text-[#8a7456]'}`}>{label}</button>)}</div><SourceHintBanner hint={sourceHint} />{form.source_type !== 'autre' && form.source_type !== 'service' ? <label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">Produit vendu *</span><select value={form.source_id} onChange={(e) => changeSource(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm"><option value="">— sélectionner —</option>{options.map((o) => <option key={`${o.value}-${o.sale_kind}`} value={o.value}>{o.label}</option>)}</select>{selected ? <span className="text-xs text-[#8a7456]">Disponible : {selected.qty} {selected.unit}</span> : null}</label> : null}<Input label="Libellé produit vendu *" value={form.product_name} onChange={(v) => set('product_name', v)} /><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Input label="Quantité *" type="number" value={form.quantity} onChange={(v) => set('quantity', v)} disabled={form.source_type === 'animal'} /><Select label="Unité" value={form.unit} onChange={(v) => set('unit', v)} options={unitOptions} disabled={form.source_type === 'animal'} /><Input label="Prix unitaire *" type="number" value={form.unit_price} onChange={(v) => set('unit_price', v)} /></div><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Input label="Remise (%)" type="number" value={form.discount_pct} onChange={(v) => set('discount_pct', v)} /><Input label="Remise (FCFA)" type="number" value={form.discount_amount} onChange={(v) => set('discount_amount', v)} /></div><div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-3 text-sm text-[#7d6a4a]">{lineMargin.calculable ? <>Marge estimée : <b>{fmtCurrency(lineMargin.margin)}</b> ({lineMargin.marginPct}%)</> : lineMargin.message}</div>{form.client_id !== WALK_IN ? <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900"><p className="font-black text-xs uppercase tracking-wide">Prix client</p><p>Prix défaut : {fmtCurrency(form.unit_price)} · Remise : {fmtCurrency(linePricing.discountApplied)} · Final : <b>{fmtCurrency(linePricing.lineTotal)}</b>{pricing.margin?.margin != null ? <> · Marge estimée : {fmtCurrency(pricing.margin.margin)} ({pricing.margin.marginPct}%)</> : null}</p></div> : null}</div> : null}
    {step === 1 ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Client *" value={form.client_id} onChange={(v) => set('client_id', v)} options={[{ value: WALK_IN, label: 'Client de passage — paiement comptant uniquement' }, ...arr(props.clients).map((c) => ({ value: c.id, label: c.nom || c.name || c.id }))]} empty="Choisir un client" /><Input label="Date *" type="date" value={form.date} onChange={(v) => set('date', v)} /></div> : null}
    {step === 2 ? <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><Select label="Retrait / livraison" value={form.fulfillment_mode} onChange={setFulfillment} options={[{ value: 'recupere', label: 'Récupéré sur place (0 FCFA livraison)' }, { value: 'livraison', label: 'Livré au client maintenant' }, { value: 'a_livrer', label: 'À livrer plus tard' }]} /><Select label="Facture" value={form.invoice_issued ? 'emise' : 'non_emise'} onChange={(v) => set('invoice_issued', v === 'emise')} options={[{ value: 'emise', label: 'Facture émise automatiquement' }, { value: 'non_emise', label: 'Pas de facture' }]} /></div>{deliveryModeNeedsFee(form.fulfillment_mode) ? <Input label="Frais de livraison (FCFA) — laisser 0 si offerte" type="number" value={form.delivery_fee} onChange={(v) => set('delivery_fee', v)} /> : <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-3 text-sm text-[#8a7456]">Retrait sur place : livraison <b>0 FCFA</b> — non incluse dans le total ni dans la marge.</div>}<div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-3 text-xs text-[#7d6a4a]">{DELIVERY_HINT}</div><label className="space-y-1 block"><span className="text-xs font-bold text-[#8a7456]">Notes</span><textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} className="w-full rounded-xl border border-[#d6c3a0] bg-[#fffdf8] px-3 py-2 text-sm" /></label><div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm text-[#7d6a4a]">Total produits : <b>{fmtCurrency(productTotal)}</b>{deliveryFee > 0 ? <> · Livraison : <b>{fmtCurrency(deliveryFee)}</b></> : null} · Total commande : <b>{fmtCurrency(grandTotal)}</b></div></div> : null}
    {step === 3 ? <div className="space-y-3"><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Select label="Paiement" value={form.payment_status} onChange={(v) => set('payment_status', v)} options={[{ value: 'paye', label: 'Payé totalement' }, { value: 'partiel', label: 'Paiement partiel' }, { value: 'non_paye', label: 'Crédit / à encaisser' }]} />{form.payment_status === 'partiel' ? <Input label="Montant payé" type="number" value={form.paid_amount} onChange={(v) => set('paid_amount', v)} /> : null}{form.payment_status !== 'non_paye' ? <Select label="Moyen paiement" value={form.payment_method} onChange={(v) => set('payment_method', v)} options={paymentMethods} /> : null}</div><div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Total commande (produits + livraison)</p><p className="text-2xl font-black text-emerald-700">{fmtCurrency(grandTotal)}</p><p className="text-xs text-emerald-700">Produits : {fmtCurrency(productTotal)}{deliveryFee > 0 ? ` · Livraison : ${fmtCurrency(deliveryFee)}` : ''}</p><p className="text-xs text-emerald-700">Payé : {fmtCurrency(paid)} · Reste : {fmtCurrency(remaining)}</p></div></div> : null}
    {step === 4 ? <ImpactSummary form={form} selected={selected} clients={props.clients} productTotal={productTotal} deliveryFee={deliveryFee} grandTotal={grandTotal} paid={paid} remaining={remaining} /> : null}
    <div className="flex justify-between gap-2 pt-2"><button type="button" onClick={step === 0 ? onClose : prev} className="min-h-[44px] rounded-xl border border-[#eadcc2] px-4 py-2 text-sm font-bold text-[#8a7456]">{step === 0 ? 'Annuler' : 'Retour'}</button>{step < STEPS.length - 1 ? <button type="button" onClick={next} className="min-h-[44px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white">Continuer</button> : <button type="submit" disabled={workflowBusy} className="min-h-[44px] rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{workflowBusy ? 'Enregistrement...' : 'Valider la vente et appliquer les impacts'}</button>}</div></form></div></div>;
}

export default function VentesTerrainV3(props) {
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState('');
  const payments = arr(props.paymentsList || props.payments);
  const orders = arr(props.rows);
  const ca = orders.reduce((sum, order) => sum + orderAmount(order), 0);
  const cash = orders.reduce((sum, order) => sum + paidForOrder(order, payments), 0);
  const rest = Math.max(0, ca - cash);
  const done = (orderId) => { setModal(false); setToast(`Vente ${orderId} enregistrée`); setTimeout(() => setToast(''), 3500); };
  return <div className="space-y-5 p-4 md:p-6">{toast ? <div className="fixed right-4 top-4 z-50 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-xl">{toast}</div> : null}<div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h1 className="text-xl font-black text-[#2f2415]">Nouvelle vente</h1><p className="text-sm text-[#8a7456]">Produit, client, livraison, paiement et facture.</p></div><div className="flex gap-2"><button type="button" onClick={props.onRefresh} className="min-h-[44px] rounded-xl border border-[#eadcc2] px-3 py-2 text-xs font-bold text-[#8a7456]"><RefreshCw size={13} className="inline" /> Actualiser</button><button type="button" onClick={() => setModal(true)} className="min-h-[44px] rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"><Plus size={13} className="inline" /> Nouvelle vente</button></div></div><div className="grid grid-cols-2 md:grid-cols-3 gap-3"><Kpi icon={ShoppingCart} label="CA ventes" value={fmtCurrency(ca)} /><Kpi icon={CreditCard} label="Encaissé" value={fmtCurrency(cash)} /><Kpi icon={FileText} label="Créances" value={fmtCurrency(rest)} /></div>{modal ? <SaleModal props={props} onClose={() => setModal(false)} onDone={done} /> : null}</div>;
}
