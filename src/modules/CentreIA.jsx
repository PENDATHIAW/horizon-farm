import { AlertTriangle, BrainCircuit, CheckCircle, LineChart, ShieldAlert, Sparkles, TrendingUp, Zap } from 'lucide-react';
import { useMemo } from 'react';
import Btn from '../components/Btn';
import KpiCard from '../components/KpiCard';
import SectionHeader from '../components/SectionHeader';
import { buildStrategicInsights } from '../services/aiStrategyService';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { buildHorizonAutomations } from '../services/horizonAutomationEngine';
import { buildHorizonProactiveInsights } from '../services/horizonProactiveService';
import { buildDraftFromProactiveInsight } from '../services/proactiveActionDrafts';
import { fmtCurrency } from '../utils/format';
import DecisionRecommendationCardCompact from './DecisionRecommendationCardCompact.jsx';
import ProductionCycleDecisionPanel from './ProductionCycleDecisionPanel.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const money = (value) => Number(value || 0);
const orderAmount = (order = {}) => money(order.montant_total ?? order.total_ttc ?? order.total ?? order.amount);
const paymentAmount = (payment = {}) => money(payment.montant_paye ?? payment.montant ?? payment.amount ?? payment.paid_amount);
const plural = (count, one, many) => `${count} ${count > 1 ? many : one}`;

function buildCommercialSnapshot({ salesOrders = [], payments = [], transactions = [] }) {
  const ca = arr(salesOrders).reduce((sum, order) => sum + orderAmount(order), 0);
  const encaisse = Math.max(arr(payments).reduce((sum, payment) => sum + paymentAmount(payment), 0), arr(transactions).filter((trx) => String(trx.type || '').toLowerCase() === 'entree').reduce((sum, trx) => sum + money(trx.montant), 0));
  const depenses = arr(transactions).filter((trx) => String(trx.type || '').toLowerCase() === 'sortie').reduce((sum, trx) => sum + money(trx.montant), 0);
  return { ca, encaisse: ca > 0 ? Math.min(ca, encaisse) : encaisse, depenses, creances: Math.max(0, ca - encaisse), marge: ca - depenses };
}
function safeSkeleton() { return <div className="space-y-4" aria-label="Chargement du centre décisionnel"><div className="h-28 rounded-3xl border border-[#eadcc2] bg-[#fffdf8] animate-pulse" /><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-28 rounded-2xl border border-[#eadcc2] bg-[#fffdf8] animate-pulse" />)}</div></div>; }
function AlertCard({ title, text, tone = 'amber', action, onClick }) { const toneClass = tone === 'red' ? 'border-red-200 bg-red-50 text-red-800' : tone === 'emerald' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'; return <div className={`rounded-2xl border p-4 ${toneClass}`}><p className="font-black flex items-center gap-2"><AlertTriangle size={16} aria-hidden="true" /> {title}</p><p className="mt-1 text-sm leading-relaxed">{text}</p>{action ? <button type="button" onClick={onClick} className="mt-3 min-h-[44px] rounded-xl bg-white/80 border border-current/20 px-4 py-2 text-sm font-black hover:bg-white">{action}</button> : null}</div>; }

export default function CentreIA({ lots = [], productionLogs = [], alimentationLogs = [], stocks = [], marketPrices = [], marketCalendarEvents = [], salesOrders = [], payments = [], transactions = [], smartfarmEvents = [], sensors = [], cameras = [], meteo = null, dataMap = {}, onNavigate }) {
  const centreDataMap = useMemo(() => ({ ...dataMap, lots, avicole: lots, productionLogs, production_oeufs_logs: productionLogs, alimentationLogs, alimentation_logs: alimentationLogs, stock: stocks, stocks, salesOrders, sales_orders: salesOrders, payments, transactions, finances: transactions, sensors, cameras, market_prices: marketPrices, market_calendar_events: marketCalendarEvents, meteo }), [dataMap, lots, productionLogs, alimentationLogs, stocks, salesOrders, payments, transactions, sensors, cameras, marketPrices, marketCalendarEvents, meteo]);
  const openDraft = (draft, sourceLabel = 'Centre décisionnel') => { if (!draft) return; window.dispatchEvent(new CustomEvent('horizon-open-draft', { detail: { draft, sourceLabel } })); };
  const openDraftFromInsight = (insight) => openDraft(buildDraftFromProactiveInsight(insight, centreDataMap), 'Centre décisionnel');
  const insights = useMemo(() => buildStrategicInsights({ avicoleLots: lots, productionLogs, alimentationLogs, stocks, marketPrices, marketCalendarEvents, salesOrders, payments, finances: transactions, smartfarmEvents, sensors, cameras, meteo }), [lots, productionLogs, alimentationLogs, stocks, marketPrices, marketCalendarEvents, salesOrders, payments, transactions, smartfarmEvents, sensors, cameras, meteo]);
  const proactive = useMemo(() => buildHorizonProactiveInsights(centreDataMap), [centreDataMap]);
  const automations = useMemo(() => buildHorizonAutomations(centreDataMap, { maxDrafts: 3 }), [centreDataMap]);
  const commercial = useMemo(() => buildCommercialSnapshot({ salesOrders, payments, transactions }), [salesOrders, payments, transactions]);
  const growth = useMemo(() => buildDecisionCenterPlan(centreDataMap), [centreDataMap]);
  if (!insights || !growth) return safeSkeleton();
  const score = Math.round(insights.strategic_score || 0);
  const goal = growth.goals?.global || { attainment: 0 };
  const riskCount = Math.max(insights.anomalies?.urgence_count || 0, proactive.urgent_count || 0) + Math.max(insights.anomalies?.critique_count || 0, proactive.high_count || 0);
  const mainRecommendations = arr(growth.recommendations).slice(0, 3);
  const mainRisks = arr(proactive.insights).slice(0, 3);
  const automationRows = arr(automations.automations).slice(0, 3);

  return <div className="space-y-6"><SectionHeader title="Centre décisionnel" sub="Un écran court pour décider quoi faire maintenant : cycles de production, ventes, trésorerie et risques importants." actions={<div className="flex flex-wrap gap-2"><Btn variant="outline" small onClick={() => onNavigate?.('investissements')}>Plan financier</Btn><Btn variant="outline" small onClick={() => onNavigate?.('objectifs_croissance')}>Objectifs</Btn><Btn variant="outline" small onClick={() => onNavigate?.('ventes')}>Ventes</Btn></div>} />
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><KpiCard icon={BrainCircuit} label="Santé décisionnelle" value={`${score}/100`} sub={score >= 75 ? 'Situation favorable' : score >= 50 ? 'À renforcer' : 'Risque élevé'} color={score >= 75 ? 'bg-emerald-500/20 text-emerald-500' : score >= 50 ? 'bg-amber-500/20 text-amber-500' : 'bg-red-500/20 text-red-500'} /><KpiCard icon={TrendingUp} label="Objectif mensuel" value={`${goal.attainment ?? 0}%`} sub="Prévu vs réel" color={(goal.attainment ?? 0) >= 90 ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'} onClick={() => onNavigate?.('objectifs_croissance')} /><KpiCard icon={LineChart} label="Créances" value={fmtCurrency(commercial.creances)} sub="À encaisser" color={commercial.creances > 0 ? 'bg-amber-500/20 text-amber-500' : 'bg-emerald-500/20 text-emerald-500'} onClick={() => onNavigate?.('ventes')} /><KpiCard icon={ShieldAlert} label="Alertes" value={riskCount} sub="Urgentes / critiques" color={riskCount > 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/20 text-emerald-500'} /></div>
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#2f2415] text-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-black text-[#f8e8b6] flex items-center gap-2"><Zap size={16} aria-hidden="true" /> Décisions à prendre maintenant</p><h2 className="text-xl font-black mt-1">Les 3 actions prioritaires</h2><p className="text-sm text-[#f8e8b6]/85 mt-1">Le reste n’est pas affiché ici pour éviter de surcharger l’écran.</p></div><Btn small variant="outline" onClick={() => onNavigate?.('objectifs_croissance')}>Voir objectifs</Btn></div><div className="grid grid-cols-1 xl:grid-cols-3 gap-3">{mainRecommendations.map((item) => <DecisionRecommendationCardCompact key={item.id} item={item} dataMap={centreDataMap} onNavigate={onNavigate} />)}{!mainRecommendations.length ? <div className="col-span-full rounded-2xl border border-white/15 bg-white/10 p-4 text-sm text-white/85">Aucune action prioritaire pour le moment.</div> : null}</div></div>
    <ProductionCycleDecisionPanel dataMap={centreDataMap} lots={lots} animaux={centreDataMap.animaux || []} productionLogs={productionLogs} onNavigate={onNavigate} />
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-black text-[#2f2415] flex items-center gap-2"><ShieldAlert size={18} className="text-red-500" aria-hidden="true" /> Alertes importantes</p><p className="text-sm text-[#8a7456]">Seulement les risques à traiter maintenant.</p></div><Btn small variant="outline" onClick={() => onNavigate?.('alertes')}>Voir alertes</Btn></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{mainRisks.map((insight) => <AlertCard key={insight.id} title={insight.title} text={insight.recommendation} tone={insight.priority === 'haute' || insight.severity === 'critique' ? 'red' : 'amber'} action="Ouvrir action" onClick={() => openDraftFromInsight(insight)} />)}{!mainRisks.length ? <AlertCard title="Tout est calme" text="Aucune alerte critique à traiter pour le moment." tone="emerald" /> : null}</div></section>
    {automationRows.length ? <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between"><div><p className="font-black text-[#2f2415] flex items-center gap-2"><Sparkles size={18} className="text-purple-500" aria-hidden="true" /> Brouillons à valider</p><p className="text-sm text-[#8a7456]">Rien n’est exécuté sans validation.</p></div><span className="rounded-full bg-purple-50 border border-purple-200 px-3 py-1 text-xs font-black text-purple-700">{plural(automations.total || 0, 'proposition', 'propositions')}</span></div><div className="grid grid-cols-1 lg:grid-cols-3 gap-3">{automationRows.map((automation) => <div key={automation.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="font-black text-[#2f2415] text-sm line-clamp-2">{automation.title}</p><p className="text-xs text-[#8a7456] mt-1 line-clamp-2">{automation.recommendation}</p><Btn onClick={() => openDraft(automation.draft, 'Horizon Automation')} className="mt-3 w-full" small>Ouvrir le brouillon</Btn></div>)}</div></section> : null}
  </div>;
}
