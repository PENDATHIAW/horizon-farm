import { BrainCircuit } from 'lucide-react';
import ObjectivePerformanceCard from '../../components/ObjectivePerformanceCard.jsx';
import { buildCultureDecisionProfile } from '../../services/cultureDecisionEngine.js';
import { fmtCurrency, fmtNumber, toNumber } from '../../utils/format';
import CultureOperationalHealthPanel from '../CultureOperationalHealthPanel.jsx';
import CulturesRepairPanel from './CulturesRepairPanel.jsx';
import { getRealCultureRows } from '../CulturesTabActionsBridge.jsx';

const surfaceOf = (row = {}) => toNumber(row.surface_exploitable ?? row.surface);
const costOf = (row = {}) => toNumber(row.cout_total_reel ?? row.budget_prevu);
const revenueOf = (row = {}) => toNumber(row.revenu_reel ?? row.revenu_estime);
const qtyOf = (row = {}) => toNumber(row.quantite_disponible ?? row.quantite_recoltee);

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  return (
    <div className="rounded-2xl border border-line bg-card p-4">
      <p className="text-xs text-slate">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

export default function CulturesPilotageHub({
  rows = [],
  stocks = [],
  salesOrders = [],
  businessEvents = [],
  transactions = [],
  meteo,
  dataMap = {},
  onNavigate,
  onCreateBusinessEvent,
  onCreateStock,
  onUpdateStock,
  onRefresh,
}) {
  const realRows = getRealCultureRows(rows);
  const active = realRows.filter((row) => !['perdu', 'termine', 'vendu'].includes(String(row.statut || '').toLowerCase()));
  const totalSurface = active.reduce((sum, row) => sum + surfaceOf(row), 0);
  const totalCost = realRows.reduce((sum, row) => sum + costOf(row), 0);
  const totalRevenue = realRows.reduce((sum, row) => sum + revenueOf(row), 0);
  const sellableQty = active.reduce((sum, row) => sum + qtyOf(row), 0);
  const marginGross = totalRevenue - totalCost;
  const risky = realRows
    .map((row) => ({ row, profile: buildCultureDecisionProfile(row) }))
    .filter(({ profile }) => profile.priority === 'haute' || profile.priority === 'moyenne')
    .slice(0, 1)[0];

  const iaBrief = risky
    ? `La parcelle/culture « ${risky.row.nom || risky.row.parcelle || risky.row.id} » : ${risky.profile.decision}. ${risky.profile.risk || 'Suivi recommandé sous 48h.'}`
    : 'Aucun signal critique - cultures dans la norme. Consultez Intrants & Météo si stress hydrique suspecté.';

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-neutral-bg p-4 text-sm text-neutral">
        <p className="flex items-center gap-2 font-semibold"><BrainCircuit size={16} /> Brief décision terrain</p>
        <p className="mt-2">{iaBrief}</p>
        <p className="mt-1 text-xs text-neutral">Règles métier locales - lecture seule, aucune donnée stockée ici.</p>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        <Stat label="Cultures actives" value={active.length} tone="good" />
        <Stat label="Surface exploitée" value={`${fmtNumber(totalSurface)} m²`} />
        <Stat label="Valeur cultures (revenu fiche)" value={fmtCurrency(totalRevenue)} />
        <Stat label="Récoltes vendables" value={`${fmtNumber(sellableQty)} u.`} tone={sellableQty > 0 ? 'good' : 'warn'} />
        <Stat label="Coût de production" value={fmtCurrency(totalCost)} />
        <Stat label="Marge brute technique" value={fmtCurrency(marginGross)} tone={marginGross >= 0 ? 'good' : 'bad'} />
      </div>

      <CultureOperationalHealthPanel rows={rows} salesOrders={salesOrders} onNavigate={onNavigate} />
      <ObjectivePerformanceCard dataMap={{ ...dataMap, cultures: rows, meteo }} activity="cultures" title="Objectif cultures" compact onNavigate={onNavigate} />
      <CulturesRepairPanel
        cultures={rows}
        stocks={stocks}
        businessEvents={businessEvents}
        transactions={transactions}
        salesOrders={salesOrders}
        onCreateBusinessEvent={onCreateBusinessEvent}
        onCreateStock={onCreateStock}
        onUpdateStock={onUpdateStock}
        onRefresh={onRefresh}
      />
    </div>
  );
}
