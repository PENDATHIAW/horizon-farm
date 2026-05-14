import { AlertTriangle, BrainCircuit, CheckCircle, LineChart, ShieldAlert, Sparkles, TrendingUp } from 'lucide-react';
import { useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { buildStrategicInsights } from '../services/aiStrategyService';
import { fmtCurrency, fmtNumber } from '../utils/format';

const priorityClass = {
  critique: 'border-red-300 bg-red-50 text-red-700',
  haute: 'border-orange-300 bg-orange-50 text-orange-700',
  moyenne: 'border-amber-300 bg-amber-50 text-amber-700',
  basse: 'border-sky-300 bg-sky-50 text-sky-700',
};

const axisLabel = {
  croissance: 'Croissance',
  stock: 'Stock',
  vente: 'Vente',
  achat: 'Achat',
  tresorerie: 'Tresorerie',
  risque: 'Risque',
  saisonnier: 'Saisonnier',
  pilotage: 'Pilotage',
  general: 'General',
};

export default function CentreIA({
  lots = [],
  productionLogs = [],
  alimentationLogs = [],
  stocks = [],
  marketPrices = [],
  marketCalendarEvents = [],
  salesOrders = [],
  payments = [],
  transactions = [],
  smartfarmEvents = [],
  sensors = [],
  cameras = [],
  meteo = null,
  onNavigate,
}) {
  const insights = useMemo(() => buildStrategicInsights({
    avicoleLots: lots,
    productionLogs,
    alimentationLogs,
    stocks,
    marketPrices,
    marketCalendarEvents,
    salesOrders,
    payments,
    finances: transactions,
    smartfarmEvents,
    sensors,
    cameras,
    meteo,
  }), [lots, productionLogs, alimentationLogs, stocks, marketPrices, marketCalendarEvents, salesOrders, payments, transactions, smartfarmEvents, sensors, cameras, meteo]);

  const score = Math.round(insights.strategic_score || 0);
  const criticalDecisions = insights.decisions.filter((d) => ['critique', 'haute'].includes(d.priority)).length;
  const feedDays = insights.forecasts.feed.autonomy_days;
  const projectedTablets = insights.forecasts.eggs.projected_tablets;
  const projectedCash = insights.forecasts.cash.projected_cash_balance;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Centre IA"
        sub="Cerveau decisionnel transversal — recommandations, previsions, anomalies et strategie sans duplication des modules"
        actions={
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => onNavigate?.('avicole')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-semibold text-[#7d6a4a] hover:border-emerald-500 hover:text-emerald-600">Voir Avicole</button>
            <button type="button" onClick={() => onNavigate?.('stock')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-semibold text-[#7d6a4a] hover:border-emerald-500 hover:text-emerald-600">Voir Stock</button>
            <button type="button" onClick={() => onNavigate?.('alertes')} className="rounded-xl border border-[#d6c3a0] px-3 py-2 text-xs font-semibold text-[#7d6a4a] hover:border-emerald-500 hover:text-emerald-600">Voir Alertes</button>
          </div>
        }
      />

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard icon={BrainCircuit} label="Score IA exploitation" value={`${score}/100`} sub={score >= 75 ? 'Situation favorable' : score >= 50 ? 'Pilotage a renforcer' : 'Risque eleve'} color={score >= 75 ? 'bg-emerald-500/20 text-emerald-500' : score >= 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'} />
        <KpiCard icon={Sparkles} label="Decisions prioritaires" value={criticalDecisions} sub="Critiques ou hautes" color="bg-purple-500/20 text-purple-500" />
        <KpiCard icon={LineChart} label="Tablettes projetees" value={fmtNumber(projectedTablets || 0)} sub="Projection 30 jours" color="bg-yellow-500/20 text-yellow-600" />
        <KpiCard icon={TrendingUp} label="Cash previsionnel" value={fmtCurrency(projectedCash || 0)} sub="Projection 30 jours" color={projectedCash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-[#2f2415] flex items-center gap-2"><BrainCircuit size={18} className="text-emerald-500" /> Décisions IA</p>
              <p className="text-xs text-[#8a7456]">Recommandations transversales générées à partir des modules sources.</p>
            </div>
            <span className="text-xs font-semibold text-[#8a7456]">{insights.decisions.length} décision(s)</span>
          </div>

          <div className="space-y-3">
            {insights.decisions.slice(0, 8).map((decision) => (
              <div key={decision.id} className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4">
                <div className="flex flex-wrap gap-2 items-center mb-2">
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${priorityClass[decision.priority] || priorityClass.moyenne}`}>{decision.priority}</span>
                  <span className="rounded-full bg-[#2f2415]/5 px-2 py-0.5 text-[11px] font-semibold text-[#7d6a4a]">{axisLabel[decision.axis] || decision.axis}</span>
                  <span className="text-[11px] text-[#8a7456]">Confiance {Math.round(decision.confidence_score || 0)}%</span>
                </div>
                <p className="font-bold text-[#2f2415]">{decision.title}</p>
                <p className="text-sm text-[#7d6a4a] mt-1">{decision.summary}</p>
                <div className="mt-3 rounded-xl bg-white border border-[#eadcc2] p-3 text-sm text-[#2f2415]">
                  <strong>Action recommandée :</strong> {decision.recommendation}
                  {decision.expected_impact ? <p className="text-xs text-[#8a7456] mt-1">Impact attendu : {decision.expected_impact}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
            <p className="font-bold text-[#2f2415] flex items-center gap-2"><ShieldAlert size={18} className="text-red-500" /> Risques IA</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-red-50 border border-red-200 p-3">
                <p className="text-xs text-red-700 font-semibold">Urgences</p>
                <p className="text-2xl font-black text-red-700">{insights.anomalies.urgence_count}</p>
              </div>
              <div className="rounded-xl bg-orange-50 border border-orange-200 p-3">
                <p className="text-xs text-orange-700 font-semibold">Critiques</p>
                <p className="text-2xl font-black text-orange-700">{insights.anomalies.critique_count}</p>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              {insights.anomalies.anomalies.slice(0, 5).map((a) => (
                <div key={a.id} className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3 text-sm">
                  <p className="font-semibold text-[#2f2415]">{a.title}</p>
                  <p className="text-xs text-[#8a7456]">{a.summary}</p>
                </div>
              ))}
              {!insights.anomalies.anomalies.length ? (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex gap-2"><CheckCircle size={16} /> Aucune anomalie IA majeure détectée.</div>
              ) : null}
            </div>
          </div>

          <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5">
            <p className="font-bold text-[#2f2415] flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Prévisions clés</p>
            <div className="mt-4 space-y-3 text-sm text-[#7d6a4a]">
              <div className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3">
                <p className="font-semibold text-[#2f2415]">Autonomie aliment</p>
                <p>{feedDays === null ? 'Données insuffisantes' : `${Math.round(feedDays)} jour(s)`}</p>
              </div>
              <div className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3">
                <p className="font-semibold text-[#2f2415]">Production vendable estimée</p>
                <p>{fmtNumber(insights.forecasts.eggs.projected_sellable_eggs || 0)} œufs / 30 jours</p>
              </div>
              <div className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3">
                <p className="font-semibold text-[#2f2415]">Coût tablette pondeuses</p>
                <p>{fmtCurrency(insights.pondeuses.totals.cost_per_tablet || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
