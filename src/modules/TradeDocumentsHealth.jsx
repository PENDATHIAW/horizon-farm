import { AlertTriangle, FileText, Receipt, Users, Truck } from 'lucide-react';
import Btn from '../components/Btn';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency } from '../utils/format';
import { transactionHasProof } from '../utils/accountingProof';

const arr = (value) => Array.isArray(value) ? value : [];
const amountOf = (row = {}) => Number(row.montant_total ?? row.total_amount ?? row.total ?? row.amount ?? row.montant ?? 0) || 0;
const paidOf = (row = {}) => Number(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.amount ?? row.montant ?? 0) || 0;
const paymentOrderId = (row = {}) => row.order_id || row.sale_id || row.source_record_id || row.related_id;
const ownerName = (row = {}) => row.nom || row.name || row.title || row.id || 'Tiers';
const docLinkedTo = (doc = {}, id = '') => [doc.entity_id, doc.client_id, doc.fournisseur_id, doc.supplier_id, doc.related_id, doc.source_record_id].some((value) => String(value || '') === String(id || ''));
const financeLinkedTo = (tx = {}, id = '') => [tx.client_id, tx.fournisseur_id, tx.supplier_id, tx.related_id, tx.source_record_id].some((value) => String(value || '') === String(id || ''));
const orderClientId = (order = {}) => order.client_id || order.customer_id || order.related_id;

function clientSummary(client, orders = [], payments = [], docs = [], finances = []) {
  const clientOrders = arr(orders).filter((order) => String(orderClientId(order) || '') === String(client.id || ''));
  const orderIds = new Set(clientOrders.map((order) => String(order.id)));
  const clientPayments = arr(payments).filter((payment) => orderIds.has(String(paymentOrderId(payment) || '')) || String(payment.client_id || '') === String(client.id || ''));
  const ca = clientOrders.reduce((sum, order) => sum + amountOf(order), 0);
  const paid = Math.min(ca, clientPayments.reduce((sum, payment) => sum + paidOf(payment), 0) || clientOrders.reduce((sum, order) => sum + paidOf(order), 0));
  const receivable = Math.max(0, ca - paid);
  const proofMissing = arr(finances).filter((tx) => financeLinkedTo(tx, client.id) && amountOf(tx) > 0 && !transactionHasProof(tx, docs)).length;
  return { owner: client, total: ca, paid, balance: receivable, docs: docs.filter((doc) => docLinkedTo(doc, client.id)).length, proofMissing, action: receivable > 0 ? 'Relancer paiement' : proofMissing > 0 ? 'Compléter preuve / facture' : 'OK' };
}

function supplierSummary(supplier, docs = [], finances = [], stocks = []) {
  const txs = arr(finances).filter((tx) => financeLinkedTo(tx, supplier.id));
  const purchases = arr(stocks).filter((stock) => String(stock.fournisseur_id || stock.supplier_id || stock.related_id || '') === String(supplier.id || ''));
  const debt = Number(supplier.dettes || 0) || txs.filter((tx) => String(tx.statut || tx.status || '').toLowerCase() !== 'paye' && String(tx.type || '').toLowerCase() === 'sortie').reduce((sum, tx) => sum + amountOf(tx), 0);
  const proofMissing = txs.filter((tx) => amountOf(tx) > 0 && !transactionHasProof(tx, docs)).length;
  return { owner: supplier, total: purchases.reduce((sum, row) => sum + amountOf(row), 0), paid: Math.max(0, amountOf(supplier) - debt), balance: debt, docs: docs.filter((doc) => docLinkedTo(doc, supplier.id)).length, proofMissing, action: debt > 0 ? 'Planifier paiement' : proofMissing > 0 ? 'Compléter preuve / facture' : 'OK' };
}

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={14} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><b className="block text-earth break-words">{value}</b><span className="text-xs text-slate">{label}</span></div>;
}

export default function TradeDocumentsHealth({ mode = 'clients', rows = [], salesOrders = [], payments = [], finances = [], transactions = [], stocks = [], documents, onNavigate }) {
  const documentsCrud = useCrudModule('documents');
  const docs = documents || documentsCrud.rows || [];
  const txs = arr(finances).length ? finances : transactions;
  const summaries = mode === 'fournisseurs'
    ? arr(rows).map((supplier) => supplierSummary(supplier, docs, txs, stocks))
    : arr(rows).map((client) => clientSummary(client, salesOrders, payments, docs, txs));
  const withBalance = summaries.filter((item) => item.balance > 0).sort((a, b) => b.balance - a.balance);
  const withMissingProof = summaries.filter((item) => item.proofMissing > 0).sort((a, b) => b.proofMissing - a.proofMissing);
  const totalBalance = withBalance.reduce((sum, item) => sum + item.balance, 0);
  const missingProofCount = withMissingProof.reduce((sum, item) => sum + item.proofMissing, 0);
  const title = mode === 'fournisseurs' ? 'Suivi fournisseurs & preuves/factures' : 'Suivi clients & preuves/factures';
  const OwnerIcon = mode === 'fournisseurs' ? Truck : Users;

  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
      <div>
        <p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><FileText size={15} /> {title}</p>
        <h3 className="text-xl font-semibold text-earth mt-1">Argent à suivre et pièces à compléter</h3>
        <p className="text-sm text-slate mt-1">Vue courte pour repérer les soldes ouverts et les preuves/factures manquantes avant les tableaux détaillés.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm min-w-[320px]">
        <Mini icon={OwnerIcon} label="Tiers" value={rows.length} />
        <Mini icon={Receipt} label={mode === 'fournisseurs' ? 'À payer' : 'À encaisser'} value={fmtCurrency(totalBalance)} danger={totalBalance > 0} />
        <Mini icon={AlertTriangle} label="Preuves manquantes" value={missingProofCount} danger={missingProofCount > 0} />
        <Mini icon={FileText} label="Documents liés" value={docs.length} />
      </div>
    </div>

    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth">{mode === 'fournisseurs' ? 'Paiements fournisseurs à suivre' : 'Créances clients à relancer'}</p>
        <div className="mt-3 space-y-2 text-sm">
          {withBalance.slice(0, 4).map((item) => <div key={item.owner.id || ownerName(item.owner)} className="rounded-xl bg-white border border-line px-3 py-2"><b className="text-earth">{ownerName(item.owner)}</b><p className="text-xs text-slate">{fmtCurrency(item.balance)} · {item.action}</p></div>)}
          {!withBalance.length ? <div className="rounded-xl bg-white border border-line px-3 py-2 text-slate">Aucun solde ouvert prioritaire.</div> : null}
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-card p-4">
        <p className="font-semibold text-earth">Preuves / factures à compléter</p>
        <div className="mt-3 space-y-2 text-sm">
          {withMissingProof.slice(0, 4).map((item) => <div key={item.owner.id || ownerName(item.owner)} className="rounded-xl bg-white border border-line px-3 py-2"><b className="text-earth">{ownerName(item.owner)}</b><p className="text-xs text-slate">{item.proofMissing} pièce(s) manquante(s)</p></div>)}
          {!withMissingProof.length ? <div className="rounded-xl bg-white border border-line px-3 py-2 text-slate">Aucune preuve/facture manquante détectée pour ces tiers.</div> : null}
        </div>
      </div>
    </div>

    <div className="flex justify-end"><Btn small variant="outline" onClick={() => onNavigate?.('documents')}>Ouvrir documents</Btn></div>
  </section>;
}
