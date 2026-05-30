import ChartsGrid from '../components/charts/ChartsGrid.jsx';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import SmartPieChart from '../components/charts/SmartPieChart.jsx';
import { toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const seuil = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const maxStock = (row = {}) => toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price ?? row.price ?? row.cout_unitaire);
const valueOf = (row = {}) => qty(row) * unitPrice(row);
const categoryOf = (row = {}) => row.categorie || row.category || 'Autre';
const isCritical = (row = {}) => seuil(row) > 0 && qty(row) <= seuil(row);
const isZero = (row = {}) => qty(row) <= 0;
const movementType = (row = {}) => lower(row.last_movement_type || row.type || row.mouvement_type || row.event_type);
const movementQty = (row = {}) => toNumber(row.last_movement_qty ?? row.quantite ?? row.quantity);
const movementDate = (row = {}) => row.last_movement_at || row.date || row.created_at || row.updated_at;
const logQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty);
const logCost = (row = {}) => toNumber(row.cout_total ?? row.total_cost ?? row.montant ?? row.amount ?? row.cost ?? 0);

function asDate(value) { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? null : parsed; }
function monthKey(value) { const date = asDate(value); if (!date) return 'Sans date'; return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; }
function monthLabel(key) { if (key === 'Sans date') return key; const [year, month] = key.split('-'); return `${month}/${String(year).slice(-2)}`; }
function ensure(map, key) { if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), achats: 0, valeur_stock: 0, sorties: 0, pertes: 0, ruptures: 0, critiques: 0, mouvements: 0, reappro: 0, rotation: 0 }); return map.get(key); }

function buildMonthly(rows = [], alimentationLogs = []) {
  const map = new Map();
  const currentKey = monthKey(new Date());
  const currentBucket = ensure(map, currentKey);
  arr(rows).forEach((row) => {
    currentBucket.valeur_stock += valueOf(row);
    if (isZero(row)) currentBucket.ruptures += 1;
    if (isCritical(row)) currentBucket.critiques += 1;
    const type = movementType(row);
    const q = movementQty(row);
    if (q) {
      const bucket = ensure(map, monthKey(movementDate(row)));
      bucket.mouvements += 1;
      if (type.includes('entree') || type.includes('entrée') || type.includes('reception') || type.includes('achat')) { bucket.reappro += q; bucket.achats += q * unitPrice(row); }
      if (type.includes('sortie') || type.includes('utilisation') || type.includes('consomm')) bucket.sorties += q;
      if (type.includes('perte')) bucket.pertes += q;
    }
  });
  arr(alimentationLogs).forEach((log) => {
    const bucket = ensure(map, monthKey(log.date || log.created_at || log.updated_at));
    bucket.sorties += logQty(log);
    bucket.mouvements += 1;
    bucket.achats += logCost(log) || 0;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, rotation: row.valeur_stock > 0 ? Number(((row.sorties / Math.max(1, row.valeur_stock)) * 100).toFixed(1)) : 0 }));
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function StockEvolution({ rows = [], alimentationLogs = [] }) {
  const products = arr(rows);
  const monthly = buildMonthly(products, alimentationLogs);
  const categoryMap = new Map();
  products.forEach((row) => {
    const key = categoryOf(row);
    if (!categoryMap.has(key)) categoryMap.set(key, { categorie: key, valeur: 0, critiques: 0, ruptures: 0 });
    const bucket = categoryMap.get(key);
    bucket.valeur += valueOf(row);
    if (isCritical(row)) bucket.critiques += 1;
    if (isZero(row)) bucket.ruptures += 1;
  });
  const byCategory = [...categoryMap.values()].sort((a, b) => b.valeur - a.valeur).slice(0, 6);

  return (
    <ChartsGrid>
      <SmartEvolutionChart moduleName="Stock" compact title="Achats vs sorties" subtitle="Histogramme — flux stock mensuels" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Achats', type: 'bar', unit: 'FCFA', data: values(monthly, 'achats') },
        { name: 'Sorties', type: 'bar', unit: 'FCFA', data: values(monthly, 'sorties') },
      ]} />
      <SmartEvolutionChart moduleName="Stock" compact title="Rotation stock" subtitle="Courbe — % sorties / valeur" months={labels(monthly)} leftUnit="%" rightUnit="" series={[
        { name: 'Rotation', type: 'line', unit: '%', data: values(monthly, 'rotation') },
      ]} />
      <SmartPieChart moduleName="Stock" compact title="Valeur par catégorie" subtitle="Camembert — répartition du stock" unit="FCFA" items={byCategory.map((row) => ({ name: row.categorie, value: row.valeur }))} />
      <SmartEvolutionChart moduleName="Stock" compact title="Ruptures vs critiques" subtitle="Histogramme — alertes stock" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Ruptures', type: 'bar', data: values(monthly, 'ruptures') },
        { name: 'Critiques', type: 'bar', data: values(monthly, 'critiques') },
      ]} />
      <SmartEvolutionChart moduleName="Stock" compact title="Mouvements vs réappro" subtitle="Histogramme — activité stock" months={labels(monthly)} leftUnit="" rightUnit="" series={[
        { name: 'Mouvements', type: 'bar', data: values(monthly, 'mouvements') },
        { name: 'Réappro', type: 'bar', data: values(monthly, 'reappro') },
      ]} />
      <SmartEvolutionChart moduleName="Stock" compact title="Valeur stock vs pertes" subtitle="Histogramme — valorisation et pertes" months={labels(monthly)} leftUnit="FCFA" rightUnit="" series={[
        { name: 'Valeur stock', type: 'bar', unit: 'FCFA', data: values(monthly, 'valeur_stock') },
        { name: 'Pertes', type: 'bar', unit: 'FCFA', data: values(monthly, 'pertes') },
      ]} />
    </ChartsGrid>
  );
}
