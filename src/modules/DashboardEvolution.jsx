import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';
import { filterRowsByPeriodScope, isAllTimeScope, normalizePeriodScope } from '../utils/periodScope';

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
const isLateTask = (row = {}) => ['retard', 'en_retard', 'overdue'].includes(lower(row.status || row.statut)) || lower(row.priority || row.priorite) === 'critique';
const isCriticalAlert = (row = {}) => ['urgence', 'critique', 'critical', 'urgent'].includes(lower(row.severity || row.gravite || row.priority || row.priorite));
const rowDate = (row = {}) => row.date || row.created_at || row.updated_at || row.order_date || row.date_commande || row.paid_at || row.payment_date || row.date_paiement;

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensureMonth(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), commandes: 0, encaissements: 0, depenses: 0, marge: 0, oeufs: 0, pertes_oeufs: 0, alertes: 0, taches: 0, stock_critique: 0, taux_marge: 0, taux_perte_oeufs: 0 }); return map.get(key); }

function buildMonthly({
  salesOrders = [],
  payments = [],
  transactions = [],
  productionLogs = [],
  alertes = [],
  taches = [],
  stocks = [],
  periodScope = {},
}) {
  const scope = normalizePeriodScope(periodScope);
  const scopedAlertes = isAllTimeScope(scope) ? arr(alertes) : filterRowsByPeriodScope(alertes, scope);
  const scopedTaches = isAllTimeScope(scope) ? arr(taches) : filterRowsByPeriodScope(taches, scope);
  const scopedStocks = isAllTimeScope(scope) ? arr(stocks) : filterRowsByPeriodScope(stocks, scope);

  const map = new Map();
  arr(salesOrders).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).commandes += orderAmount(row); });
  arr(payments).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).encaissements += paymentAmount(row); });
  arr(transactions).forEach((row) => { const b = ensureMonth(map, monthKey(rowDate(row))); if (isRevenue(row)) b.encaissements += amount(row); if (isExpense(row)) b.depenses += amount(row); });
  arr(productionLogs).forEach((row) => { const b = ensureMonth(map, monthKey(rowDate(row))); b.oeufs += eggCount(row); b.pertes_oeufs += brokenEggs(row); });
  scopedAlertes.filter(isCriticalAlert).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).alertes += 1; });
  scopedTaches.filter(isLateTask).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).taches += 1; });
  scopedStocks.filter(isStockCritical).forEach((row) => { ensureMonth(map, monthKey(rowDate(row))).stock_critique += 1; });

  let monthly = [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({
    ...row,
    marge: row.encaissements - row.depenses,
    taux_marge: row.encaissements > 0 ? Number((((row.encaissements - row.depenses) / row.encaissements) * 100).toFixed(1)) : 0,
    taux_perte_oeufs: row.oeufs > 0 ? Number(((row.pertes_oeufs / row.oeufs) * 100).toFixed(1)) : 0,
  }));

  if (!isAllTimeScope(scope)) {
    const monthSet = new Set(scope.monthKeys);
    monthly = monthly.filter((row) => monthSet.has(row.key));
  }

  return monthly;
}

function values(rows, key) { return rows.map((row) => toNumber(row[key])); }
function labels(rows) { return rows.map((row) => row.mois); }

export default function DashboardEvolution({
  salesOrders = [],
  payments = [],
  transactions = [],
  productionLogs = [],
  stocks = [],
  taches = [],
  alertes = [],
  periodScope = {},
}) {
  const monthly = buildMonthly({
    salesOrders,
    payments,
    transactions,
    productionLogs,
    alertes,
    taches,
    stocks,
    periodScope,
  });
  const totalEnc = monthly.reduce((s, r) => s + r.encaissements, 0);
  const totalDep = monthly.reduce((s, r) => s + r.depenses, 0);

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Dashboard" compact title="Commandes vs encaissements" subtitle="Histogramme - activité commerciale" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Commandes', type: 'bar', unit: 'FCFA', data: values(monthly, 'commandes') },
        { name: 'Encaissements', type: 'bar', unit: 'FCFA', data: values(monthly, 'encaissements') },
      ]} />
      <SmartEvolutionChart moduleName="Dashboard" compact title="Dépenses vs marge" subtitle="Histogramme - charges et résultat" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Dépenses', type: 'bar', unit: 'FCFA', data: values(monthly, 'depenses') },
        { name: 'Marge', type: 'bar', unit: 'FCFA', data: values(monthly, 'marge') },
      ]} />
      <SmartEvolutionChart moduleName="Dashboard" compact title="Taux de marge" subtitle="Courbe - % marge sur encaissements" months={labels(monthly)} leftUnit="%" rightUnit="" series={[
        { name: 'Taux marge', type: 'line', unit: '%', data: values(monthly, 'taux_marge') },
      ]} />
      <SmartPieChart moduleName="Dashboard" compact title="Encaissements vs dépenses" subtitle="Camembert - structure globale" unit="FCFA" items={[
        { name: 'Encaissements', value: totalEnc },
        { name: 'Dépenses', value: totalDep },
      ]} />
      <SmartEvolutionChart moduleName="Dashboard" compact title="Alertes vs tâches sensibles" subtitle="Histogramme - points de vigilance" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Alertes critiques', type: 'bar', data: values(monthly, 'alertes') },
        { name: 'Tâches sensibles', type: 'bar', data: values(monthly, 'taches') },
      ]} />
      <SmartEvolutionChart moduleName="Dashboard" compact title="Production œufs vs pertes" subtitle="Barres + courbe - volume et taux casse" months={labels(monthly)} leftUnit="" rightUnit="%" series={[
        { name: 'Œufs produits', type: 'bar', data: values(monthly, 'oeufs') },
        { name: 'Taux perte', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_perte_oeufs') },
      ]} />
    </ChartsGrid>
  );
}
