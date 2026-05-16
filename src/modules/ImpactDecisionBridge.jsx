import { AlertTriangle, BrainCircuit, CheckCircle2, Target, TrendingUp, Zap } from 'lucide-react';
import { buildDecisionCenterPlan } from '../services/growthDecisionEngine';
import { buildAnimalDecisionProfile } from '../services/animalDecisionEngine';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { buildCultureDecisionProfile } from '../services/cultureDecisionEngine';
import { buildOpportunityAttributionMetrics } from '../services/salesAttributionService';
import { fmtCurrency } from '../utils/format';

const arr = (value) => Array.isArray(value) ? value : [];
const high = (value = '') => String(value || '').toLowerCase().includes('haute');
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const amountOf = (row = {}) => Number(row.montant_total ?? row.total ?? row.amount ?? row.montant ?? row.total_amount ?? row.estimated_value ?? 0) || 0;
const isConverted = (row = {}) => ['converti', 'converted', 'confirme', 'confirmé', 'execute', 'exécuté', 'vendu'].some((status) => norm(row.status || row.statut || row.decision_status).includes(status));
const isDecisionEvent = (row = {}) => ['opportunite', 'recommandation', 'decision', 'vente', 'investissement', 'paiement'].some((term) => norm(`${row.event_type || ''} ${row.module_source || ''} ${row.title || ''} ${row.description || ''}`).includes(term));

function ImpactMini({ icon: Icon, label, value, detail, tone = 'neutral' }) {
  const cls = tone === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : tone === 'danger'
      ? 'border-red-200 bg-red-50 text-red-700'
      : tone === 'warning'
        ? 'border-amber-200 bg-amber-50 text-amber-800'
        : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]';

  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <Icon size={18} />
      <p className="mt-2 text-2xl font-black text-[#2f2415]">{value}</p>
      <p className="font-black text-[#2f2415]">{label}</p>
      <p className="mt-1 text-xs">{detail}</p>
    </div>
  );
}

function DecisionHistoryTable({ rows = [] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#eadcc2] bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-[#fffdf8] text-xs uppercase tracking-wide text-[#8a7456]">
          <tr>
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Décision / opportunité</th>
            <th className="px-3 py-2 text-left">Origine</th>
            <th className="px-3 py-2 text-left">Statut</th>
            <th className="px-3 py-2 text-right">Valeur</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 8).map((row) => (
            <tr key={row.id} className="border-t border-[#eadcc2]">
              <td className="px-3 py-2 font-mono text-xs text-[#8a7456]">{row.id}</td>
              <td className="px-3 py-2 font-bold text-[#2f2415]">{row.title}</td>
              <td className="px-3 py-2 text-[#7d6a4a]">{row.origin}</td>
              <td className="px-3 py-2"><span className={`rounded-full border px-2 py-0.5 text-xs font-black ${row.status === 'exécuté' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : row.status === 'à suivre' ? 'border-amber-200 bg-amber-50 text-amber-700' : 'border-[#eadcc2] bg-[#fffdf8] text-[#7d6a4a]'}`}>{row.status}</span></td>
              <td className="px-3 py-2 text-right font-black text-[#2f2415]">{fmtCurrency(row.value)}</td>
            </tr>
          ))}
          {!rows.length ? <tr><td colSpan={5} className="px-3 py-6 text-center text-[#8a7456]">Aucune décision/opportunité exploitable pour le moment.</td></tr> : null}
        </tbody>
      </table>
    </div>
  );
}

function buildDecisionExecutionImpact(dataMap = {}, plan = { recommendations: [] }) {
  const opportunities = arr(dataMap.sales_opportunities || dataMap.salesOpportunities || dataMap.opportunities);
  const orders = arr(dataMap.sales_orders || dataMap.salesOrders);
  const payments = arr(dataMap.payments);
  const events = arr(dataMap.business_events || dataMap.businessEvents);
  const investments = arr(dataMap.investissements);
  const businessPlans = arr(dataMap.business_plans || dataMap.businessPlans);
  const attribution = buildOpportunityAttributionMetrics({ opportunities, orders, payments });

  const generatedRecommendations = arr(plan.recommendations).length + opportunities.length;
  const convertedOpportunities = opportunities.filter(isConverted);
  const decisionEvents = events.filter(isDecisionEvent);
  const salesFromDecision = attribution.linkedOrders.length ? attribution.linkedOrders : orders.filter((order) => {
    const text = norm(`${order.source_module || ''} ${order.source_type || ''} ${order.recommendation_id || ''} ${order.opportunity_id || ''} ${order.notes || ''}`);
    return text.includes('centre') || text.includes('decision') || text.includes('opportunite') || text.includes('horizon');
  });
  const paidTotal = attribution.attributableCash || payments.reduce((sum, payment) => sum + amountOf(payment), 0);
  const linkedSalesValue = attribution.attributableRevenue || salesFromDecision.reduce((sum, order) => sum + amountOf(order), 0);
  const convertedValue = convertedOpportunities.reduce((sum, opp) => sum + amountOf(opp), 0);
  const plannedInvestments = investments.filter((row) => norm(`${row.business_plan_id || ''} ${row.libelle || ''} ${row.nom || ''}`).includes('bp') || row.business_plan_id).length;
  const horizonBusinessPlans = businessPlans.filter((bp) => norm(`${bp.nom || ''} ${bp.title || ''}`).includes('horizon'));
  const executedCount = Math.max(
    attribution.convertedOpportunities || 0,
    convertedOpportunities.length + salesFromDecision.length + decisionEvents.filter((event) => norm(event.event_type).includes('convert') || norm(event.event_type).includes('vente') || norm(event.event_type).includes('paiement') || norm(event.event_type).includes('invest')).length,
  );
  const executionRate = generatedRecommendations > 0 ? Math.round((executedCount / generatedRecommendations) * 100) : 0;

  const historyRows = [
    ...opportunities.map((opp) => ({ id: opp.id, title: opp.title || opp.nom || 'Opportunité vente', origin: opp.decision_origin || opp.source_type || 'Opportunités vente', status: isConverted(opp) ? 'exécuté' : 'à suivre', value: amountOf(opp) })),
    ...salesFromDecision.map((order) => ({ id: order.id, title: order.source_label || `Commande ${order.id}`, origin: order.decision_origin || 'Vente liée opportunité', status: 'exécuté', value: amountOf(order) })),
    ...decisionEvents.map((event) => ({ id: event.id, title: event.title || event.event_type || 'Événement décisionnel', origin: event.module_source || 'Événement ERP', status: ['vente', 'paiement', 'investissement', 'convert'].some((term) => norm(event.event_type).includes(term)) ? 'exécuté' : 'mémorisé', value: amountOf(event) })),
  ].sort((a, b) => (b.value || 0) - (a.value || 0));

  const learningNotes = [
    generatedRecommendations ? `${generatedRecommendations} recommandation(s) ou opportunité(s) sont visibles pour alimenter l’historique.` : 'Le Centre décisionnel doit encore générer des recommandations exploitables.',
    executedCount ? `${executedCount} action(s) semblent exécutées ou mémorisées.` : 'Aucune exécution clairement reliée à une recommandation pour le moment.',
    linkedSalesValue || convertedValue ? `Valeur commerciale attribuable à suivre : ${fmtCurrency(linkedSalesValue + convertedValue)}.` : 'Les ventes doivent être liées à une opportunité/recommandation pour mesurer la valeur réelle.',
    attribution.attributableRevenue ? `Attribution opportunité → commande détectée : ${fmtCurrency(attribution.attributableRevenue)} de CA lié.` : 'L’attribution automatique relie les commandes aux opportunités via source_id/source_type quand opportunity_id manque.',
    plannedInvestments || horizonBusinessPlans.length ? 'Les BP/investissements liés permettent de suivre rentabilité prévue vs réelle.' : 'Créer ou lier les BP aux recommandations exécutées pour suivre la rentabilité finale.',
  ];

  return {
    generatedRecommendations,
    convertedOpportunities: Math.max(convertedOpportunities.length, attribution.convertedOpportunities || 0),
    executedCount,
    executionRate,
    linkedSalesValue,
    convertedValue,
    paidTotal,
    plannedInvestments,
    horizonBusinessPlans: horizonBusinessPlans.length,
    historyRows,
    learningNotes,
  };
}

export default function ImpactDecisionBridge(props) {
  const dataMap = {
    animaux: arr(props.animaux),
    avicole: arr(props.lots || props.avicole),
    lots: arr(props.lots || props.avicole),
    cultures: arr(props.cultures),
    stock: arr(props.stocks || props.stock),
    stocks: arr(props.stocks || props.stock),
    clients: arr(props.clients),
    fournisseurs: arr(props.fournisseurs),
    investissements: arr(props.investissements),
    business_plans: arr(props.businessPlans || props.business_plans),
    businessPlans: arr(props.businessPlans || props.business_plans),
    sales_orders: arr(props.salesOrders || props.sales_orders),
    salesOrders: arr(props.salesOrders || props.sales_orders),
    sales_opportunities: arr(props.salesOpportunities || props.opportunities),
    salesOpportunities: arr(props.salesOpportunities || props.opportunities),
    opportunities: arr(props.salesOpportunities || props.opportunities),
    business_events: arr(props.businessEvents || props.business_events),
    businessEvents: arr(props.businessEvents || props.business_events),
    payments: arr(props.payments),
    finances: arr(props.transactions || props.finances),
    transactions: arr(props.transactions || props.finances),
    production_oeufs_logs: arr(props.productionLogs || props.production_oeufs_logs),
    productionLogs: arr(props.productionLogs || props.production_oeufs_logs),
    alimentation_logs: arr(props.alimentationLogs || props.alimentation_logs),
    alimentationLogs: arr(props.alimentationLogs || props.alimentation_logs),
  };

  const plan = buildDecisionCenterPlan(dataMap);
  const executionImpact = buildDecisionExecutionImpact(dataMap, plan);
  const animalProfiles = dataMap.animaux.map((animal) => buildAnimalDecisionProfile(animal));
  const avicoleProfiles = dataMap.avicole.map((lot) => buildAvicoleLotDecision(lot, dataMap.productionLogs));
  const cultureProfiles = dataMap.cultures.map((culture) => buildCultureDecisionProfile(culture));

  const animalCashRisk = animalProfiles.filter((item) => item.ageDays > item.targetDelay).length;
  const weighingActions = animalProfiles.filter((item) => item.nextWeighingDate).length;
  const avicoleHigh = avicoleProfiles.filter((item) => high(item.priority)).length;
  const cultureHigh = cultureProfiles.filter((item) => high(item.priority)).length;
  const totalDecisionSignals = plan.recommendations.length + animalCashRisk + avicoleHigh + cultureHigh;
  const goal = plan.goals.global;

  const proofs = [
    goal.attainment < 100 ? `Objectif mensuel à ${goal.attainment}% : ${fmtCurrency(goal.remaining)} restent à vendre.` : 'Objectif mensuel atteint ou dépassé : sécuriser le cash et préparer la croissance.',
    plan.recommendations.length ? `${plan.recommendations.length} recommandation(s) d’investissement ou de vente générées.` : null,
    animalCashRisk ? `${animalCashRisk} animal(aux) dépassent le délai cible : cash immobilisé à arbitrer.` : null,
    avicoleHigh ? `${avicoleHigh} lot(s) avicoles demandent une décision : vente, ponte, santé ou réforme.` : null,
    cultureHigh ? `${cultureHigh} culture(s) nécessitent une décision : sol, eau, rendement ou vente.` : null,
    executionImpact.executedCount ? `${executionImpact.executedCount} décision(s) semblent exécutées ou mémorisées dans l’ERP.` : null,
  ].filter(Boolean);

  return (
    <div className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black flex items-center gap-2">
            <BrainCircuit size={16} /> Impact du Centre décisionnel
          </p>
          <h2 className="mt-1 text-xl font-black text-[#2f2415]">Ce que l’IA apporte concrètement à la ferme</h2>
          <p className="mt-1 text-sm text-[#8a7456]">
            Cette zone relie Impact & Valeur ERP au Centre décisionnel : objectifs, risques détectés, décisions terrain, investissements pilotés et résultats suivis.
          </p>
        </div>
        <button type="button" onClick={() => props.onNavigate?.('centre_ia')} className="rounded-xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white hover:bg-[#3d2f1d]">
          Voir Centre décisionnel
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <ImpactMini icon={Target} label="Objectif CA" value={`${goal.attainment}%`} detail={`${fmtCurrency(goal.realized)} réalisés / ${fmtCurrency(goal.monthTarget)}`} tone={goal.attainment >= 90 ? 'good' : 'warning'} />
        <ImpactMini icon={TrendingUp} label="Reste à vendre" value={fmtCurrency(goal.remaining)} detail={`Objectif hebdo ${fmtCurrency(goal.weekTarget)}`} tone={goal.remaining > 0 ? 'warning' : 'good'} />
        <ImpactMini icon={Zap} label="Signaux IA" value={totalDecisionSignals} detail="recommandations + risques terrain" tone={totalDecisionSignals ? 'warning' : 'good'} />
        <ImpactMini icon={AlertTriangle} label="Cash immobilisé" value={animalCashRisk} detail="animaux au-delà du délai cible" tone={animalCashRisk ? 'danger' : 'good'} />
        <ImpactMini icon={CheckCircle2} label="Pesées pilotées" value={weighingActions} detail="dates et poids attendus proposés" tone="neutral" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
        <ImpactMini icon={BrainCircuit} label="Reco/opportunités" value={executionImpact.generatedRecommendations} detail="base de suivi décisionnel" tone="neutral" />
        <ImpactMini icon={CheckCircle2} label="Exécutées" value={executionImpact.executedCount} detail={`${executionImpact.executionRate}% de taux d’exécution estimé`} tone={executionImpact.executedCount ? 'good' : 'warning'} />
        <ImpactMini icon={TrendingUp} label="Valeur attribuable" value={fmtCurrency(executionImpact.linkedSalesValue + executionImpact.convertedValue)} detail="ventes/opportunités reliées" tone={(executionImpact.linkedSalesValue + executionImpact.convertedValue) > 0 ? 'good' : 'warning'} />
        <ImpactMini icon={Target} label="BP liés" value={executionImpact.plannedInvestments + executionImpact.horizonBusinessPlans} detail="investissements / BP à suivre" tone={executionImpact.plannedInvestments || executionImpact.horizonBusinessPlans ? 'good' : 'warning'} />
        <ImpactMini icon={Zap} label="Cash encaissé" value={fmtCurrency(executionImpact.paidTotal)} detail="paiements liés aux ventes/opportunités" tone={executionImpact.paidTotal > 0 ? 'good' : 'warning'} />
      </div>

      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">Preuves de valeur IA</p>
        <ul className="mt-3 space-y-2 text-sm text-[#7d6a4a]">
          {proofs.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span>{item}</span></li>)}
        </ul>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
          <p className="font-black text-[#2f2415]">Apprentissage décisionnel</p>
          <ul className="mt-3 space-y-2 text-sm text-[#7d6a4a]">
            {executionImpact.learningNotes.map((note) => <li key={note} className="flex gap-2"><CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span>{note}</span></li>)}
          </ul>
        </div>
        <div>
          <p className="mb-2 font-black text-[#2f2415]">Historique décisions / opportunités</p>
          <DecisionHistoryTable rows={executionImpact.historyRows} />
        </div>
      </div>
    </div>
  );
}
