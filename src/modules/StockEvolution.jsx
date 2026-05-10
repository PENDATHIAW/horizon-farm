import { AlertTriangle, BarChart3, Package, ShoppingCart } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const lower = (value) => String(value || '').trim().toLowerCase();
const qty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.stock);
const seuil = (row = {}) => toNumber(row.seuil ?? row.threshold ?? row.seuil_alerte);
const maxStock = (row = {}) => toNumber(row.stock_max ?? row.quantite_max ?? row.max_stock);
const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price ?? row.price ?? row.cout_unitaire);
const valueOf = (row = {}) => qty(row) * unitPrice(row);
const categoryOf = (row = {}) => row.categorie || row.category || 'autre';
const isCritical = (row = {}) => seuil(row) > 0 && qty(row) <= seuil(row);
const isZero = (row = {}) => qty(row) <= 0;
const movementType = (row = {}) => lower(row.last_movement_type || row.type || row.mouvement_type || row.event_type);
const movementQty = (row = {}) => toNumber(row.last_movement_qty ?? row.quantite ?? row.quantity);
const movementDate = (row = {}) => row.last_movement_at || row.date || row.created_at || row.updated_at;

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

function NumberLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{fmtNumber(value)}</text>;
}

function MoneyLabel({ x, y, value }) {
  if (!value) return null;
  return <text x={x} y={y - 6} textAnchor="middle" fontSize={11} fill="#2f2415">{Number(value).toLocaleString('fr-FR')}</text>;
}

function buildMovementMonthly(rows = [], alimentationLogs = []) {
  const map = new Map();
  const ensure = (key) => {
    if (!map.has(key)) map.set(key, { key, mois: monthLabel(key), entrees: 0, sorties: 0, pertes: 0 });
    return map.get(key);
  };

  arr(rows).forEach((row) => {
    const type = movementType(row);
    const amount = movementQty(row);
    if (!amount) return;
    const bucket = ensure(monthKey(movementDate(row)));
    if (type.includes('entree') || type.includes('entrée') || type.includes('reception') || type.includes('réception')) bucket.entrees += amount;
    if (type.includes('sortie') || type.includes('utilisation')) bucket.sorties += amount;
    if (type.includes('perte')) bucket.pertes += amount;
  });

  arr(alimentationLogs).forEach((log) => {
    ensure(monthKey(log.date || log.created_at || log.updated_at)).sorties += toNumber(log.quantite);
  });

  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
}

export default function StockEvolution({ rows = [], alimentationLogs = [] }) {
  const products = arr(rows);
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
    if (!categoryMap.has(key)) categoryMap.set(key, { categorie: key, valeur: 0, critiques: 0, produits: 0 });
    const bucket = categoryMap.get(key);
    bucket.valeur += valueOf(row);
    bucket.produits += 1;
    if (isCritical(row)) bucket.critiques += 1;
  });
  const byCategory = [...categoryMap.values()].sort((a, b) => b.valeur - a.valeur).slice(0, 8);
  const criticalProducts = criticalRows
    .map((row) => ({ produit: row.produit || row.nom || row.id, quantite: qty(row), seuil: seuil(row), a_commander: Math.max(0, (maxStock(row) || seuil(row)) - qty(row)) }))
    .sort((a, b) => b.a_commander - a.a_commander)
    .slice(0, 8);
  const movements = buildMovementMonthly(products, alimentationLogs);

  return (
    <div className="space-y-4">
      <div className="bg-white border border-[#d6c3a0] rounded-2xl p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#fff3d8] text-[#9a6b12] flex items-center justify-center"><Package size={18} /></div>
          <div>
            <p className="font-black text-[#2f2415]">Évolution Stock</p>
            <p className="text-xs text-[#8a7456] mt-1">Lecture décisionnelle : valeur, ruptures, seuils critiques, entrées/sorties et commandes à préparer.</p>
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
          <SmallMetric label="Valeur stock" value={fmtCurrency(totalValue)} hint={`${valuedRows.length}/${products.length} produits valorisés`} />
          <SmallMetric label="Valeur critique" value={fmtCurrency(criticalValue)} hint="produits sous seuil" />
          <SmallMetric label="Produits critiques" value={fmtNumber(criticalRows.length)} hint="à surveiller" />
          <SmallMetric label="Ruptures à zéro" value={fmtNumber(zeroRows.length)} hint="action immédiate" />
          <SmallMetric label="À commander" value={fmtNumber(suggestedQty)} hint="quantité suggérée" />
          <SmallMetric label="Sorties aliment" value={fmtNumber(arr(alimentationLogs).length)} hint="liées aux activités" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ChartCard title="Valeur stock par catégorie" subtitle="Montant réellement calculable avec les prix unitaires disponibles.">
          {byCategory.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byCategory} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="categorie" /><YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(value) => fmtCurrency(value)} /><Legend /><Bar dataKey="valeur" name="Valeur"><LabelList content={<MoneyLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun stock valorisable. Complète les prix unitaires pour obtenir ce graphe.</p>}
        </ChartCard>

        <ChartCard title="Criticité par catégorie" subtitle="Nombre de produits sous seuil par catégorie.">
          {byCategory.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={byCategory} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="categorie" /><YAxis allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="produits" name="Produits"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="critiques" name="Critiques"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucune catégorie exploitable.</p>}
        </ChartCard>

        <ChartCard title="Entrées / sorties / pertes" subtitle="Basé sur les derniers mouvements stock et les utilisations alimentation enregistrées.">
          {movements.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={movements} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="mois" /><YAxis /><Tooltip /><Legend /><Bar dataKey="entrees" name="Entrées"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="sorties" name="Sorties"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="pertes" name="Pertes"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <p className="text-sm text-[#8a7456]">Aucun mouvement daté exploitable pour le moment.</p>}
        </ChartCard>

        <ChartCard title="Produits à commander" subtitle="Quantité suggérée pour revenir au seuil ou au stock cible.">
          {criticalProducts.length ? <ResponsiveContainer width="100%" height="100%"><BarChart data={criticalProducts} margin={{ top: 24, right: 16, left: 8, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="produit" /><YAxis /><Tooltip /><Legend /><Bar dataKey="quantite" name="Disponible"><LabelList content={<NumberLabel />} /></Bar><Bar dataKey="a_commander" name="À commander"><LabelList content={<NumberLabel />} /></Bar></BarChart></ResponsiveContainer> : <div className="h-full flex items-center justify-center text-sm text-emerald-700"><ShoppingCart size={18} className="mr-2" /> Aucun produit sous seuil.</div>}
        </ChartCard>
      </div>

      {criticalRows.length ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={18} className="mt-0.5" />
          <div><b>Action recommandée :</b> préparer une commande ou contacter le fournisseur pour les produits sous seuil, surtout ceux à zéro.</div>
        </div>
      ) : null}
    </div>
  );
}
