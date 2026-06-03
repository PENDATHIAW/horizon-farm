import { AlertTriangle, ArrowRight, BarChart3, CheckCircle2, Coins, Edit3, FileSpreadsheet, Link2, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import EditModal from '../modals/EditModal';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { HORIZON_FARM_BP_ID, HORIZON_FARM_BP_NAME, HORIZON_FARM_INVESTMENT_LINES, HORIZON_FARM_MONTHLY_COSTS, HORIZON_FARM_REVENUE_PROJECTIONS, buildHorizonFarmBpLine, buildHorizonFarmBusinessPlan, buildHorizonFarmMonthlyCost, buildHorizonFarmProjection } from '../services/horizonFarmBusinessPlanSeed';
import {
  BP_LINE_COMPLETED_EVENT,
  BP_LINE_STATUS,
  BP_LINE_STATUS_OPTIONS,
  bpLineAmount,
  bpLineStatusLabel,
  buildBpLineCompletionWorkflow,
  buildBpLineStatusPatch,
  canConcretizeBpLine,
  computeBpInvestmentTotals,
  isBpLineEditable,
  launchBpLineConcretization,
  normalizeBpLineStatus,
} from '../utils/bpLineConcretization';
import { fmtCurrency, toNumber } from '../utils/format';
import { buildInvestmentAssetWorkflow, buildInvestmentRealizationWorkflow, investmentAmount, investmentAssetKind, investmentLabel } from '../utils/investmentWorkflows';
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

async function syncBp(props, { silent = false, force = false } = {}) {
  try {
    const existing = arr(props.businessPlans).find(isBp);
    if (existing?.id && !force && arr(props.bpInvestmentLines).some((r) => String(r.business_plan_id) === String(existing.id))) {
      if (!silent) toast.success('BP déjà présent dans la base');
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
      if (found?.id) await props.onUpdateBpRecurringCost?.(found.id, { ...official, frequence: 'mensuelle' });
      else await props.onCreateBpRecurringCost?.(buildHorizonFarmMonthlyCost(official, planId));
    }
    for (const official of HORIZON_FARM_REVENUE_PROJECTIONS) {
      const found = currentProj.find((r) => Number(r.mois_index) === Number(official.mois_index));
      if (found?.id) await props.onUpdateBpRevenueProjection?.(found.id, official);
      else await props.onCreateBpRevenueProjection?.(buildHorizonFarmProjection(official, planId));
    }
    await Promise.allSettled([props.onRefreshBusinessPlans?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBpRecurringCosts?.(), props.onRefreshBpRevenueProjections?.()]);
    if (!silent) toast.success('Source officielle resynchronisée');
  } catch (e) {
    if (!silent) toast.error(e.message || 'Synchronisation impossible');
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
    toast.success(`Ligne BP concrétisée · ${investmentLabel(line)}`);
  } catch (error) {
    toast.error(error.message || 'Mise à jour BP impossible');
  }
}

async function realizeInvestment(line, props) {
  const workflow = buildInvestmentRealizationWorkflow(line);
  if (!workflow) return toast.error('Montant investissement invalide');
  if (line.linked_finance_transaction_id || line.realization_key) return toast.error('Cette ligne est déjà réalisée.');
  try {
    await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    await props.onCreateDocument?.(workflow.proofDocument);
    await props.onUpdateBpInvestmentLine?.(line.id, { ...workflow.linePatch, ...buildBpLineStatusPatch(BP_LINE_STATUS.CONCRETISE) });
    await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([props.onRefreshFinances?.(), props.onRefreshDocuments?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBusinessEvents?.()]);
    toast.success('Investissement payé, finance et preuve préparées');
  } catch (error) {
    toast.error(error.message || 'Paiement investissement impossible');
  }
}

async function createAssetFromInvestment(line, props) {
  const workflow = buildInvestmentAssetWorkflow(line);
  if (!workflow) return toast.error(line.asset_id ? 'Actif déjà créé pour cette ligne.' : 'Cette ligne ne correspond pas encore à un actif automatique.');
  const createByModule = { avicole: props.onCreateLot, animal: props.onCreateAnimal, culture: props.onCreateCulture, equipements: props.onCreateEquipement, stock: props.onCreateStock };
  const refreshByModule = { avicole: props.onRefreshLots, animal: props.onRefreshAnimals, culture: props.onRefreshCultures, equipements: props.onRefreshEquipements, stock: props.onRefreshStock };
  const creator = createByModule[workflow.module];
  if (!creator) return toast.error(`Création ${workflow.module} non disponible dans ce module.`);
  try {
    for (const payload of workflow.payloads) await creator(payload);
    await props.onUpdateBpInvestmentLine?.(line.id, { ...workflow.linePatch, ...buildBpLineStatusPatch(BP_LINE_STATUS.CONCRETISE) });
    await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([refreshByModule[workflow.module]?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBusinessEvents?.()]);
    toast.success('Actif métier créé et relié au BP');
  } catch (error) {
    toast.error(error.message || 'Création actif impossible');
  }
}

function InvestmentTerrainActions({ lines = [], props }) {
  const actionable = lines.filter((line) => isBpLineEditable(line));
  const officialOnly = !actionable.length;
  const realisable = actionable.filter((line) => normalizeBpLineStatus(line) === BP_LINE_STATUS.A_CONCRETISER && !line.linked_finance_transaction_id && !line.realization_key && investmentAmount(line) > 0);
  const assetReady = actionable.filter((line) => (line.linked_finance_transaction_id || normalizeBpLineStatus(line) === BP_LINE_STATUS.CONCRETISE) && !line.asset_id && !line.asset_created_at && investmentAssetKind(line));
  const toConcretize = actionable.filter((line) => canConcretizeBpLine(line) && investmentAssetKind(line));

  const openConcretization = (line) => {
    const result = launchBpLineConcretization(line, { onNavigate: props.onNavigate });
    if (!result.ok) return toast.error('Cette ligne ne peut pas encore être concrétisée dans un module métier.');
    toast.success(`Ouverture ${investmentAssetKind(line) || 'module'} · complétez la fiche puis validez`);
  };

  return <Section icon={Wallet} title="Actions terrain investissement" subtitle="Concrétiser une ligne ouvre le module métier concerné (Avicole, Animaux, Cultures, Stock…). Finance, preuve et lien BP suivent après validation.">
    {officialOnly ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={16} className="inline" /> Chargement du BP en cours ou lignes encore en lecture seule. Les lignes officielles deviennent modifiables dès qu’elles sont en base.</div> : null}
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 xl:col-span-1">
        <p className="font-black text-[#2f2415]">Concrétiser dans le métier</p>
        <p className="mt-1 text-sm text-[#8a7456]">Ex. 3000 pondeuses → Élevage / Avicole avec le formulaire « nouvelle bande » prérempli.</p>
        <div className="mt-3 space-y-2">{toConcretize.slice(0, 8).map((line) => <button type="button" key={line.id} onClick={() => openConcretization(line)} className="w-full rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-left text-sm hover:border-emerald-400"><ArrowRight size={14} className="inline text-emerald-700" /> <b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-[#8a7456]">{money(totalLine(line))} · {investmentAssetKind(line)}</span></button>)}{!toConcretize.length ? <p className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#8a7456]">Aucune ligne éligible à la concrétisation guidée.</p> : null}</div>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">Marquer une dépense réalisée</p>
        <p className="mt-1 text-sm text-[#8a7456]">Crée une sortie Finance et une preuve sans passer par le module métier.</p>
        <div className="mt-3 space-y-2">{realisable.slice(0, 6).map((line) => <button type="button" key={line.id} onClick={() => realizeInvestment(line, props)} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-left text-sm hover:border-[#9a6b12]"><b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-[#8a7456]">{money(investmentAmount(line))}</span></button>)}{!realisable.length ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Aucune ligne en attente de paiement.</p> : null}</div>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">Créer l’actif automatiquement</p>
        <p className="mt-1 text-sm text-[#8a7456]">Raccourci sans formulaire métier, après paiement enregistré.</p>
        <div className="mt-3 space-y-2">{assetReady.slice(0, 6).map((line) => <button type="button" key={line.id} onClick={() => createAssetFromInvestment(line, props)} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-left text-sm hover:border-[#9a6b12]"><Link2 size={14} className="inline text-[#9a6b12]" /> <b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-[#8a7456]">vers {investmentAssetKind(line)}</span></button>)}{!assetReady.length ? <p className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#8a7456]">Aucun actif en attente.</p> : null}</div>
      </div>
    </div>
  </Section>;
}

export default function InvestissementsV9(props) {
  const [tab, setTab] = useState('bp');
  const [editLine, setEditLine] = useState(null);
  const [editCost, setEditCost] = useState(null);
  const [saving, setSaving] = useState(false);
  const seedAttempted = useRef(false);

  const plan = useMemo(() => arr(props.businessPlans).find(isBp) || null, [props.businessPlans]);
  const planId = plan?.id || HORIZON_FARM_BP_ID;
  const dbLines = dedupe(arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id || planId) === String(planId)));
  const lines = dbLines.length ? dbLines : HORIZON_FARM_INVESTMENT_LINES.map((r, i) => ({ id: `off-${i}`, ...r, statut: BP_LINE_STATUS.A_CONCRETISER }));
  const costs = dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))).length ? dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))) : HORIZON_FARM_MONTHLY_COSTS.map((r, i) => ({ id: `cost-${i}`, ...r }));
  const projections = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)).length ? arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)) : HORIZON_FARM_REVENUE_PROJECTIONS.map((r, i) => ({ id: `rev-${i}`, ...r }));

  const totals = useMemo(() => computeBpInvestmentTotals(lines), [lines]);
  const monthCosts = costs.reduce((s, r) => s + monthly(r), 0);
  const annualRevenue = projections.reduce((s, r) => s + revenue(r), 0) || HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal;
  let balance = -totals.prevu;
  const amort = projections.slice().sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index)).map((r, i) => { const marge = revenue(r) - charges(r); balance += marge; return { ...r, mois: r.mois_index || i + 1, marge, balance, pct: Math.max(0, Math.min(100, ((totals.prevu + balance) / Math.max(1, totals.prevu)) * 100)) }; });
  const tabs = [['bp', 'BP Horizon Farm'], ['actions', 'Actions terrain'], ['plan', 'Prévu vs réel'], ['budget', 'Investissements'], ['charges', 'Charges'], ['amort', 'Amortissements'], ['revenus', 'Revenus'], ['controle', 'Contrôle']];

  useEffect(() => {
    if (seedAttempted.current) return;
    seedAttempted.current = true;
    if (!plan || !dbLines.length) syncBp(props, { silent: true });
  }, [plan, dbLines.length]);

  useEffect(() => {
    const handler = (event) => finalizeBpLineCompletion(event.detail || {}, props);
    window.addEventListener(BP_LINE_COMPLETED_EVENT, handler);
    return () => window.removeEventListener(BP_LINE_COMPLETED_EVENT, handler);
  }, [props]);

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
      toast.success('Ligne investissement mise à jour');
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
    { label: 'Catégorie', key: 'categorie' },
    { label: 'Quantité', render: (r) => `${r.quantite || ''} ${r.unite || ''}` },
    { label: 'Prix unitaire', render: (r) => money(r.prix_unitaire) },
    { label: 'Total', render: (r) => money(totalLine(r)) },
    { label: 'Réel', render: (r) => money(r.montant_reel) },
    {
      label: 'Statut',
      render: (r) => {
        const status = normalizeBpLineStatus(r);
        if (!isBpLineEditable(r)) return <span className="text-[#8a7456]">{bpLineStatusLabel(status)}</span>;
        return <select value={status} onChange={(e) => updateLineStatus(r, e.target.value)} className="rounded-lg border border-[#eadcc2] bg-white px-2 py-1 text-xs font-bold text-[#2f2415]">{BP_LINE_STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select>;
      },
    },
    {
      label: 'Actions',
      render: (r) => {
        if (!isBpLineEditable(r)) return '—';
        return <div className="flex flex-wrap gap-1"><button type="button" onClick={() => setEditLine(r)} className="rounded-lg border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /> Modifier</button>{canConcretizeBpLine(r) && investmentAssetKind(r) ? <button type="button" onClick={() => { const result = launchBpLineConcretization(r, { onNavigate: props.onNavigate }); if (result.ok) toast.success('Module métier ouvert'); else toast.error('Concrétisation indisponible'); }} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-black text-emerald-800">Concrétiser</button> : null}</div>;
      },
    },
  ];

  const costColumns = [
    { label: 'Charge', key: 'designation' },
    { label: 'Catégorie', key: 'categorie' },
    { label: 'Mensuel', render: (r) => money(monthly(r)) },
    { label: 'Fréquence', key: 'frequence' },
    {
      label: 'Actions',
      render: (r) => isBpLineEditable(r) ? <button type="button" onClick={() => setEditCost(r)} className="rounded-lg border border-[#eadcc2] px-2 py-1 text-xs font-black text-[#2f2415]"><Edit3 size={12} className="inline" /> Modifier</button> : '—',
    },
  ];

  return <div className="space-y-5 investissements-mobile-structured">
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Investissements & Business Plan</p>
          <h2 className="mt-1 text-2xl font-black text-[#2f2415]">{plan?.nom || HORIZON_FARM_BP_NAME}</h2>
          <p className="mt-1 text-sm text-[#8a7456]">Modifiez les lignes, choisissez « à concrétiser », « concrétisé » ou « annulée », puis ouvrez le module métier pour matérialiser l’investissement. Le prévu / réalisé / reste se recalcule automatiquement.</p>
        </div>
        <button type="button" onClick={() => syncBp(props, { force: true })} className="rounded-2xl border border-[#d6c3a0] bg-white px-4 py-3 text-sm font-black text-[#7d6a4a]"><RefreshCw size={16} className="inline" /> Resynchroniser source officielle</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <Kpi label="Prévu total" value={money(totals.prevu)} />
        <Kpi label="Concrétisé" value={money(totals.concretise)} tone="good" />
        <Kpi label="Annulé" value={money(totals.annule)} tone="bad" />
        <Kpi label="Reste à concrétiser" value={money(totals.reste)} tone="warn" />
        <Kpi label="CA prévu année 1" value={money(annualRevenue)} />
      </div>
      {!plan ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={16} className="inline" /> Initialisation silencieuse du BP Horizon Farm…</div> : null}
    </div>

    <div className="flex flex-wrap gap-2 rounded-3xl border border-[#d6c3a0] bg-white p-3">{tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] text-[#7d6a4a] border border-[#eadcc2]'}`}>{label}</button>)}</div>

    {tab === 'bp' ? <Section icon={FileSpreadsheet} title="BP Horizon Farm" subtitle="Suivi prévu vs concrétisé vs annulé.">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Kpi label="Lignes investissement" value={`${lines.length}`} />
        <Kpi label="Concrétisées" value={money(totals.concretise)} tone="good" />
        <Kpi label="Reste" value={money(totals.reste)} tone="warn" />
        <Kpi label="Charges mensuelles" value={money(monthCosts)} />
      </div>
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Source : Plan-financier-previsionnel HORIZON FARM(4).xlsx · statut par défaut <b>à concrétiser</b>. Le bouton « Concrétiser » ouvre le module adapté (Avicole pour les pondeuses, etc.).</div>
    </Section> : null}

    {tab === 'actions' ? <InvestmentTerrainActions lines={lines} props={props} /> : null}
    {tab === 'plan' ? <FinancialPlanPanel {...props} /> : null}

    {tab === 'budget' ? <Section icon={FileSpreadsheet} title="Budget d’investissement" subtitle="Édition inline, statut et concrétisation guidée vers les modules métier.">
      <Table rows={lines} columns={lineColumns} />
    </Section> : null}

    {tab === 'charges' ? <Section icon={Coins} title="Charges récurrentes" subtitle="Charges mensuelles modifiables du BP.">
      <Table rows={costs} columns={costColumns} />
    </Section> : null}

    {tab === 'amort' ? <Section icon={BarChart3} title="Amortissements" subtitle="Solde d’investissement récupéré progressivement avec la marge prévisionnelle."><Table rows={amort} columns={[{ label: 'Mois', render: (r) => `M${r.mois}` }, { label: 'CA', render: (r) => money(revenue(r)) }, { label: 'Charges', render: (r) => money(charges(r)) }, { label: 'Marge', render: (r) => money(r.marge) }, { label: 'Solde', render: (r) => money(r.balance) }, { label: 'Amorti', render: (r) => `${Number(r.pct || 0).toFixed(0)}%` }]} /></Section> : null}

    {tab === 'revenus' ? <Section icon={BarChart3} title="Prévisions de revenus" subtitle="CA, charges et marge mensuelle issus du BP."><Table rows={projections} columns={[{ label: 'Mois', key: 'mois_index' }, { label: 'CA estimé', render: (r) => money(revenue(r)) }, { label: 'Charges', render: (r) => money(charges(r)) }, { label: 'Marge', render: (r) => money(revenue(r) - charges(r)) }, { label: 'Notes', key: 'notes' }]} /></Section> : null}

    {tab === 'controle' ? <Section icon={ShieldCheck} title="Contrôle qualité" subtitle="Cohérence BP, lignes, financement, transactions et actifs métier."><InvestmentQualityControl rows={props.rows || []} businessPlans={props.businessPlans || []} bpInvestmentLines={props.bpInvestmentLines || []} bpFundingSources={props.bpFundingSources || []} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} /></Section> : null}

    <EditModal open={Boolean(editLine)} onClose={() => setEditLine(null)} onSubmit={saveLineEdit} fields={INVESTMENT_EDIT_FIELDS} initialValues={editLine || {}} loading={saving} title="Modifier ligne investissement" submitLabel="Enregistrer" />
    <EditModal open={Boolean(editCost)} onClose={() => setEditCost(null)} onSubmit={saveCostEdit} fields={COST_EDIT_FIELDS} initialValues={editCost || {}} loading={saving} title="Modifier charge récurrente" submitLabel="Enregistrer" />
  </div>;
}
