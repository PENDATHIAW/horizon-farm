import { AlertTriangle, ArrowRight, CheckCircle2, Coins, Edit3, FileSpreadsheet, RefreshCw, ShieldCheck } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import EditModal from '../modals/EditModal';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { HORIZON_FARM_BP_ID, HORIZON_FARM_BP_NAME, HORIZON_FARM_BP_DISTRIBUTION, HORIZON_FARM_FUNDING_SOURCES, HORIZON_FARM_INVESTMENT_LINES, HORIZON_FARM_MONTHLY_COSTS, HORIZON_FARM_REVENUE_PROJECTIONS, buildHorizonFarmBpLine, buildHorizonFarmBusinessPlan, buildHorizonFarmFundingSource, buildHorizonFarmMonthlyCost, buildHorizonFarmProjection, getHorizonFarmBpSyncPayload } from '../services/horizonFarmBusinessPlanSeed';
import { BP_SHEET_MAPPING, isInvestissementsActionableLine, buildBpImportFromExcel } from '../services/bpImport';
import {
  BP_COST_COMPLETED_EVENT,
  BP_LINE_COMPLETED_EVENT,
  BP_LINE_STATUS,
  BP_LINE_STATUS_OPTIONS,
  bpCostLabel,
  bpLineAmount,
  bpLineStatusLabel,
  buildBpCostCompletionWorkflow,
  buildBpCostConcretizationRoute,
  buildBpLineConcretizationRoute,
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
import {
  BpFundingFinanceurPanel,
  BpMonthlyCostsPanel,
  BpRevenueForecastsPanel,
  InvestmentsInvestorBridge,
} from '../components/investments/InvestmentsFinancePanels.jsx';
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

const MODULE_LABELS = {
  avicole: 'Élevage / Avicole',
  animal: 'Élevage / Animaux',
  culture: 'Cultures',
  stock: 'Achats / Stock',
  equipement: 'Équipements',
  equipements: 'Équipements',
  finance_pilotage: 'Finance & Pilotage',
  objectifs_croissance: 'Objectifs & Croissance',
  commercial: 'Commercial',
  rh: 'RH',
  achats_stock: 'Achats & Stock',
  documents_rapports: 'Documents & Rapports',
};

const INVESTMENT_EDIT_FIELDS = [
  { key: 'designation', label: 'Poste', type: 'text', required: true },
  { key: 'categorie', label: 'Catégorie', type: 'text' },
  { key: 'quantite', label: 'Quantité', type: 'number' },
  { key: 'unite', label: 'Unité', type: 'text' },
  { key: 'prix_unitaire', label: 'Prix unitaire', type: 'number' },
  { key: 'notes', label: 'Notes', type: 'textarea', rows: 2, fullWidth: true },
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

async function syncBp(props, { silent = false, force = false, payload: externalPayload = null } = {}) {
  try {
    const existing = arr(props.businessPlans).find(isBp);
    if (existing?.id && !force && !externalPayload && arr(props.bpInvestmentLines).some((r) => String(r.business_plan_id) === String(existing.id))) {
      if (!silent) toast.success('Plan déjà chargé');
      return;
    }
    const planBase = externalPayload?.sourceBp
      ? {
        ...buildHorizonFarmBusinessPlan(),
        identite_projet: externalPayload.sourceBp.identity,
        besoin_demarrage_total: externalPayload.sourceBp.startupNeeds?.officialTotal,
        financement_total: externalPayload.sourceBp.funding?.officialTotal,
        source_document: externalPayload.sourceBp.sourceDocument,
        bp_import_version: '2.1',
      }
      : buildHorizonFarmBusinessPlan();
    const plan = existing?.id ? { ...planBase, id: existing.id } : planBase;
    if (existing?.id) await props.onUpdateBusinessPlan?.(existing.id, plan); else await props.onCreateBusinessPlan?.(plan);
    const planId = plan.id;
    const payload = externalPayload || getHorizonFarmBpSyncPayload(planId);
    const currentLines = arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id) === String(planId));
    const currentCosts = arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id) === String(planId));
    const currentProj = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id) === String(planId));
    const currentFunding = arr(props.bpFundingSources).filter((r) => String(r.business_plan_id) === String(planId));

    for (const official of payload.investmentLines.filter((line) => isInvestissementsActionableLine(line))) {
      const found = currentLines.find((r) => key(r) === key(official));
      const patch = { ...official, total: totalLine(official), statut: found?.statut || BP_LINE_STATUS.A_CONCRETISER, display_in_investissements: true };
      if (found?.id) await props.onUpdateBpInvestmentLine?.(found.id, patch);
      else await props.onCreateBpInvestmentLine?.(buildHorizonFarmBpLine(official, planId));
    }
    for (const official of payload.recurringCosts) {
      const found = currentCosts.find((r) => key(r) === key(official));
      const patch = { ...official, frequence: 'mensuelle', statut: found?.statut || BP_LINE_STATUS.A_CONCRETISER, display_in_investissements: false };
      if (found?.id) await props.onUpdateBpRecurringCost?.(found.id, patch);
      else await props.onCreateBpRecurringCost?.(buildHorizonFarmMonthlyCost(official, planId));
    }
    for (const official of payload.revenueProjections) {
      const found = currentProj.find((r) => Number(r.mois_index) === Number(official.mois_index));
      if (found?.id) await props.onUpdateBpRevenueProjection?.(found.id, { ...official, display_in_investissements: false });
      else await props.onCreateBpRevenueProjection?.(buildHorizonFarmProjection(official, planId));
    }
    for (const official of payload.fundingSources) {
      const found = currentFunding.find((r) => key(r) === key(official));
      if (found?.id) await props.onUpdateBpFundingSource?.(found.id, official);
      else await props.onCreateBpFundingSource?.(buildHorizonFarmFundingSource(official, planId));
    }
    await Promise.allSettled([
      props.onRefreshBusinessPlans?.(),
      props.onRefreshBpInvestmentLines?.(),
      props.onRefreshBpRecurringCosts?.(),
      props.onRefreshBpRevenueProjections?.(),
      props.onRefreshBpFundingSources?.(),
    ]);
    if (!silent) toast.success('BP importé et réparti par onglet xlsx');
  } catch (e) {
    if (!silent) toast.error(e.message || 'Rechargement impossible');
  }
}

async function finalizeBpCostCompletion(detail, props) {
  const cost = arr(props.bpRecurringCosts).find((row) => String(row.id) === String(detail?.bp_line_id || detail?.bp_cost_id));
  if (!cost?.id) return;
  const workflow = buildBpCostCompletionWorkflow(cost, detail);
  try {
    if (workflow.financeTransaction && !cost.linked_finance_transaction_id) {
      await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    }
    if (workflow.proofDocument && !cost.proof_document_id) {
      await props.onCreateDocument?.(workflow.proofDocument);
    }
    await props.onUpdateBpRecurringCost?.(cost.id, workflow.linePatch);
    if (workflow.event?.title) await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([
      props.onRefreshFinances?.(),
      props.onRefreshDocuments?.(),
      props.onRefreshBpRecurringCosts?.(),
      props.onRefreshBusinessEvents?.(),
    ]);
    toast.success(`Charge enregistrée · ${bpCostLabel(cost)}`);
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
  const [saving, setSaving] = useState(false);
  const [showExcelImport, setShowExcelImport] = useState(false);
  const seedAttempted = useRef(false);

  const plan = useMemo(() => arr(props.businessPlans).find(isBp) || null, [props.businessPlans]);
  const planId = plan?.id || HORIZON_FARM_BP_ID;
  const dbLines = dedupe(arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id || planId) === String(planId)));
  const allLines = dbLines.length ? dbLines : HORIZON_FARM_INVESTMENT_LINES.map((r, i) => ({ id: `off-${i}`, ...r, statut: BP_LINE_STATUS.A_CONCRETISER }));
  const lines = allLines.filter(isInvestissementsActionableLine);
  const costs = dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))).length ? dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))) : HORIZON_FARM_MONTHLY_COSTS.map((r, i) => ({ id: `cost-${i}`, ...r, statut: BP_LINE_STATUS.A_CONCRETISER }));
  const projections = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)).length ? arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)) : HORIZON_FARM_REVENUE_PROJECTIONS.map((r, i) => ({ id: `rev-${i}`, ...r }));

  const totals = useMemo(() => computeBpInvestmentTotals(lines), [lines]);
  const costTotals = useMemo(() => computeBpCostTotals(costs), [costs]);
  const pendingLines = useMemo(() => lines.filter((line) => canConcretizeBpLine(line) && buildBpLineConcretizationRoute(line)), [lines]);
  const pendingCosts = useMemo(() => costs.filter((cost) => canConcretizeBpCost(cost) && buildBpCostConcretizationRoute(cost)), [costs]);
  const costsNeedDbSync = useMemo(() => costs.some((cost) => !isBpCostEditable(cost)), [costs]);
  const dbCostsCount = dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))).length;
  const monthCosts = costs.reduce((s, r) => s + monthly(r), 0);
  const annualRevenue = projections.reduce((s, r) => s + revenue(r), 0) || HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal;

  const tabs = [
    ['overview', 'Vue d’ensemble'],
    ['budget', 'Mes investissements'],
    ['funding', 'Financement'],
    ['costs', 'Charges mensuelles'],
    ['plan', 'Suivi réel'],
    ['forecasts', 'Prévisions'],
    ['repartition', 'Répartition BP'],
    ['controle', 'Contrôle'],
  ];
  const fundingSources = dedupe(arr(props.bpFundingSources).filter((r) => String(r.business_plan_id || planId) === String(planId)));
  const fileInputRef = useRef(null);

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
    const route = buildBpLineConcretizationRoute(line);
    const mod = route?.navigate?.module;
    toast.success(`Ouverture ${MODULE_LABELS[mod] || mod || 'module'}…`);
  };

  const importExcelFile = async (file) => {
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const imported = buildBpImportFromExcel(buffer, planId, file.name);
      await syncBp(props, { force: true, payload: imported });
      toast.success(`Fichier ${file.name} — ${imported.parsed?.counts?.startupLines ?? imported.investmentLines?.length ?? 0} lignes démarrage parsées, répartition ERP appliquée.`);
    } catch (error) {
      toast.error(error.message || 'Import Excel impossible');
    }
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

  const lineColumns = [
    { label: 'Poste', key: 'designation' },
    { label: 'Nature', render: (r) => r.nature || r.categorie || '—' },
    { label: 'Prévu', render: (r) => money(r.montant_prevu ?? totalLine(r)) },
    { label: 'Payé', render: (r) => money(r.montant_paye ?? r.montant_reel) },
    { label: 'Reste', render: (r) => money(r.reste_a_realiser ?? Math.max(0, totalLine(r) - toNumber(r.montant_paye ?? r.montant_reel))) },
    {
      label: 'Module cible',
      render: (r) => MODULE_LABELS[r.module_cible] || r.module_cible || (investmentAssetKind(r) ? MODULE_LABELS[investmentAssetKind(r)] : '—'),
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
        const canDo = canConcretizeBpLine(r) && buildBpLineConcretizationRoute(r);
        return <div className="flex flex-wrap gap-1 justify-end">
          {canDo ? <button type="button" onClick={() => openConcretization(r)} className="rounded-lg bg-[#2f2415] px-3 py-1.5 text-xs font-black text-white">Concrétiser</button> : null}
          <button type="button" onClick={() => setEditLine(r)} className="rounded-lg border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /> Modifier</button>
        </div>;
      },
    },
  ];

  return <div className="space-y-5 investissements-mobile-structured">
    <InvestmentsInvestorBridge {...props} onNavigate={props.onNavigate} />

    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Business Plan</p>
          <h2 className="mt-1 text-2xl font-black text-[#2f2415]">{plan?.nom || HORIZON_FARM_BP_NAME}</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Lignes d’investissement actionnables uniquement — le reste du BP est réparti vers Finance, RH, Commercial, Objectifs…</p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <button type="button" onClick={() => syncBp(props, { force: true })} className="rounded-2xl bg-[#2f2415] px-4 py-2 text-xs font-black text-white"><RefreshCw size={14} className="inline" /> Resynchroniser le BP officiel</button>
          <button type="button" onClick={() => setShowExcelImport((v) => !v)} className="text-xs font-bold text-[#8a7456] underline-offset-2 hover:underline">
            {showExcelImport ? 'Masquer import Excel' : 'Autre fichier Excel (optionnel)'}
          </button>
          {showExcelImport ? (
            <>
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-2 text-xs font-black text-[#7d6a4a]"><FileSpreadsheet size={14} className="inline" /> Choisir un .xlsx</button>
              <p className="text-[11px] text-[#8a7456] max-w-xs text-right">Utile seulement si vous avez une version Excel plus récente que le BP intégré.</p>
            </>
          ) : null}
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={(e) => importExcelFile(e.target.files?.[0])} />
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="Prévu" value={money(totals.prevu)} />
        <Kpi label="Déjà fait" value={money(totals.concretise)} tone="good" />
        <Kpi label="Annulé" value={money(totals.annule)} tone="bad" />
        <Kpi label="Reste à faire" value={money(totals.reste)} tone="warn" />
      </div>
    </div>

    <div className="flex flex-wrap gap-2 rounded-3xl border border-[#d6c3a0] bg-white p-3">{tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] text-[#7d6a4a] border border-[#eadcc2]'}`}>{label}</button>)}</div>

    {tab === 'overview' ? <Section icon={FileSpreadsheet} title="Vue d’ensemble" subtitle="Investissements actionnables — charges, revenus et synthèse BP sont dans leurs modules respectifs.">
      <HelpSteps />
      {pendingLines.length ? <div className="space-y-2">
        <p className="text-sm font-black text-[#2f2415]">À concrétiser maintenant ({pendingLines.length})</p>
        {pendingLines.slice(0, 6).map((line) => <button type="button" key={line.id} onClick={() => openConcretization(line)} className="flex w-full items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-left hover:border-emerald-400">
          <span><b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-sm text-[#8a7456]">{money(totalLine(line))}</span></span>
          <span className="flex items-center gap-1 text-xs font-black text-emerald-800">Concrétiser <ArrowRight size={14} /></span>
        </button>)}
        {pendingLines.length > 6 ? <p className="text-xs text-[#8a7456]">+ {pendingLines.length - 6} autre(s) ligne(s) dans l’onglet Mes investissements.</p> : null}
      </div> : <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Rien en attente — toutes les lignes éligibles sont traitées ou annulées.</div>}
      {costsNeedDbSync ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Charges BP :</b> resynchronisez le plan pour activer les boutons Concrétiser sur les charges ({dbCostsCount ? `${dbCostsCount} en base` : 'aperçu seul'}).</div> : null}
      {pendingCosts.length ? <div className="space-y-2">
        <p className="text-sm font-black text-[#2f2415]">Charges à concrétiser ({pendingCosts.length})</p>
        {pendingCosts.slice(0, 4).map((cost) => <button type="button" key={cost.id} onClick={() => launchBpCostConcretization(cost, { onNavigate: props.onNavigate })} className="flex w-full items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left hover:border-sky-400">
          <span><b className="text-[#2f2415]">{bpCostLabel(cost)}</b><span className="ml-2 text-sm text-[#8a7456]">{money(bpCostAmount(cost))}/mois</span></span>
          <span className="flex items-center gap-1 text-xs font-black text-sky-800">Concrétiser <ArrowRight size={14} /></span>
        </button>)}
        {pendingCosts.length > 4 ? <p className="text-xs text-[#8a7456]">+ {pendingCosts.length - 4} dans l’onglet Charges mensuelles.</p> : null}
      </div> : null}
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-sm text-[#5c4a32]">
        <p className="font-black text-[#2f2415]">Répartition du BP (4 onglets xlsx)</p>
        <ul className="mt-2 space-y-1 text-xs">
          <li><b>Hypothèses</b> → Objectifs, Commercial, Finance charges, RH, Achats ({costTotals.count} charges en base)</li>
          <li><b>Périodicité revenus</b> → Objectifs, Commercial, Élevage, Trésorerie ({projections.length} mois)</li>
          <li><b>Données à saisir</b> → Investissements actionnables + Financeurs ({lines.length} lignes ici)</li>
          <li><b>Plan à imprimer</b> → Documents & Rapports, synthèse Finance (lecture seule)</li>
        </ul>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
        <Kpi label="Lignes actionnables" value={String(lines.length)} />
        <Kpi label="Charges BP (hors Invest.)" value={money(costTotals.prevu || monthCosts)} />
        <Kpi label="Financements BP" value={String(HORIZON_FARM_FUNDING_SOURCES.length)} />
        <Kpi label="CA prévu an 1" value={money(annualRevenue)} />
      </div>
    </Section> : null}

    {tab === 'budget' ? <Section icon={Coins} title="Mes investissements" subtitle="Besoins de démarrage, équipements, stock initial, trésorerie de départ — lignes actionnables à concrétiser.">
      <HelpSteps />
      <Table rows={lines} columns={lineColumns} />
    </Section> : null}

    {tab === 'funding' ? <BpFundingFinanceurPanel bpFundingSources={fundingSources.length ? fundingSources : undefined} besoinsTotal={totals.prevu} /> : null}

    {tab === 'costs' ? (
      <BpMonthlyCostsPanel
        costs={costs}
        costTotals={costTotals}
        onNavigate={props.onNavigate}
        onUpdateBpRecurringCost={props.onUpdateBpRecurringCost}
        onRefreshBpRecurringCosts={props.onRefreshBpRecurringCosts}
        needsSync={costsNeedDbSync}
        onRequestSync={() => syncBp(props, { force: true })}
      />
    ) : null}

    {tab === 'forecasts' ? <BpRevenueForecastsPanel projections={projections} /> : null}

    {tab === 'repartition' ? <Section icon={FileSpreadsheet} title="Mapping des 4 onglets Excel" subtitle="Chaque onglet alimente le bon module ERP — Investissements n’affiche que les lignes actionnables.">
      {BP_SHEET_MAPPING.map((sheet) => <div key={sheet.key} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 space-y-2">
        <p className="font-black text-[#2f2415]">{sheet.label}</p>
        <p className="text-xs text-[#8a7456]">{sheet.role}</p>
        {sheet.sections ? <ul className="text-xs space-y-1">{sheet.sections.map((sec) => <li key={sec.key}>• {sec.label} → <b>{MODULE_LABELS[sec.module] || sec.module}</b>{sec.display_in_investissements ? ' (visible Investissements)' : ''}</li>)}</ul> : null}
        {sheet.targets ? <ul className="text-xs space-y-1">{sheet.targets.map((t) => <li key={`${t.module}-${t.tab}`}>→ {MODULE_LABELS[t.module] || t.module}{t.tab ? ` / ${t.tab}` : ''}</li>)}</ul> : null}
        {sheet.read_only_summary ? <p className="text-[11px] text-amber-800">Rapport de synthèse — ne crée pas de lignes, reprend les calculs des autres onglets.</p> : null}
      </div>)}
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <CheckCircle2 size={16} className="inline" /> Compteur sync : {JSON.stringify(HORIZON_FARM_BP_DISTRIBUTION?.routedTo || {})}
      </div>
    </Section> : null}

    {tab === 'plan' ? <FinancialPlanPanel {...props} /> : null}

    {tab === 'controle' ? <Section icon={ShieldCheck} title="Contrôle" subtitle="Vérifications techniques pour les admins."><InvestmentQualityControl rows={props.rows || []} businessPlans={props.businessPlans || []} bpInvestmentLines={props.bpInvestmentLines || []} bpFundingSources={props.bpFundingSources || []} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} /></Section> : null}

    <EditModal open={Boolean(editLine)} onClose={() => setEditLine(null)} onSubmit={saveLineEdit} fields={INVESTMENT_EDIT_FIELDS} initialValues={editLine || {}} loading={saving} title="Modifier la ligne" submitLabel="Enregistrer" />
  </div>;
}
