import { CheckCircle2, RefreshCw, ShieldCheck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { getFinanceActivityFromSale, getFinanceCategoryFromSale } from '../services/financeSyncService';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim().toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const now = () => new Date().toISOString();
const amountOf = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.total ?? row.montant_total ?? 0);
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? 0);
const idOf = (row = {}) => String(row.id || '');
const isClosedOpportunity = (opp = {}) => /converti|convertie|ferme|fermée|cloture|clôture|commande/.test(clean(opp.status || opp.statut || opp.etat));

function linkedOrderForOpportunity(opp = {}, orders = []) {
  const oppId = String(opp.id || '');
  const sourceId = String(opp.source_id || opp.related_id || opp.entity_id || '');
  const sourceModule = clean(opp.source_module || opp.created_from || opp.module_source || '');
  return arr(orders).find((order) => {
    const orderSourceId = String(order.source_id || order.related_id || order.entity_id || '');
    const orderSourceModule = clean(order.source_module || order.created_from || order.module_source || '');
    return String(order.opportunity_id || '') === oppId
      || String(order.source_opportunity_id || '') === oppId
      || String(order.converted_opportunity_id || '') === oppId
      || (sourceId && orderSourceId === sourceId && (!sourceModule || !orderSourceModule || sourceModule === orderSourceModule));
  });
}

function orderForPayment(payment = {}, orders = []) {
  const orderId = String(payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
  return arr(orders).find((order) => String(order.id) === orderId) || {};
}

function financeExistsForPayment(payment = {}, order = {}, finances = []) {
  const paymentId = String(payment.id || '');
  const orderId = String(order.id || payment.order_id || payment.sale_id || payment.source_record_id || payment.related_id || '');
  const amount = amountOf(payment);
  return arr(finances).some((trx) => {
    const trxPaymentId = String(trx.payment_id || '');
    const trxOrderId = String(trx.order_id || trx.sale_id || trx.related_id || trx.source_record_id || '');
    const trxAmount = amountOf(trx);
    return (paymentId && trxPaymentId === paymentId)
      || (orderId && trxOrderId === orderId && Math.abs(trxAmount - amount) < 1);
  });
}

function documentExistsForInvoice(invoice = {}, documents = []) {
  const invoiceId = String(invoice.id || '');
  const orderId = String(invoice.order_id || invoice.sale_id || invoice.related_id || '');
  return arr(documents).some((doc) => String(doc.invoice_id || '') === invoiceId
    || String(doc.related_id || doc.entity_id || doc.order_id || '') === invoiceId
    || (orderId && String(doc.order_id || doc.sale_id || doc.related_id || '') === orderId));
}

function orderForAnimal(animal = {}, orders = []) {
  const animalId = String(animal.id || animal.tag || animal.numero || '');
  return arr(orders).find((order) => {
    const sourceType = clean(`${order.source_type || ''} ${order.source_module || ''} ${order.product_type || ''}`);
    const sourceId = String(order.source_id || order.product_id || order.entity_id || order.related_id || '');
    return animalId && sourceId === animalId && /animal|animaux|bovin|ovin|caprin/.test(sourceType);
  });
}

function buildFinanceFromPayment(payment, order) {
  const amount = amountOf(payment);
  const date = payment.date_paiement || payment.date || today();
  return {
    id: makeId('TRX'),
    type: 'entree',
    libelle: `Encaissement ${order.product_name || order.libelle || order.id || payment.order_id || 'vente'}`,
    montant: amount,
    amount,
    date,
    categorie: getFinanceCategoryFromSale(order),
    activite: getFinanceActivityFromSale(order),
    module_lie: 'ventes',
    source_module: 'ventes',
    related_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    source_record_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    order_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    sale_id: order.id || payment.order_id || payment.sale_id || payment.source_record_id || '',
    payment_id: payment.id,
    client_id: order.client_id || payment.client_id || '',
    invoice_id: order.invoice_id || payment.invoice_id || '',
    source_type: order.source_type || order.type_vente || order.product_type || '',
    source_id: order.source_id || order.product_id || order.entity_id || '',
    statut: 'paye',
    moyen_paiement: payment.moyen_paiement || payment.mode_paiement || '',
    notes: `Transaction créée automatiquement depuis paiement ${payment.id}`,
    created_at: now(),
  };
}

function buildDocumentFromInvoice(invoice, order) {
  return {
    id: makeId('DOC'),
    title: `Facture ${invoice.numero || invoice.id || order.id || ''}`,
    titre: `Facture ${invoice.numero || invoice.id || order.id || ''}`,
    type: 'facture_vente',
    module_lie: 'ventes',
    entity_type: 'invoice',
    entity_id: invoice.id,
    invoice_id: invoice.id,
    order_id: invoice.order_id || invoice.sale_id || order.id || '',
    sale_id: invoice.order_id || invoice.sale_id || order.id || '',
    related_id: invoice.id,
    montant: toNumber(invoice.montant_total ?? invoice.total ?? orderAmount(order)),
    date: invoice.date || invoice.date_facture || today(),
    statut: 'genere',
    status: 'genere',
    description: `Document facture lié à la vente ${invoice.order_id || invoice.sale_id || order.id || ''}`,
    created_at: now(),
  };
}

export default function SalesWorkflowRepairPanel(props) {
  const [saving, setSaving] = useState(false);
  const orders = arr(props.rows);
  const payments = arr(props.paymentsList || props.payments);
  const finances = arr(props.transactions || props.finances);
  const opportunities = arr(props.opportunities);
  const invoices = arr(props.invoicesList || props.invoices);
  const documents = arr(props.documents);
  const animals = arr(props.animaux);

  const audit = useMemo(() => {
    const paymentsWithoutFinance = payments
      .map((payment) => ({ payment, order: orderForPayment(payment, orders) }))
      .filter(({ payment, order }) => amountOf(payment) > 0 && !financeExistsForPayment(payment, order, finances));

    const opportunitiesToClose = opportunities
      .map((opp) => ({ opp, order: linkedOrderForOpportunity(opp, orders) }))
      .filter(({ opp, order }) => order && !isClosedOpportunity(opp));

    const invoicesWithoutDocument = invoices
      .map((invoice) => ({ invoice, order: orders.find((order) => String(order.id) === String(invoice.order_id || invoice.sale_id || invoice.related_id || '')) || {} }))
      .filter(({ invoice }) => !documentExistsForInvoice(invoice, documents));

    const soldAnimalsToLink = animals
      .map((animal) => ({ animal, order: orderForAnimal(animal, orders) }))
      .filter(({ animal, order }) => /vendu|vendue/.test(clean(animal.status || animal.statut)) && order && !animal.sale_order_id && !animal.commande_id && !animal.vente_id);

    return { paymentsWithoutFinance, opportunitiesToClose, invoicesWithoutDocument, soldAnimalsToLink };
  }, [orders, payments, finances, opportunities, invoices, documents, animals]);

  const totalActions = audit.paymentsWithoutFinance.length + audit.opportunitiesToClose.length + audit.invoicesWithoutDocument.length + audit.soldAnimalsToLink.length;

  const repair = async () => {
    if (saving) return;
    if (!totalActions) return toast.success('Workflow ventes déjà cohérent');
    try {
      setSaving(true);

      for (const { payment, order } of audit.paymentsWithoutFinance) {
        // eslint-disable-next-line no-await-in-loop
        await props.onCreateFinanceTransaction?.(buildFinanceFromPayment(payment, order));
      }

      for (const { opp, order } of audit.opportunitiesToClose) {
        // eslint-disable-next-line no-await-in-loop
        await props.onUpdateOpportunity?.(opp.id, {
          status: 'convertie',
          statut: 'convertie',
          converted_order_id: order.id,
          converted_at: opp.converted_at || now(),
          updated_at: now(),
        });
      }

      for (const { invoice, order } of audit.invoicesWithoutDocument) {
        // eslint-disable-next-line no-await-in-loop
        await props.onCreateDocument?.(buildDocumentFromInvoice(invoice, order));
      }

      for (const { animal, order } of audit.soldAnimalsToLink) {
        // eslint-disable-next-line no-await-in-loop
        await props.onUpdateAnimal?.(animal.id, {
          sale_order_id: order.id,
          commande_id: order.id,
          vente_id: order.id,
          sold_at: animal.sold_at || order.date || today(),
          sale_price: orderAmount(order),
          prix_vente: orderAmount(order),
          updated_at: now(),
        });
      }

      await Promise.allSettled([
        props.onRefreshFinances?.(),
        props.onRefreshPayments?.(),
        props.onRefreshInvoices?.(),
        props.onRefreshDocuments?.(),
        props.onRefreshOpportunities?.(),
        props.onRefreshAnimals?.(),
        props.onRefreshWorkflow?.(),
      ]);

      toast.success('Workflow ventes réparé et synchronisé');
    } catch (error) {
      toast.error(error.message || 'Correction du parcours ventes impossible');
    } finally {
      setSaving(false);
    }
  };

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
      <div>
        <p className="inline-flex items-center gap-2 rounded-full border border-[#eadcc2] bg-[#fffdf8] px-3 py-1 text-xs font-black text-[#8a7456]"><ShieldCheck size={14} /> Correction contrôlée</p>
        <h3 className="mt-3 text-xl font-black text-[#2f2415]">Réparer le parcours ventes</h3>
        <p className="mt-1 text-sm text-[#8a7456]">Corrige les liens manquants entre ventes, paiements, finances, factures, documents, opportunités et animaux vendus.</p>
      </div>
      <button type="button" disabled={saving || !totalActions} onClick={repair} className="rounded-xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white disabled:opacity-50">
        {saving ? <RefreshCw size={14} className="inline animate-spin" /> : <Wrench size={14} className="inline" />} Corriger maintenant
      </button>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Metric label="Paiements sans finance" value={audit.paymentsWithoutFinance.length} />
      <Metric label="Opportunités à fermer" value={audit.opportunitiesToClose.length} />
      <Metric label="Factures sans document" value={audit.invoicesWithoutDocument.length} />
      <Metric label="Animaux à relier" value={audit.soldAnimalsToLink.length} />
    </div>

    {!totalActions ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-bold text-emerald-700"><CheckCircle2 size={14} className="inline" /> Aucun correctif ventes automatique à appliquer.</div> : null}
    <p className="text-xs text-[#8a7456]">Sécurité : la correction ne crée pas de vente fictive. Elle synchronise seulement les liens et transactions manquants lorsqu’une source fiable existe déjà.</p>
  </section>;
}

function Metric({ label, value }) {
  return <div className={`rounded-2xl border p-4 ${value ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
    <p className="text-xs uppercase tracking-wide text-[#8a7456]">{label}</p>
    <p className={`mt-2 text-xl font-black ${value ? 'text-amber-700' : 'text-emerald-700'}`}>{value}</p>
  </div>;
}
