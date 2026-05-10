import { AlertTriangle, BarChart3, CreditCard, Receipt, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { paidForOrder, remainingForOrder } from '../utils/salesStatuses';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? row.montant ?? 0);
const rowDate = (row = {}) => row.date_commande || row.order_date || row.date || row.created_at || row.updated_at;
const paymentDate = (row = {}) => row.date_paiement || row.payment_date || row.date || row.created_at || row.updated_at;
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.total ?? 0);
const status = (row = {}) => lower(row.statut_commande || row.order_status || row.statut || row.status || row.statut_paiement || row.payment_status);
const isOpen = (row = {}) => !['annule', 'annulé', 'cancelled', 'paye', 'payé', 'paid', 'solde', 'soldé'].includes(status(row));

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

function buildMonthly({ rows = [], payments = [] }) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), commandes: 0, encaisses: 0, impayes: 0, nb_commandes: 0, ouvertes: 0 });
    return map.get(key);
  };

  arr(rows).forEach((order) => {
    const key = monthKey(rowDate(order));
    const bucket = ensure(key);
    const total = amount(order);
    const paid = paidForOrder(order, payments);
    const remaining = remainingForOrder(order, payments);
    bucket.commandes += total;
    bucket.encaisses += paid;
    bucket.impayes += remaining;
    bucket.nb_commandes += 1;
    if (remaining > 0 || isOpen(order)) bucket.ouvertes += 1;
  });

  arr(payments).forEach((payment) => {
    const key = monthKey(paymentDate(payment));
    const bucket = ensure(key);
    bucket.encaisses += paymentAmount(payment);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export default function SalesEvolution({ rows = [], payments = [], opportunities = [] }) {
  const monthly = buildMonthly({ rows, payments });
  const totalOrders = arr(rows).reduce((sum, row) => sum + amount(row), 0);
  const totalPaid = arr(rows).reduce((sum, row) => sum + paidForOrder(row, payments), 0) + arr(payments).reduce((sum, row) => sum + paymentAmount(row), 0);
  const totalRemaining = arr(rows).reduce((sum, row) => sum + remainingForOrder(row, payments), 0);
  const openOrders = arr(rows).filter((row) => remainingForOrder(row, payments) > 0 || isOpen(row));
  const openOpportunities = arr(opportunities).filter((opp) => !['gagnee', 'gagnée', 'perdue', 'annulee', 'annulée', 'closed'].includes(lower(opp.status || opp.statut))).length;
  const last = monthly[monthly.length - 1];
  const hasData = monthly.length > 0;
  const conversionRate = arr(rows).length + openOpportunities > 0 ? (arr(rows).length / (arr(rows).length + openOpportunities)) * 100 : 0;
  const interpretation = !hasData
    ? 'Aucune vente datée exploitable pour le moment.'
    : last.impayes > 0
      ? `Dernier mois : ${fmtCurrency(last.impayes)} reste à encaisser.`
      : `Dernier mois : ventes suivies et aucun impayé détecté sur la période.`;

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#e8f7ef] text-emerald-600 flex items-center justify-center"><Receipt size={18} /></div>
          <div>
            <p className="font-black text-[#2f2415]">Évolution Ventes</p>
            <p className="text-xs text-[#8a7456] mt-1">Lecture décisionnelle : commandes, encaissements, impayés et opportunités à convertir.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <SmallMetric label="CA commandé" value={fmtCurrency(totalOrders)} hint={`${fmtNumber(arr(rows).length)} commande(s)`} />
          <SmallMetric label="Encaissé" value={fmtCurrency(totalPaid)} hint="paiements liés" />
          <SmallMetric label="Impayés" value={fmtCurrency(totalRemaining)} hint={`${fmtNumber(openOrders.length)} commande(s) ouvertes`} />
          <SmallMetric label="Opportunités" value={fmtNumber(openOpportunities)} hint="à convertir" />
          <SmallMetric label="Conversion" value={`${conversionRate.toFixed(1)}%`} hint="commandes / pipeline" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="CA commandé / encaissé / impayés" subtitle="Grand graphique principal : suivre ce qui est vendu, encaissé et encore exposé.">
          {hasData ? <ResponsiveContainer width="100%" height="100%"><BarChart data={monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => fmtCurrency(value)} /><Legend /><Bar dataKey="commandes" name="CA commandé"><LabelList content={<MoneyLabel />} /></Bar><Bar dataKey="encaisses" name="Encaissé"><LabelList content={<MoneyLabel />} /></Bar><Bar dataKey="impayes" name="Impayés"><LabelList content={<MoneyLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune donnée datée disponible.</p>}
        </ChartCard>

        <ChartCard title="Commandes ouvertes" subtitle="Nombre de commandes restant à traiter ou à encaisser.">
          {hasData ? <ResponsiveContainer width="100%" height="100%"><LineChart data={monthly} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Line type="monotone" dataKey="ouvertes" name="Commandes ouvertes" strokeWidth={3}><LabelList content={<NumberLabel />} /></Line><Line type="monotone" dataKey="nb_commandes" name="Commandes créées"><LabelList content={<NumberLabel />} /></Line></LineChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune commande datée disponible.</p>}
        </ChartCard>
      </div>

      <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3">
        <TrendingUp size={18} className="text-[#9a6b12] mt-0.5" />
        <div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div>
      </div>

      {(totalRemaining > 0 || openOpportunities > 0) ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5" />
          <div><b>Action recommandée :</b> relancer les commandes non soldées et convertir les opportunités ouvertes en ventes confirmées.</div>
        </div>
      ) : (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 text-sm text-emerald-800 flex items-start gap-2">
          <CreditCard size={18} className="mt-0.5" />
          <div><b>Action recommandée :</b> maintenir le suivi des paiements et préparer les prochaines opportunités de vente.</div>
        </div>
      )}
    </div>
  );
}
