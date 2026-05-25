import { CheckCircle2, ChevronDown, CreditCard, ShieldCheck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';
import SalesFollowUpPanel from './SalesFollowUpPanel.jsx';
import SalesWorkflowHealth from './SalesWorkflowHealth.jsx';
import VentesTerrainV3 from './VentesTerrainV3.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const label = (row = {}) => row.name || row.nom || row.produit || row.culture || row.id || 'Produit';
const findSource = (draft = {}, props = {}) => {
  const fields = draft.draft_fields || {};
  const sourceId = String(fields.source_id || '').trim();
  const product = String(fields.product_name || '').toLowerCase();
  if (sourceId) {
    const animal = (props.animaux || []).find((row) => String(row.id).toUpperCase() === sourceId.toUpperCase());
    if (animal) return { type: 'animal', row: animal, name: label(animal), unit: 'tête', qty: 1 };
    const lot = (props.lots || []).find((row) => String(row.id).toUpperCase() === sourceId.toUpperCase());
    if (lot) return { type: 'lot_avicole', row: lot, name: label(lot), unit: product.includes('oeuf') || product.includes('œuf') || product.includes('tablette') ? 'tablette' : 'tête', qty: num(fields.quantity || 1) };
    const stock = (props.stocks || []).find((row) => String(row.id).toUpperCase() === sourceId.toUpperCase());
    if (stock) return { type: 'stock', row: stock, name: label(stock), unit: stock.unite || 'unité', qty: num(fields.quantity || 1) };
  }
  if (product.includes('poulet') || product.includes('oeuf') || product.includes('œuf') || product.includes('tablette')) return { type: 'lot_avicole', row: null, name: fields.product_name || 'Produit avicole', unit: product.includes('tablette') || product.includes('oeuf') || product.includes('œuf') ? 'tablette' : 'tête', qty: num(fields.quantity || 1) };
  return { type: 'autre', row: null, name: fields.product_name || sourceId || 'Produit à préciser', unit: fields.unit || 'unité', qty: num(fields.quantity || 1) };
};

function Section({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}
function AdminFold({ children }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white"><span><span className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><ShieldCheck size={16} /> Qualité des ventes</span><span className="mt-1 block text-xs text-[#8a7456]">Réservé aux régularisations exceptionnelles et anciennes données importées.</span></span><ChevronDown size={18} className={`text-[#8a7456] ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-4">{children}</div> : null}</section>;
}
function HorizonSaleCard({ draft, props, onClose }) {
  const fields = draft?.draft_fields || {};
  const source = findSource(draft, props);
  const [productName, setProductName] = useState(source.name);
  const [quantity, setQuantity] = useState(source.qty || 1);
  const [unit, setUnit] = useState(source.unit || fields.unit || 'unité');
  const [unitPrice, setUnitPrice] = useState(fields.payment_amount || fields.unit_price || '');
  const [clientName, setClientName] = useState(fields.client_name || 'Client de passage');
  const [date, setDate] = useState(fields.date || today());
  const [paymentStatus, setPaymentStatus] = useState(fields.payment_status === 'credit' ? 'non_paye' : fields.payment_status === 'partial' ? 'partiel' : 'paye');
  const [paidAmount, setPaidAmount] = useState(fields.payment_amount || '');
  const [saving, setSaving] = useState(false);
  const total = num(quantity) * num(unitPrice);
  const paid = paymentStatus === 'paye' ? total : paymentStatus === 'partiel' ? num(paidAmount) : 0;
  const remaining = Math.max(0, total - paid);
  const submit = async () => {
    if (!productName || num(quantity) <= 0 || num(unitPrice) <= 0) return toast.error('Produit, quantité et prix sont obligatoires');
    try {
      setSaving(true);
      const orderId = makeId('CMD');
      const invoiceId = makeId('FAC');
      const paymentId = paid > 0 ? makeId('PAY') : '';
      await props.onCreate?.({ id: orderId, date, client_label: clientName, client_type: clientName === 'Client de passage' ? 'passage' : 'client', product_name: productName, quantity: num(quantity), unit, unite: unit, unit_price: num(unitPrice), montant_total: total, montant_paye: paid, reste_a_payer: remaining, statut_paiement: paymentStatus, statut_livraison: 'recupere', statut_commande: 'livre', facture_emise: true, invoice_id: invoiceId, source_type: source.type, source_module: source.type === 'lot_avicole' ? 'avicole' : source.type, source_id: source.row?.id || fields.source_id || '', notes: draft.raw_input, created_from: 'hey_horizon' });
      await props.onCreateItem?.({ id: makeId('CMDI'), order_id: orderId, source_type: source.type, source_id: source.row?.id || fields.source_id || '', product_name: productName, quantity: num(quantity), unit, unit_price: num(unitPrice), total });
      await props.onCreateDelivery?.({ id: makeId('LIV'), order_id: orderId, date_livraison: date, statut: 'recupere', status: 'recupere', destinataire: clientName });
      await props.onCreateInvoice?.({ id: invoiceId, order_id: orderId, numero_facture: `FAC-${orderId.slice(-6)}`, date_facture: date, montant_total: total, statut: 'emise' });
      if (paid > 0) {
        await props.onCreatePayment?.({ id: paymentId, order_id: orderId, sale_id: orderId, source_record_id: orderId, date_paiement: date, montant: paid, montant_paye: paid, amount: paid, moyen_paiement: 'especes', statut: 'paye', created_from: 'hey_horizon' });
        await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Encaissement ${orderId} - ${clientName}`, montant: paid, date, categorie: 'Vente', module_lie: 'ventes', related_id: orderId, source_module: 'ventes', source_record_id: orderId, payment_id: paymentId, transaction_origin: 'automatique' });
      }
      await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'vente_hey_horizon', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, title: `Vente ${productName} - ${fmtCurrency(total)}`, description: draft.raw_input || '', event_date: date, severity: 'info' });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshInvoices?.(), props.onRefreshPayments?.(), props.onRefreshFinances?.(), props.onRefreshBusinessEvents?.(), props.onRefreshDeliveries?.()]);
      toast.success('Vente créée depuis Hey Horizon');
      onClose?.();
    } catch (error) { toast.error(error.message || 'Création vente impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><CreditCard size={15} /> Fiche préparée par Hey Horizon</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">Vente à enregistrer</h3><p className="mt-1 text-sm text-emerald-800">Complète le prix/client si besoin, puis valide. Les impacts vente, facture, paiement et finance sont créés.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Produit</span><input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Quantité</span><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Unité</span><input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Prix unitaire</span><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Client</span><input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Paiement</span><select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="paye">Payé</option><option value="partiel">Partiel</option><option value="non_paye">Crédit</option></select></label>{paymentStatus === 'partiel' ? <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Montant payé</span><input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label> : null}</div><div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="inline" /> Total : <b>{fmtCurrency(total)}</b> · Payé : <b>{fmtCurrency(paid)}</b> · Reste : <b>{fmtCurrency(remaining)}</b></div><div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Création...' : 'Créer la vente'}</button></div></section>;
}

export default function VentesV4(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  const payments = props.paymentsList || props.payments || [];
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'ventes' && draft?.form_type === 'sale_record') {
        setHorizonDraft(draft);
        window.setTimeout(() => document.getElementById('hey-horizon-sale-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
  return <div className="space-y-5 ventes-mobile-structured">
    {horizonDraft ? <div id="hey-horizon-sale-card"><HorizonSaleCard draft={horizonDraft} props={props} onClose={() => setHorizonDraft(null)} /></div> : null}
    <Section icon={CreditCard} title="Vendre & encaisser" subtitle="Créer une vente complète : client explicite, produit, quantité, paiement, livraison et facture. L’ERP met à jour automatiquement finance, comptabilité, stock et historique client."><VentesTerrainV3 {...props} /></Section>
    <SalesFollowUpPanel {...props} paymentsList={payments} />
    <AdminFold><SalesWorkflowHealth orders={props.rows || []} payments={payments} transactions={props.transactions || []} invoices={props.invoicesList || props.invoices || []} deliveries={props.deliveriesList || props.deliveries || []} stocks={props.stocks || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} onNavigate={props.onNavigate} /></AdminFold>
  </div>;
}