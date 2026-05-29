import { CheckCircle2, ChevronDown, CreditCard, Edit3, FileText, PackageCheck, ReceiptText, ShieldCheck, Truck, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';
import { calculateSalesMargin } from '../utils/salesMarginEngine';
import { buildSaleSourcePatch, capSalePayment } from '../utils/salesWorkflows';
import SalesFollowUpPanel from './SalesFollowUpPanel.jsx';
import SalesWorkflowHealth from './SalesWorkflowHealth.jsx';
import VentesTerrainV3 from './VentesTerrainV3.jsx';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const label = (row = {}) => row.name || row.nom || row.produit || row.culture || row.product_name || row.client_label || row.id || 'Produit';
const payStatus = (sale = {}) => sale.statut_paiement || sale.payment_status || sale.status_paiement || (num(sale.reste_a_payer) > 0 ? 'non_paye' : 'paye');
const deliveryStatus = (sale = {}) => sale.statut_livraison || sale.delivery_status || sale.status_livraison || 'a_livrer';
const totalOf = (sale = {}) => num(sale.montant_total || sale.total || sale.amount || sale.total_amount || (num(sale.quantity || sale.quantite) * num(sale.unit_price || sale.prix_unitaire)));
const paidOf = (sale = {}, payments = []) => num(sale.montant_paye || sale.paid_amount) || payments.filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(sale.id)).reduce((sum, p) => sum + num(p.montant || p.amount || p.montant_paye), 0);
const remainingOf = (sale = {}, payments = []) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const isClosed = (sale = {}, payments = []) => ['cloture', 'clôture', 'annule', 'annulé'].includes(String(sale.statut_commande || sale.status || '').toLowerCase()) || (remainingOf(sale, payments) <= 0 && ['livre', 'livré', 'recupere', 'récupéré'].includes(String(deliveryStatus(sale)).toLowerCase()));
const statusBadge = (text = '', tone = 'amber') => <span className={`rounded-full px-2 py-1 text-[11px] font-black border ${tone === 'green' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : tone === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>{text}</span>;
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
const applySaleSourcePatch = async (props = {}, patch) => {
  if (!patch?.id) return;
  if (patch.module === 'stock') await props.onUpdateStock?.(patch.id, patch.patch);
  if (patch.module === 'lot_avicole') await props.onUpdateLot?.(patch.id, patch.patch);
  if (patch.module === 'animal') await props.onUpdateAnimal?.(patch.id, patch.patch);
  if (patch.module === 'culture') await props.onUpdateCulture?.(patch.id, patch.patch);
};

function Section({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}
function AdminFold({ children }) {
  const [open, setOpen] = useState(false);
  return <section className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] shadow-sm overflow-hidden"><button type="button" onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-white"><span><span className="flex items-center gap-2 text-sm font-black text-[#2f2415]"><ShieldCheck size={16} /> Contrôle qualité ventes</span><span className="mt-1 block text-xs text-[#8a7456]">Outils de régularisation, données importées et vérifications avancées.</span></span><ChevronDown size={18} className={`text-[#8a7456] ${open ? 'rotate-180' : ''}`} /></button>{open ? <div className="border-t border-[#eadcc2] p-4">{children}</div> : null}</section>;
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
  const [delivery, setDelivery] = useState('recupere');
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
      await props.onCreate?.({ id: orderId, date, client_label: clientName, client_type: clientName === 'Client de passage' ? 'passage' : 'client', product_name: productName, quantity: num(quantity), unit, unite: unit, unit_price: num(unitPrice), montant_total: total, montant_paye: paid, reste_a_payer: remaining, statut_paiement: paymentStatus, statut_livraison: delivery, statut_commande: remaining <= 0 && delivery !== 'a_livrer' ? 'livre' : 'ouvert', facture_emise: true, invoice_id: invoiceId, source_type: source.type, source_module: source.type === 'lot_avicole' ? 'avicole' : source.type, source_id: source.row?.id || fields.source_id || '', notes: draft.raw_input, created_from: 'hey_horizon' });
      await props.onCreateItem?.({ id: makeId('CMDI'), order_id: orderId, source_type: source.type, source_id: source.row?.id || fields.source_id || '', product_name: productName, quantity: num(quantity), unit, unit_price: num(unitPrice), total });
      await applySaleSourcePatch(props, buildSaleSourcePatch({ sourceType: source.type, sourceRow: source.row, quantity: num(quantity), total, date, orderId, clientId: '', saleKind: source.type }));
      await props.onCreateDelivery?.({ id: makeId('LIV'), order_id: orderId, date_livraison: date, statut: delivery, status: delivery, destinataire: clientName });
      await props.onCreateInvoice?.({ id: invoiceId, order_id: orderId, numero_facture: `FAC-${orderId.slice(-6)}`, date_facture: date, montant_total: total, statut: 'emise' });
      await props.onCreateDocument?.({ id: makeId('DOC'), title: `Facture FAC-${orderId.slice(-6)}`, document_category: 'facture', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, related_id: orderId, invoice_id: invoiceId, status: 'emise', amount: total });
      if (paid > 0) {
        await props.onCreatePayment?.({ id: paymentId, order_id: orderId, sale_id: orderId, source_record_id: orderId, date_paiement: date, montant: paid, montant_paye: paid, amount: paid, moyen_paiement: 'especes', statut: 'paye', created_from: 'hey_horizon' });
        await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Encaissement ${orderId} - ${clientName}`, montant: paid, date, categorie: 'Vente', module_lie: 'ventes', related_id: orderId, source_module: 'ventes', source_record_id: orderId, payment_id: paymentId, transaction_origin: 'automatique' });
      }
      await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'vente_hey_horizon', module_source: 'ventes', entity_type: 'commande', entity_id: orderId, title: `Vente ${productName} - ${fmtCurrency(total)}`, description: draft.raw_input || '', event_date: date, severity: 'info' });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshInvoices?.(), props.onRefreshPayments?.(), props.onRefreshFinances?.(), props.onRefreshBusinessEvents?.(), props.onRefreshDeliveries?.()]);
      toast.success('Vente créée');
      onClose?.();
    } catch (error) { toast.error(error.message || 'Création vente impossible'); } finally { setSaving(false); }
  };
  return <section className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm space-y-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-emerald-700 font-black flex items-center gap-2"><CreditCard size={15} /> Vente préparée</p><h3 className="mt-1 text-xl font-black text-[#2f2415]">Nouvelle vente</h3><p className="mt-1 text-sm text-emerald-800">Comme en caisse : produit, client, paiement, livraison et facture au même endroit.</p></div><button type="button" onClick={onClose} className="rounded-full border border-emerald-200 bg-white p-2 text-emerald-700"><X size={16} /></button></div><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Produit vendu</span><input value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Quantité</span><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Unité</span><input value={unit} onChange={(e) => setUnit(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Prix unitaire</span><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Client</span><input value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Date</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label><label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Paiement</span><select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="paye">Payé maintenant</option><option value="partiel">Avance / partiel</option><option value="non_paye">À crédit</option></select></label>{paymentStatus === 'partiel' ? <label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Montant reçu</span><input type="number" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm" /></label> : null}<label className="space-y-1"><span className="text-xs font-bold text-emerald-800">Livraison</span><select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="w-full min-h-[44px] rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm"><option value="recupere">Récupéré sur place</option><option value="a_livrer">À livrer</option><option value="livre">Déjà livré</option></select></label></div><div className="rounded-xl border border-emerald-200 bg-white p-3 text-sm text-emerald-800"><CheckCircle2 size={14} className="inline" /> Total : <b>{fmtCurrency(total)}</b> · Reçu : <b>{fmtCurrency(paid)}</b> · Reste : <b>{fmtCurrency(remaining)}</b></div><div className="flex justify-end"><button type="button" onClick={submit} disabled={saving} className="rounded-xl bg-[#2f2415] px-5 py-2 text-sm font-black text-white disabled:opacity-60">{saving ? 'Création...' : 'Créer vente + facture'}</button></div></section>;
}

function SaleActionModal({ sale, payments, props, onClose, initialMode = 'edit' }) {
  const [mode, setMode] = useState(initialMode);
  const [client, setClient] = useState(sale.client_label || sale.client_name || 'Client de passage');
  const [product, setProduct] = useState(sale.product_name || sale.produit || '');
  const [quantity, setQuantity] = useState(sale.quantity || 1);
  const [unitPrice, setUnitPrice] = useState(sale.unit_price || '');
  const [amount, setAmount] = useState(remainingOf(sale, payments));
  const [delivery, setDelivery] = useState(deliveryStatus(sale));
  const [saving, setSaving] = useState(false);
  const total = num(quantity) * num(unitPrice);
  const save = async () => {
    try {
      setSaving(true);
      if (mode === 'edit') await props.onUpdate?.(sale.id, { client_label: client, product_name: product, quantity: num(quantity), unit_price: num(unitPrice), montant_total: total, reste_a_payer: Math.max(0, total - paidOf(sale, payments)) });
      if (mode === 'pay') {
        const cappedAmount = capSalePayment(sale, payments, amount);
        if (cappedAmount <= 0) {
          toast.success('Vente déjà soldée : aucun encaissement à ajouter.');
          await props.onUpdate?.(sale.id, { reste_a_payer: 0, statut_paiement: 'paye', payment_status: 'paye' });
          await props.onRefresh?.();
          onClose?.();
          return;
        }
        const payId = makeId('PAY');
        await props.onCreatePayment?.({ id: payId, order_id: sale.id, sale_id: sale.id, source_record_id: sale.id, date_paiement: today(), montant: cappedAmount, amount: cappedAmount, moyen_paiement: 'especes', statut: 'paye' });
        await props.onCreateFinanceTransaction?.({ id: makeId('TRX'), type: 'entree', libelle: `Encaissement ${sale.id} - ${client}`, montant: cappedAmount, date: today(), categorie: 'Vente', module_lie: 'ventes', related_id: sale.id, source_module: 'ventes', source_record_id: sale.id, payment_id: payId, transaction_origin: 'automatique' });
        const newPaid = paidOf(sale, payments) + cappedAmount;
        await props.onUpdate?.(sale.id, { montant_paye: newPaid, reste_a_payer: Math.max(0, totalOf(sale) - newPaid), statut_paiement: Math.max(0, totalOf(sale) - newPaid) <= 0 ? 'paye' : 'partiel' });
      }
      if (mode === 'deliver') {
        await props.onCreateDelivery?.({ id: makeId('LIV'), order_id: sale.id, date_livraison: today(), statut: delivery, status: delivery, destinataire: client });
        await props.onUpdate?.(sale.id, { statut_livraison: delivery, statut_commande: remainingOf(sale, payments) <= 0 && delivery !== 'a_livrer' ? 'livre' : 'ouvert' });
      }
      if (mode === 'invoice') {
        const invId = sale.invoice_id || makeId('FAC');
        await props.onCreateInvoice?.({ id: invId, order_id: sale.id, numero_facture: `FAC-${sale.id.slice(-6)}`, date_facture: today(), montant_total: totalOf(sale), statut: 'emise' });
        await props.onCreateDocument?.({ id: makeId('DOC'), title: `Facture FAC-${sale.id.slice(-6)}`, document_category: 'facture', module_source: 'ventes', entity_type: 'commande', entity_id: sale.id, related_id: sale.id, invoice_id: invId, status: 'emise', amount: totalOf(sale) });
        await props.onUpdate?.(sale.id, { facture_emise: true, invoice_id: invId });
      }
      if (mode === 'close') await props.onUpdate?.(sale.id, { statut_commande: 'cloture', closed_at: new Date().toISOString() });
      await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: `vente_${mode}`, module_source: 'ventes', entity_type: 'commande', entity_id: sale.id, title: `Vente ${sale.id} · ${mode}`, description: product || sale.product_name || '', event_date: today(), severity: 'info' });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshPayments?.(), props.onRefreshFinances?.(), props.onRefreshInvoices?.(), props.onRefreshDeliveries?.(), props.onRefreshBusinessEvents?.()]);
      toast.success('Vente mise à jour');
      onClose?.();
    } catch (error) { toast.error(error.message || 'Action vente impossible'); } finally { setSaving(false); }
  };
  return <div className="fixed inset-0 z-[90] bg-black/40 p-4 flex items-center justify-center"><div className="w-full max-w-2xl rounded-3xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden"><div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Vente {sale.id}</p><h3 className="text-xl font-black text-[#2f2415]">Traiter la vente</h3><p className="text-sm text-[#8a7456] mt-1">Modifier, encaisser, livrer, facturer ou clôturer.</p></div><button type="button" onClick={onClose}><X size={18} /></button></div><div className="p-5 space-y-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-2">{[['edit','Modifier'],['pay','Encaisser'],['deliver','Livrer'],['invoice','Facture'],['close','Clôturer']].map(([key, text]) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-xl border px-3 py-2 text-sm font-black ${mode === key ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>{text}</button>)}</div>{mode === 'edit' ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={client} onChange={(e) => setClient(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Client" /><input value={product} onChange={(e) => setProduct(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Produit" /><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Quantité" /><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Prix unitaire" /></div> : null}{mode === 'pay' ? <label className="block"><span className="text-xs font-bold text-[#8a7456]">Montant reçu</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2" /></label> : null}{mode === 'deliver' ? <label className="block"><span className="text-xs font-bold text-[#8a7456]">Statut livraison</span><select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2"><option value="recupere">Récupéré sur place</option><option value="a_livrer">À livrer</option><option value="livre">Livré</option></select></label> : null}{mode === 'invoice' ? <div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm text-[#7d6a4a]">Une facture sera créée ou rattachée à cette vente.</div> : null}{mode === 'close' ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Clôture la vente quand paiement et livraison sont OK ou quand tu veux archiver le dossier.</div> : null}<div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm text-[#7d6a4a]">Total : <b>{fmtCurrency(mode === 'edit' ? total : totalOf(sale))}</b> · Payé : <b>{fmtCurrency(paidOf(sale, payments))}</b> · Reste : <b>{fmtCurrency(remainingOf(sale, payments))}</b></div></div><div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border border-[#d6c3a0] px-4 py-2">Annuler</button><button type="button" disabled={saving} onClick={save} className="rounded-xl bg-[#2f2415] px-4 py-2 text-white font-black disabled:opacity-60">{saving ? 'Enregistrement...' : 'Valider'}</button></div></div></div>;
}

function SalesDesk({ props, payments }) {
  const [selected, setSelected] = useState(null);
  const [initialMode, setInitialMode] = useState('edit');
  const openSale = (sale, mode = 'edit') => { setSelected(sale); setInitialMode(mode); };
  const sales = props.rows || [];
  const marginContext = useMemo(() => ({
    lots: props.lots || props.avicole || [],
    animaux: props.animaux || [],
    cultures: props.cultures || [],
    stocks: props.stocks || props.stock || [],
    alimentationLogs: props.alimentationLogs || props.alimentation_logs || [],
    productionLogs: props.productionLogs || props.production_oeufs_logs || [],
    vaccins: props.vaccins || props.sante || [],
    businessEvents: props.businessEvents || props.business_events || [],
    payments,
  }), [props.lots, props.avicole, props.animaux, props.cultures, props.stocks, props.stock, props.alimentationLogs, props.alimentation_logs, props.productionLogs, props.production_oeufs_logs, props.vaccins, props.sante, props.businessEvents, props.business_events, payments]);
  const openSales = sales.filter((sale) => !isClosed(sale, payments)).slice(0, 12);
  const closedSales = sales.filter((sale) => isClosed(sale, payments)).slice(0, 8);
  return <div className="space-y-4">
    {selected ? <SaleActionModal sale={selected} payments={payments} props={props} initialMode={initialMode} onClose={() => setSelected(null)} /> : null}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-3"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Ventes ouvertes</p><b className="text-2xl text-[#2f2415]">{openSales.length}</b></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">À encaisser</p><b className="text-2xl text-[#2f2415]">{fmtCurrency(openSales.reduce((s, v) => s + remainingOf(v, payments), 0))}</b></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">À livrer</p><b className="text-2xl text-[#2f2415]">{openSales.filter((s) => deliveryStatus(s) === 'a_livrer').length}</b></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">Historique</p><b className="text-2xl text-[#2f2415]">{closedSales.length}</b></div></div>
    <div className="space-y-2"><p className="text-sm font-black text-[#2f2415]">Ventes à traiter</p>{openSales.length ? <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">{openSales.map((sale) => { const remaining = remainingOf(sale, payments); const delivery = deliveryStatus(sale); const margin = calculateSalesMargin(sale, marginContext); return <article key={sale.id} className="rounded-2xl border border-[#d6c3a0] bg-white p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-[#2f2415]">{sale.product_name || sale.produit || sale.id}</p><p className="text-xs text-[#8a7456]">{sale.client_label || sale.client_name || 'Client'} · {sale.date || 'date non renseignée'}</p></div><div className="flex flex-wrap gap-1 justify-end">{statusBadge(remaining <= 0 ? 'Payé' : remaining < totalOf(sale) ? 'Partiel' : 'À encaisser', remaining <= 0 ? 'green' : 'amber')}{statusBadge(delivery === 'a_livrer' ? 'À livrer' : delivery === 'livre' ? 'Livré' : 'Récupéré', delivery === 'a_livrer' ? 'red' : 'green')}</div></div><div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm"><div><span className="text-[#8a7456]">Total</span><b className="block text-[#2f2415]">{fmtCurrency(totalOf(sale))}</b></div><div><span className="text-[#8a7456]">Payé</span><b className="block text-[#2f2415]">{fmtCurrency(paidOf(sale, payments))}</b></div><div><span className="text-[#8a7456]">Reste</span><b className="block text-[#2f2415]">{fmtCurrency(remaining)}</b></div><div><span className="text-[#8a7456]">Coût</span><b className="block text-[#2f2415]">{margin.cout_a_completer ? 'À compléter' : fmtCurrency(margin.cout_revient)}</b></div><div><span className="text-[#8a7456]">Marge</span><b className={`block ${margin.cout_a_completer ? 'text-amber-700' : margin.marge_directe < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{margin.cout_a_completer ? 'Non fiable' : `${fmtCurrency(margin.marge_directe)} · ${margin.marge_taux}%`}</b></div></div><div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-xs text-[#7d6a4a]">Source marge : {margin.cout_a_completer ? 'coût source à renseigner' : margin.source_label || margin.cout_source || 'coût suivi'}</div><div className="grid grid-cols-2 md:grid-cols-4 gap-2"><button type="button" onClick={() => openSale(sale, 'edit')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-black text-[#7d6a4a]"><Edit3 size={13} className="inline" /> Modifier</button><button type="button" onClick={() => openSale(sale, 'pay')} className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-black text-emerald-700"><ReceiptText size={13} className="inline" /> Encaisser</button><button type="button" onClick={() => openSale(sale, 'deliver')} className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-black text-amber-700"><Truck size={13} className="inline" /> Livrer</button><button type="button" onClick={() => openSale(sale, 'invoice')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-xs font-black text-[#7d6a4a]"><FileText size={13} className="inline" /> Facture</button></div></article>; })}</div> : <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#8a7456]">Aucune vente ouverte.</div>}</div>
  </div>;
}

export default function VentesV4(props) {
  const [horizonDraft, setHorizonDraft] = useState(null);
  const [showGuidedSale, setShowGuidedSale] = useState(false);
  const payments = props.paymentsList || props.payments || [];
  useEffect(() => {
    const handler = (event) => {
      const draft = event.detail?.draft;
      if (event.detail?.module === 'ventes' && draft?.form_type === 'sale_record') {
        setHorizonDraft(draft);
        setShowGuidedSale(false);
        window.setTimeout(() => document.getElementById('hey-horizon-sale-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, []);
  return <div className="space-y-5 ventes-mobile-structured">
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm"><div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Caisse ventes</p><h2 className="text-2xl font-black text-[#2f2415]">Vendre comme dans la vraie vie</h2><p className="text-sm text-[#8a7456] mt-1">Une vente = produit + client + paiement + livraison + facture + suivi.</p></div><button type="button" onClick={() => { setShowGuidedSale((v) => !v); setHorizonDraft(null); }} className="rounded-2xl bg-[#2f2415] px-5 py-3 text-sm font-black text-white"><CreditCard size={16} className="inline mr-1" /> Nouvelle vente</button></div></div>
    {horizonDraft ? <div id="hey-horizon-sale-card"><HorizonSaleCard draft={horizonDraft} props={props} onClose={() => setHorizonDraft(null)} /></div> : null}
    {showGuidedSale ? <Section icon={CreditCard} title="Nouvelle vente guidée" subtitle="Saisir la vente en une seule fois : produit, client, paiement, livraison et facture."><VentesTerrainV3 {...props} /></Section> : null}
    <Section icon={PackageCheck} title="Ventes à traiter" subtitle="Chaque vente a ses actions : modifier, encaisser, livrer, facturer ou clôturer."><SalesDesk props={props} payments={payments} /></Section>
    <SalesFollowUpPanel {...props} paymentsList={payments} />
    <AdminFold><SalesWorkflowHealth orders={props.rows || []} payments={payments} transactions={props.transactions || []} invoices={props.invoicesList || props.invoices || []} deliveries={props.deliveriesList || props.deliveries || []} stocks={props.stocks || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} onNavigate={props.onNavigate} /></AdminFold>
  </div>;
}
