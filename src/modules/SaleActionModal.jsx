import { X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency } from '../utils/format';
import { makeId } from '../utils/ids';
import { findInvoicesForOrder } from '../services/salesIntegrityService';
import { recordSalePayment } from '../utils/recordSalePayment';
import { saleQuantityDetail, deliveryModeNeedsFee, deliveryFeeOf } from '../utils/saleQuantityLabel';

const today = () => new Date().toISOString().slice(0, 10);
const num = (value = 0) => Number(value || 0) || 0;
const totalOf = (sale = {}) => num(sale.montant_total || sale.total || sale.amount || sale.total_amount || (num(sale.quantity || sale.quantite) * num(sale.unit_price || sale.prix_unitaire)));
const paidOf = (sale = {}, payments = []) => num(sale.montant_paye || sale.paid_amount) || payments.filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(sale.id)).reduce((sum, p) => sum + num(p.montant || p.amount || p.montant_paye), 0);
const remainingOf = (sale = {}, payments = []) => Math.max(0, totalOf(sale) - paidOf(sale, payments));
const deliveryStatus = (sale = {}) => sale.statut_livraison || sale.delivery_status || sale.status_livraison || 'a_livrer';

const MODES = [['view', 'Voir'], ['edit', 'Modifier'], ['pay', 'Encaisser'], ['deliver', 'Livrer'], ['invoice', 'Facture'], ['close', 'Clôturer']];

function ReadOnlyField({ label, value }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2"><p className="text-[11px] font-bold uppercase tracking-wide text-[#8a7456]">{label}</p><p className="mt-1 text-sm font-black text-[#2f2415]">{value || '—'}</p></div>;
}

export default function SaleActionModal({ sale, payments, props, onClose, initialMode = 'edit', marginDetail = null }) {
  const deliveries = props?.deliveriesList || props?.deliveries || [];
  const fulfillmentMode = sale.fulfillment_mode || sale.mode_livraison || deliveryStatus(sale);
  const [mode, setMode] = useState(initialMode);
  const [client, setClient] = useState(sale.client_label || sale.client_name || 'Client de passage');
  const [product, setProduct] = useState(sale.product_name || sale.produit || '');
  const [quantity, setQuantity] = useState(sale.quantity || 1);
  const [unitPrice, setUnitPrice] = useState(sale.unit_price || '');
  const [deliveryFee, setDeliveryFee] = useState(deliveryFeeOf(sale, deliveries));
  const [amount, setAmount] = useState(remainingOf(sale, payments));
  const [delivery, setDelivery] = useState(deliveryStatus(sale));
  const [saving, setSaving] = useState(false);
  const productTotal = num(quantity) * num(unitPrice);
  const feeApplies = deliveryModeNeedsFee(fulfillmentMode) || deliveryModeNeedsFee(delivery);
  const activeFee = feeApplies ? Math.max(0, num(deliveryFee)) : 0;
  const editGrandTotal = productTotal + activeFee;
  const isView = mode === 'view';
  const qtyDetail = saleQuantityDetail(sale);

  const save = async () => {
    if (isView) return onClose?.();
    try {
      setSaving(true);
      if (mode === 'edit') await props.onUpdate?.(sale.id, { client_label: client, product_name: product, quantity: num(quantity), unit_price: num(unitPrice), montant_ht: productTotal, frais_livraison: activeFee, delivery_fee: activeFee, fulfillment_mode: feeApplies ? (fulfillmentMode || delivery) : 'recupere', montant_total: editGrandTotal, reste_a_payer: Math.max(0, editGrandTotal - paidOf(sale, payments)) });
      if (mode === 'pay') {
        const result = await recordSalePayment({
          sale,
          requestedAmount: amount,
          payments,
          transactions: props.transactions || [],
          clients: props.clients || [],
          salesOrders: props.rows || [],
          paymentMethod: 'especes',
          paymentDate: today(),
          handlers: {
            onCreatePayment: props.onCreatePayment,
            onCreateFinanceTransaction: props.onCreateFinanceTransaction,
            onUpdateOrder: props.onUpdate,
            onUpdateClient: props.onUpdateClient,
            onRefresh: props.onRefresh,
            onRefreshPayments: props.onRefreshPayments,
            onRefreshFinances: props.onRefreshFinances,
            onRefreshClients: props.onRefreshClients,
          },
        });
        if (result?.skipped && result.reason === 'already_settled') {
          toast.success('Vente déjà soldée : aucun encaissement à ajouter.');
          onClose?.();
          return;
        }
        if (result?.skipped && result.reason === 'duplicate_payment') {
          toast.success('Encaissement déjà enregistré — aucun doublon.');
          onClose?.();
          return;
        }
      }
      if (mode === 'deliver') {
        const fee = deliveryModeNeedsFee(delivery) ? Math.max(0, num(deliveryFee)) : 0;
        const newTotal = productTotal + fee;
        await props.onCreateDelivery?.({ id: makeId('LIV'), order_id: sale.id, date_livraison: today(), statut: delivery, status: delivery, frais_livraison: fee, delivery_fee: fee, destinataire: client });
        await props.onUpdate?.(sale.id, { statut_livraison: delivery, statut_commande: remainingOf(sale, payments) <= 0 && delivery !== 'a_livrer' ? 'livre' : 'ouvert', frais_livraison: fee, delivery_fee: fee, montant_total: fee > 0 || num(sale.frais_livraison) ? newTotal : totalOf(sale), reste_a_payer: Math.max(0, (fee > 0 || num(sale.frais_livraison) ? newTotal : totalOf(sale)) - paidOf(sale, payments)) });
      }
      if (mode === 'invoice') {
        const invoices = props.invoicesList || props.invoices || [];
        const linked = findInvoicesForOrder(sale.id, invoices);
        const existing = linked[0] || (sale.invoice_id ? invoices.find((row) => String(row.id) === String(sale.invoice_id)) : null);
        await Promise.allSettled(linked.slice(1).map((row) => props.onDeleteInvoice?.(row.id)));
        if (existing) {
          await props.onUpdate?.(sale.id, { facture_emise: true, invoice_id: existing.id, invoice_status: 'emise', statut_facture: 'emise' });
          toast.success('Facture déjà émise — aucun doublon créé');
        } else {
          const invId = makeId('FAC');
          await props.onCreateInvoice?.({ id: invId, order_id: sale.id, numero_facture: `FAC-${sale.id.slice(-6)}`, date_facture: today(), montant_total: totalOf(sale), statut: 'emise', invoice_status: 'emise' });
          await props.onCreateDocument?.({ id: makeId('DOC'), title: `Facture FAC-${sale.id.slice(-6)}`, document_category: 'facture', module_source: 'ventes', entity_type: 'commande', entity_id: sale.id, related_id: sale.id, invoice_id: invId, status: 'emise', amount: totalOf(sale) });
          await props.onUpdate?.(sale.id, { facture_emise: true, invoice_id: invId, invoice_status: 'emise', statut_facture: 'emise' });
          toast.success('Facture émise');
        }
      }
      if (mode === 'close') await props.onUpdate?.(sale.id, { statut_commande: 'cloture', closed_at: new Date().toISOString() });
      await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: `vente_${mode}`, module_source: 'ventes', entity_type: 'commande', entity_id: sale.id, title: `Vente ${sale.id} · ${mode}`, description: product || sale.product_name || '', event_date: today(), severity: 'info' });
      await Promise.allSettled([props.onRefresh?.(), props.onRefreshPayments?.(), props.onRefreshFinances?.(), props.onRefreshInvoices?.(), props.onRefreshDeliveries?.(), props.onRefreshBusinessEvents?.()]);
      toast.success('Vente mise à jour');
      onClose?.();
    } catch (error) { toast.error(error.message || 'Action vente impossible'); } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 z-[90] bg-black/40 p-4 flex items-center justify-center"><div className="w-full max-w-2xl rounded-3xl bg-[#fffdf8] border border-[#d6c3a0] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"><div className="p-5 border-b border-[#eadcc2] flex items-start justify-between gap-3 shrink-0"><div><p className="text-xs uppercase tracking-widest text-[#8a7456]">Vente {sale.id}</p><h3 className="text-xl font-black text-[#2f2415]">{isView ? 'Détail de la vente' : 'Traiter la vente'}</h3><p className="text-sm text-[#8a7456] mt-1">{isView ? 'Consultation, puis modification ou actions si besoin.' : 'Modifier, encaisser, livrer, facturer ou clôturer.'}</p></div><button type="button" onClick={onClose} aria-label="Fermer"><X size={18} /></button></div><div className="p-5 space-y-4 overflow-y-auto"><div className="grid grid-cols-2 md:grid-cols-6 gap-2">{MODES.map(([key, text]) => <button key={key} type="button" onClick={() => setMode(key)} className={`rounded-xl border px-2 py-2 text-xs md:text-sm font-black ${mode === key ? 'bg-[#2f2415] text-white border-[#2f2415]' : 'bg-white text-[#7d6a4a] border-[#d6c3a0]'}`}>{text}</button>)}</div>{isView ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><ReadOnlyField label="Client" value={client} /><ReadOnlyField label="Produit" value={product} /><ReadOnlyField label="Quantité" value={qtyDetail.label} /><ReadOnlyField label="Prix unitaire" value={fmtCurrency(unitPrice)} /><ReadOnlyField label="Frais livraison client" value={deliveryFeeOf(sale, deliveries) > 0 ? fmtCurrency(deliveryFeeOf(sale, deliveries)) : feeApplies ? '0 FCFA (non renseigné)' : '— (retrait sur place)'} /><ReadOnlyField label="Date" value={String(sale.date || sale.date_commande || sale.created_at || '').slice(0, 10)} /><ReadOnlyField label="Livraison" value={deliveryStatus(sale)} />{marginDetail ? <><ReadOnlyField label="Coût direct" value={marginDetail.cout_a_completer ? 'À compléter' : fmtCurrency(marginDetail.cout_revient)} /><ReadOnlyField label="Marge nette" value={marginDetail.cout_a_completer ? 'Non fiable' : fmtCurrency(marginDetail.marge_nette_exploitation ?? marginDetail.marge_directe)} /><ReadOnlyField label="Source coût" value={marginDetail.source_label || marginDetail.cout_source || '—'} /></> : null}</div> : null}{mode === 'edit' ? <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><input value={client} onChange={(e) => setClient(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Client" /><input value={product} onChange={(e) => setProduct(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Produit" /><input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Quantité" /><input type="number" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="rounded-xl border border-[#d6c3a0] px-3 py-2" placeholder="Prix unitaire" />{feeApplies ? <label className="block md:col-span-2"><span className="text-xs font-bold text-[#8a7456]">Frais de livraison (FCFA)</span><input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2" /></label> : null}</div> : null}{mode === 'pay' ? <label className="block"><span className="text-xs font-bold text-[#8a7456]">Montant reçu</span><input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2" /></label> : null}{mode === 'deliver' ? <div className="space-y-3"><label className="block"><span className="text-xs font-bold text-[#8a7456]">Statut livraison</span><select value={delivery} onChange={(e) => setDelivery(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2"><option value="recupere">Récupéré sur place</option><option value="a_livrer">À livrer</option><option value="livre">Livré</option></select></label>{deliveryModeNeedsFee(delivery) ? <label className="block"><span className="text-xs font-bold text-[#8a7456]">Frais de livraison (FCFA)</span><input type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="mt-1 w-full rounded-xl border border-[#d6c3a0] px-3 py-2" /></label> : null}</div> : null}{mode === 'invoice' ? <div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm text-[#7d6a4a]">Une facture sera créée ou rattachée à cette vente.</div> : null}{mode === 'close' ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">Clôture la vente quand paiement et livraison sont OK ou quand tu veux archiver le dossier.</div> : null}<div className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm text-[#7d6a4a]">Total : <b>{fmtCurrency(mode === 'edit' ? editGrandTotal : totalOf(sale))}</b>{mode === 'edit' && activeFee > 0 ? <> · dont livraison <b>{fmtCurrency(activeFee)}</b></> : deliveryFeeOf(sale, deliveries) > 0 ? <> · dont livraison <b>{fmtCurrency(deliveryFeeOf(sale, deliveries))}</b></> : null} · Payé : <b>{fmtCurrency(paidOf(sale, payments))}</b> · Reste : <b>{fmtCurrency(remainingOf(sale, payments))}</b></div>{marginDetail?.margin_warning ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">{marginDetail.margin_warning}</div> : null}</div><div className="p-4 border-t border-[#eadcc2] flex justify-end gap-2 shrink-0"><button type="button" onClick={onClose} className="rounded-xl border border-[#d6c3a0] px-4 py-2">Annuler</button><button type="button" disabled={saving} onClick={save} className="rounded-xl bg-[#2f2415] px-4 py-2 text-white font-black disabled:opacity-60">{saving ? 'Enregistrement...' : isView ? 'Fermer' : 'Valider'}</button></div></div></div>;
}
