import { AlertTriangle, Beef, CalendarDays, CheckCircle2, HeartPulse, ShoppingCart, Utensils } from 'lucide-react';
import { buildCalculatedCycleDates } from '../services/productionCycleDates';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const dateOf = (row = {}) => clean(row.date || row.date_log || row.created_at || row.event_date).slice(0, 10);
const statusOf = (row = {}) => lower(row.status || row.statut || row.health_status);
const isClosed = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'sorti'].some((word) => statusOf(row).includes(word));
const isBovin = (row = {}) => lower(`${row.type || ''} ${row.espece || ''} ${row.species || ''} ${row.name || ''}`).includes('bovin');
const animalName = (row = {}) => clean(row.name || row.nom || row.boucle_numero || row.id || 'Animal');
const saleAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.montant);
const saleText = (row = {}) => lower(`${row.product_name || ''} ${row.source_type || ''} ${row.sale_kind || ''}`);

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={15} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><p className="mt-1 text-xs text-slate">{label}</p><p className="font-semibold text-earth break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${danger ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{children}</span>;
}

export default function AnimalCycleHealthPanel({ rows = [], alimentationLogs = [], vaccins = [], salesOrders = [], onNavigate }) {
  const active = arr(rows).filter((animal) => !isClosed(animal));
  const bovins = active.filter(isBovin);
  const cycles = buildCalculatedCycleDates({ lots: [], animaux: active });
  const bovinSales = arr(cycles.bovinSales || []);
  const dueSoon = bovinSales.filter((row) => row.targetDate && row.targetDate <= addDays(10));
  const late = bovinSales.filter((row) => row.targetDate && row.targetDate < today());
  const sick = active.filter((animal) => ['malade', 'a_surveiller', 'à surveiller', 'traitement'].some((word) => statusOf(animal).includes(word)));
  const feedToday = arr(alimentationLogs).filter((log) => dateOf(log) === today()).reduce((sum, log) => sum + toNumber(log.quantite ?? log.quantity), 0);
  const healthLate = arr(vaccins).filter((v) => ['retard', 'a_faire', 'à faire'].some((word) => statusOf(v).includes(word))).length;
  const animalSales = arr(salesOrders).filter((sale) => saleText(sale).includes('animal') || saleText(sale).includes('bovin')).reduce((sum, sale) => sum + saleAmount(sale), 0);
  const priority = [...late, ...dueSoon].slice(0, 6);
  const warningCount = late.length + dueSoon.length + sick.length + healthLate;
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><CalendarDays size={15} /> Pilotage animaux</p><h3 className="text-xl font-semibold text-earth mt-1">Cycles bovins, santé, alimentation et ventes</h3><p className="text-sm text-slate mt-1">Les bovins vendables sont calculés à J+90 depuis leur date d’ajout. Les ventes, soins et aliments doivent rester reliés à chaque animal.</p></div>{warningCount ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {warningCount} point(s) à surveiller</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Cheptel maîtrisé</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"><Mini icon={Beef} label="Animaux actifs" value={active.length} /><Mini icon={Beef} label="Bovins actifs" value={bovins.length} /><Mini icon={CalendarDays} label="Bovins vendables ≤10j" value={dueSoon.length} danger={dueSoon.length > 0} /><Mini icon={AlertTriangle} label="Bovins en retard" value={late.length} danger={late.length > 0} /><Mini icon={Utensils} label="Aliment aujourd’hui" value={`${fmtNumber(feedToday)} kg`} /><Mini icon={ShoppingCart} label="CA animaux" value={fmtCurrency(animalSales)} /></div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-card"><table className="min-w-full text-sm"><thead className="bg-earth text-white"><tr><th className="px-3 py-2 text-left">Animal / cycle</th><th className="px-3 py-2 text-left">Date vente calculée</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{priority.length ? priority.map((row, idx) => { const lateRow = row.targetDate && row.targetDate < today(); return <tr key={`${row.id || row.animal_id || idx}-${row.targetDate}`} className="border-t border-line"><td className="px-3 py-2"><b className="text-earth">{row.name || row.label || row.animal_id || row.id || 'Bovin'}</b><p className="text-xs text-slate">Cycle embouche J+90</p></td><td className="px-3 py-2 text-slate">{row.targetDate || '-'}</td><td className="px-3 py-2 text-slate">Préparer vente ou renouvellement</td><td className="px-3 py-2"><Badge danger={lateRow}>{lateRow ? 'En retard' : 'À préparer'}</Badge></td></tr>; }) : <tr><td colSpan="4" className="px-3 py-6 text-center text-slate">Aucun bovin vendable prioritaire dans les prochains jours.</td></tr>}</tbody></table></div>
    {sick.length || healthLate ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark"><HeartPulse size={15} className="inline" /> Santé à suivre : {sick.map(animalName).join(' · ') || 'aucun animal malade'}{healthLate ? ` · ${healthLate} soin(s)/vaccin(s) en retard` : ''}</div> : null}
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Stock alimentation</button><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Ventes</button><button type="button" onClick={() => onNavigate?.('sante')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Santé</button></div>
  </section>;
}
