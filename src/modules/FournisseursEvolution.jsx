import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const monthKey = (value) => String(value || new Date().toISOString()).slice(0, 7);
const lastMonths = (count = 6) => {
  const base = new Date();
  return Array.from({ length: count }).map((_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1);
    return date.toISOString().slice(0, 7);
  });
};
const supplierId = (row = {}) => row.fournisseur_id || row.supplier_id || row.fournisseur || row.supplier || row.related_id || '';
const stockAmount = (row = {}) => toNumber(row.valeur_stock ?? row.cout_total ?? row.total_value ?? row.montant_total) || toNumber(row.quantite) * toNumber(row.prixunit ?? row.prixUnit ?? row.prix_unitaire);
const financeAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.total ?? row.montant_total);
const isSupplierExpense = (row = {}) => {
  const text = String(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''}`).toLowerCase();
  return text.includes('sortie') || text.includes('fournisseur') || text.includes('achat');
};

function buildRows({  stocks = [], finances = [] }) {
  return lastMonths(6).map((month) => {
    const stockRows = arr(stocks).filter((row) => monthKey(row.date || row.created_at || row.updated_at) === month && supplierId(row));
    const financeRows = arr(finances).filter((row) => monthKey(row.date || row.created_at || row.updated_at) === month && isSupplierExpense(row));
    return {
      month,
      achats: stockRows.reduce((sum, row) => sum + stockAmount(row), 0),
      paiements: financeRows.reduce((sum, row) => sum + financeAmount(row), 0),
      livraisons: stockRows.length,
    };
  });
}

export default function FournisseursEvolution({ rows = [], stocks = [], finances = [] }) {
  const data = buildRows({ suppliers: rows, stocks, finances });
  const achats = data.reduce((sum, row) => sum + row.achats, 0);
  const paiements = data.reduce((sum, row) => sum + row.paiements, 0);
  const dettes = rows.reduce((sum, row) => sum + toNumber(row.dettes), 0);

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Fournisseurs" compact title="Achats vs paiements" subtitle="Histogramme — flux fournisseurs" months={data.map((row) => row.month)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Achats', type: 'bar', unit: 'FCFA', data: data.map((row) => row.achats) },
        { name: 'Paiements', type: 'bar', unit: 'FCFA', data: data.map((row) => row.paiements) },
      ]} />
      <SmartEvolutionChart moduleName="Fournisseurs" compact title="Livraisons mensuelles" subtitle="Courbe — réceptions fournisseurs" months={data.map((row) => row.month)} leftUnit="liv." rightUnit="" series={[
        { name: 'Livraisons', type: 'line', unit: 'liv.', data: data.map((row) => row.livraisons) },
      ]} />
      <SmartPieChart moduleName="Fournisseurs" compact title="Achats vs dettes" subtitle="Camembert — engagement fournisseurs" unit="FCFA" items={[
        { name: 'Achats période', value: achats },
        { name: 'Paiements période', value: paiements },
        { name: 'Dettes déclarées', value: dettes },
      ].filter((item) => item.value > 0)} />
    </ChartsGrid>
  );
}
