import { Beef, History, Wallet } from 'lucide-react';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';
import { calculateUnifiedAnimalCost } from '../services/unifiedCostService.js';

const arr = (value) => Array.isArray(value) ? value : [];
const animalLabel = (row = {}) => row.name || row.tag || row.id || 'Animal';
const logAnimalId = (row = {}) => String(row.animal_id || row.cible_id || row.related_id || row.entity_id || row.source_record_id || '');
const logCost = (row = {}) => toNumber(row.montant_total ?? row.cout_total ?? row.amount ?? row.montant);
const logQty = (row = {}) => toNumber(row.quantite ?? row.quantity ?? row.qty);
const animalRevenue = (row = {}) => toNumber(row.prix_vente_reel ?? row.sale_price ?? row.revenu_reel ?? row.revenu_estime);

function CostCard({ label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="text-xs text-[#8a7456]">{label}</p>
    <p className={`mt-1 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

export default function AnimalCostOverview({ rows = [], alimentationLogs = [], vaccins = [], businessEvents = [] }) {
  const activeRows = arr(rows).filter((animal) => animal?.id && !['vendu', 'mort', 'vole', 'volé', 'abattu', 'abattue'].includes(String(animal.status || '').toLowerCase()));
  const details = activeRows.map((animal) => {
    const cost = calculateUnifiedAnimalCost({ animal, alimentationLogs, vaccins, directCharges: businessEvents, slaughterEvents: businessEvents }).raw;
    const revenue = animalRevenue(animal);
    const directMargin = revenue - cost.totalCost;
    return { animal, cost, revenue, directMargin, directMarginPct: revenue > 0 ? (directMargin / revenue) * 100 : 0 };
  });
  const totals = details.reduce((acc, item) => ({
    achat: acc.achat + item.cost.baseCost,
    alimentation: acc.alimentation + item.cost.feedCostUsed,
    sante: acc.sante + item.cost.healthCost,
    charges: acc.charges + item.cost.otherDirectCost,
    total: acc.total + item.cost.totalCost,
    revenu: acc.revenu + item.revenue,
    margeDirecte: acc.margeDirecte + item.directMargin,
  }), { achat: 0, alimentation: 0, sante: 0, charges: 0, total: 0, revenu: 0, margeDirecte: 0 });
  const marginPct = totals.revenu > 0 ? (totals.margeDirecte / totals.revenu) * 100 : 0;

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Beef size={20} /> Coût réel animaux</p>
        <p className="mt-1 text-sm text-[#8a7456]">Coûts directs animaux uniquement : achat, alimentation, santé et charges ponctuelles liées.</p>
      </div>
      <div className="rounded-2xl bg-[#2f2415] px-4 py-3 text-white">
        <p className="text-xs opacity-80">Marge directe</p>
        <p className="text-xl font-black">{fmtCurrency(totals.margeDirecte)}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <CostCard label="Achat animaux" value={fmtCurrency(totals.achat)} hint="coût d'achat individuel" />
      <CostCard label="Alimentation" value={fmtCurrency(totals.alimentation)} hint="logs cumulés + estimation si vide" />
      <CostCard label="Santé" value={fmtCurrency(totals.sante)} hint="soins, vaccins, traitements" />
      <CostCard label="Charges directes" value={fmtCurrency(totals.charges)} hint="transport, frais directs, divers" />
      <CostCard label="Coût moyen direct" value={fmtCurrency(details.length ? totals.total / details.length : 0)} hint={`${fmtNumber(details.length)} animal(aux)`} />
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <CostCard label="Revenus saisis" value={fmtCurrency(totals.revenu)} hint="ventes / estimations" />
      <CostCard label="Coût direct total" value={fmtCurrency(totals.total)} hint="sans RH / exploitation" />
      <CostCard label="Marge directe" value={fmtCurrency(totals.margeDirecte)} hint={`${marginPct.toFixed(1)}%`} danger={totals.margeDirecte < 0} />
      <CostCard label="Charges structure" value="À part" hint="RH / exploitation dans Finances-Comptabilité" />
    </div>

    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Animal</th><th className="py-2 px-3">Revenu</th><th className="py-2 px-3">Coût direct</th><th className="py-2 px-3">Marge directe</th><th className="py-2 px-3">Taux</th><th className="py-2 px-3">Coût/kg</th></tr></thead>
        <tbody>{details.slice(0, 10).map(({ animal, cost, revenue, directMargin, directMarginPct }) => <tr key={animal.id} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{animalLabel(animal)}</td><td className="py-3 px-3">{fmtCurrency(revenue)}</td><td className="py-3 px-3 font-black">{fmtCurrency(cost.totalCost)}<p className="text-[11px] text-[#8a7456]">achat + aliment + santé + charges</p></td><td className={`py-3 px-3 font-bold ${directMargin < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtCurrency(directMargin)}</td><td className="py-3 px-3">{directMarginPct.toFixed(1)}%</td><td className="py-3 px-3">{cost.costPerKg ? fmtCurrency(cost.costPerKg) : '—'}</td></tr>)}</tbody>
      </table>
    </div>

    <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
      <p className="flex items-center gap-2 font-black text-[#2f2415]"><History size={16} /> Dernières alimentations animaux</p>
      {arr(alimentationLogs).filter((log) => logAnimalId(log)).slice(0, 6).length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-2">{arr(alimentationLogs).filter((log) => logAnimalId(log)).slice(0, 6).map((log) => <div key={log.id || `${log.date}-${log.animal_id}`} className="rounded-xl border border-[#eadcc2] bg-white p-3 text-sm"><div className="flex items-center justify-between gap-2"><b className="text-[#2f2415]">{log.date || '—'}</b><span className="text-[#8a7456]">{fmtCurrency(logCost(log))}</span></div><p className="text-xs text-[#8a7456] mt-1">Animal {logAnimalId(log)} · {fmtNumber(logQty(log))} {log.unite || 'kg'} · {log.produit || log.stock_id || 'stock aliment'}</p></div>)}</div> : <p className="text-sm text-[#8a7456]">Aucune alimentation animal enregistrée.</p>}
    </div>

    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2"><Wallet size={16} className="mt-0.5" /> Les coûts directs restent dans l’activité. Les pertes diminuent les quantités et restent en historique. RH et exploitation sont calculées à part dans Finances/Comptabilité.</div>
  </section>;
}
