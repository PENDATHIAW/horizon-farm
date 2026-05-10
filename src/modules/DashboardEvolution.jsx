import { AlertTriangle, CheckCircle2, Package, Receipt, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.total_amount ?? row.montant_total ?? 0);
const orderAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount ?? 0);
const paymentAmount = (row = {}) => toNumber(row.montant_paye ?? row.montant ?? row.amount ?? row.paid_amount ?? 0);
const eggCount = (row = {}) => toNumber(row.oeufs_produits ?? row.eggs ?? row.quantity ?? row.quantite);
const brokenEggs = (row = {}) => toNumber(row.oeufs_casses ?? row.broken ?? row.casses ?? row.pertes);
const stockQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const stockThreshold = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const isStockCritical = (row = {}) => stockThreshold(row) > 0 && stockQty(row) <= stockThreshold(row);
const isExpense = (row = {}) => ['sortie', 'depense', 'dépense', 'charge', 'achat', 'expense'].some((key) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.sens || ''}`).includes(key));
const isRevenue = (row = {}) => ['entree', 'entrée', 'revenu', 'recette', 'vente', 'income'].some((key) => lower(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.sens || ''}`).includes(key));
const isOpenTask = (row = {}) => !['termine', 'terminé', 'done', 'annule', 'annulé', 'cancelled'].includes(lower(row.status || row.statut));
const isLateTask = (row = {}) => ['retard', 'en_retard', 'overdue'].includes(lower(row.status || row.statut)) || lower(row.priority || row.priorite) === 'critique';
const isCriticalAlert = (row = {}) => ['urgence', 'critique', 'critical', 'urgent'].includes(lower(row.severity || row.gravite || row.priority || row.priorite));
const rowDate = (row = {}) => row.date || row.created_at || row.updated_at || row.order_date || row.date_commande || row.paid_at || row.payment_date || row.date_paiement;

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensureMonth(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), commandes: 0, encaissements: 0, depenses: 0, marge: 0, oeufs: 0, pertes_oeufs: 0, alertes: 0, taches: 0, stock_critique: 0, taux_marge: 0, taux_perte_oeufs: 0 }); return map.get(key); }
function buildMonthly({ salesOrders = [], payments = [], transactions = [], productionLogs = [], alertes = [], taches = [], stocks = [] }) {
  const map = new Map();
  arr(salesOrders).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).commandes += orderAmount(row); });
  arr(payments).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).encaissements += paymentAmount(row); });
  arr(transactions).forEach((row) => { const b = ensureMonth(map, monthKey(rowDate(row))); if (isRevenue(row)) b.encaissements += amount(row); if (isExpense(row)) b.depenses += amount(row); });
  arr(productionLogs).forEach((row) => { const b = ensureMonth(map, monthKey(rowDate(row))); b.oeufs += eggCount(row); b.pertes_oeufs += brokenEggs(row); });
  arr(alertes).filter(isCriticalAlert).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).alertes += 1; });
  arr(taches).filter(isLateTask).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).taches += 1; });
  arr(stocks).filter(isStockCritical).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).stock_critique += 1; });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, marge: row.encaissements - row.depenses, taux_marge: row.encaissements > 0 ? Number((((row.encaissements - row.depenses) / row.encaissements) * 100).toFixed(1)) : 0, taux_perte_oeufs: row.oeufs > 0 ? Number(((row.pertes_oeufs / row.oeufs) * 100).toFixed(1)) : 0 }));
}
function SmallMetric({ label, value, hint, danger = false }) { return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>; }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
function labels(rows) { return rows.map((row) => row.mois); }

export default function DashboardEvolution({ salesOrders = [], payments = [], transactions = [], productionLogs = [], stocks = [], taches = [], alertes = [], onNavigate }) {
  const monthly = buildMonthly({ salesOrders, payments, transactions, productionLogs, alertes, taches, stocks });
  const stockCritical = arr(stocks).filter(isStockCritical).length;
  const zeroStock = arr(stocks).filter((row) => stockQty(row) <= 0).length;
  const openTasks = arr(taches).filter(isOpenTask).length;
  const lateTasks = arr(taches).filter(isLateTask).length;
  const criticalAlerts = arr(alertes).filter(isCriticalAlert).length;
  const totalEggs = arr(productionLogs).reduce((sum, row) => sum + eggCount(row), 0);
  const totalLosses = arr(productionLogs).reduce((sum, row) => sum + brokenEggs(row), 0);
  const last = monthly[monthly.length - 1];
  const totalRevenue = monthly.reduce((sum, row) => sum + row.encaissements, 0);
  const totalExpenses = monthly.reduce((sum, row) => sum + row.depenses, 0);
  const totalMargin = totalRevenue - totalExpenses;
  const priority = criticalAlerts > 0 ? { module: 'alertes', label: 'Ouvrir le centre alertes', icon: AlertTriangle } : stockCritical > 0 ? { module: 'stock', label: 'Commander / vérifier le stock', icon: Package } : lateTasks > 0 ? { module: 'taches', label: 'Traiter les tâches sensibles', icon: CheckCircle2 } : { module: 'finances', label: 'Analyser les finances', icon: Receipt };
  const PriorityIcon = priority.icon;
  const interpretation = !monthly.length ? 'Aucune donnée historique suffisante pour interpréter l’évolution.' : last.marge < 0 ? `Dernier mois à surveiller : marge ${fmtCurrency(last.marge)}.` : criticalAlerts > 0 || stockCritical > 0 || lateTasks > 0 ? `Activité suivie, mais ${criticalAlerts + stockCritical + lateTasks} point(s) sensible(s) demandent une action.` : `Tendance maîtrisée : marge ${fmtCurrency(last.marge)} sur le dernier mois suivi.`;

  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4"><div className="flex items-start justify-between gap-3 mb-4"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><TrendingUp size={18} /></div><div><p className="font-black text-[#2f2415]">Évolution Dashboard interactive</p><p className="text-xs text-[#8a7456] mt-1">Synthèse dirigeant : finance, production, alertes, tâches et stocks critiques.</p></div></div>{onNavigate ? <button type="button" onClick={() => onNavigate(priority.module)} className="hidden md:inline-flex items-center gap-2 rounded-xl bg-[#c9a96a] px-3 py-2 text-sm font-bold text-white hover:bg-[#b6975f]"><PriorityIcon size={15} />{priority.label}</button> : null}</div><div className="grid grid-cols-2 lg:grid-cols-6 gap-3"><SmallMetric label="Encaissements" value={fmtCurrency(totalRevenue)} hint="cash + revenus" /><SmallMetric label="Dépenses" value={fmtCurrency(totalExpenses)} hint="charges détectées" danger={totalExpenses > totalRevenue && totalRevenue > 0} /><SmallMetric label="Marge" value={fmtCurrency(totalMargin)} hint="encaissements - dépenses" danger={totalMargin < 0} /><SmallMetric label="Alertes critiques" value={fmtNumber(criticalAlerts)} hint="urgence / critique" danger={criticalAlerts > 0} /><SmallMetric label="Stocks critiques" value={fmtNumber(stockCritical)} hint={`${fmtNumber(zeroStock)} à zéro`} danger={stockCritical > 0} /><SmallMetric label="Tâches sensibles" value={fmtNumber(lateTasks)} hint={`${fmtNumber(openTasks)} ouverte(s)`} danger={lateTasks > 0} /></div></div>
    <SmartEvolutionChart moduleName="Dashboard" title="Dashboard — performance globale" subtitle="Barres : commandes, encaissements, dépenses et marge. Courbe : taux de marge." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" reportPayload={{ alertes_critiques: criticalAlerts, stocks_critiques: stockCritical, taches_sensibles: lateTasks }} series={[{ name: 'Commandes', type: 'bar', unit: 'FCFA', data: values(monthly, 'commandes') }, { name: 'Encaissements', type: 'bar', unit: 'FCFA', data: values(monthly, 'encaissements') }, { name: 'Dépenses', type: 'bar', unit: 'FCFA', data: values(monthly, 'depenses') }, { name: 'Marge', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') }, { name: 'Taux marge', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_marge') }]} />
    <SmartEvolutionChart moduleName="Dashboard" title="Dashboard — risques et production" subtitle="Alertes, tâches sensibles, stocks critiques, œufs produits et taux de perte." months={labels(monthly)} leftUnit="" rightUnit="%" reportPayload={{ oeufs_produits: totalEggs, oeufs_perdus: totalLosses }} series={[{ name: 'Alertes critiques', type: 'bar', data: values(monthly, 'alertes') }, { name: 'Tâches sensibles', type: 'bar', data: values(monthly, 'taches') }, { name: 'Stocks critiques', type: 'bar', data: values(monthly, 'stock_critique') }, { name: 'Œufs produits', type: 'bar', data: values(monthly, 'oeufs') }, { name: 'Pertes œufs', type: 'bar', data: values(monthly, 'pertes_oeufs') }, { name: 'Taux perte œufs', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_perte_oeufs') }]} />
    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${criticalAlerts || stockCritical || lateTasks ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div>{onNavigate ? <button type="button" onClick={() => onNavigate(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button> : null}</div>
  </div>;
}
