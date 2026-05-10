import { AlertTriangle, Package, ShoppingCart, TrendingUp } from 'lucide-react';
import SmartEvolutionChart from '../components/charts/SmartEvolutionChart.jsx';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

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
  if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), achats: 0, valeur_stock: 0, sorties: 0, pertes: 0, ruptures: 0, critiques: 0, sous_seuil: 0, mouvements: 0, reappro: 0, rotation: 0 });
  return map.get(key);
}

function SmallMetric({ label, value, hint, danger = false }) {
  return <div className={`border rounded-xl p-3 ${danger ? 'bg-red-50 border-red-200' : 'bg-[#fffdf8] border-[#d6c3a0]'}`}><p className="text-xs text-[#8a7456]">{label}</p><p className={`text-xl font-black mt-1 ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>{hint ? <p className="text-[11px] text-[#8a7456] mt-1">{hint}</p> : null}</div>;
}

function buildMonthly(rows = [], alimentationLogs = []) {
  const map = new Map();
  const currentKey = monthKey(new Date());
  const currentBucket = ensure(map, currentKey);
  arr(rows).forEach((row) => {
    currentBucket.valeur_stock += valueOf(row);
    if (isZero(row)) currentBucket.ruptures += 1;
    if (isCritical(row)) currentBucket.critiques += 1;
    if (isCritical(row)) currentBucket.sous_seuil += 1;
    const type = movementType(row);
    const q = movementQty(row);
    if (q) {
      const bucket = ensure(map, monthKey(movementDate(row)));
      bucket.mouvements += 1;
      if (type.includes('entree') || type.includes('entrée') || type.includes('reception') || type.includes('réception') || type.includes('achat')) { bucket.reappro += q; bucket.achats += q * unitPrice(row); }
      if (type.includes('sortie') || type.includes('utilisation') || type.includes('consomm')) bucket.sorties += q;
      if (type.includes('perte')) bucket.pertes += q;
    }
  });
  arr(alimentationLogs).forEach((log) => {
    const bucket = ensure(map, monthKey(log.date || log.created_at || log.updated_at));
    const q = logQty(log);
    bucket.sorties += q;
    bucket.mouvements += 1;
    bucket.achats += logCost(log) || 0;
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).map((row) => ({ ...row, rotation: row.valeur_stock > 0 ? Number(((row.sorties / Math.max(1, row.valeur_stock)) * 100).toFixed(1)) : 0 }));
}

function labels(rows) { return rows.map((row) => row.mois); }
function values(rows, key) { return rows.map((row) => toNumber(row[key])); }

export default function StockEvolution({ rows = [], alimentationLogs = [], onNavigate }) {
  const products = arr(rows);
  const monthly = buildMonthly(products, alimentationLogs);
  const criticalRows = products.filter(isCritical);
  const zeroRows = products.filter(isZero);
  const valuedRows = products.filter((row) => unitPrice(row) > 0);
  const totalValue = valuedRows.reduce((sum, row) => sum + valueOf(row), 0);
  const criticalValue = criticalRows.reduce((sum, row) => sum + valueOf(row), 0);
  const suggestedQty = criticalRows.reduce((sum, row) => {
    const target = maxStock(row) > 0 ? maxStock(row) : seuil(row);
    return sum + Math.max(0, target - qty(row));
  }, 0);

  const categoryMap = new Map();
  products.forEach((row) => {
    const key = categoryOf(row);
    if (!categoryMap.has(key)) categoryMap.set(key, { categorie: key, valeur: 0, critiques: 0, produits: 0, ruptures: 0 });
    const bucket = categoryMap.get(key);
    bucket.valeur += valueOf(row);
    bucket.produits += 1;
    if (isCritical(row)) bucket.critiques += 1;
    if (isZero(row)) bucket.ruptures += 1;
  });
  const byCategory = [...categoryMap.values()].sort((a, b) => b.valeur - a.valeur).slice(0, 8);
  const criticalProducts = criticalRows.map((row) => ({ produit: row.produit || row.nom || row.id, quantite: qty(row), seuil: seuil(row), a_commander: Math.max(0, (maxStock(row) || seuil(row)) - qty(row)) })).sort((a, b) => b.a_commander - a.a_commander).slice(0, 8);
  const priority = zeroRows.length || criticalRows.length ? { module: 'fournisseurs', label: 'Commander / contacter fournisseur', icon: AlertTriangle } : { module: 'stock', label: 'Contrôler les mouvements', icon: Package };
  const PriorityIcon = priority.icon;
  const interpretation = zeroRows.length ? `${fmtNumber(zeroRows.length)} produit(s) sont à zéro : réapprovisionnement immédiat.` : criticalRows.length ? `${fmtNumber(criticalRows.length)} produit(s) sont sous seuil.` : 'Stock globalement maîtrisé : maintenir les prix unitaires et mouvements à jour.';

  return <div className="space-y-5">
    <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Package size={18} /></div>
        <div><p className="font-black text-[#2f2415]">Évolution Stock interactive</p><p className="text-xs text-[#8a7456] mt-1">Valeur, achats, sorties, ruptures, seuils critiques et réapprovisionnements.</p></div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <SmallMetric label="Valeur stock" value={fmtCurrency(totalValue)} hint={`${valuedRows.length}/${products.length} produits valorisés`} />
        <SmallMetric label="Valeur critique" value={fmtCurrency(criticalValue)} hint="produits sous seuil" danger={criticalValue > 0} />
        <SmallMetric label="Produits critiques" value={fmtNumber(criticalRows.length)} hint="à surveiller" danger={criticalRows.length > 0} />
        <SmallMetric label="Ruptures à zéro" value={fmtNumber(zeroRows.length)} hint="action immédiate" danger={zeroRows.length > 0} />
        <SmallMetric label="À commander" value={fmtNumber(suggestedQty)} hint="quantité suggérée" />
        <SmallMetric label="Sorties aliment" value={fmtNumber(arr(alimentationLogs).length)} hint="liées aux activités" />
      </div>
    </div>

    <SmartEvolutionChart title="Stock — économie mensuelle" subtitle="Barres : achats, valeur stock, sorties et pertes. Courbe : rotation stock estimée." months={labels(monthly)} leftUnit="FCFA" rightUnit="%" series={[{ name: 'Achats stock', type: 'bar', unit: 'FCFA', data: values(monthly, 'achats') }, { name: 'Valeur stock', type: 'bar', unit: 'FCFA', data: values(monthly, 'valeur_stock') }, { name: 'Sorties / consommation', type: 'bar', data: values(monthly, 'sorties') }, { name: 'Pertes', type: 'bar', data: values(monthly, 'pertes') }, { name: 'Rotation stock', type: 'line', axis: 'right', unit: '%', data: values(monthly, 'rotation') }]} />

    <SmartEvolutionChart title="Stock — performance opérationnelle" subtitle="Produits critiques, ruptures, mouvements et réapprovisionnements par mois." months={labels(monthly)} leftUnit="" rightUnit="" series={[{ name: 'Produits critiques', type: 'bar', data: values(monthly, 'critiques') }, { name: 'Ruptures à zéro', type: 'bar', data: values(monthly, 'ruptures') }, { name: 'Sous seuil', type: 'bar', data: values(monthly, 'sous_seuil') }, { name: 'Mouvements', type: 'bar', data: values(monthly, 'mouvements') }, { name: 'Réapprovisionnements', type: 'bar', data: values(monthly, 'reappro') }]} />

    <SmartEvolutionChart title="Stock — catégories critiques" subtitle="Valeur et criticité par catégorie. Clique sur la légende pour isoler les ruptures ou les produits critiques." months={byCategory.map((row) => row.categorie)} leftUnit="FCFA" rightUnit="" series={[{ name: 'Valeur', type: 'bar', unit: 'FCFA', data: byCategory.map((row) => row.valeur) }, { name: 'Produits', type: 'bar', data: byCategory.map((row) => row.produits) }, { name: 'Critiques', type: 'bar', data: byCategory.map((row) => row.critiques) }, { name: 'Ruptures', type: 'bar', data: byCategory.map((row) => row.ruptures) }]} />

    <SmartEvolutionChart title="Stock — produits à commander" subtitle="Quantité disponible, seuil et quantité à commander pour les produits sous seuil." months={criticalProducts.map((row) => row.produit)} leftUnit="" rightUnit="" series={[{ name: 'Disponible', type: 'bar', data: criticalProducts.map((row) => row.quantite) }, { name: 'Seuil', type: 'bar', data: criticalProducts.map((row) => row.seuil) }, { name: 'À commander', type: 'bar', data: criticalProducts.map((row) => row.a_commander) }]} />

    <div className="bg-[#fffdf8] border border-[#d6c3a0] rounded-2xl p-4 text-sm text-[#7d6a4a] flex items-start gap-3"><TrendingUp size={18} className="text-[#9a6b12] mt-0.5" /><div><b className="text-[#2f2415]">Interprétation :</b> {interpretation}</div></div>
    <div className={`${criticalRows.length ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'} border rounded-2xl p-4 text-sm flex items-start justify-between gap-3`}><div className="flex items-start gap-2"><PriorityIcon size={18} className="mt-0.5" /><div><b>Action recommandée :</b> {priority.label}.</div></div><button type="button" onClick={() => onNavigate?.(priority.module)} className="shrink-0 rounded-xl bg-white/70 border border-current/10 px-3 py-1.5 text-xs font-bold">Ouvrir</button></div>
  </div>;
}
