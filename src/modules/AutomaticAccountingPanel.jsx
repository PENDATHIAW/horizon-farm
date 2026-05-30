import { CheckCircle2, FileText, Receipt, Scale, ShieldCheck } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const money = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const isSale = (row = {}) => lower(`${row.module_lie || ''} ${row.source_module || ''} ${row.categorie || ''} ${row.libelle || ''}`).includes('vente');
const isExpense = (row = {}) => ['sortie', 'depense', 'dépense', 'expense'].includes(lower(row.type));
const isCashIn = (row = {}) => ['entree', 'entrée', 'income'].includes(lower(row.type));
const isCredit = (row = {}) => ['impaye', 'partiel'].includes(lower(row.statut || row.status));
const hasProof = (row = {}) => row.document_id || row.linked_document_id || row.piece_jointe || row.file_url || row.justificatif_url || row.invoice_id;

function compute(transactions = [], documents = []) {
  const tx = arr(transactions);
  const salesEntries = tx.filter((row) => isCashIn(row) && isSale(row));
  const expenses = tx.filter(isExpense);
  const credits = tx.filter((row) => isCashIn(row) && isCredit(row));
  const proofMissing = tx.filter((row) => money(row) > 0 && !hasProof(row) && !arr(documents).some((doc) => String(doc.transaction_id || doc.finance_id || doc.related_id || doc.entity_id) === String(row.id)));
  const revenue = salesEntries.reduce((sum, row) => sum + money(row), 0);
  const charges = expenses.reduce((sum, row) => sum + money(row), 0);
  return { salesEntries, expenses, credits, proofMissing, revenue, charges };
}
function Mini({ icon: Icon, label, value, hint, danger = false }) {
  return <div className={`rounded-xl border px-3 py-2 ${danger ? 'border-amber-200 bg-amber-50' : 'border-[#eadcc2] bg-white'}`}><Icon size={15} className={danger ? 'text-amber-700' : 'text-[#9a6b12]'} /><b className="block text-[#2f2415]">{value}</b><span className="text-xs text-[#8a7456]">{label}</span>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

export default function AutomaticAccountingPanel({ transactions = [], documents = [], onNavigate }) {
  const k = compute(transactions, documents);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Scale size={15} /> Lignes comptables automatiques</p><h3 className="text-xl font-black text-[#2f2415] mt-1">La comptabilité vérifie les actions métier</h3><p className="text-sm text-[#8a7456] mt-1">Ventes, paiements, reste à encaisser, achats et dépenses alimentent automatiquement les lignes à contrôler. La saisie manuelle sert seulement aux corrections exceptionnelles.</p></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 size={15} className="inline" /> Automatisation prioritaire</div></div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2 text-sm"><Mini icon={Receipt} label="Ventes contrôlées" value={k.salesEntries.length} hint={fmtCurrency(k.revenue)} /><Mini icon={FileText} label="Dépenses suivies" value={k.expenses.length} hint={fmtCurrency(k.charges)} /><Mini icon={ShieldCheck} label="Reste à encaisser suivi" value={k.credits.length} danger={k.credits.length > 0} /><Mini icon={FileText} label="Preuves à joindre" value={k.proofMissing.length} danger={k.proofMissing.length > 0} /><Mini icon={Scale} label="Résultat simplifié" value={fmtCurrency(k.revenue - k.charges)} danger={k.revenue - k.charges < 0} /><Mini icon={CheckCircle2} label="Saisie manuelle" value="Exception" hint="correction uniquement" /></div>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Règle produit :</b> tu n’as pas besoin d’être comptable pour vendre ou dépenser. L’ERP crée les lignes depuis les modules métier ; Comptabilité sert à contrôler les preuves, le reste à encaisser, le reste à payer et les corrections.</div>
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ventes</button><button type="button" onClick={() => onNavigate?.('finances')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Finances</button><button type="button" onClick={() => onNavigate?.('documents')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Documents</button></div>
  </section>;
}
