import { Calculator, Wallet } from 'lucide-react';
import useCrudModule from '../hooks/useCrudModule';
import { allocateOverheadToEntities, applyOperatingMargin } from '../services/operatingMarginService';
import { calculateAvicoleLotCost } from '../utils/costEngine';
import { calculateCultureMetrics } from '../utils/businessCalculations';
import { fmtCurrency, fmtNumber, toNumber } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const effective = (provided, fallback) => arr(provided).length ? provided : fallback;
const labelOf = (row = {}) => row.name || row.nom || row.tag || row.type || row.id || 'Élément';
const lotRevenue = (row = {}) => toNumber(row.revenu_reel ?? row.revenuEstime ?? row.revenu_estime ?? row.chiffre_affaires ?? row.montant_total);
const cultureRevenue = (row = {}) => toNumber(row.revenu_reel ?? row.revenu_estime ?? row.chiffre_affaires ?? row.montant_total ?? row.valeur_recolte);

function Card({ label, value, hint, danger = false }) {
  return <div className={`rounded-2xl border p-4 ${danger ? 'border-red-200 bg-red-50' : 'border-[#eadcc2] bg-[#fffdf8]'}`}>
    <p className="text-xs text-[#8a7456]">{label}</p>
    <p className={`mt-1 text-xl font-black ${danger ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p>
    {hint ? <p className="mt-1 text-xs text-[#8a7456]">{hint}</p> : null}
  </div>;
}

function directCostFor({ mode, row, alimentationLogs, productionLogs, businessEvents }) {
  if (mode === 'avicole') {
    return calculateAvicoleLotCost({ lot: row, alimentationLogs, productionLogs, directCharges: businessEvents, healthEvents: businessEvents, slaughterEvents: businessEvents });
  }
  const metrics = calculateCultureMetrics(row);
  return {
    totalCost: toNumber(row.cout_total_reel) || metrics.costTotal,
    baseCost: toNumber(row.cout_semences ?? row.cout_preparation ?? row.budget_prevu),
    feedCostUsed: 0,
    healthCost: toNumber(row.cout_traitements ?? row.cout_phytosanitaire),
    otherDirectCost: toNumber(row.autres_charges ?? row.charges_directes),
    costPerLiveSubject: 0,
    costPerInitialSubject: 0,
  };
}

export default function ActivityOperatingMarginPanel({ mode = 'avicole', rows = [], transactions = [], alimentationLogs = [], productionLogs = [], businessEvents = [] }) {
  const financesCrud = useCrudModule('finances');
  const financeTransactions = effective(transactions, financesCrud.rows);
  const moduleKey = mode === 'cultures' ? 'cultures' : 'avicole';
  const title = mode === 'cultures' ? 'Marges cultures' : 'Marges avicoles';
  const subtitle = mode === 'cultures'
    ? 'Marge directe cultures séparée des RH et charges d’exploitation allouées.'
    : 'Marge directe lots séparée des RH et charges d’exploitation allouées.';
  const activeRows = arr(rows).filter((row) => row?.id && !['annule', 'annulé', 'perdu', 'termine', 'terminé'].includes(String(row.statut || row.status || '').toLowerCase()));
  const overhead = allocateOverheadToEntities({ module: moduleKey, entities: activeRows, transactions: financeTransactions });
  const details = activeRows.map((row) => {
    const cost = directCostFor({ mode, row, alimentationLogs, productionLogs, businessEvents });
    const revenue = mode === 'cultures' ? cultureRevenue(row) : lotRevenue(row);
    const margin = applyOperatingMargin({ directRevenue: revenue, directCosts: cost.totalCost, rhCost: overhead.perEntity.rhCost, operatingCost: overhead.perEntity.operatingCost });
    return { row, cost, margin };
  });
  const totals = details.reduce((acc, item) => ({
    revenue: acc.revenue + item.margin.revenue,
    direct: acc.direct + item.margin.directCosts,
    rh: acc.rh + item.margin.rhCost,
    exploitation: acc.exploitation + item.margin.operatingCost,
    margeDirecte: acc.margeDirecte + item.margin.directMargin,
    margeApresRh: acc.margeApresRh + item.margin.marginAfterRh,
    margeNette: acc.margeNette + item.margin.netOperatingMargin,
  }), { revenue: 0, direct: 0, rh: 0, exploitation: 0, margeDirecte: 0, margeApresRh: 0, margeNette: 0 });

  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Calculator size={20} /> {title}</p>
        <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p>
      </div>
      <div className="rounded-2xl bg-[#2f2415] px-4 py-3 text-white">
        <p className="text-xs opacity-80">Marge nette</p>
        <p className="text-xl font-black">{fmtCurrency(totals.margeNette)}</p>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
      <Card label="Revenus" value={fmtCurrency(totals.revenue)} hint={`${fmtNumber(details.length)} ligne(s)`} />
      <Card label="Coûts directs" value={fmtCurrency(totals.direct)} hint={mode === 'cultures' ? 'intrants, traitements, charges directes' : 'achat, aliment, santé, charges directes'} />
      <Card label="RH allouée" value={fmtCurrency(totals.rh)} hint="charge séparée" />
      <Card label="Exploitation" value={fmtCurrency(totals.exploitation)} hint="charge séparée" />
      <Card label="Marge directe" value={fmtCurrency(totals.margeDirecte)} hint="revenu - coût direct" danger={totals.margeDirecte < 0} />
      <Card label="Marge nette" value={fmtCurrency(totals.margeNette)} hint="après RH + exploitation" danger={totals.margeNette < 0} />
    </div>

    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]">
      <table className="min-w-full text-sm">
        <thead><tr className="border-b border-[#eadcc2] bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]"><th className="py-2 px-3">Cible</th><th className="py-2 px-3">Revenu</th><th className="py-2 px-3">Coût direct</th><th className="py-2 px-3">RH</th><th className="py-2 px-3">Exploitation</th><th className="py-2 px-3">Marge directe</th><th className="py-2 px-3">Marge nette</th></tr></thead>
        <tbody>{details.slice(0, 12).map(({ row, cost, margin }, index) => <tr key={`${row.id || 'activity'}-${index}`} className="border-b border-[#f0e5d0]"><td className="py-3 px-3 font-bold text-[#2f2415]">{labelOf(row)}<p className="text-xs text-[#8a7456]">{row.id}</p></td><td className="py-3 px-3">{fmtCurrency(margin.revenue)}</td><td className="py-3 px-3 font-bold">{fmtCurrency(cost.totalCost)}</td><td className="py-3 px-3">{fmtCurrency(margin.rhCost)}</td><td className="py-3 px-3">{fmtCurrency(margin.operatingCost)}</td><td className={`py-3 px-3 font-bold ${margin.directMargin < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{fmtCurrency(margin.directMargin)}</td><td className={`py-3 px-3 font-bold ${margin.netOperatingMargin < 0 ? 'text-red-600' : 'text-[#2f2415]'}`}>{fmtCurrency(margin.netOperatingMargin)}</td></tr>)}</tbody>
      </table>
    </div>

    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 flex items-start gap-2"><Wallet size={16} className="mt-0.5" /> Les coûts directs restent propres au module. RH et exploitation ne servent qu’à lire la rentabilité nette.</div>
  </section>;
}
