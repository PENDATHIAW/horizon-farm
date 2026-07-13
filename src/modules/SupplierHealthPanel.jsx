import { AlertTriangle, CheckCircle2, FileText, Package, Receipt, Truck } from 'lucide-react';
import { documentIsUsableProof } from '../utils/accountingProof';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const money = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.cost ?? row.cout);
const supplierName = (row = {}) => clean(row.nom || row.name || row.raison_sociale || row.fournisseur || row.id || 'Fournisseur');
const supplierId = (row = {}) => clean(row.id || row.fournisseur_id || row.supplier_id);
const stockSupplierId = (row = {}) => clean(row.fournisseur_id || row.supplier_id || row.fournisseur);
const txSupplierId = (row = {}) => clean(row.fournisseur_id || row.supplier_id || row.related_id);
const isExpense = (row = {}) => ['sortie', 'depense', 'dépense', 'expense', 'achat'].some((word) => lower(`${row.type || ''} ${row.categorie || ''}`).includes(word));
const isUnpaid = (row = {}) => ['impaye', 'partiel', 'a_payer', 'à payer'].includes(lower(row.statut || row.status));
const hasProof = (row = {}, docs = []) => row.document_id || row.linked_document_id || row.piece_jointe || row.file_url || row.justificatif_url || arr(docs).some((doc) => clean(doc.transaction_id || doc.finance_id || doc.related_id || doc.entity_id) === clean(row.id) && documentIsUsableProof(doc));

function buildRows({ fournisseurs = [], stocks = [], finances = [], documents = [] }) {
  return arr(fournisseurs).map((supplier) => {
    const id = supplierId(supplier);
    const stockRows = arr(stocks).filter((row) => stockSupplierId(row) === id || lower(row.fournisseur || '').includes(lower(supplierName(supplier))));
    const txRows = arr(finances).filter((row) => isExpense(row) && (txSupplierId(row) === id || lower(row.libelle || '').includes(lower(supplierName(supplier)))));
    const debtFromSupplier = toNumber(supplier.dettes ?? supplier.dette ?? supplier.solde_du ?? supplier.reste_a_payer);
    const unpaidTx = txRows.filter(isUnpaid).reduce((sum, row) => sum + money(row), 0);
    const spent = txRows.reduce((sum, row) => sum + money(row), 0);
    const missingProof = txRows.filter((row) => !hasProof(row, documents)).length;
    const stockValue = stockRows.reduce((sum, row) => sum + toNumber(row.quantite) * toNumber(row.prixunit ?? row.prixUnit ?? row.prix_unitaire), 0);
    const debt = Math.max(debtFromSupplier, unpaidTx);
    const risk = debt > 0 || missingProof > 0 || ['a_risque', 'à risque', 'bloque', 'bloqué'].includes(lower(supplier.statut || supplier.status));
    return { supplier, id, name: supplierName(supplier), debt, spent, stockRows: stockRows.length, stockValue, missingProof, risk };
  }).sort((a, b) => b.debt - a.debt || b.spent - a.spent);
}
function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={15} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><p className="mt-1 text-xs text-slate">{label}</p><p className="font-semibold text-earth break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${danger ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{children}</span>;
}

export default function SupplierHealthPanel({ rows = [], stocks = [], finances = [], documents = [], onNavigate }) {
  const supplierRows = buildRows({ fournisseurs: rows, stocks, finances, documents });
  const totalDebt = supplierRows.reduce((sum, row) => sum + row.debt, 0);
  const totalSpent = supplierRows.reduce((sum, row) => sum + row.spent, 0);
  const riskRows = supplierRows.filter((row) => row.risk);
  const missingProof = supplierRows.reduce((sum, row) => sum + row.missingProof, 0);
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><Truck size={15} /> Santé fournisseurs</p><h3 className="text-xl font-semibold text-earth mt-1">Achats, dettes et preuves fournisseurs</h3><p className="text-sm text-slate mt-1">Les achats doivent alimenter stock, finances, documents et suivi fournisseur sans action technique manuelle.</p></div>{riskRows.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {riskRows.length} fournisseur(s) à surveiller</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Fournisseurs maîtrisés</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><Mini icon={Truck} label="Fournisseurs" value={supplierRows.length} /><Mini icon={Receipt} label="Achats / dépenses" value={fmtCurrency(totalSpent)} /><Mini icon={AlertTriangle} label="Dettes" value={fmtCurrency(totalDebt)} danger={totalDebt > 0} /><Mini icon={FileText} label="Preuves manquantes" value={missingProof} danger={missingProof > 0} /></div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-card"><table className="min-w-full text-sm"><thead className="bg-earth text-white"><tr><th className="px-3 py-2 text-left">Fournisseur</th><th className="px-3 py-2 text-right">Dépenses</th><th className="px-3 py-2 text-right">Dette</th><th className="px-3 py-2 text-right">Stock reçu</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{supplierRows.slice(0, 6).length ? supplierRows.slice(0, 6).map((row) => <tr key={row.id || row.name} className="border-t border-line"><td className="px-3 py-2"><b className="text-earth">{row.name}</b><p className="text-xs text-slate">Preuves manquantes : {row.missingProof}</p></td><td className="px-3 py-2 text-right font-semibold text-earth">{fmtCurrency(row.spent)}</td><td className="px-3 py-2 text-right font-semibold text-earth">{fmtCurrency(row.debt)}</td><td className="px-3 py-2 text-right text-slate">{row.stockRows} ligne(s)</td><td className="px-3 py-2"><Badge danger={row.risk}>{row.risk ? 'À suivre' : 'À jour'}</Badge></td></tr>) : <tr><td colSpan="5" className="px-3 py-6 text-center text-slate">Aucun fournisseur enregistré pour le moment.</td></tr>}</tbody></table></div>
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth"><Package size={14} className="inline" /> Stock</button><button type="button" onClick={() => onNavigate?.('finances')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Finances</button><button type="button" onClick={() => onNavigate?.('documents')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Documents</button></div>
  </section>;
}
