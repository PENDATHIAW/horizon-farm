import { AlertTriangle, CheckCircle2, FileText, FolderOpen, Receipt, ShieldCheck } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';
import { transactionHasProof } from '../utils/accountingProof';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const docLinkedTo = (doc = {}, id = '') => [doc.entity_id, doc.transaction_id, doc.finance_id, doc.related_id, doc.source_record_id, doc.invoice_id].map(clean).includes(clean(id));
const hasDocFor = (docs = [], id = '') => arr(docs).some((doc) => docLinkedTo(doc, id));
const invoiceOrderId = (row = {}) => clean(row.order_id || row.sale_id || row.source_record_id || row.related_id);
const docCategory = (doc = {}) => lower(doc.document_category || doc.category || doc.type || doc.title);
const isFinanceDossier = (doc = {}) => docCategory(doc).includes('dossier_financeur') || docCategory(doc).includes('banque') || docCategory(doc).includes('partenaire');
const isInvoiceDoc = (doc = {}) => docCategory(doc).includes('facture') || docCategory(doc).includes('recu') || docCategory(doc).includes('reçu');

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><p className="mt-1 text-xs text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${danger ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700'}`}>{children}</span>;
}

export default function DocumentControlPanel({ rows = [], transactions = [], salesOrders = [], invoices = [], businessPlans = [], investissements = [], onNavigate }) {
  const docs = arr(rows);
  const missingTransactionProof = arr(transactions).filter((tx) => amount(tx) > 0 && !transactionHasProof(tx, docs));
  const missingInvoiceDocs = arr(invoices).filter((invoice) => !hasDocFor(docs, invoice.id) && !hasDocFor(docs, invoiceOrderId(invoice)));
  const salesWithoutDocs = arr(salesOrders).filter((sale) => !hasDocFor(docs, sale.id) && !arr(invoices).some((invoice) => invoiceOrderId(invoice) === clean(sale.id))).slice(0, 99);
  const financeDossiers = docs.filter(isFinanceDossier);
  const invoicesDocs = docs.filter(isInvoiceDoc);
  const investmentDocsMissing = arr(investissements).filter((row) => amount(row) > 0 && !hasDocFor(docs, row.id));
  const priorities = [
    ...missingTransactionProof.map((row) => ({ id: `tx-${row.id}`, type: 'Finance', label: row.libelle || row.id, amount: amount(row), status: 'Preuve manquante' })),
    ...missingInvoiceDocs.map((row) => ({ id: `inv-${row.id}`, type: 'Facture', label: row.numero_facture || row.id, amount: amount(row), status: 'Document facture manquant' })),
    ...investmentDocsMissing.map((row) => ({ id: `invst-${row.id}`, type: 'Investissement', label: row.libelle || row.designation || row.id, amount: amount(row), status: 'Justificatif investissement manquant' })),
  ].slice(0, 8);
  const riskCount = missingTransactionProof.length + missingInvoiceDocs.length + investmentDocsMissing.length;
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><ShieldCheck size={15} /> Contrôle documentaire</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Preuves, factures et dossiers financeurs</h3><p className="text-sm text-[#8a7456] mt-1">Les documents doivent être rattachés aux ventes, finances, investissements, fournisseurs, clients et dossiers banque/partenaire.</p></div>{riskCount ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800"><AlertTriangle size={15} className="inline" /> {riskCount} preuve(s) à compléter</div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Documents maîtrisés</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"><Mini icon={FolderOpen} label="Documents" value={docs.length} /><Mini icon={Receipt} label="Factures/reçus" value={invoicesDocs.length} /><Mini icon={FileText} label="Dossiers financeurs" value={financeDossiers.length} /><Mini icon={AlertTriangle} label="Preuves finances" value={missingTransactionProof.length} danger={missingTransactionProof.length > 0} /><Mini icon={Receipt} label="Factures à relier" value={missingInvoiceDocs.length} danger={missingInvoiceDocs.length > 0} /><Mini icon={FileText} label="BP disponibles" value={arr(businessPlans).length} /></div>
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]"><table className="min-w-full text-sm"><thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Élément</th><th className="px-3 py-2 text-left">Module</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{priorities.length ? priorities.map((row) => <tr key={row.id} className="border-t border-[#eadcc2]"><td className="px-3 py-2"><b className="text-[#2f2415]">{row.label}</b></td><td className="px-3 py-2 text-[#7d6a4a]">{row.type}</td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(row.amount)}</td><td className="px-3 py-2"><Badge danger>{row.status}</Badge></td></tr>) : <tr><td colSpan="4" className="px-3 py-6 text-center text-[#8a7456]">Aucun document prioritaire manquant.</td></tr>}</tbody></table></div>
    {salesWithoutDocs.length ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"><b>Ventes sans facture/document détecté :</b> {salesWithoutDocs.slice(0, 5).map((sale) => sale.id).join(' · ')}</div> : null}
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ventes</button><button type="button" onClick={() => onNavigate?.('finances')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Finances</button><button type="button" onClick={() => onNavigate?.('rapports')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Dossier financeur</button></div>
  </section>;
}
