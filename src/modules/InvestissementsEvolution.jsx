import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const amount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total ?? row.total_amount ?? row.budget_prevu ?? row.cout_total ?? 0);
const lineTotal = (row = {}) => toNumber(row.total ?? row.montant_total ?? row.amount ?? toNumber(row.quantite) * toNumber(row.prix_unitaire));
const rowDate = (row = {}) => row.date || row.date_debut || row.created_at || row.updated_at || row.start_date;
const status = (row = {}) => lower(row.statut || row.status || row.etat);
const isDone = (row = {}) => ['termine', 'terminé', 'clos', 'cloture', 'clôturé', 'effectif', 'paid'].includes(status(row));
const isRisk = (row = {}) => ['risque', 'a_risque', 'retard', 'bloque', 'bloqué'].includes(status(row)) || lower(row.risk_level || row.priorite).includes('haut');
const isActive = (row = {}) => !isDone(row) && !['annule', 'annulé', 'cancelled'].includes(status(row));
const isRevenue = (row = {}) => lower(row.type).includes('entree') || lower(row.type).includes('revenu') || lower(row.sens) === 'credit';
const isExpense = (row = {}) => lower(row.type).includes('sortie') || lower(row.type).includes('depense') || lower(row.type).includes('dépense') || lower(row.sens) === 'debit';

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), investi: 0, depenses: 0, revenus: 0, marge: 0, roi: 0, actifs: 0, termines: 0, risques: 0, retards: 0, actifs_crees: 0 }); return map.get(key); }

function buildMonthly({ rows = [], businessPlans = [], bpInvestmentLines = [], bpRecurringCosts = [], bpRevenueProjections = [], transactions = [] }) {
  const map = new Map();
  arr(rows).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); const value = amount(row); bucket.investi += value; bucket.depenses += value; if (isActive(row)) bucket.actifs += 1; if (isDone(row)) bucket.termines += 1; if (isRisk(row)) bucket.risques += 1; if (status(row).includes('retard')) bucket.retards += 1; });
  arr(businessPlans).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); if (isActive(row)) bucket.actifs += 1; if (isDone(row)) bucket.termines += 1; if (isRisk(row)) bucket.risques += 1; });
  arr(bpInvestmentLines).forEach((row) => { const bucket = ensure(map, monthKey(rowDate(row))); const value = lineTotal(row); bucket.investi += value; bucket.depenses += value; if (row.asset_created_at || row.asset_id) bucket.actifs_crees += 1; });
  arr(bpRecurringCosts).forEach((row) => { ensure(map, monthKey(rowDate(row))).depenses += lineTotal(row); });
  arr(bpRevenueProjections).forEach((row) => { ensure(map, monthKey(rowDate(row))).revenus += lineTotal(row); });
  arr(transactions).forEach((row) => {
    const text = `${row.module_lie || ''} ${row.categorie || ''} ${row.libelle || ''}`.toLowerCase();
    if (!text.includes('invest')) return;
    const bucket = ensure(map, monthKey(rowDate(row)));
    if (isRevenue(row)) bucket.revenus += amount(row);
    if (isExpense(row)) { bucket.depenses += amount(row); bucket.investi += amount(row); }
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({
    ...row,
    marge: row.revenus - row.depenses,
    roi: row.investi > 0 ? Number((((row.revenus - row.depenses) / row.investi) * 100).toFixed(1)) : 0,
  }));
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function InvestissementsEvolution({ rows = [], businessPlans = [], bpInvestmentLines = [], bpRecurringCosts = [], bpRevenueProjections = [], transactions = [] }) {
  const monthly = buildMonthly({ rows, businessPlans, bpInvestmentLines, bpRecurringCosts, bpRevenueProjections, transactions });
  const invested = monthly.reduce((sum, row) => sum + row.investi, 0);
  const revenues = monthly.reduce((sum, row) => sum + row.revenus, 0);
  const expenses = monthly.reduce((sum, row) => sum + row.depenses, 0);

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Investissements" compact title="Investi vs revenus" subtitle="Histogramme — performance projets" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Investi', type: 'bar', unit: 'FCFA', data: values(monthly, 'investi') },
        { name: 'Revenus', type: 'bar', unit: 'FCFA', data: values(monthly, 'revenus') },
      ]} />
      <SmartEvolutionChart moduleName="Investissements" compact title="ROI estimé" subtitle="Courbe — retour sur investissement %" months={labels(monthly)} leftUnit="%" rightUnit="" series={[
        { name: 'ROI', type: 'line', unit: '%', data: values(monthly, 'roi') },
      ]} />
      <SmartPieChart moduleName="Investissements" compact title="Investi vs dépenses vs revenus" subtitle="Camembert — structure financière" unit="FCFA" items={[
        { name: 'Investi', value: invested },
        { name: 'Dépenses', value: expenses },
        { name: 'Revenus', value: revenues },
      ].filter((item) => item.value > 0)} />
      <SmartEvolutionChart moduleName="Investissements" compact title="Projets actifs vs terminés" subtitle="Histogramme — avancement" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Actifs', type: 'bar', data: values(monthly, 'actifs') },
        { name: 'Terminés', type: 'bar', data: values(monthly, 'termines') },
      ]} />
      <SmartEvolutionChart moduleName="Investissements" compact title="Risques vs retards" subtitle="Histogramme — vigilance projets" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Risques', type: 'bar', data: values(monthly, 'risques') },
        { name: 'Retards', type: 'bar', data: values(monthly, 'retards') },
      ]} />
    </ChartsGrid>
  );
}
