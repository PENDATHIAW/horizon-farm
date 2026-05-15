import { AlertTriangle, BrainCircuit, CheckCircle, LineChart, ShieldAlert, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { buildStrategicInsights } from '../services/aiStrategyService';
import { buildHorizonAutomations } from '../services/horizonAutomationEngine';
import { buildHorizonProactiveInsights } from '../services/horizonProactiveService';
import { buildDraftFromProactiveInsight } from '../services/proactiveActionDrafts';
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
  const centreDataMap = useMemo(() => ({ lots, avicole: lots, productionLogs, alimentationLogs, stock: stocks, stocks, salesOrders, sales_orders: salesOrders, payments, transactions, finances: transactions, sensors, cameras, meteo }), [lots, productionLogs, alimentationLogs, stocks, salesOrders, payments, transactions, sensors, cameras, meteo]);

  const openDraft = (draft, sourceLabel = 'Centre IA') => {
    if (!draft) return;
    window.dispatchEvent(new CustomEvent('horizon-open-draft', { detail: { draft, sourceLabel } }));
  };

  const openDraftFromInsight = (insight) => openDraft(buildDraftFromProactiveInsight(insight, centreDataMap), 'Centre IA Proactif');

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

  const proactive = useMemo(() => buildHorizonProactiveInsights(centreDataMap), [centreDataMap]);
  const automations = useMemo(() => buildHorizonAutomations(centreDataMap, { maxDrafts: 4 }), [centreDataMap]);

  const score = Math.round(insights.strategic_score || 0);
  const proactiveScore = Math.round(proactive.proactive_score || 0);
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

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        <KpiCard icon={BrainCircuit} label="Score IA exploitation" value={`${score}/100`} sub={score >= 75 ? 'Situation favorable' : score >= 50 ? 'Pilotage a renforcer' : 'Risque eleve'} color={score >= 75 ? 'bg-emerald-500/20 text-emerald-500' : score >= 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'} />
        <KpiCard icon={Zap} label="Score proactif" value={`${proactiveScore}/100`} sub={`${proactive.urgent_count} urgence(s), ${proactive.high_count} haute(s)`} color={proactiveScore >= 75 ? 'bg-emerald-500/20 text-emerald-500' : proactiveScore >= 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'} />
        <KpiCard icon={Sparkles} label="Automatisations" value={automations.total} sub="Brouillons semi-autonomes" color="bg-purple-500/20 text-purple-500" />
        <KpiCard icon={LineChart} label="Tablettes projetees" value={fmtNumber(projectedTablets || 0)} sub="Projection 30 jours" color="bg-yellow-500/20 text-yellow-600" />
        <KpiCard icon={TrendingUp} label="Cash previsionnel" value={fmtCurrency(projectedCash || 0)} sub="Projection 30 jours" color={projectedCash >= 0 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'} />
      </div>

      <div className="bg-[#2f2415] text-white rounded-3xl p-5 border border-[#d6c3a0] shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-[#f8e8b6] flex items-center gap-2"><Zap size={16} /> Horizon Proactif</p>
            <h3 className="text-xl font-black mt-1">{proactive.executive_summary}</h3>
            <p className="text-sm text-[#f8e8b6]/80 mt-1">Horizon surveille les modules et remonte les actions prioritaires avant que les problèmes deviennent coûteux.</p>
          </div>
          <div className="grid grid-cols-3 gap-2 min-w-[260px]"><div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-center"><p className="text-2xl font-black">{proactive.urgent_count}</p><p className="text-[11px] text-[#f8e8b6]">Urgences</p></div><div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-center"><p className="text-2xl font-black">{proactive.high_count}</p><p className="text-[11px] text-[#f8e8b6]">Priorités</p></div><div className="rounded-2xl bg-white/10 border border-white/10 p-3 text-center"><p className="text-2xl font-black">{proactive.total_count}</p><p className="text-[11px] text-[#f8e8b6]">Points IA</p></div></div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 mt-4">
          {proactive.insights.slice(0, 5).map((item, index) => <div key={`${item.id}-${index}`} className="text-left rounded-2xl bg-white/10 border border-white/10 p-3"><span className="text-[10px] uppercase tracking-wider text-[#f8e8b6] font-black">{item.severity}</span><p className="text-sm font-bold mt-1 line-clamp-2">{item.title}</p><p className="text-[11px] text-white/70 mt-1 line-clamp-2">{item.action}</p><div className="flex gap-2 mt-3"><button type="button" onClick={() => onNavigate?.(item.module)} className="flex-1 rounded-xl bg-white/10 px-2 py-1.5 text-[10px] font-black text-white hover:bg-white/20">Voir</button><button type="button" onClick={() => openDraftFromInsight(item)} className="flex-1 rounded-xl bg-[#f6c453] px-2 py-1.5 text-[10px] font-black text-[#2f2415] hover:bg-[#ffe08a]">Préparer</button></div></div>)}
          {!proactive.insights.length ? <div className="lg:col-span-5 rounded-2xl bg-white/10 border border-white/10 p-3 text-sm text-[#f8e8b6]">Aucune action proactive urgente pour le moment.</div> : null}
        </div>
      </div>

      <div className="bg-white border border-[#d6c3a0] rounded-3xl p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div><p className="font-black text-[#2f2415] flex items-center gap-2"><Sparkles size={18} className="text-purple-500" /> Automatisations Horizon</p><p className="text-xs text-[#8a7456]">Brouillons semi-autonomes préparés par les règles IA. Rien n’est exécuté sans validation.</p></div>
          <span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-black text-purple-700">{automations.total} proposition(s)</span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
          {automations.automations.map((automation) => (
            <div key={automation.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
              <div className="flex items-center justify-between gap-2 mb-2"><span className="rounded-full bg-white border border-[#d6c3a0] px-2 py-0.5 text-[10px] font-black text-[#7d6a4a]">{automation.severity}</span><span className="text-[10px] text-[#8a7456]">semi-auto</span></div>
              <p className="font-black text-[#2f2415] text-sm line-clamp-2">{automation.title}</p>
              <p className="text-xs text-[#8a7456] mt-1 line-clamp-2">{automation.recommendation}</p>
              <button type="button" onClick={() => openDraft(automation.draft, 'Horizon Automation')} className="mt-3 w-full rounded-xl bg-[#2f2415] px-3 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]">Ouvrir le brouillon</button>
            </div>
          ))}
          {!automations.automations.length ? <div className="lg:col-span-4 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-700 flex gap-2"><CheckCircle size={16} /> Aucune automatisation à valider pour le moment.</div> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 bg-white border border-[#d6c3a0] rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between gap-3"><div><p className="font-bold text-[#2f2415] flex items-center gap-2"><BrainCircuit size={18} className="text-emerald-500" /> Décisions IA</p><p className="text-xs text-[#8a7456]">Recommandations transversales générées à partir des modules sources.</p></div><span className="text-xs font-semibold text-[#8a7456]">{insights.decisions.length} décision(s)</span></div>
          <div className="space-y-3">{insights.decisions.slice(0, 8).map((decision) => <div key={decision.id} className="rounded-2xl border border-[#d6c3a0] bg-[#fffdf8] p-4"><div className="flex flex-wrap gap-2 items-center mb-2"><span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase ${priorityClass[decision.priority] || priorityClass.moyenne}`}>{decision.priority}</span><span className="rounded-full bg-[#2f2415]/5 px-2 py-0.5 text-[11px] font-semibold text-[#7d6a4a]">{axisLabel[decision.axis] || decision.axis}</span><span className="text-[11px] text-[#8a7456]">Confiance {Math.round(decision.confidence_score || 0)}%</span></div><p className="font-bold text-[#2f2415]">{decision.title}</p><p className="text-sm text-[#7d6a4a] mt-1">{decision.summary}</p><div className="mt-3 rounded-xl bg-white border border-[#eadcc2] p-3 text-sm text-[#2f2415]"><strong>Action recommandée :</strong> {decision.recommendation}{decision.expected_impact ? <p className="text-xs text-[#8a7456] mt-1">Impact attendu : {decision.expected_impact}</p> : null}</div></div>)}</div>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-bold text-[#2f2415] flex items-center gap-2"><ShieldAlert size={18} className="text-red-500" /> Risques IA</p><div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-red-50 border border-red-200 p-3"><p className="text-xs text-red-700 font-semibold">Urgences</p><p className="text-2xl font-black text-red-700">{Math.max(insights.anomalies.urgence_count, proactive.urgent_count)}</p></div><div className="rounded-xl bg-orange-50 border border-orange-200 p-3"><p className="text-xs text-orange-700 font-semibold">Critiques</p><p className="text-2xl font-black text-orange-700">{Math.max(insights.anomalies.critique_count, proactive.high_count)}</p></div></div><div className="mt-4 space-y-2">{proactive.insights.slice(0, 5).map((a) => <div key={a.id} className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3 text-sm"><button type="button" onClick={() => onNavigate?.(a.module)} className="w-full text-left"><p className="font-semibold text-[#2f2415]">{a.title}</p><p className="text-xs text-[#8a7456]">{a.message}</p></button><button type="button" onClick={() => openDraftFromInsight(a)} className="mt-2 rounded-xl bg-emerald-50 px-3 py-1.5 text-[11px] font-black text-emerald-700 hover:bg-emerald-100">Préparer une action Horizon</button></div>)}{!proactive.insights.length ? <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-sm text-emerald-700 flex gap-2"><CheckCircle size={16} /> Aucune anomalie IA majeure détectée.</div> : null}</div></div>
          <div className="bg-white border border-[#d6c3a0] rounded-2xl p-5"><p className="font-bold text-[#2f2415] flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500" /> Prévisions clés</p><div className="mt-4 space-y-3 text-sm text-[#7d6a4a]"><div className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3"><p className="font-semibold text-[#2f2415]">Autonomie aliment</p><p>{feedDays === null ? 'Données insuffisantes' : `${Math.round(feedDays)} jour(s)`}</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3"><p className="font-semibold text-[#2f2415]">Production vendable estimée</p><p>{fmtNumber(insights.forecasts.eggs.projected_sellable_eggs || 0)} œufs / 30 jours</p></div><div className="rounded-xl bg-[#fffdf8] border border-[#d6c3a0] p-3"><p className="font-semibold text-[#2f2415]">Coût tablette pondeuses</p><p>{fmtCurrency(insights.pondeuses.totals.cost_per_tablet || 0)}</p></div></div></div>
        </div>
      </div>
    </div>
  );
}
