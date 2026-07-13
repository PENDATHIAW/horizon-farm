import { BookOpenCheck, CreditCard, Receipt, Scale } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value = '') => String(value || '').toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount);
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount);
const orderPaid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
const isIn = (row = {}) => ['entree', 'entrée', 'income'].includes(lower(row.type));
const isOut = (row = {}) => ['sortie', 'depense', 'dépense', 'expense', 'charge'].includes(lower(row.type));
const label = (row = {}) => row.libelle || row.title || row.product_name || row.id || 'Mouvement';

function buildEntries({ transactions = [], salesOrders = [], payments = [] }) {
  const entries = [];
  arr(salesOrders).forEach((sale) => {
    const total = orderAmount(sale);
    const paid = Math.max(orderPaid(sale), arr(payments).filter((p) => String(p.order_id || p.sale_id || p.source_record_id) === String(sale.id)).reduce((sum, p) => sum + paymentAmount(p), 0));
    const credit = Math.max(0, total - paid);
    if (paid > 0) entries.push({ id: `cash-${sale.id}`, source: `Vente ${sale.id}`, debit: 'Caisse / Banque', credit: 'Ventes', amount: paid, meaning: 'Argent client reçu automatiquement.' });
    if (credit > 0) entries.push({ id: `receivable-${sale.id}`, source: `Vente ${sale.id}`, debit: 'Reste à encaisser clients', credit: 'Ventes', amount: credit, meaning: 'Reste à encaisser suivi automatiquement.' });
  });
  arr(transactions).forEach((tx) => {
    if (isOut(tx)) entries.push({ id: `expense-${tx.id}`, source: label(tx), debit: tx.categorie || 'Charges', credit: 'Caisse / Banque', amount: amount(tx), meaning: 'Dépense enregistrée depuis le module métier.' });
    if (isIn(tx) && !lower(`${tx.module_lie || ''} ${tx.source_module || ''} ${tx.categorie || ''}`).includes('vente')) entries.push({ id: `income-${tx.id}`, source: label(tx), debit: 'Caisse / Banque', credit: tx.categorie || 'Produits', amount: amount(tx), meaning: 'Entrée d’argent non issue d’une vente.' });
  });
  return entries.filter((entry) => entry.amount > 0).slice(0, 12);
}
function Mini({ icon: Icon, label, value }) {
  return <div className="rounded-xl border border-line bg-white p-3"><Icon size={15} className="text-horizon-dark" /><p className="mt-1 text-xs text-slate">{label}</p><p className="font-semibold text-earth">{value}</p></div>;
}

export default function AccountingAutoEntriesPreview({ transactions = [], salesOrders = [], payments = [] }) {
  const entries = buildEntries({ transactions, salesOrders, payments });
  const totalDebit = entries.reduce((sum, row) => sum + row.amount, 0);
  const totalCredit = totalDebit;
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><BookOpenCheck size={15} /> Lignes générées automatiquement</p><h3 className="text-xl font-semibold text-earth mt-1">Lecture simplifiée des lignes comptables</h3><p className="text-sm text-slate mt-1">Ces lignes sont déduites des ventes, paiements et dépenses. La saisie manuelle doit rester exceptionnelle.</p></div><div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive">Équilibré</div></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2"><Mini icon={Receipt} label="Lignes affichées" value={entries.length} /><Mini icon={CreditCard} label="Côté argent/source" value={fmtCurrency(totalDebit)} /><Mini icon={Scale} label="Côté vente/dépense" value={fmtCurrency(totalCredit)} /><Mini icon={BookOpenCheck} label="Mode" value="Automatique" /></div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-card"><table className="min-w-full text-sm"><thead className="bg-earth text-white"><tr><th className="px-3 py-2 text-left">Source</th><th className="px-3 py-2 text-left">Argent / reste</th><th className="px-3 py-2 text-left">Vente / dépense</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2 text-left">Sens métier</th></tr></thead><tbody>{entries.length ? entries.map((entry) => <tr key={entry.id} className="border-t border-line"><td className="px-3 py-2 font-semibold text-earth">{entry.source}</td><td className="px-3 py-2 text-slate">{entry.debit}</td><td className="px-3 py-2 text-slate">{entry.credit}</td><td className="px-3 py-2 text-right font-semibold text-earth">{fmtCurrency(entry.amount)}</td><td className="px-3 py-2 text-slate">{entry.meaning}</td></tr>) : <tr><td colSpan="5" className="px-3 py-6 text-center text-slate">Aucune ligne automatique à afficher pour le moment.</td></tr>}</tbody></table></div>
  </section>;
}
