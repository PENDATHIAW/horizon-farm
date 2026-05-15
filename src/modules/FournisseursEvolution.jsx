import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

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
  const text = String(`${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.module_lie || ''} ${row.source_module || ''}`).toLowerCase();
  return text.includes('sortie') || text.includes('fournisseur') || text.includes('achat');
};

function buildRows({ suppliers = [], stocks = [], finances = [] }) {
  return lastMonths(6).map((month) => {
    const stockRows = arr(stocks).filter((row) => monthKey(row.date || row.created_at || row.updated_at) === month && supplierId(row));
    const financeRows = arr(finances).filter((row) => monthKey(row.date || row.created_at || row.updated_at) === month && isSupplierExpense(row));
    const achats = stockRows.reduce((sum, row) => sum + stockAmount(row), 0);
    const paiements = financeRows.reduce((sum, row) => sum + financeAmount(row), 0);
    const dettes = arr(suppliers).reduce((sum, supplier) => sum + toNumber(supplier.dettes), 0);
    return { month, achats, paiements, dettes, livraisons: stockRows.length };
  });
}

export default function FournisseursEvolution({ rows = [], stocks = [], finances = [], onNavigate }) {
  const data = buildRows({ suppliers: rows, stocks, finances });
  const achats = data.reduce((sum, row) => sum + row.achats, 0);
  const paiements = data.reduce((sum, row) => sum + row.paiements, 0);
  const dettes = rows.reduce((sum, row) => sum + toNumber(row.dettes), 0);
  const livraisons = data.reduce((sum, row) => sum + row.livraisons, 0);

  return (
    <div className="space-y-3">
      <SmartEvolutionChart
        moduleName="Fournisseurs"
        title="Évolution fournisseurs & approvisionnement"
        subtitle="Achats fournisseurs, paiements, dettes et livraisons sur les derniers mois"
        months={data.map((row) => row.month)}
        leftUnit="FCFA"
        rightUnit="liv."
        series={[
          { name: 'Achats', type: 'bar', unit: 'FCFA', data: data.map((row) => row.achats) },
          { name: 'Paiements', type: 'bar', unit: 'FCFA', data: data.map((row) => row.paiements) },
          { name: 'Dettes', type: 'line', axis: 'left', unit: 'FCFA', data: data.map((row) => row.dettes) },
          { name: 'Livraisons', type: 'line', axis: 'right', unit: 'liv.', data: data.map((row) => row.livraisons) },
        ]}
        reportPayload={{ achats: fmtCurrency(achats), paiements: fmtCurrency(paiements), dettes: fmtCurrency(dettes), livraisons: fmtNumber(livraisons), fournisseurs: fmtNumber(rows.length) }}
      />
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]">
        <p><b>Interprétation :</b> {dettes > 0 ? `${fmtCurrency(dettes)} restent à suivre côté fournisseurs.` : 'Aucune dette fournisseur déclarée actuellement.'}</p>
        <button type="button" onClick={() => onNavigate?.('fournisseurs')} className="mt-2 font-bold text-emerald-700">Action recommandée : vérifier les fournisseurs avec dettes ou ruptures liées</button>
      </div>
    </div>
  );
}
