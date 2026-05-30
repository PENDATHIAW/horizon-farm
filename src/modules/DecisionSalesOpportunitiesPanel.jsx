import { CalendarDays, CheckCircle2, Egg, ShoppingCart, Sprout } from 'lucide-react';
import Btn from '../components/Btn';
import { buildCalculatedCycleDates } from '../services/productionCycleDates';
import { fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const clean = (value = '') => String(value || '').trim();
const qty = (row = {}) => toNumber(row.quantity ?? row.quantite ?? row.count ?? row.effectif ?? row.current_count ?? row.effectif_actuel);
const cultureQty = (row = {}) => toNumber(row.quantite_disponible ?? row.quantite_recoltee ?? row.rendement_reel);
const eggsQty = (row = {}) => toNumber(row.oeufs ?? row.eggs ?? row.quantite_oeufs ?? row.quantity);
const logDate = (row = {}) => clean(row.date || row.date_log || row.created_at).slice(0, 10);
const isDue = (date = '') => date && date <= addDays(7);
const isLate = (date = '') => date && date < today();

function buildOps({ lots = [], animaux = [], productionLogs = [], cultures = [] }) {
  const cycles = buildCalculatedCycleDates({ lots, animaux });
  const chair = arr(cycles.chairSales).filter((row) => isDue(row.targetDate)).map((row) => ({ id: `chair-${row.id}`, type: 'Poulets chair', label: row.label, qty: row.quantity, date: row.targetDate, action: 'Préparer vente chair', priority: isLate(row.targetDate) ? 'retard' : 'pret' }));
  const bovins = arr(cycles.bovinSales).filter((row) => isDue(row.targetDate)).map((row) => ({ id: `bovin-${row.id}`, type: 'Bovin', label: row.label, qty: row.quantity || 1, date: row.targetDate, action: 'Préparer vente bovin', priority: isLate(row.targetDate) ? 'retard' : 'pret' }));
  const reform = arr(cycles.layerReform).filter((row) => isDue(row.targetDate)).map((row) => ({ id: `reform-${row.id}`, type: 'Pondeuses', label: row.label, qty: row.quantity, date: row.targetDate, action: 'Décider réforme / renouvellement', priority: isLate(row.targetDate) ? 'retard' : 'surveillance' }));
  const eggs = arr(productionLogs).filter((row) => eggsQty(row) > 0 && logDate(row) >= addDays(-3)).slice(0, 3).map((row) => ({ id: `egg-${row.id || logDate(row)}`, type: 'Œufs', label: `Œufs ramassés ${logDate(row) || ''}`, qty: eggsQty(row), date: logDate(row), action: 'Transformer en vente œufs', priority: 'pret' }));
  const cultureOps = arr(cultures).filter((row) => cultureQty(row) > 0).slice(0, 3).map((row) => ({ id: `culture-${row.id}`, type: 'Culture', label: row.culture || row.nom || row.name || row.id, qty: cultureQty(row), date: row.date_recolte || row.updated_at || '', action: 'Transformer en vente culture', priority: 'pret' }));
  return [...chair, ...bovins, ...reform, ...eggs, ...cultureOps].slice(0, 8);
}
function Badge({ value }) {
  const cls = value === 'retard' ? 'bg-red-100 text-red-700' : value === 'surveillance' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-700';
  return <span className={`rounded-full px-2 py-0.5 text-xs font-black ${cls}`}>{value === 'retard' ? 'En retard' : value === 'surveillance' ? 'À décider' : 'Prêt'}</span>;
}

export default function DecisionSalesOpportunitiesPanel({ lots = [], animaux = [], productionLogs = [], cultures = [], onNavigate }) {
  const ops = buildOps({ lots, animaux, productionLogs, cultures });
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-black text-[#2f2415] flex items-center gap-2"><ShoppingCart size={18} className="text-emerald-600" /> Opportunités de vente</p><p className="text-sm text-[#8a7456]">Uniquement ce qui existe réellement : lots, bovins, œufs ou récoltes disponibles.</p></div><Btn small variant="outline" onClick={() => onNavigate?.('ventes')}>Ouvrir ventes</Btn></div>
    {ops.length ? <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-[#fffdf8]"><table className="min-w-full text-sm"><thead className="bg-[#2f2415] text-white"><tr><th className="px-3 py-2 text-left">Produit</th><th className="px-3 py-2 text-left">Origine</th><th className="px-3 py-2 text-right">Quantité</th><th className="px-3 py-2 text-left">Date</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{ops.map((op) => <tr key={op.id} className="border-t border-[#eadcc2]"><td className="px-3 py-2 font-black text-[#2f2415]">{op.type}</td><td className="px-3 py-2 text-[#7d6a4a]">{op.label}</td><td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtNumber(op.qty)}</td><td className="px-3 py-2 text-[#7d6a4a]">{op.date || '-'}</td><td className="px-3 py-2 text-[#7d6a4a]">{op.action}</td><td className="px-3 py-2"><Badge value={op.priority} /></td></tr>)}</tbody></table></div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Aucune opportunité réelle à vendre pour le moment. Ajoute des lots, animaux, œufs ou récoltes pour déclencher les recommandations.</div>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm"><button type="button" onClick={() => onNavigate?.('avicole')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left font-bold text-[#2f2415]"><Egg size={15} className="inline" /> Avicole</button><button type="button" onClick={() => onNavigate?.('animaux')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left font-bold text-[#2f2415]"><CalendarDays size={15} className="inline" /> Animaux</button><button type="button" onClick={() => onNavigate?.('cultures')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-left font-bold text-[#2f2415]"><Sprout size={15} className="inline" /> Cultures</button></div>
  </section>;
}
