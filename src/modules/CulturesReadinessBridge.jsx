import { AlertTriangle, CheckCircle2, Droplets, Sprout, TrendingUp } from 'lucide-react';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const num = (value) => Number(value || 0) || 0;
const lower = (value) => String(value || '').trim().toLowerCase();
const hasValue = (row, keys = []) => keys.some((key) => row?.[key] !== undefined && row?.[key] !== null && String(row?.[key]).trim() !== '' && Number(row?.[key] || 0) !== 0);
const amount = (row = {}) => num(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount);

function Mini({ icon: Icon, label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : tone === 'warning' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';
  return <div className={`rounded-2xl border p-4 ${cls}`}><Icon size={17} /><p className="mt-2 text-xl font-black text-[#2f2415]">{value}</p><p className="text-xs font-bold">{label}</p></div>;
}

function CultureLine({ row }) {
  const name = row.nom || row.name || row.culture || row.variete || row.id;
  const costs = num(row.cout_total || row.total_cost || row.cout_intrants || row.cout_semences || row.cout_engrais || row.cout_eau || row.cout_main_oeuvre);
  const harvest = num(row.quantite_recoltee || row.recolte || row.rendement || row.production || row.harvest_qty);
  const revenue = num(row.valeur_recolte || row.revenu_estime || row.valeur_estimee || row.chiffre_affaires);
  const hasInputs = hasValue(row, ['intrants', 'semences', 'engrais', 'fertilisant', 'produits', 'cout_intrants', 'cout_semences', 'cout_engrais']);
  const hasWater = hasValue(row, ['eau', 'irrigation', 'cout_eau', 'water_cost']);
  const hasLabor = hasValue(row, ['main_oeuvre', 'cout_main_oeuvre', 'personnel', 'labor_cost']);
  const hasYield = harvest > 0 || hasValue(row, ['rendement', 'quantite_recoltee', 'recolte', 'production']);
  const missing = [!hasInputs ? 'intrants' : null, !hasWater ? 'eau' : null, !hasLabor ? 'main-d’œuvre' : null, !hasYield ? 'rendement' : null, costs <= 0 ? 'coûts' : null].filter(Boolean);
  const margin = revenue - costs;
  return <div className={`rounded-2xl border p-4 ${missing.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}><div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="font-black text-[#2f2415]">{name}</p><p className="mt-1 text-xs text-[#7d6a4a]">{missing.length ? `À compléter : ${missing.join(', ')}` : 'Suivi bien renseigné.'}</p></div><div className="grid grid-cols-3 gap-2 text-xs text-[#7d6a4a]"><span><b className="block text-[#2f2415]">{fmtCurrency(costs)}</b> Coûts</span><span><b className="block text-[#2f2415]">{harvest || '—'}</b> Récolte</span><span><b className={margin >= 0 ? 'block text-emerald-700' : 'block text-red-700'}>{fmtCurrency(margin)}</b> Résultat</span></div></div></div>;
}

export default function CulturesReadinessBridge({ rows = [], transactions = [], salesOrders = [] }) {
  const cultures = arr(rows);
  const cultureTransactions = arr(transactions).filter((row) => lower(`${row.module_lie || ''} ${row.source_module || ''} ${row.categorie || ''} ${row.libelle || ''}`).includes('culture'));
  const cultureSales = arr(salesOrders).filter((row) => lower(`${row.source_module || ''} ${row.product_type || ''} ${row.type || ''}`).includes('culture'));
  const completeCostRows = cultures.filter((row) => num(row.cout_total || row.total_cost || row.cout_intrants || row.cout_semences || row.cout_engrais || row.cout_eau || row.cout_main_oeuvre) > 0).length;
  const yieldRows = cultures.filter((row) => num(row.quantite_recoltee || row.recolte || row.rendement || row.production || row.harvest_qty) > 0).length;
  const totalCosts = cultures.reduce((sum, row) => sum + num(row.cout_total || row.total_cost || row.cout_intrants || row.cout_semences || row.cout_engrais || row.cout_eau || row.cout_main_oeuvre), 0) + cultureTransactions.reduce((sum, row) => sum + amount(row), 0);
  const totalSales = cultureSales.reduce((sum, row) => sum + amount(row), 0);
  return <div className="space-y-4"><div className="grid grid-cols-1 md:grid-cols-4 gap-3"><Mini icon={Sprout} label="Cultures suivies" value={cultures.length} tone={cultures.length ? 'good' : 'warning'} /><Mini icon={CheckCircle2} label="Coûts renseignés" value={`${completeCostRows}/${cultures.length || 0}`} tone={completeCostRows === cultures.length && cultures.length ? 'good' : 'warning'} /><Mini icon={Droplets} label="Rendement renseigné" value={`${yieldRows}/${cultures.length || 0}`} tone={yieldRows === cultures.length && cultures.length ? 'good' : 'warning'} /><Mini icon={TrendingUp} label="Résultat visible" value={fmtCurrency(totalSales - totalCosts)} tone={totalSales - totalCosts >= 0 ? 'good' : 'warning'} /></div><div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><p className="font-black text-[#2f2415]"><AlertTriangle size={16} className="inline text-amber-600" /> Lecture cultures</p><p className="mt-1 text-sm text-[#8a7456]">Pour défendre les cultures dans le guide, chaque parcelle doit montrer : intrants, eau, main-d’œuvre, coûts, récolte et résultat.</p></div><div className="grid grid-cols-1 gap-3">{cultures.length ? cultures.slice(0, 8).map((row) => <CultureLine key={row.id || row.nom || row.name} row={row} />) : <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Aucune culture suivie pour le moment.</div>}</div></div>;
}
