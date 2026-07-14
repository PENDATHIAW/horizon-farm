import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';

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

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), entrees: 0, sorties: 0, cash: 0, creances: 0, marge: 0, alimentation: 0, sante: 0, stock: 0, investissement: 0, equipement: 0, autres_charges: 0, taux_recouvrement: 0 }); return map.get(key); }
function classifyExpense(row = {}) {
  const cat = category(row);
  if (cat.includes('aliment') || cat.includes('nutrition')) return 'alimentation';
  if (cat.includes('sante') || cat.includes('santé') || cat.includes('vaccin') || cat.includes('soin')) return 'sante';
  if (cat.includes('stock') || cat.includes('fournisseur') || cat.includes('achat')) return 'stock';
  if (cat.includes('invest')) return 'investissement';
  if (cat.includes('equip') || cat.includes('équip') || cat.includes('maintenance')) return 'equipement';
  return 'autres_charges';
}

function buildMonthly({ rows = [], salesOrders = [], payments = [] }) {
  const map = new Map();
  arr(rows).forEach((row) => {
    const bucket = ensure(map, monthKey(rowDate(row)));
    const value = amount(row);
    if (!value) return;
    if (isIn(row)) { bucket.entrees += value; if (isUnpaid(row)) bucket.creances += value; else bucket.cash += value; }
    if (isOut(row)) { bucket.sorties += value; bucket[classifyExpense(row)] += value; }
  });
  arr(payments).forEach((row) => { const value = paymentAmount(row); if (value) ensure(map, monthKey(rowDate(row))).cash += value; });
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
  const chargeTotals = monthly.reduce((acc, row) => ({
    alimentation: acc.alimentation + row.alimentation,
    sante: acc.sante + row.sante,
    stock: acc.stock + row.stock,
    investissement: acc.investissement + row.investissement,
    equipement: acc.equipement + row.equipement,
    autres: acc.autres + row.autres_charges,
  }), { alimentation: 0, sante: 0, stock: 0, investissement: 0, equipement: 0, autres: 0 });

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Finances" compact title="Cash encaissé vs sorties" subtitle="Histogramme - flux mensuels" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Cash encaissé', type: 'bar', unit: 'FCFA', data: values(monthly, 'cash') },
        { name: 'Sorties', type: 'bar', unit: 'FCFA', data: values(monthly, 'sorties') },
      ]} />
      <SmartEvolutionChart moduleName="Finances" compact title="Marge cash" subtitle="Courbe - encaissements − dépenses" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Marge cash', type: 'line', unit: 'FCFA', data: values(monthly, 'marge') },
      ]} />
      <SmartPieChart moduleName="Finances" compact title="Structure des charges" subtitle="Camembert - répartition des sorties" unit="FCFA" items={[
        { name: 'Alimentation', value: chargeTotals.alimentation },
        { name: 'Santé', value: chargeTotals.sante },
        { name: 'Stock / fournisseurs', value: chargeTotals.stock },
        { name: 'Investissements', value: chargeTotals.investissement },
        { name: 'Équipements', value: chargeTotals.equipement },
        { name: 'Autres', value: chargeTotals.autres },
      ]} />
      <SmartEvolutionChart moduleName="Finances" compact title="Créances vs recouvrement" subtitle="Barres + courbe - créances et taux %" months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[
        { name: 'Créances', type: 'bar', unit: 'FCFA', data: values(monthly, 'creances') },
        { name: 'Taux recouvrement', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'taux_recouvrement') },
      ]} />
    </ChartsGrid>
  );
}
