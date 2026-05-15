import { History, Leaf, Wallet } from 'lucide-react';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import { calculateCultureHealthCost } from '../utils/costEngine';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const cultureLabel = (row = {}) => row.nom || row.type || row.id || 'Culture';
const surface = (row = {}) => toNumber(row.surface_exploitable ?? row.surface);
const harvestQty = (row = {}) => toNumber(row.quantite_recoltee ?? row.production_reelle ?? row.quantite_disponible ?? row.quantite_prevue);
const eventTargetId = (row = {}) => String(row.target_id || row.related_id || row.entity_id || row.source_record_id || row.culture_id || row.cible_id || '');
const eventAmount = (row = {}) => toNumber(row.montant ?? row.amount ?? row.cout ?? row.cost ?? row.cout_total ?? row.total_cost ?? row.total ?? row.montant_total);
const isCultureCharge = (row = {}) => {
  const text = String(`${row.type_intervention || ''} ${row.type_evenement || ''} ${row.event_type || ''} ${row.type || ''} ${row.categorie || ''} ${row.category || ''} ${row.title || ''} ${row.libelle || ''}`).toLowerCase();
  const source = String(`${row.target_type || ''} ${row.type_cible || ''} ${row.module_lie || ''} ${row.source_module || ''}`).toLowerCase();
  return source.includes('culture') || text.includes('culture') || text.includes('engrais') || text.includes('semence') || text.includes('irrigation') || text.includes('phyto') || text.includes('phytosanitaire') || text.includes('traitement') || text.includes('carburant') || text.includes('charge_directe');
};
const directChargeFor = (events = [], cultureId) => arr(events).filter((event) => isCultureCharge(event) && eventTargetId(event) === String(cultureId)).reduce((sum, event) => sum + eventAmount(event), 0);

function Card({ label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="text-xs text-[#8a7456]">{label}</p>
    <p className={`mt-1 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function CultureCostOverview({ rows = [], businessEvents = [], healthEvents = [] }) {
  const allEvents = [...arr(businessEvents), ...arr(healthEvents)];
  const details = arr(rows).map((culture) => {
    const metrics = calculateCultureMetrics(culture);
    const chargesDirectes = directChargeFor(allEvents, culture.id);
    const health = calculateCultureHealthCost({ culture, healthEvents: allEvents, directCharges: [] });
    const coutSante = health.total;
    const baseCost = toNumber(culture.cout_total_reel) || metrics.costTotal;
    const coutTotal = baseCost + chargesDirectes + coutSante;
    const qty = harvestQty(culture);
    const area = surface(culture);
    return { culture, metrics, chargesDirectes, coutSante, coutTotal, qty, area, coutKg: qty > 0 ? coutTotal / qty : 0, coutSurface: area > 0 ? coutTotal / area : 0 };
  });
  const totals = details.reduce((acc, item) => ({
    cout: acc.cout + item.coutTotal,
    charges: acc.charges + item.chargesDirectes,
    sante: acc.sante + item.coutSante,
    surface: acc.surface + item.area,
    quantite: acc.quantite + item.qty,
    marge: acc.marge + (toNumber(item.culture.revenu_reel || item.culture.revenu_estime || item.metrics.revenueEstimated) - item.coutTotal),
  }), { cout: 0, charges: 0, sante: 0, surface: 0, quantite: 0, marge: 0 });
  const recentCharges = arr(allEvents).filter(isCultureCharge).slice(0, 6);

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Leaf size={20} /> Coût réel cultures</p>
        <p className="mt-1 text-sm text-[#8a7456]">Semences, engrais, irrigation, main-d’œuvre, traitements et charges directes par culture.</p>
      </div>
      <div className="rounded-2xl bg-[#2f2415] px-4 py-3 text-white">
        <p className="text-xs opacity-80">Coût total cultures</p>
        <p className="text-xl font-black">{fmtCurrency(totals.cout)}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Card label="Coût total" value={fmtCurrency(totals.cout)} hint={`${fmtNumber(details.length)} culture(s)`} />
      <Card label="Traitements" value={fmtCurrency(totals.sante)} hint="phyto / soins culture" />
      <Card label="Charges directes" value={fmtCurrency(totals.charges)} hint="ajouts ponctuels" />
      <Card label="Coût / m²" value={fmtCurrency(totals.surface ? totals.cout / totals.surface : 0)} hint={`${fmtNumber(totals.surface)} m²`} />
      <Card label="Coût / kg" value={fmtCurrency(totals.quantite ? totals.cout / totals.quantite : 0)} hint={`${fmtNumber(totals.quantite)} kg récoltés`} />
      <Card label="Marge culture" value={fmtCurrency(totals.marge)} danger={totals.marge < 0} />
    </div>

    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Culture</th><th className="py-2 px-3">Surface</th><th className="py-2 px-3">Récolte</th><th className="py-2 px-3">Coût total</th><th className="py-2 px-3">Traitements</th><th className="py-2 px-3">Charges directes</th><th className="py-2 px-3">Coût/kg</th><th className="py-2 px-3">Coût/m²</th></tr></thead>
        <tbody>{details.slice(0, 10).map((item) => <tr key={item.culture.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{cultureLabel(item.culture)}</td><td className="py-3 px-3">{fmtNumber(item.area)} m²</td><td className="py-3 px-3">{fmtNumber(item.qty)} kg</td><td className="py-3 px-3 font-black">{fmtCurrency(item.coutTotal)}</td><td className="py-3 px-3">{fmtCurrency(item.coutSante)}</td><td className="py-3 px-3">{fmtCurrency(item.chargesDirectes)}</td><td className="py-3 px-3">{item.coutKg ? fmtCurrency(item.coutKg) : '—'}</td><td className="py-3 px-3">{item.coutSurface ? fmtCurrency(item.coutSurface) : '—'}</td></tr>)}</tbody>
      </table>
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
      <p className="flex items-center gap-2 font-black text-[#2f2415]"><History size={16} /> Dernières charges cultures</p>
      {recentCharges.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{recentCharges.map((event) => <div key={event.id || event.title} className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm"><div className="flex justify-between gap-2"><b className="text-[#2f2415]">{event.title || event.libelle || event.event_type || 'Charge culture'}</b><span className="text-[#8a7456]">{fmtCurrency(eventAmount(event))}</span></div><p className="text-xs text-[#8a7456] mt-1">{event.event_date || event.date || '—'} · {event.description || event.notes || '—'}</p></div>)}</div> : <p className="text-sm text-[#8a7456]">Aucune charge directe culture enregistrée.</p>}
    </div>

    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2"><Wallet size={16} className="mt-0.5" /> Les traitements et charges s’additionnent au coût réel de la culture sans remplacer l’historique.</div>
  </section>;
}
