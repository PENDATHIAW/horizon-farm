import { AlertTriangle, BarChart3, Receipt, TrendingUp, Wallet } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? 0);
const status = (row = {}) => lower(row.statut ?? row.status ?? row.statut_paiement ?? 'paye');
const isIn = (row = {}) => lower(row.type) === 'entree' || lower(row.type).includes('revenu') || lower(row.type).includes('recette');
const isOut = (row = {}) => lower(row.type) === 'sortie' || lower(row.type).includes('depense') || lower(row.type).includes('dépense') || lower(row.type).includes('charge');
const isUnpaid = (row = {}) => ['impaye', 'impayé', 'partiel', 'en_retard', 'retard', 'unpaid', 'overdue'].includes(status(row));
const rowDate = (row = {}) => row.date || row.created_at || row.updated_at || row.paid_at || row.payment_date || row.order_date || row.date_commande;

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

function ChartCard({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="mb-3">
        <p className="font-black text-[#2f2415] flex items-center gap-2"><BarChart3 size={16} />{title}</p>
        <p className="text-xs text-[#8a7456] mt-1">{subtitle}</p>
      </div>
      <div className="h-72">{children}</div>
    </div>
  );
}

function SmallMetric({ label, value, hint }) {
  return (
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-xl p-3">
      <p className="text-xs text-[#8a7456]">{label}</p>
      <p className="text-xl font-black text-[#2f2415] mt-1">{value}</p>
      {hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}
    </div>
  );
}

function MoneyLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{Number(value).toLocaleString('fr-FR')}</text>;
}

function NumberLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{fmtNumber(value)}</text>;
}

function buildMonthly({ rows = [], salesOrders = [], payments = [] }) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), entrees: 0, sorties: 0, cash: 0, creances: 0, marge: 0, transactions: 0 });
    return map.get(key);
  };

  arr(rows).forEach((row) => {
    const bucket = ensure(monthKey(rowDate(row)));
    const value = amount(row);
    if (!value) return;
    bucket.transactions += 1;
    if (isIn(row)) {
      bucket.entrees += value;
      if (isUnpaid(row)) bucket.creances += value;
      else bucket.cash += value;
    }
    if (isOut(row)) bucket.sorties += value;
  });

  arr(payments).forEach((row) => {
    const value = amount(row);
    if (!value) return;
    const bucket = ensure(monthKey(rowDate(row)));
    bucket.cash += value;
  });

  arr(salesOrders).forEach((row) => {
    const value = amount(row);
    if (!value) return;
    const bucket = ensure(monthKey(rowDate(row)));
    const paid = toNumber(row.montant_paye ?? row.paid_amount ?? row.amount_paid);
    const rest = toNumber(row.reste_a_payer ?? row.remaining_amount);
    bucket.entrees += value;
    if (rest > 0 || isUnpaid(row)) bucket.creances += rest || Math.max(0, value - paid);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, marge: row.cash - row.sorties }));
}

export default function FinanceEvolution({ rows = [], salesOrders = [], payments = [] }) {
  const monthly = buildMonthly({ rows, salesOrders, payments });
  const totalCash = monthly.reduce((sum, row) => sum + row.cash, 0);
  const totalOut = monthly.reduce((sum, row) => sum + row.sorties, 0);
  const totalMargin = totalCash - totalOut;
  const receivables = monthly.reduce((sum, row) => sum + row.creances, 0);
  const riskyMonths = monthly.filter((row) => row.marge < 0 || row.creances > 0).length;
  const hasData = monthly.length > 0;
  const last = monthly[monthly.length - 1];
  const interpretation = !hasData ? 'Aucune donnée financière datée exploitable.' : last?.marge >= 0 ? `Dernier mois positif : marge ${fmtCurrency(last.marge)}.` : `Dernier mois à surveiller : marge ${fmtCurrency(last?.marge || 0)}.`;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><Wallet size={18} /></div>
          <div>
            <p className="font-black text-[#2f2415]">Évolution Finances</p>
            <p className="text-xs text-[#8a7456] mt-1">Lecture décisionnelle : cash encaissé, sorties, marge et créances au fil des mois.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SmallMetric label="Cash encaissé" value={fmtCurrency(totalCash)} hint="paiements + entrées payées" />
          <SmallMetric label="Sorties" value={fmtCurrency(totalOut)} hint="charges/dépenses" />
          <SmallMetric label="Marge cash" value={fmtCurrency(totalMargin)} hint="cash - sorties" />
          <SmallMetric label="Créances" value={fmtCurrency(receivables)} hint={`${fmtNumber(riskyMonths)} mois à surveiller`} />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Cash encaissé vs sorties" subtitle="Grand graphique principal : mesure la respiration financière de la ferme.">
          {hasData ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => fmtCurrency(value)} /><Legend /><Bar dataKey="cash" name="Cash encaissé"><LabelList content={<MoneyLabel />} /></Bar><Bar dataKey="sorties" name="Sorties"><LabelList content={<MoneyLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée datée disponible.</p>}
        </ChartCard>

        <ChartCard title="Marge cash et créances" subtitle="Permet de voir si l’argent rentre réellement et ce qui reste à relancer.">
          {hasData ? <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => fmtCurrency(value)} /><Legend /><Line type="monotone" dataKey="marge" name="Marge cash" strokeWidth={3}><LabelList content={<MoneyLabel />} /></Line><Line type="monotone" dataKey="creances" name="Créances"><LabelList content={<MoneyLabel />} /></Line></LineChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée datée disponible.</p>}
        </ChartCard>
      </div>

      <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3">
        <TrendingUp size={18} className="text-[#9a6b12] mt-0.5" />
        <div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div>
      </div>

      {(receivables > 0 || totalMargin < 0) ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5" />
          <div><b>Action recommandée :</b> relancer les créances et vérifier les postes de dépenses qui pèsent sur la marge cash.</div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 flex items-start gap-2">
          <Receipt size={18} className="mt-0.5" />
          <div><b>Action recommandée :</b> maintenir le suivi des encaissements et rattacher les justificatifs aux transactions.</div>
        </div>
      )}
    </div>
  );
}
