import { AlertTriangle, CheckCircle, CreditCard, FileText, Package, ShoppingCart, Truck, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { fmtCurrency, toDateInput } from '../utils/format';
import FicheTabsBar from './FicheTabsBar.jsx';

const statusLabel = (value) => String(value || 'non renseigne').replace(/_/g, ' ');

const fmtDate = (value) => {
  if (!value) return '-';
  const normalized = toDateInput(value);
  if (!normalized) return String(value);
  const [year, month, day] = normalized.split('-');
  return `${day}/${month}/${year}`;
};

const normalizeInvoiceStatus = (invoice = {}) => {
  const raw = String(invoice.statut_facture || invoice.invoice_status || invoice.statut || '').toLowerCase();
  if (['enregistree', 'enregistrée', 'emise', 'émise', 'envoyee', 'envoyée', 'annulee', 'annulée'].includes(raw)) return raw.replace('enregistrée', 'enregistree').replace('émise', 'emise').replace('envoyée', 'envoyee').replace('annulée', 'annulee');
  if (['paye', 'payé', 'partiel', 'non_paye', 'impaye', 'impayé', 'solde', 'soldé'].includes(raw)) return invoice.date_envoi || invoice.sent_at ? 'envoyee' : 'emise';
  return invoice.id ? 'emise' : 'enregistree';
};

const invoicePaymentStatus = (invoice = {}, order = {}) => (
  invoice.statut_paiement
  || invoice.payment_status
  || order.statut_paiement
  || 'non_paye'
);

const orderTone = (status) => {
  if (status === 'annule') return 'red';
  if (status === 'livre') return 'emerald';
  if (status === 'confirme' || status === 'enregistree') return 'sky';
  return 'amber';
};

function Pill({ children, tone = 'slate' }) {
  const tones = {
    emerald: 'bg-emerald-500/15 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-500/15 text-amber-700 border-amber-200',
    red: 'bg-red-500/15 text-red-700 border-red-200',
    sky: 'bg-sky-500/15 text-sky-700 border-sky-200',
    slate: 'bg-slate-500/10 text-slate-700 border-slate-200',
  };
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${tones[tone] || tones.slate}`}>{children}</span>;
}

function ImpactBadge({ label, state, hint }) {
  const ok = state === 'ok';
  const warn = state === 'warning';
  return (
    <div className={`rounded-xl border p-3 ${ok ? 'bg-emerald-50 border-emerald-200' : warn ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
      <div className="flex items-center gap-2">
        {ok ? <CheckCircle className="h-4 w-4 text-emerald-600" /> : warn ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <Package className="h-4 w-4 text-slate-500" />}
        <span className="text-sm font-semibold text-[#2f2415]">{label}</span>
      </div>
      {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
    </div>
  );
}

function Section({ title, icon: Icon, children }) {
  return (
    <section className="rounded-2xl border border-[#e8d5b0] bg-white p-4">
      <div className="mb-3 flex items-center gap-2">
        {Icon ? <Icon className="h-4 w-4 text-[#c9a96a]" /> : null}
        <h3 className="text-sm font-bold text-[#2f2415]">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-[#8a7456]">{label}</span>
      <span className="text-right font-semibold text-[#2f2415]">{value ?? '-'}</span>
    </div>
  );
}

export default function SaleDetailModal({
  order,
  client,
  items = [],
  payments = [],
  invoices = [],
  deliveries = [],
  transactions = [],
  businessEvents = [],
  documents = [],
  impactApplied = false,
  onClose,
  onEdit,
  onPay,
  onInvoice,
  onCancel,
  onOpenSource,
}) {
  const [tab, setTab] = useState('general');

  useEffect(() => {
    if (order) setTab('general');
  }, [order?.id]);

  if (!order) return null;

  const itemTotal = items.reduce((sum, item) => sum + Number(item.total || item.line_total || 0), 0);
  const total = Number(order.montant_total ?? order.total_amount ?? itemTotal ?? 0);
  const paidFromPayments = payments.reduce((sum, payment) => sum + Number(payment.montant || payment.montant_paye || payment.amount || 0), 0);
  const paid = Number(order.montant_paye ?? order.paid_amount ?? paidFromPayments ?? 0);
  const remaining = Number(order.reste_a_payer ?? order.remaining_amount ?? Math.max(0, total - paid));
  const orderStatus = order.statut_commande || (paid > 0 ? 'confirme' : total > 0 ? 'enregistree' : 'brouillon');
  const paymentStatus = order.statut_paiement || (paid >= total && total > 0 ? 'paye' : paid > 0 ? 'partiel' : 'non_paye');
  const deliveryStatus = order.statut_livraison || 'a_livrer';
  const paidTransactions = transactions.filter((tx) => (tx.statut || 'paye') !== 'impaye');
  const linkedEvents = businessEvents.filter((event) => event.linked_sale_id === order.id || event.entity_id === order.id);
  const linkedDocuments = documents.filter((doc) => doc.entity_id === order.id || doc.linked_sale_id === order.id);
  const hasAccounting = transactions.some((tx) => tx.accounting_entry_id);

  const openAndClose = (callback) => {
    callback?.();
    window.setTimeout(() => onClose?.(), 0);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-3">
      <div className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-[#e8d5b0] bg-[#fdf8f0] shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-[#e8d5b0] px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#8a7456]">Fiche vente</p>
            <h2 className="text-xl font-black text-[#2f2415]">CMD-{String(order.id || '').slice(-6)}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              <Pill tone={orderTone(orderStatus)}>Commande: {statusLabel(orderStatus)}</Pill>
              <Pill tone={paymentStatus === 'paye' ? 'emerald' : paymentStatus === 'partiel' ? 'amber' : 'red'}>Paiement: {statusLabel(paymentStatus)}</Pill>
              <Pill tone={deliveryStatus === 'livre' ? 'emerald' : 'amber'}>Livraison: {statusLabel(deliveryStatus)}</Pill>
            </div>
          </div>
          <button onClick={onClose} className="rounded-xl p-2 text-[#8a7456] hover:bg-[#f5ece0]" aria-label="Fermer la fiche vente">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          <FicheTabsBar
            tabs={[
              { id: 'general', label: 'Général' },
              { id: 'products', label: 'Produits', badge: items.length || null },
              { id: 'payments', label: 'Paiements', badge: payments.length || null },
              { id: 'logistics', label: 'Livraison & docs' },
            ]}
            active={tab}
            onChange={setTab}
          />

          {tab === 'general' ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Section title="Informations generales" icon={ShoppingCart}>
                <div className="space-y-2">
                  <InfoRow label="Numero commande" value={`CMD-${String(order.id || '').slice(-6)}`} />
                  <InfoRow label="Date commande" value={fmtDate(order.date)} />
                  <InfoRow label="Client" value={client?.nom || client?.name || order.client_id || 'Client non renseigne'} />
                  <InfoRow label="Contact client" value={client?.tel || client?.whatsapp || client?.email || 'Non renseigne'} />
                  <InfoRow label="Canal / moyen" value={order.moyen_paiement || order.payment_method || 'Non renseigne'} />
                  <InfoRow label="Notes" value={order.notes || '-'} />
                </div>
              </Section>
              <Section title="Totaux et paiement" icon={CreditCard}>
                <div className="space-y-2">
                  <InfoRow label="Sous-total" value={fmtCurrency(Number(order.montant_ht || total))} />
                  <InfoRow label="Remise totale" value={fmtCurrency(Number(order.remise || 0))} />
                  <InfoRow label="Montant total" value={fmtCurrency(total)} />
                  <InfoRow label="Montant paye" value={fmtCurrency(paid)} />
                  <InfoRow label="Reste a payer" value={fmtCurrency(remaining)} />
                  <InfoRow label="Marge estimee" value={items.some((item) => item.margin_estimated) ? fmtCurrency(items.reduce((sum, item) => sum + Number(item.margin_estimated || 0), 0)) : 'Non disponible'} />
                </div>
              </Section>
            </div>
          ) : null}

          {tab === 'products' ? (
            <Section title="Lignes vendues" icon={Package}>
              <div className="space-y-3">
                {items.length === 0 ? (
                  <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-700">Aucune ligne detaillee trouvee.</p>
                ) : items.map((item) => (
                  <div key={item.id} className="rounded-xl border border-[#e8d5b0] bg-[#fffdf8] p-3">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-semibold text-[#2f2415]">{item.product_name || item.label || item.source_id || 'Produit vendu'}</p>
                      <Pill>{statusLabel(item.source_type || item.item_type || 'source')}</Pill>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-[#8a7456] md:grid-cols-4">
                      <span>Reference: <b className="text-[#2f2415]">{item.source_id || '-'}</b></span>
                      <span>Quantite: <b className="text-[#2f2415]">{item.quantity} {item.unit || ''}</b></span>
                      <span>Prix: <b className="text-[#2f2415]">{fmtCurrency(Number(item.unit_price || 0))}</b></span>
                      <span>Total: <b className="text-[#2f2415]">{fmtCurrency(Number(item.total || item.line_total || 0))}</b></span>
                    </div>
                    {item.source_id && onOpenSource ? (
                      <button onClick={() => onOpenSource(item.source_type || item.item_type, item.source_id)} className="mt-2 rounded-lg bg-[#f5ece0] px-3 py-1 text-xs font-semibold text-[#8a7456] hover:bg-[#e8d5b0]">
                        Voir fiche source
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </Section>
          ) : null}

          {tab === 'payments' ? (
            <>
              <Section title="Paiements et finances" icon={CreditCard}>
                <div className="space-y-3">
                  {payments.length === 0 ? <p className="text-sm text-[#8a7456]">Aucun paiement encaisse.</p> : payments.map((payment) => (
                    <div key={payment.id} className="rounded-xl border border-[#e8d5b0] bg-[#fffdf8] p-3">
                      <InfoRow label="Date" value={fmtDate(payment.date_paiement || payment.date)} />
                      <InfoRow label="Montant" value={fmtCurrency(Number(payment.montant || payment.montant_paye || payment.amount || 0))} />
                      <InfoRow label="Moyen" value={payment.moyen_paiement || payment.mode_paiement || '-'} />
                    </div>
                  ))}
                  {transactions.length ? (
                    <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">
                      Transaction(s): {transactions.map((tx) => tx.id).join(', ')}
                    </div>
                  ) : null}
                </div>
              </Section>
              <Section title="Impacts inter-modules" icon={CheckCircle}>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <ImpactBadge label="Source vendue" state={impactApplied ? 'ok' : orderStatus === 'brouillon' ? 'neutral' : 'warning'} />
                  <ImpactBadge label="Finance" state={paid > 0 && paidTransactions.length > 0 ? 'ok' : paid > 0 ? 'warning' : 'neutral'} />
                  <ImpactBadge label="Creance client" state={remaining > 0 ? 'ok' : 'neutral'} />
                  <ImpactBadge label="Comptabilite" state={hasAccounting ? 'ok' : 'neutral'} />
                  <ImpactBadge label="Tracabilite" state={linkedEvents.length ? 'ok' : 'warning'} />
                  <ImpactBadge label="Documents" state={invoices.length || linkedDocuments.length ? 'ok' : 'neutral'} />
                </div>
              </Section>
            </>
          ) : null}

          {tab === 'logistics' ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Section title="Livraison" icon={Truck}>
                <div className="space-y-2">
                  {deliveries.length === 0 ? <p className="text-sm text-[#8a7456]">Aucune livraison liee.</p> : deliveries.map((delivery) => (
                    <div key={delivery.id} className="rounded-xl border border-[#e8d5b0] bg-[#fffdf8] p-3 text-sm">
                      <InfoRow label="Statut" value={statusLabel(delivery.statut)} />
                      <InfoRow label="Date livraison" value={fmtDate(delivery.date_livraison)} />
                      <InfoRow label="Destinataire" value={delivery.destinataire || '-'} />
                      <InfoRow label="Adresse" value={delivery.adresse || '-'} />
                    </div>
                  ))}
                </div>
              </Section>
              <Section title="Documents et tracabilite" icon={FileText}>
                <div className="space-y-3">
                  {invoices.length === 0 && linkedDocuments.length === 0 ? <p className="text-sm text-[#8a7456]">Aucun document lie.</p> : null}
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border border-[#e8d5b0] bg-[#fffdf8] p-3">
                      <InfoRow label="Facture" value={invoice.numero_facture || invoice.id} />
                      <InfoRow label="Statut facture" value={statusLabel(normalizeInvoiceStatus(invoice))} />
                      <InfoRow label="Statut paiement" value={statusLabel(invoicePaymentStatus(invoice, order))} />
                      <InfoRow label="Montant" value={fmtCurrency(Number(invoice.montant_total || invoice.total_amount || total || 0))} />
                    </div>
                  ))}
                  {linkedEvents.length ? (
                    <div className="space-y-2">
                      {linkedEvents.slice(0, 4).map((event) => (
                        <div key={event.id} className="rounded-xl bg-[#fffdf8] p-3 text-sm">
                          <p className="font-semibold text-[#2f2415]">{event.title || event.event_type}</p>
                          <p className="text-xs text-[#8a7456]">{fmtDate(event.event_date)} - {event.module_source || 'module non renseigne'}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </Section>
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-[#e8d5b0] px-5 py-4">
          <button onClick={() => openAndClose(onEdit)} className="rounded-xl border border-[#e8d5b0] px-4 py-2 text-sm font-semibold text-[#8a7456] hover:bg-[#f5ece0]">Modifier</button>
          {remaining > 0 ? <button onClick={() => openAndClose(onPay)} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">Encaisser / Paiement</button> : null}
          <button onClick={() => openAndClose(onInvoice)} className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700">{invoices.length ? 'Ouvrir facture' : 'Generer facture'}</button>
          {orderStatus !== 'annule' ? <button onClick={onCancel} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Annuler</button> : null}
        </div>
      </div>
    </div>
  );
}
