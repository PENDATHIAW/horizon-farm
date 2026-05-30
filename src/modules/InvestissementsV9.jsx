import { AlertTriangle, BarChart3, CheckCircle2, Coins, FileSpreadsheet, Link2, RefreshCw, ShieldCheck, Wallet } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { fmtCurrency, toNumber } from '../utils/format';
import { buildInvestmentAssetWorkflow, buildInvestmentRealizationWorkflow, investmentAmount, investmentAssetKind, investmentLabel } from '../utils/investmentWorkflows';
import { HORIZON_FARM_OFFICIAL_BP } from '../services/horizonFarmOfficialBusinessPlan';
import { HORIZON_FARM_BP_ID, HORIZON_FARM_BP_NAME, HORIZON_FARM_INVESTMENT_LINES, HORIZON_FARM_MONTHLY_COSTS, HORIZON_FARM_REVENUE_PROJECTIONS, buildHorizonFarmBpLine, buildHorizonFarmBusinessPlan, buildHorizonFarmMonthlyCost, buildHorizonFarmProjection } from '../services/horizonFarmBusinessPlanSeed';
import FinancialPlanPanel from './FinancialPlanPanel.jsx';
import InvestmentQualityControl from './InvestmentQualityControl.jsx';

const arr = (v) => Array.isArray(v) ? v : [];
const low = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
const isBp = (bp = {}) => String(bp.id || '') === HORIZON_FARM_BP_ID || low(bp.nom || bp.name || bp.title).includes('horizon farm');
const isArchived = (r = {}) => ['annule', 'annulé', 'archive', 'archivé'].includes(low(r.statut || r.status));
const key = (r = {}) => low(r.designation || r.name || r.nom || r.title || r.id);
const money = (v) => fmtCurrency(Number(v || 0));
const totalLine = (r = {}) => toNumber(r.total) || toNumber(r.quantite) * toNumber(r.prix_unitaire);
const monthly = (r = {}) => toNumber(r.montant_mensuel || r.amount || r.montant);
const revenue = (r = {}) => toNumber(r.ca_estime || r.revenue || r.montant);
const charges = (r = {}) => toNumber(r.charges_estimees || r.charges);
const dedupe = (rows = []) => [...arr(rows).filter((r) => !isArchived(r)).reduce((m, r) => m.set(key(r), r), new Map()).values()];

function Kpi({ label, value, tone = '' }) { return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-lg font-black ${tone === 'good' ? 'text-emerald-700' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]'}`}>{value}</p></div>; }
function Section({ icon: Icon, title, subtitle, children }) { return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>; }
function Table({ rows, columns }) { return <div className="overflow-x-auto rounded-2xl border border-[#eadcc2]"><table className="w-full min-w-[760px] text-sm"><thead><tr className="bg-[#fffdf8] text-left text-xs uppercase text-[#8a7456]">{columns.map((c) => <th key={c.label} className="px-3 py-2">{c.label}</th>)}</tr></thead><tbody>{rows.map((r, i) => <tr key={r.id || i} className="border-t border-[#eadcc2]">{columns.map((c) => <td key={c.label} className="px-3 py-2 align-top">{c.render ? c.render(r, i) : (r[c.key] ?? '—')}</td>)}</tr>)}</tbody></table></div>; }

async function syncBp(props) {
  try {
    const existing = arr(props.businessPlans).find(isBp);
    const plan = existing?.id ? { ...buildHorizonFarmBusinessPlan(), id: existing.id } : buildHorizonFarmBusinessPlan();
    if (existing?.id) await props.onUpdateBusinessPlan?.(existing.id, plan); else await props.onCreateBusinessPlan?.(plan);
    const planId = plan.id;
    const currentLines = arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id) === String(planId));
    const currentCosts = arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id) === String(planId));
    const currentProj = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id) === String(planId));
    for (const official of HORIZON_FARM_INVESTMENT_LINES) { const found = currentLines.find((r) => key(r) === key(official)); if (found?.id) await props.onUpdateBpInvestmentLine?.(found.id, { ...official, total: totalLine(official) }); else await props.onCreateBpInvestmentLine?.(buildHorizonFarmBpLine(official, planId)); }
    for (const official of HORIZON_FARM_MONTHLY_COSTS) { const found = currentCosts.find((r) => key(r) === key(official)); if (found?.id) await props.onUpdateBpRecurringCost?.(found.id, { ...official, frequence: 'mensuelle' }); else await props.onCreateBpRecurringCost?.(buildHorizonFarmMonthlyCost(official, planId)); }
    for (const official of HORIZON_FARM_REVENUE_PROJECTIONS) { const found = currentProj.find((r) => Number(r.mois_index) === Number(official.mois_index)); if (found?.id) await props.onUpdateBpRevenueProjection?.(found.id, official); else await props.onCreateBpRevenueProjection?.(buildHorizonFarmProjection(official, planId)); }
    await Promise.allSettled([props.onRefreshBusinessPlans?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBpRecurringCosts?.(), props.onRefreshBpRevenueProjections?.()]);
    toast.success('BP Horizon Farm restauré / synchronisé');
  } catch (e) { toast.error(e.message || 'Synchronisation impossible'); }
}

async function realizeInvestment(line, props) {
  const workflow = buildInvestmentRealizationWorkflow(line);
  if (!workflow) return toast.error('Montant investissement invalide');
  if (line.linked_finance_transaction_id || line.realization_key) return toast.error('Cette ligne est déjà réalisée.');
  try {
    await props.onCreateFinanceTransaction?.(workflow.financeTransaction);
    await props.onCreateDocument?.(workflow.proofDocument);
    await props.onUpdateBpInvestmentLine?.(line.id, workflow.linePatch);
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
  const createByModule = {
    avicole: props.onCreateLot,
    animal: props.onCreateAnimal,
    culture: props.onCreateCulture,
    equipements: props.onCreateEquipement,
    stock: props.onCreateStock,
  };
  const refreshByModule = {
    avicole: props.onRefreshLots,
    animal: props.onRefreshAnimals,
    culture: props.onRefreshCultures,
    equipements: props.onRefreshEquipements,
    stock: props.onRefreshStock,
  };
  const creator = createByModule[workflow.module];
  if (!creator) return toast.error(`Création ${workflow.module} non disponible dans ce module.`);
  try {
    for (const payload of workflow.payloads) await creator(payload);
    await props.onUpdateBpInvestmentLine?.(line.id, workflow.linePatch);
    await props.onCreateBusinessEvent?.(workflow.event);
    await Promise.allSettled([refreshByModule[workflow.module]?.(), props.onRefreshBpInvestmentLines?.(), props.onRefreshBusinessEvents?.()]);
    toast.success('Actif métier créé et relié au BP');
  } catch (error) {
    toast.error(error.message || 'Création actif impossible');
  }
}

function InvestmentTerrainActions({ lines = [], props }) {
  const actionable = lines.filter((line) => line.id && !String(line.id).startsWith('off-'));
  const officialOnly = !actionable.length;
  const realisable = actionable.filter((line) => !line.linked_finance_transaction_id && !line.realization_key && investmentAmount(line) > 0);
  const assetReady = actionable.filter((line) => (line.linked_finance_transaction_id || low(line.statut || line.status).includes('effectif')) && !line.asset_id && !line.asset_created_at && investmentAssetKind(line));
  return <Section icon={Wallet} title="Actions terrain investissement" subtitle="Transformer le BP en argent dépensé, preuve à joindre et actif exploitable.">
    {officialOnly ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={16} className="inline" /> Les lignes visibles viennent encore de la source officielle. Clique d’abord sur <b>Restaurer le BP</b> pour les rendre modifiables et actionnables.</div> : null}
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">Marquer une dépense réalisée</p>
        <p className="mt-1 text-sm text-[#8a7456]">Crée une sortie Finance, une preuve/facture à joindre si nécessaire, puis verrouille la ligne BP comme réalisée.</p>
        <div className="mt-3 space-y-2">{realisable.slice(0, 8).map((line) => <button type="button" key={line.id} onClick={() => realizeInvestment(line, props)} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-left text-sm hover:border-[#9a6b12]"><b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-[#8a7456]">{money(investmentAmount(line))}</span></button>)}{!realisable.length ? <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">Aucune ligne non réalisée avec montant exploitable.</p> : null}</div>
      </div>
      <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
        <p className="font-black text-[#2f2415]">Créer l’actif métier</p>
        <p className="mt-1 text-sm text-[#8a7456]">Après paiement, crée le lot, l’animal, la culture, l’équipement ou le stock lié. Le double clic est bloqué par l’actif déjà relié.</p>
        <div className="mt-3 space-y-2">{assetReady.slice(0, 8).map((line) => <button type="button" key={line.id} onClick={() => createAssetFromInvestment(line, props)} className="w-full rounded-xl border border-[#d6c3a0] bg-white px-3 py-2 text-left text-sm hover:border-[#9a6b12]"><Link2 size={14} className="inline text-[#9a6b12]" /> <b className="text-[#2f2415]">{investmentLabel(line)}</b><span className="ml-2 text-[#8a7456]">vers {investmentAssetKind(line)}</span></button>)}{!assetReady.length ? <p className="rounded-xl border border-[#eadcc2] bg-white px-3 py-2 text-sm text-[#8a7456]">Aucun actif en attente. Réalise une ligne éligible ou vérifie qu’elle n’est pas déjà liée.</p> : null}</div>
      </div>
    </div>
  </Section>;
}

export default function InvestissementsV9(props) {
  const [tab, setTab] = useState('bp');
  const plan = useMemo(() => arr(props.businessPlans).find(isBp) || null, [props.businessPlans]);
  const planId = plan?.id || HORIZON_FARM_BP_ID;
  const lines = dedupe(arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id || planId) === String(planId))).length ? dedupe(arr(props.bpInvestmentLines).filter((r) => String(r.business_plan_id || planId) === String(planId))) : HORIZON_FARM_INVESTMENT_LINES.map((r, i) => ({ id: `off-${i}`, ...r, statut: 'source officielle' }));
  const costs = dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))).length ? dedupe(arr(props.bpRecurringCosts).filter((r) => String(r.business_plan_id || planId) === String(planId))) : HORIZON_FARM_MONTHLY_COSTS.map((r, i) => ({ id: `cost-${i}`, ...r }));
  const projections = arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)).length ? arr(props.bpRevenueProjections).filter((r) => String(r.business_plan_id || planId) === String(planId) && !isArchived(r)) : HORIZON_FARM_REVENUE_PROJECTIONS.map((r, i) => ({ id: `rev-${i}`, ...r }));
  const invest = lines.reduce((s, r) => s + totalLine(r), 0) || HORIZON_FARM_OFFICIAL_BP.startupNeeds.officialTotal;
  const monthCosts = costs.reduce((s, r) => s + monthly(r), 0);
  const annualRevenue = projections.reduce((s, r) => s + revenue(r), 0) || HORIZON_FARM_OFFICIAL_BP.revenue.annualTotal;
  let balance = -invest;
  const amort = projections.slice().sort((a, b) => toNumber(a.mois_index) - toNumber(b.mois_index)).map((r, i) => { const marge = revenue(r) - charges(r); balance += marge; return { ...r, mois: r.mois_index || i + 1, marge, balance, pct: Math.max(0, Math.min(100, ((invest + balance) / Math.max(1, invest)) * 100)) }; });
  const tabs = [['bp','BP Horizon Farm'], ['actions','Actions terrain'], ['plan','Prévu vs réel'], ['budget','Investissements'], ['charges','Charges'], ['amort','Amortissements'], ['revenus','Revenus'], ['controle','Contrôle']];

  return <div className="space-y-5 investissements-mobile-structured"><div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm space-y-4"><div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-widest text-[#8a7456] font-black">Investissements & Business Plan</p><h2 className="mt-1 text-2xl font-black text-[#2f2415]">{plan?.nom || HORIZON_FARM_BP_NAME}</h2><p className="mt-1 text-sm text-[#8a7456]">Module restructuré : un BP central, puis actions terrain, budget, charges, amortissement, revenus et suivi réel. Une dépense réalisée doit créer une sortie Finance, une preuve et un actif métier si applicable.</p></div><button type="button" onClick={() => syncBp(props)} className="rounded-2xl bg-[#2f2415] px-4 py-3 text-sm font-black text-white"><RefreshCw size={16} className="inline" /> Restaurer le BP</button></div><div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3"><Kpi label="Investissement prévu" value={money(invest)} /><Kpi label="Charges mensuelles" value={money(monthCosts)} /><Kpi label="CA prévu année 1" value={money(annualRevenue)} /><Kpi label="CAF A1" value={money(HORIZON_FARM_OFFICIAL_BP.forecast.cashFlowCapacityByYear?.[0])} tone="good" /></div>{!plan ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertTriangle size={16} className="inline" /> Le BP Horizon Farm n’est pas chargé dans la base. Clique <b>Restaurer le BP</b> pour recréer les onglets : investissements, charges, projections et amortissements.</div> : null}</div><div className="flex flex-wrap gap-2 rounded-3xl border border-[#d6c3a0] bg-white p-3">{tabs.map(([k, label]) => <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-2xl px-4 py-2 text-sm font-black ${tab === k ? 'bg-[#2f2415] text-white' : 'bg-[#fffdf8] text-[#7d6a4a] border border-[#eadcc2]'}`}>{label}</button>)}</div>{tab === 'bp' ? <Section icon={FileSpreadsheet} title="BP Horizon Farm" subtitle="Le fichier financier est représenté ici sous forme d’onglets ERP clairs."><div className="grid grid-cols-1 md:grid-cols-3 gap-3"><Kpi label="Onglet investissements" value={`${lines.length} lignes`} /><Kpi label="Onglet charges" value={`${costs.length} charges`} /><Kpi label="Onglet projections" value={`${projections.length} mois`} /></div><div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 size={16} className="inline" /> Le BP retrouvé dans les documents s’appelait “Plan-financier-previsionnel HORIZON FARM(4).xlsx”. L’ERP utilise sa version structurée officielle pour remplir ces onglets.</div></Section> : null}{tab === 'actions' ? <InvestmentTerrainActions lines={lines} props={props} /> : null}{tab === 'plan' ? <FinancialPlanPanel {...props} /> : null}{tab === 'budget' ? <Section icon={FileSpreadsheet} title="Budget d’investissement" subtitle="Dépenses ponctuelles : cheptel, bâtiments, équipements, infrastructures, stock initial, fonds de roulement."><Table rows={lines} columns={[{ label:'Poste', key:'designation' }, { label:'Catégorie', key:'categorie' }, { label:'Quantité', render:(r)=>`${r.quantite || ''} ${r.unite || ''}` }, { label:'Prix unitaire', render:(r)=>money(r.prix_unitaire) }, { label:'Total', render:(r)=>money(totalLine(r)) }, { label:'Réel', render:(r)=>money(r.montant_reel) }, { label:'Statut', key:'statut' }]} /></Section> : null}{tab === 'charges' ? <Section icon={Coins} title="Charges récurrentes" subtitle="Charges mensuelles du BP : aliments, salaires, santé, énergie, transport, maintenance, administration."><Table rows={costs} columns={[{ label:'Charge', key:'designation' }, { label:'Catégorie', key:'categorie' }, { label:'Mensuel', render:(r)=>money(monthly(r)) }, { label:'Fréquence', key:'frequence' }]} /></Section> : null}{tab === 'amort' ? <Section icon={BarChart3} title="Amortissements" subtitle="Solde d’investissement récupéré progressivement avec la marge prévisionnelle."><Table rows={amort} columns={[{ label:'Mois', render:(r)=>`M${r.mois}` }, { label:'CA', render:(r)=>money(revenue(r)) }, { label:'Charges', render:(r)=>money(charges(r)) }, { label:'Marge', render:(r)=>money(r.marge) }, { label:'Solde', render:(r)=>money(r.balance) }, { label:'Amorti', render:(r)=>`${Number(r.pct || 0).toFixed(0)}%` }]} /></Section> : null}{tab === 'revenus' ? <Section icon={BarChart3} title="Prévisions de revenus" subtitle="CA, charges et marge mensuelle issus du BP."><Table rows={projections} columns={[{ label:'Mois', key:'mois_index' }, { label:'CA estimé', render:(r)=>money(revenue(r)) }, { label:'Charges', render:(r)=>money(charges(r)) }, { label:'Marge', render:(r)=>money(revenue(r)-charges(r)) }, { label:'Notes', key:'notes' }]} /></Section> : null}{tab === 'controle' ? <Section icon={ShieldCheck} title="Contrôle qualité" subtitle="Cohérence BP, lignes, financement, transactions et actifs métier."><InvestmentQualityControl rows={props.rows || []} businessPlans={props.businessPlans || []} bpInvestmentLines={props.bpInvestmentLines || []} bpFundingSources={props.bpFundingSources || []} transactions={props.transactions || []} lots={props.lots || []} animaux={props.animaux || []} cultures={props.cultures || []} /></Section> : null}</div>;
}
