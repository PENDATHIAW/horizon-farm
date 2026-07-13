import { AlertTriangle, CalendarDays, CheckCircle2, Drumstick, Egg, Utensils } from 'lucide-react';
import { buildCalculatedCycleDates } from '../services/productionCycleDates';
import { fmtNumber, toNumber } from '../utils/format';
import { avicoleActiveCount } from '../utils/avicoleMetrics';

const arr = (value) => Array.isArray(value) ? value : [];
const clean = (value = '') => String(value || '').trim();
const lower = (value = '') => clean(value).toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const lotText = (lot = {}) => lower(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isLayer = (lot = {}) => ['pondeuse', 'ponte', 'oeuf', 'œuf'].some((word) => lotText(lot).includes(word));
const isBroiler = (lot = {}) => ['chair', 'broiler'].some((word) => lotText(lot).includes(word));
const mortality = (lot = {}) => toNumber(lot.mortality ?? lot.morts ?? lot.dead_count);
const initial = (lot = {}) => toNumber(lot.initial_count ?? lot.effectif_initial);
const mortalityRate = (lot = {}) => initial(lot) > 0 ? Math.round((mortality(lot) / initial(lot)) * 100) : 0;
const dateOf = (row = {}) => clean(row.date || row.date_log || row.created_at || row.event_date).slice(0, 10);
const addDays = (days) => { const d = new Date(); d.setDate(d.getDate() + days); return d.toISOString().slice(0, 10); };
const eggCount = (log = {}) => toNumber(log.oeufs_produits ?? log.oeufs ?? log.eggs ?? log.quantite_oeufs ?? log.quantity ?? log.quantite);
const uniqueCycleRows = (rows = []) => Array.from(new Map(rows.map((row) => [`${row.type || ''}:${row.id || row.lot_id || row.label || ''}:${row.targetDate || row.date || ''}`, row])).values());

function Mini({ icon: Icon, label, value, danger = false }) {
  return <div className={`rounded-xl border p-3 ${danger ? 'border-vigilance bg-vigilance-bg' : 'border-line bg-white'}`}><Icon size={15} className={danger ? 'text-horizon-dark' : 'text-horizon-dark'} /><p className="mt-1 text-xs text-slate">{label}</p><p className="font-semibold text-earth break-words">{value}</p></div>;
}
function Badge({ children, danger }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${danger ? 'bg-vigilance-bg text-horizon-dark' : 'bg-positive-bg text-positive'}`}>{children}</span>;
}

export default function AvicoleCycleHealthPanel({ rows = [], productionLogs = [], alimentationLogs = [], onNavigate }) {
  const lots = arr(rows);
  const active = lots.filter((lot) => avicoleActiveCount(lot) > 0);
  const layers = active.filter(isLayer);
  const broilers = active.filter(isBroiler);
  const cycles = buildCalculatedCycleDates({ lots: active, animaux: [] });
  const broilerSales = arr(cycles.chairSales || []);
  const layerReforms = arr(cycles.layerReform || []);
  const dueBroilers = broilerSales.filter((row) => row.targetDate && row.targetDate <= addDays(10));
  const lateBroilers = broilerSales.filter((row) => row.targetDate && row.targetDate < today());
  const mortalityAlerts = active.filter((lot) => mortalityRate(lot) >= 4);
  const eggsToday = arr(productionLogs).filter((log) => dateOf(log) === today()).reduce((sum, log) => sum + eggCount(log), 0);
  const feedToday = arr(alimentationLogs).filter((log) => dateOf(log) === today()).reduce((sum, log) => sum + toNumber(log.quantite ?? log.quantity), 0);
  const priorityRows = uniqueCycleRows([...lateBroilers, ...dueBroilers, ...layerReforms]).slice(0, 6);
  const warningCount = lateBroilers.length + dueBroilers.length + mortalityAlerts.length;
  return <section className="rounded-3xl border border-line bg-white p-6 shadow-card space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-normal text-slate font-semibold flex items-center gap-2"><CalendarDays size={15} /> Pilotage avicole</p><h3 className="text-xl font-semibold text-earth mt-1">Cycles, ponte, alimentation et ventes prévues</h3><p className="text-sm text-slate mt-1">Les dates de vente chair sont calculées à J+40 depuis la date d’ajout du lot. Les pondeuses restent suivies selon ponte réelle et risque de réforme.</p></div>{warningCount ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-3 text-sm text-horizon-dark"><AlertTriangle size={15} className="inline" /> {warningCount} point(s) à surveiller</div> : <div className="rounded-2xl border border-positive bg-positive-bg p-3 text-sm text-positive"><CheckCircle2 size={15} className="inline" /> Cycles maîtrisés</div>}</div>
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2"><Mini icon={Egg} label="Lots pondeuses" value={layers.length} /><Mini icon={Drumstick} label="Lots chair" value={broilers.length} /><Mini icon={CalendarDays} label="Chair à vendre ≤10j" value={dueBroilers.length} danger={dueBroilers.length > 0} /><Mini icon={AlertTriangle} label="Chair en retard" value={lateBroilers.length} danger={lateBroilers.length > 0} /><Mini icon={Egg} label="Œufs aujourd’hui" value={fmtNumber(eggsToday)} /><Mini icon={Utensils} label="Aliment aujourd’hui" value={`${fmtNumber(feedToday)} kg`} /></div>
    <div className="overflow-x-auto rounded-2xl border border-line bg-card"><table className="min-w-full text-sm"><thead className="bg-earth text-white"><tr><th className="px-3 py-2 text-left">Lot / cycle</th><th className="px-3 py-2 text-left">Date calculée</th><th className="px-3 py-2 text-right">Quantité</th><th className="px-3 py-2 text-left">Action</th><th className="px-3 py-2 text-left">Statut</th></tr></thead><tbody>{priorityRows.length ? priorityRows.map((row, idx) => { const late = row.targetDate && row.targetDate < today(); const reform = row.type === 'pondeuses' || row.type === 'layer_reform' || row.label?.toLowerCase?.().includes('réforme'); return <tr key={`${row.id || row.lot_id || 'cycle'}-${row.targetDate || 'date'}-${idx}`} className="border-t border-line"><td className="px-3 py-2"><b className="text-earth">{row.name || row.label || row.lot_id || row.id || 'Lot'}</b><p className="text-xs text-slate">{reform ? 'Pondeuses' : 'Poulets chair'}</p></td><td className="px-3 py-2 text-slate">{row.targetDate || row.date || '-'}</td><td className="px-3 py-2 text-right font-semibold text-earth">{fmtNumber(row.quantity || row.effectif || row.count || 0)}</td><td className="px-3 py-2 text-slate">{reform ? 'Surveiller ponte / décider renouvellement' : 'Préparer vente chair'}</td><td className="px-3 py-2"><Badge danger={late}>{late ? 'En retard' : 'À préparer'}</Badge></td></tr>; }) : <tr><td colSpan="5" className="px-3 py-6 text-center text-slate">Aucune vente ou réforme prioritaire dans les prochains jours.</td></tr>}</tbody></table></div>
    {mortalityAlerts.length ? <div className="rounded-2xl border border-vigilance bg-vigilance-bg p-4 text-sm text-horizon-dark"><b>Mortalité à surveiller :</b> {mortalityAlerts.map((lot) => `${lot.name || lot.nom || lot.id} (${mortalityRate(lot)}%)`).join(' · ')}</div> : null}
    <div className="flex justify-end gap-2"><button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Stock alimentation</button><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Ventes</button><button type="button" onClick={() => onNavigate?.('sante')} className="rounded-xl border border-line bg-card px-3 py-2 text-sm font-semibold text-earth">Santé</button></div>
  </section>;
}
