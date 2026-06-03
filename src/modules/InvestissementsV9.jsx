import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Coins, Edit3, FileSpreadsheet, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import EditModal from '../modals/EditModal';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { HORIZON_FARM_BP_ID, HORIZON_FARM_BP_NAME, HORIZON_FARM_INVESTMENT_LINES, HORIZON_FARM_MONTHLY_COSTS, HORIZON_FARM_REVENUE_PROJECTIONS, buildHorizonFarmBpLine, buildHorizonFarmBusinessPlan, buildHorizonFarmMonthlyCost, buildHorizonFarmProjection } from '../services/horizonFarmBusinessPlanSeed';
import {
  BP_COST_COMPLETED_EVENT,
  BP_LINE_COMPLETED_EVENT,
  BP_LINE_STATUS,
  BP_LINE_STATUS_OPTIONS,
  bpCostAmount,
  bpCostModuleRoute,
  bpLineAmount,
  bpLineStatusLabel,
  buildBpCostCompletionWorkflow,
  buildBpLineCompletionWorkflow,
  buildBpLineStatusPatch,
  canConcretizeBpCost,
  canConcretizeBpLine,
  computeBpCostTotals,
  computeBpInvestmentTotals,
  isBpCostEditable,
  isBpLineEditable,
  launchBpCostConcretization,
  launchBpLineConcretization,
  normalizeBpLineStatus,
} from '../utils/bpLineConcretization';
import { fmtCurrency, toNumber } from '../utils/format';
import { investmentAssetKind, investmentLabel } from '../utils/investmentWorkflows';
import FinancialPlanPanel from './FinancialPlanPanel.jsx';
import InvestmentQualityControl from './InvestmentQualityControl.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const low = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isBp = (bp = {}) => String(bp.id || '') === HORIZON_FARM_BP_ID || low(bp.nom || bp.name || bp.title).includes('horizon farm');
const isArchived = (r = {}) => ['annule', 'annulé', 'archive', 'archivé'].includes(low(r.statut || r.status));
const key = (r = {}) => low(r.designation || r.name || r.nom || r.title || r.id);
const money = (v) => fmtCurrency(Number(v || 0));
const totalLine = (r = {}) => bpLineAmount(r);
const monthly = (r = {}) => toNumber(r.montant_mensuel || r.amount || r.montant);
const revenue = (r = {}) => toNumber(r.ca_estime || r.revenue || r.montant);
const charges = (r = {}) => toNumber(r.charges_estimees || r.charges);
const dedupe = (rows = []) => [...arr(rows).filter((r) => !isArchived(r)).reduce((m, r) => m.set(key(r), r), new Map()).values()];

const MODULE_LABELS = { avicole: 'Élevage / Avicole', animal: 'Élevage / Animaux', culture: 'Cultures', stock: 'Achats / Stock', equipement: 'Équipements', equipements: 'Équipements' };

const INVESTMENT_EDIT_FIELDS = [
  { key: 'designation', label: 'Poste', type: 'text', required: true },
  { key: 'categorie', label: 'Catégorie', type: 'text' },
  { key: 'quantite', label: 'Quantité', type: 'number' },
  { key: 'unite', label: 'Unité', type: 'text' },
  { key: 'prix_unitaire', label: 'Prix unitaire', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 2, fullWidth: true },
];

const COST_EDIT_FIELDS = [
  { key: 'designation', label: 'Charge', type: 'text', required: true },
  { key: 'categorie', label: 'Catégorie', type: 'text' },
  { key: 'montant_mensuel', label: 'Montant mensuel', type: 'number' },
  { key: 'frequence', label: 'Fréquence', type: 'text' },
];

function Kpi({ label, value, tone = '' }) {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-lg font-black ${tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : tone === 'warn' ? 'text-amber-700' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

function Section({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function Table({ rows, columns }) {
  return <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">{columns.map((c) => <th key={c.label} className="px-3 py-2">{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i} className="border-t border-[#eadcc2]">{columns.map((c) => <td key={c.label} className="px-3 py-2 align-top">{c.render ? c.render(r, i) : (r[c.key] ?? '—')}</td>)}</tr>)}{!rows.length ? <tr><td colSpan={columns.length} className="px-3 py-6 text-center text-[#8a7456]">Aucune ligne.</td></tr> : null}</tbody></table></div>;
}

function HelpSteps() {
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#5c4a32] space-y-3">
    <p className="font-black text-[#2f2415]">Comment ça marche ?</p>
    <ol className="space-y-2 list-decimal list-inside leading-relaxed">
      <li><b>Prévu</b> — le BP dit ce que tu comptes acheter (ex. 3000 pondeuses).</li>
      <li><b>Concrétiser</b> — quand tu le fais vraiment, clique le bouton : l’ERP t’ouvre le bon module (Avicole, Animaux…) avec la fiche déjà remplie.</li>
      <li><b>Suivi</b> — une fois validé, la ligne passe en « concrétisé » et les montants prévu / fait / reste se mettent à jour.</li>
    </ol>
    <p className="text-xs text-[#8a7456]">Tu peux aussi marquer une ligne « annulée » si tu renonces à cette dépense.</p>
  </div>;
}

async function syncBp(props, { silent = false, force = false } = {}) {
  try {
    const existing = arr(props.businessPlans).find(isBp);
    if (existing?.id && !force && arr(props.bpInvestmentLines).some((r) => String(r.business_plan_id) === String(existing.id))) {
      if (!silent) toast.success('Plan déjà chargé');
      return;
    }
    const plan = existing?.id ? { ...buildHorizonFarmBusinessPlan(), id: existing.id } : buildHorizonFarmBusinessPlan();
    if (existing?.id) await props.onUpdateBusinessPlan?.(existing.id, plan); else await props.onCreateBusinessPlan?.(plan);
    const planId = plan.id;
    const currentLines = arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id) === String(planId));
    const currentCosts = arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id) === String(planId));
    const currentProj = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id) === String(planId));
    for (const official of HORIZON_FARM_INVESTMENT_LINES) {
      const found = currentLines.find((r) => key(r) === key(official));
      if (found?.id) await props.onUpdateBpInvestmentLine?.(found.id, { ...official, total: totalLine(official), statut: found.statut || BP_LINE_STATUS.A_CONCRETISER });
      else await props.onCreateBpInvestmentLine?.(buildHorizonFarmBpLine(official, planId));
    }
    for (const official of HORIZON_FARM_MONTHLY_COSTS) {
      const found = currentCosts.find((r) => key(r) === key(official));
      if (found?.id) await props.onUpdateBpRecurringCost?.(found.id, { ...official, frequence: 'mensuelle', statut: found.statut || BP_LINE_STATUS.A_CONCRETISER });
      else await props.onCreateBpRecurringCost?.(buildHorizonFarmMonthlyCost(official, planId));
    }
    for (const official of HORIZON_FARM_REVENUE_PROJECTIONS) {
      const found = currentProj.find((r) => Number(r.mois_index) === Number(official.mois_index));
      if (found?.id) await props.onUpdateBpRevenueProjection?.(found.id, official);
      else await props.onCreateBpRevenueProjection?.(buildHorizonFarmProjection(official, planId));
    }
    await Promise.allSettled([props.onRefreshBusinessPlans?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBpRecurringCosts?.(), props.onRefreshBpRevenueProjections?.()]);
    if (!silent) toast.success('Plan officiel rechargé');
  } catch (e) {
    if (!silent) toast.error(e.message || 'Rechargement impossible');
  }
}

async function finalizeBpCostCompletion(detail, props) {
  const cost = arr(props.bpRecurringCosts).find((row) => String(row.id) === String(detail?.bp_cost_id || detail?.bp_line_id));
  if (!cost?.id) return;
  const workflow = buildBpCostCompletionWorkflow(cost, detail);
  try {
    if (workflow.financeTransaction && !cost.linked_finance_transaction_id) await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    if (workflow.proofDocument && !cost.proof_document_id) await props.onCreateDocument?.(workflow.proofDocument);
    await props.onUpdateBpRecurringCost?.(cost.id, workflow.linePatch);
    if (workflow.event?.title) await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([props.onRefreshFinances?.(), props.onRefreshDocuments?.(), props.onRefreshBpRecurringCosts?.(), props.onRefreshBusinessEvents?.()]);
    toast.success(`Charge concrétisée · ${cost.designation || cost.id}`);
  } catch (error) {
    toast.error(error.message || 'Mise à jour charge impossible');
  }
}

async function finalizeBpLineCompletion(detail, props) {
  const line = arr(props.bpInvestmentLines).find((row) => String(row.id) === String(detail?.bp_line_id));
  if (!line?.id) return;
  const workflow = buildBpLineCompletionWorkflow(line, detail);
  try {
    if (workflow.financeTransaction && !line.linked_finance_transaction_id) await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    if (workflow.proofDocument && !line.proof_document_id) await props.onCreateDocument?.(workflow.proofDocument);
    await props.onUpdateBpInvestmentLine?.(line.id, workflow.linePatch);
    if (workflow.event?.title) await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([props.onRefreshFinances?.(), props.onRefreshDocuments?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBusinessEvents?.()]);
    toast.success(`C’est fait · ${investmentLabel(line)}`);
  } catch (error) {
    toast.error(error.message || 'Mise à jour impossible');
  }
}

export default function InvestissementsV9(props) {
  const [tab, setTab] = useState('overview');
  const [editLine, setEditLine] = useState(null);
  const [editCost, setEditCost] = useState(null);
  const [saving, setSaving] = useState(false);
  const seedAttempted = useRef(false);

  const plan = useMemo(() => arr(props.businessPlans).find(isBp) || null, [props.businessPlans]);
  const planId = plan?.id || HORIZON_FARM_BP_ID;
  const dbLines = dedupe(arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id || planId) === String(planId)));
  const lines = dbLines.length ? dbLines : HORIZON_FARM_INVESTMENT_LINES.map((r, i) => ({ id: `off-${i}`, ...r, statut: BP_LINE_STATUS.A_CONCRETISER }));
  const costs = dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))).length ? dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))) : HORIZON_FARM_MONTHLY_COSTS.map((r, i) => ({ id: `cost-${i}`, ...r, statut: BP_LINE_STATUS.A_CONCRETISER }));
  const projections = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)).length ? arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)) : HORIZON_FARM_REVENUE_PROJECTIONS.map((r, i) => ({ id: `rev-${i}`, ...r }));

  const totals = useMemo(() => computeBpInvestmentTotals(lines), [lines]);
  const costTotals = useMemo(() => computeBpCostTotals(costs), [costs]);
  const pendingLines = useMemo(() => lines.filter((line) => canConcretizeBpLine(line) && investmentAssetKind(line)), [lines]);
  const pendingCosts = useMemo(() => costs.filter((cost) => canConcretizeBpCost(cost)), [costs]);
  const monthCosts = costs.reduce((s, r) => s + monthly(r), 0);
  const annualRevenue = projections.reduce((s, r) => s + revenue(r), 0) || HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal;
  let balance = -totals.prevu;
  const amort = projections.slice().sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index)).map((r, i) => { const marge = revenue(r) - charges(r); balance += marge; return { ...r, mois: r.mois_index || i + 1, marge, balance, pct: Math.max(0, Math.min(100, ((totals.prevu + balance) / Math.max(1, totals.prevu)) * 100)) }; });

  const tabs = [
    ['overview', 'Vue d’ensemble'],
    ['budget', 'Mes investissements'],
    ['charges', 'Charges mensuelles'],
    ['plan', 'Suivi réel'],
    ['previsions', 'Prévisions'],
    ['controle', 'Contrôle'],
  ];

  useEffect(() => {
    if (seedAttempted.current) return;
    seedAttempted.current = true;
    if (!plan || !dbLines.length || !dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))).length) {
      syncBp(props, { silent: true });
    }
  }, [plan, dbLines.length, planId, props.bpRecurringCosts]);

  useEffect(() => {
    const onLine = (event) => finalizeBpLineCompletion(event.detail || {}, props);
    const onCost = (event) => finalizeBpCostCompletion(event.detail || {}, props);
    window.addEventListener(BP_LINE_COMPLETED_EVENT, onLine);
    window.addEventListener(BP_COST_COMPLETED_EVENT, onCost);
    return () => {
      window.removeEventListener(BP_LINE_COMPLETED_EVENT, onLine);
      window.removeEventListener(BP_COST_COMPLETED_EVENT, onCost);
    };
  }, [props]);

  const openConcretization = (line) => {
    const result = launchBpLineConcretization(line, { onNavigate: props.onNavigate });
    if (!result.ok) return toast.error('Cette ligne ne peut pas encore être ouverte dans un module.');
    const kind = investmentAssetKind(line);
    toast.success(`Ouverture ${MODULE_LABELS[kind] || kind}…`);
  };

  const openCostConcretization = (cost) => {
    const result = launchBpCostConcretization(cost, { onNavigate: props.onNavigate });
    if (!result.ok) return toast.error('Cette charge ne peut pas encore être ouverte dans un module.');
    const route = bpCostModuleRoute(cost);
    toast.success(`Ouverture ${route.label}…`);
  };

  const updateLineStatus = async (line, status) => {
    if (!isBpLineEditable(line)) return toast.error('Ligne en lecture seule');
    try {
      await props.onUpdateBpInvestmentLine?.(line.id, buildBpLineStatusPatch(status));
      await props.onRefreshBpInvestmentLines?.();
      toast.success(`Statut · ${bpLineStatusLabel(status)}`);
    } catch (error) {
      toast.error(error.message || 'Statut impossible');
    }
  };

  const updateCostStatus = async (cost, status) => {
    if (!isBpCostEditable(cost)) return toast.error('Charge en lecture seule');
    try {
      await props.onUpdateBpRecurringCost?.(cost.id, buildBpLineStatusPatch(status));
      await props.onRefreshBpRecurringCosts?.();
      toast.success(`Statut · ${bpLineStatusLabel(status)}`);
    } catch (error) {
      toast.error(error.message || 'Statut impossible');
    }
  };

  const saveLineEdit = async (payload) => {
    if (!editLine?.id) return;
    setSaving(true);
    try {
      const patch = { ...payload, total: toNumber(payload.quantite) * toNumber(payload.prix_unitaire), updated_at: new Date().toISOString() };
      await props.onUpdateBpInvestmentLine?.(editLine.id, patch);
      await props.onRefreshBpInvestmentLines?.();
      toast.success('Ligne mise à jour');
      setEditLine(null);
    } catch (error) {
      toast.error(error.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const saveCostEdit = async (payload) => {
    if (!editCost?.id) return;
    setSaving(true);
    try {
      await props.onUpdateBpRecurringCost?.(editCost.id, payload);
      await props.onRefreshBpRecurringCosts?.();
      toast.success('Charge mise à jour');
      setEditCost(null);
    } catch (error) {
      toast.error(error.message || 'Enregistrement impossible');
    } finally {
      setSaving(false);
    }
  };

  const lineColumns = [
    { label: 'Poste', key: 'designation' },
    { label: 'Montant prévu', render: (r) => money(totalLine(r)) },
    { label: 'Déjà fait', render: (r) => money(r.montant_reel) },
    {
      label: 'Où ça va',
      render: (r) => {
        const kind = investmentAssetKind(r);
        return kind ? (MODULE_LABELS[kind] || kind) : '—';
      },
    },
    {
      label: 'Statut',
      render: (r) => {
        const status = normalizeBpLineStatus(r);
        if (!isBpLineEditable(r)) return <span className="text-[#8a7456]">{bpLineStatusLabel(status)}</span>;
        return <select value={status} onChange={(e) => updateLineStatus(r, e.target.value)} className="rounded-lg border border-[#eadcc2] bg-white px-2 py-1 text-xs font-bold text-[#2f2415]">{BP_LINE_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>;
      },
    },
    {
      label: '',
      render: (r) => {
        if (!isBpLineEditable(r)) return null;
        const canDo = canConcretizeBpLine(r) && investmentAssetKind(r);
        return <div className="flex flex-wrap gap-1 justify-end">
          {canDo ? <button type="button" onClick={() => openConcretization(r)} className="rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white">Concrétiser</button> : null}
          <button type="button" onClick={() => setEditLine(r)} className="rounded-lg border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /> Modifier</button>
        </div>;
      },
    },
  ];

  const costColumns = [
    { label: 'Charge', key: 'designation' },
    { label: 'Par mois', render: (r) => money(monthly(r)) },
    { label: 'Déjà fait', render: (r) => money(r.montant_reel) },
    {
      label: 'Où ça va',
      render: (r) => bpCostModuleRoute(r).label || '—',
    },
    {
      label: 'Statut',
      render: (r) => {
        const status = normalizeBpLineStatus(r);
        if (!isBpCostEditable(r)) return <span className="text-[#8a7456]">{bpLineStatusLabel(status)}</span>;
        return <select value={status} onChange={(e) => updateCostStatus(r, e.target.value)} className="rounded-lg border border-[#eadcc2] bg-white px-2 py-1 text-xs font-bold text-[#2f2415]">{BP_LINE_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>;
      },
    },
    {
      label: '',
      render: (r) => {
        if (!isBpCostEditable(r)) return null;
        const canDo = canConcretizeBpCost(r);
        return <div className="flex flex-wrap gap-1 justify-end">
          {canDo ? <button type="button" onClick={() => openCostConcretization(r)} className="rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white">Concrétiser</button> : null}
          <button type="button" onClick={() => setEditCost(r)} className="rounded-lg border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /> Modifier</button>
        </div>;
      },
    },
  ];

  return <div className="space-y-5 investissements-mobile-structured">
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Business Plan</p>
          <h2 className="mt-1 text-2xl font-black text-[#2f2415]">{plan?.nom || HORIZON_FARM_BP_NAME}</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Ce que tu prévois d’investir, ce que tu as déjà fait, et ce qu’il reste.</p>
        </div>
        <button type="button" onClick={() => syncBp(props, { force: true })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#7d6a4a]"><RefreshCw size={14} className="inline" /> Recharger le plan Excel</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Prévu" value={money(totals.prevu)} />
        <Kpi label="Déjà fait" value={money(totals.concretise)} tone="good" />
        <Kpi label="Annulé" value={money(totals.annule)} tone="bad" />
        <Kpi label="Reste à faire" value={money(totals.reste)} tone="warn" />
      </div>
    </div>

    <div className="flex flex-wrap gap-2 rounded-3xl border border-[#d6c3a0] bg-white p-3">{tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] text-[#7d6a4a] border border-[#eadcc2]'}`}>{label}</button>)}</div>

    {tab === 'overview' ? <Section icon={FileSpreadsheet} title="Vue d’ensemble" subtitle="Le BP Horizon Farm en bref.">
      <HelpSteps />
      {pendingLines.length ? <div className="space-y-2">
        <p className="text-sm font-black text-[#2f2415]">À faire maintenant ({pendingLines.length})</p>
        {pendingLines.slice(0, 6).map((line) => <button type="button" key={line.id} onClick={() => openConcretization(line)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:border-emerald-400">
          <span><b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-sm text-[#8a7456]">{money(totalLine(line))}</span></span>
          <span className="flex items-center gap-1 text-xs font-black text-emerald-800">Concrétiser <ArrowRight size={14} /></span>
        </button>)}
        {pendingLines.length > 6 ? <p className="text-xs text-[#8a7456]">+ {pendingLines.length - 6} autre(s) ligne(s) dans l’onglet Mes investissements.</p> : null}
      </div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Rien en attente pour l’instant — toutes les lignes éligibles sont traitées ou annulées.</div>}
      {pendingCosts.length ? <div className="space-y-2">
        <p className="text-sm font-black text-[#2f2415]">Charges à concrétiser ({pendingCosts.length})</p>
        {pendingCosts.slice(0, 6).map((cost) => <button type="button" key={cost.id} onClick={() => openCostConcretization(cost)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left hover:border-sky-400">
          <span><b className="text-[#2f2415]">{cost.designation}</b><span className="ml-2 text-sm text-[#8a7456]">{money(monthly(cost))}/mois · {bpCostModuleRoute(cost).label}</span></span>
          <span className="flex items-center gap-1 text-xs font-black text-sky-800">Concrétiser <ArrowRight size={14} /></span>
        </button>)}
        {pendingCosts.length > 6 ? <p className="text-xs text-[#8a7456]">+ {pendingCosts.length - 6} autre(s) charge(s) dans l’onglet Charges mensuelles.</p> : null}
      </div> : null}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Kpi label="Lignes d’investissement" value={String(lines.length)} />
        <Kpi label="Charges / mois (prévu)" value={money(costTotals.prevu || monthCosts)} />
        <Kpi label="Charges concrétisées" value={money(costTotals.concretise)} tone="good" />
        <Kpi label="CA prévu an 1" value={money(annualRevenue)} />
      </div>
    </Section> : null}

    {tab === 'budget' ? <Section icon={Coins} title="Mes investissements" subtitle="Modifie une ligne, change son statut, ou clique Concrétiser pour passer à l’action.">
      <HelpSteps />
      <Table rows={lines} columns={lineColumns} />
    </Section> : null}

    {tab === 'charges' ? <Section icon={Coins} title="Charges mensuelles" subtitle="Aliments, loyers, salaires… — concrétisez vers le module métier ou la trésorerie.">
      <HelpSteps />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Prévu / mois" value={money(costTotals.prevu)} />
        <Kpi label="Concrétisé" value={money(costTotals.concretise)} tone="good" />
        <Kpi label="Annulé" value={money(costTotals.annule)} tone="bad" />
        <Kpi label="Reste" value={money(costTotals.reste)} tone="warn" />
      </div>
      <Table rows={costs} columns={costColumns} />
    </Section> : null}

    {tab === 'plan' ? <FinancialPlanPanel {...props} /> : null}

    {tab === 'previsions' ? <>
      <Section icon={BarChart3} title="Revenus prévus" subtitle="Chiffre d’affaires mensuel du BP."><Table rows={projections} columns={[{ label: 'Mois', key: 'mois_index' }, { label: 'CA', render: (r) => money(revenue(r)) }, { label: 'Charges', render: (r) => money(charges(r)) }, { label: 'Marge', render: (r) => money(revenue(r) - charges(r)) }]} /></Section>
      <Section icon={BarChart3} title="Remboursement investissement" subtitle="Combien l’activité remonte le coût de départ, mois par mois."><Table rows={amort} columns={[{ label: 'Mois', render: (r) => `M${r.mois}` }, { label: 'Marge', render: (r) => money(r.marge) }, { label: 'Solde', render: (r) => money(r.balance) }, { label: 'Récupéré', render: (r) => `${Number(r.pct || 0).toFixed(0)}%` }]} /></Section>
    </> : null}

    {tab === 'controle' ? <Section icon={ShieldCheck} title="Contrôle" subtitle="Vérifications techniques pour les admins."><InvestmentQualityControl rows={props.rows || []} businessPlans={props.businessPlans || []} bpInvestmentLines={props.bpInvestmentLines || []} bpFundingSources={props.bpFundingSources || []} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} /></Section> : null}

    <EditModal open={Boolean(editLine)} onClose={() => setEditLine(null)} onSubmit={saveLineEdit} fields={INVESTMENT_EDIT_FIELDS} initialValues={editLine || {}} loading={saving} title="Modifier la ligne" submitLabel="Enregistrer" />
    <EditModal open={Boolean(editCost)} onClose={() => setEditCost(null)} onSubmit={saveCostEdit} fields={COST_EDIT_FIELDS} initialValues={editCost || {}} loading={saving} title="Modifier la charge" submitLabel="Enregistrer" />
  </div>;
}
