import { AlertTriangle, Receipt, TrendingUp, Wallet } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const status = (row = {}) => lower(row.statut ?? row.status ?? row.statut_paiement ?? 'paye');
const category = (row = {}) => lower(`${row.categorie || ''} ${row.category || ''} ${row.type || ''} ${row.description || ''} ${row.libelle || ''}`);
const isIn = (row = {}) => lower(row.type) === 'entree' || lower(row.type).includes('revenu') || lower(row.type).includes('recette') || lower(row.sens) === 'credit';
const isOut = (row = {}) => lower(row.type) === 'sortie' || lower(row.type).includes('depense') || lower(row.type).includes('dépense') || lower(row.type).includes('charge') || lower(row.sens) === 'debit';
const isUnpaid = (row = {}) => ['impaye', 'impayé', 'partiel', 'en_retard', 'retard', 'unpaid', 'overdue'].includes(status(row));
const rowDate = (row = {}) => row.date || row.created_at || row.updated_at || row.paid_at || row.payment_date || row.order_date || row.date_commande;
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.total ?? 0);
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? 0);

function asDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value) {
  const date = asDate(value);
  if (!date) return 'Sans date';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key) {
  if (key === 'Sans date') return key;
  const [year, month] = key.split('-');
  return `${month}/${String(year).slice(-2)}`;
}

function ensure(map, key) {
  if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), entrees: 0, sorties: 0, cash: 0, creances: 0, marge: 0, transactions: 0, alimentation: 0, sante: 0, stock: 0, investissement: 0, equipement: 0, autres_charges: 0, taux_recouvrement: 0 });
  return map.get(key);
}

function classifyExpense(row = {}) {
  const cat = category(row);
  if (cat.includes('aliment') || cat.includes('nutrition')) return 'alimentation';
  if (cat.includes('sante') || cat.includes('santé') || cat.includes('vaccin') || cat.includes('soin') || cat.includes('bio')) return 'sante';
  if (cat.includes('stock') || cat.includes('fournisseur') || cat.includes('achat')) return 'stock';
  if (cat.includes('invest')) return 'investissement';
  if (cat.includes('equip') || cat.includes('équip') || cat.includes('maintenance')) return 'equipement';
  return 'autres_charges';
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function buildMonthly({ rows = [], salesOrders = [], payments = [] }) {
  const map = new Map();

  arr(rows).forEach((row) => {
    const bucket = ensure(map, monthKey(rowDate(row)));
    const value = amount(row);
    if (!value) return;
    bucket.transactions += 1;
    if (isIn(row)) {
      bucket.entrees += value;
      if (isUnpaid(row)) bucket.creances += value;
      else bucket.cash += value;
    }
    if (isOut(row)) {
      bucket.sorties += value;
      bucket[classifyExpense(row)] += value;
    }
  });

  arr(payments).forEach((row) => {
    const value = paymentAmount(row);
    if (!value) return;
    const bucket = ensure(map, monthKey(rowDate(row)));
    bucket.cash += value;
  });

  arr(salesOrders).forEach((row) => {
    const value = orderAmount(row);
    if (!value) return;
    const bucket = ensure(map, monthKey(rowDate(row)));
    const paid = toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
    const rest = toNumber(row.reste_a_payer ?? row.remaining_amount);
    bucket.entrees += value;
    if (rest > 0 || isUnpaid(row)) bucket.creances += rest || Math.max(0, value - paid);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => {
    const marge = row.cash - row.sorties;
    const expected = row.cash + row.creances;
    return { ...row, marge, taux_recouvrement: expected > 0 ? Number(((row.cash / expected) * 100).toFixed(1)) : 0 };
  });
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function FinanceEvolution({ rows = [], salesOrders = [], payments = [] }) {
  const monthly = buildMonthly({ rows, salesOrders, payments });
  const totalCash = monthly.reduce((sum, row) => sum + row.cash, 0);
  const totalOut = monthly.reduce((sum, row) => sum + row.sorties, 0);
  const totalMargin = totalCash - totalOut;
  const receivables = monthly.reduce((sum, row) => sum + row.creances, 0);
  const riskyMonths = monthly.filter((row) => row.marge < 0 || row.creances > 0).length;
  const recoveryRate = totalCash + receivables > 0 ? Number(((totalCash / (totalCash + receivables)) * 100).toFixed(1)) : 0;
  const last = monthly[monthly.length - 1];
  const interpretation = !monthly.length ? 'Aucune donnée financière datée exploitable.' : last?.marge >= 0 ? `Dernier mois positif : marge cash ${fmtCurrency(last.marge)}.` : `Dernier mois à surveiller : marge cash ${fmtCurrency(last?.marge || 0)}.`;

  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><Wallet size={18} /></div>
        <div><p className="font-black text-[#2f2415]">Évolution Finances interactive</p><p className="text-xs text-[#8a7456] mt-1">Cash encaissé, sorties, marge, créances, recouvrement et structure des charges.</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <SmallMetric label="Cash encaissé" value={fmtCurrency(totalCash)} hint="paiements + entrées payées" />
        <SmallMetric label="Sorties" value={fmtCurrency(totalOut)} hint="charges/dépenses" danger={totalOut > totalCash && totalCash > 0} />
        <SmallMetric label="Marge cash" value={fmtCurrency(totalMargin)} hint="cash - sorties" danger={totalMargin < 0} />
        <SmallMetric label="Créances" value={fmtCurrency(receivables)} hint={`${fmtNumber(riskyMonths)} mois à surveiller`} danger={receivables > 0} />
        <SmallMetric label="Recouvrement" value={`${recoveryRate}%`} hint="cash / cash + créances" danger={recoveryRate < 70 && totalCash + receivables > 0} />
      </div>
    </div>

    <SmartEvolutionChart title="Finances — économie mensuelle" subtitle="Barres : entrées attendues, cash encaissé, sorties, marge, créances. Courbe : taux de recouvrement." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[{ name: 'Entrées attendues', type: 'bar', unit: 'FCFA', data: values(monthly, 'entrees') }, { name: 'Cash encaissé', type: 'bar', unit: 'FCFA', data: values(monthly, 'cash') }, { name: 'Sorties', type: 'bar', unit: 'FCFA', data: values(monthly, 'sorties') }, { name: 'Marge cash', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') }, { name: 'Créances', type: 'bar', unit: 'FCFA', data: values(monthly, 'creances') }, { name: 'Taux recouvrement', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_recouvrement') }]} />

    <SmartEvolutionChart title="Finances — structure des charges" subtitle="Identifier rapidement ce qui pèse le plus : alimentation, santé, stock/fournisseurs, investissements, équipements." months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[{ name: 'Alimentation', type: 'bar', unit: 'FCFA', data: values(monthly, 'alimentation') }, { name: 'Santé', type: 'bar', unit: 'FCFA', data: values(monthly, 'sante') }, { name: 'Stock / fournisseurs', type: 'bar', unit: 'FCFA', data: values(monthly, 'stock') }, { name: 'Investissements', type: 'bar', unit: 'FCFA', data: values(monthly, 'investissement') }, { name: 'Équipements', type: 'bar', unit: 'FCFA', data: values(monthly, 'equipement') }, { name: 'Autres charges', type: 'bar', unit: 'FCFA', data: values(monthly, 'autres_charges') }]} />

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    {(receivables > 0 || totalMargin < 0) ? <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-2"><AlertTriangle size={18} className="mt-0.5" /><div><b>Action recommandée :</b> relancer les créances et vérifier les postes de dépenses qui pèsent sur la marge cash.</div></div> : <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 flex items-start gap-2"><Receipt size={18} className="mt-0.5" /><div><b>Action recommandée :</b> maintenir le suivi des encaissements et rattacher les justificatifs aux transactions.</div></div>}
  </div>;
}
