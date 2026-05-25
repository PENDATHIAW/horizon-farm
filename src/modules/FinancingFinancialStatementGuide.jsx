import { Calculator, Landmark, Table2 } from 'lucide-react';
import { fmtCurrency, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const money = (value) => fmtCurrency(Math.round(toNumber(value)));
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? 0);
const paid = (row = {}) => toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid ?? row.montant ?? 0);

function yearRows(data = {}) {
  const sales = arr(data.salesOrders || data.sales_orders);
  const transactions = arr(data.transactions || data.finances);
  const ca = sales.reduce((sum, row) => sum + amount(row), 0);
  const income = Math.max(ca, transactions.filter((row) => String(row.type || '').toLowerCase().includes('entree')).reduce((sum, row) => sum + amount(row), 0));
  const costs = transactions.filter((row) => String(row.type || '').toLowerCase().includes('sortie')).reduce((sum, row) => sum + amount(row), 0);
  const baseRevenue = income || 52000000;
  const baseCosts = costs || Math.round(baseRevenue * 0.68);
  return [1, 2, 3].map((year) => {
    const growth = year === 1 ? 1 : year === 2 ? 1.12 : 1.25;
    const revenue = baseRevenue * growth;
    const charges = baseCosts * (year === 1 ? 1 : year === 2 ? 1.08 : 1.15);
    const margin = Math.max(0, revenue - charges);
    return { year, revenue, charges, margin, ebitda: margin * 0.82, net: margin * 0.62 };
  });
}
function monthlyRows(data = {}) {
  const payments = arr(data.payments).reduce((sum, row) => sum + paid(row), 0);
  const baseIn = Math.max(2500000, Math.round((payments || 36000000) / 12));
  const baseOut = Math.round(baseIn * 0.72);
  let balance = 0;
  return Array.from({ length: 12 }).map((_, index) => {
    const month = index + 1;
    const ramp = month < 4 ? 0.65 + month * 0.1 : 1;
    const inflow = Math.round(baseIn * ramp);
    const outflow = Math.round(baseOut * (month <= 2 ? 1.15 : 1));
    balance += inflow - outflow;
    return { month, inflow, outflow, balance };
  });
}

export default function FinancingFinancialStatementGuide({ data = {}, onNavigate }) {
  const years = yearRows(data);
  const months = monthlyRows(data);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Landmark size={15} /> Aide avant dossier financeur</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Prévisionnels à vérifier avant export</h3><p className="text-sm text-[#8a7456] mt-1">Ce panneau sert seulement à relire les chiffres clés. Le vrai PDF se génère plus bas dans “Modifier le brouillon”.</p></div><button type="button" onClick={() => onNavigate?.('objectifs_croissance')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-sm font-black text-white">Voir BP</button></div>
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415] flex items-center gap-2"><Calculator size={16} /> Compte de résultat prévisionnel 3 ans</p><div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="bg-[#2f2415] text-white"><th className="p-2 text-left">Année</th><th className="p-2 text-right">CA</th><th className="p-2 text-right">Charges</th><th className="p-2 text-right">Marge</th><th className="p-2 text-right">Résultat net</th></tr></thead><tbody>{years.map((row) => <tr key={row.year} className="border-b border-[#eadcc2]"><td className="p-2 font-bold">A{row.year}</td><td className="p-2 text-right">{money(row.revenue)}</td><td className="p-2 text-right">{money(row.charges)}</td><td className="p-2 text-right">{money(row.margin)}</td><td className="p-2 text-right">{money(row.net)}</td></tr>)}</tbody></table></div></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415] flex items-center gap-2"><Table2 size={16} /> Trésorerie mensuelle année 1</p><div className="mt-3 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="bg-[#2f2415] text-white"><th className="p-2 text-left">Mois</th><th className="p-2 text-right">Entrées</th><th className="p-2 text-right">Sorties</th><th className="p-2 text-right">Solde</th></tr></thead><tbody>{months.map((row) => <tr key={row.month} className="border-b border-[#eadcc2]"><td className="p-2 font-bold">M{row.month}</td><td className="p-2 text-right">{money(row.inflow)}</td><td className="p-2 text-right">{money(row.outflow)}</td><td className="p-2 text-right">{money(row.balance)}</td></tr>)}</tbody></table></div></div></div>
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><b>À reprendre dans le brouillon :</b> montant demandé clair, plan de remboursement 24–36 mois, différé éventuel, hypothèses de prix, devis fournisseurs, emplois créés, site/localisation, photos et captures ERP. L’ERP sert de preuve de pilotage : ventes, dépenses, justificatifs, stock, alertes, tâches et reporting financeur.</div>
  </section>;
}
