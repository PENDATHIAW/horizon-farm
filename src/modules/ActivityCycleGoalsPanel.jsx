import { Beef, CalendarDays, Drumstick, Egg, Target } from 'lucide-react';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { buildCalculatedCycleDates } from '../services/productionCycleDates';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const monthKey = (date = new Date()) => new Date(date).toISOString().slice(0, 7);
const thisMonth = () => monthKey(new Date());
const bpMonth = () => HORIZON_FARM_OFFICIAL_BP.revenue.monthly?.[(new Date().getMonth())] || HORIZON_FARM_OFFICIAL_BP.revenue.monthly?.[0] || {};
const saleAmount = (row = {}) => toNumber(row.montant_total ?? row.total ?? row.amount ?? row.total_amount);
const saleText = (row = {}) => `${row.product_name || ''} ${row.source_type || ''} ${row.sale_kind || ''} ${row.module_lie || ''}`.toLowerCase();
const saleMonth = (row = {}) => String(row.date || row.date_vente || row.order_date || row.created_at || '').slice(0, 7);

function salesByActivity(salesOrders = []) {
  const month = thisMonth();
  return arr(salesOrders).filter((row) => saleMonth(row) === month).reduce((acc, row) => {
    const text = saleText(row);
    const amount = saleAmount(row);
    if (text.includes('chair') || text.includes('poulet')) acc.chair += amount;
    else if (text.includes('bovin') || text.includes('boeuf') || text.includes('bœuf')) acc.bovins += amount;
    else if (text.includes('oeuf') || text.includes('œuf') || text.includes('pondeuse')) acc.oeufs += amount;
    else acc.autres += amount;
    return acc;
  }, { chair: 0, bovins: 0, oeufs: 0, autres: 0 });
}
function buildRows(dataMap = {}) {
  const lots = arr(dataMap.lots || dataMap.avicole);
  const animaux = arr(dataMap.animaux);
  const sales = arr(dataMap.salesOrders || dataMap.sales_orders);
  const dates = buildCalculatedCycleDates({ lots, animaux });
  const bp = bpMonth();
  const real = salesByActivity(sales);
  const chairReadyThisMonth = dates.chairSales.filter((row) => String(row.targetDate || '').slice(0, 7) === thisMonth()).reduce((sum, row) => sum + toNumber(row.quantity), 0);
  const bovinsReadyThisMonth = dates.bovinSales.filter((row) => String(row.targetDate || '').slice(0, 7) === thisMonth()).length;
  const layerCount = dates.layerReform.reduce((sum, row) => sum + toNumber(row.quantity), 0) || lots.filter((lot) => `${lot.type || ''} ${lot.name || ''}`.toLowerCase().includes('pondeuse')).reduce((sum, lot) => sum + toNumber(lot.current_count ?? lot.initial_count), 0);
  const rows = [
    { key: 'chair', icon: Drumstick, label: 'Poulets de chair', bpTarget: toNumber(bp.chair), realized: real.chair, operational: chairReadyThisMonth ? `${fmtNumber(chairReadyThisMonth)} sujet(s) vendables ce mois` : 'Aucune bande chair vendable ce mois', rule: 'Objectif mensuel déclenché par les bandes arrivant à J+40 depuis leur date d’ajout.' },
    { key: 'oeufs', icon: Egg, label: 'Œufs / pondeuses', bpTarget: toNumber(bp.oeufs), realized: real.oeufs, operational: layerCount ? `${fmtNumber(layerCount)} pondeuse(s) en base productive` : 'Pas de base pondeuses renseignée', rule: 'Objectif mensuel dépend du nombre de pondeuses actives et du taux de ponte réel, pas d’une simple division annuelle.' },
    { key: 'bovins', icon: Beef, label: 'Bovins', bpTarget: toNumber(bp.bovins), realized: real.bovins, operational: bovinsReadyThisMonth ? `${fmtNumber(bovinsReadyThisMonth)} bovin(s) vendable(s) ce mois` : 'Aucun bovin arrivé à J+90 ce mois', rule: 'Objectif mensuel activé par le pipeline : vente à J+90, puis rachat de 5 selon le roulement.' },
  ];
  return rows.map((row) => ({ ...row, remaining: Math.max(0, row.bpTarget - row.realized), attainment: row.bpTarget > 0 ? Math.round((row.realized / row.bpTarget) * 100) : 0 }));
}
function RowCard({ row }) {
  const Icon = row.icon;
  return <article className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-3"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-black text-[#2f2415]"><Icon size={17} className="text-[#9a6b12]" /> {row.label}</p><p className="text-xs text-[#8a7456] mt-1">{row.operational}</p></div><span className={`rounded-full px-2 py-0.5 text-xs font-black ${row.attainment >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`}>{row.attainment}%</span></div><div className="grid grid-cols-3 gap-2 text-xs"><Mini label="Objectif BP" value={fmtCurrency(row.bpTarget)} /><Mini label="Réalisé" value={fmtCurrency(row.realized)} /><Mini label="Reste" value={fmtCurrency(row.remaining)} /></div><p className="rounded-xl border border-[#eadcc2] bg-white p-3 text-xs text-[#7d6a4a] leading-relaxed">{row.rule}</p></article>;
}
function Mini({ label, value }) { return <div className="rounded-xl border border-[#eadcc2] bg-white p-2"><p className="text-[#8a7456]">{label}</p><p className="font-black text-[#2f2415] break-words">{value}</p></div>; }

export default function ActivityCycleGoalsPanel({ dataMap = {}, onNavigate }) {
  const rows = buildRows(dataMap);
  const totalTarget = rows.reduce((sum, row) => sum + row.bpTarget, 0);
  const totalReal = rows.reduce((sum, row) => sum + row.realized, 0);
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Target size={15} /> Objectifs par cycles réels</p><h3 className="text-xl font-black text-[#2f2415] mt-1">Mensuel par activité : BP + capacité disponible</h3><p className="text-sm text-[#8a7456] mt-1">Les objectifs ne sont pas linéaires : chair suit J+40, bovins J+90, œufs suivent pondeuses actives et ponte réelle.</p></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><CalendarDays size={15} className="inline text-[#9a6b12]" /> {thisMonth()} · {fmtCurrency(totalReal)} / {fmtCurrency(totalTarget)}</div></div>
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">{rows.map((row) => <RowCard key={row.key} row={row} />)}</div>
    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#7d6a4a]"><b className="text-[#2f2415]">Règle :</b> l’objectif BP reste la référence annuelle, mais l’objectif mensuel opérationnel doit suivre ce qui a été investi et ce qui est réellement vendable ce mois-ci.</div>
    <div className="flex flex-wrap justify-end gap-2"><button type="button" onClick={() => onNavigate?.('centre_ia')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Centre décisionnel</button><button type="button" onClick={() => onNavigate?.('ventes')} className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] px-3 py-2 text-sm font-bold text-[#2f2415]">Ventes</button></div>
  </section>;
}
