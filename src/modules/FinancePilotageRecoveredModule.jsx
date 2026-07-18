import { BarChart3 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../components/module/ModuleListHub.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { navigationOptionsForFinding, resolveFinanceTab, resolveFinanceNavigation } from '../utils/commercialNavigation';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { aggregateMissingProofTransactions, buildFinanceCoherenceRows, buildFinanceHealthSnapshot } from './finance/financeVisionHelpers.js';
import { rowsOf, allRows } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import MarginGlossaryPanel from '../components/MarginGlossaryPanel.jsx';
import FinancesV12 from './FinancesV12';
import InvestissementsV9 from './InvestissementsV9';
import ProfitabilityStatement from './ProfitabilityStatement.jsx';
import FinanceAnnexePanel from './finance/FinanceAnnexePanel.jsx';
import FinanceSchedulePanel from './finance/FinanceSchedulePanel.jsx';
import FinanceStartupPanel from './finance/FinanceStartupPanel.jsx';
import FinanceExecutiveSituationPanel from './finance/FinanceExecutiveSituationPanel.jsx';
import FinanceAgingPanel from './finance/FinanceAgingPanel.jsx';
import FinanceCashFlowForecastPanel from './finance/FinanceCashFlowForecastPanel.jsx';
import FinanceAlertsPanel from './finance/FinanceAlertsPanel.jsx';
import FinanceMultiFarmPanel from './finance/FinanceMultiFarmPanel.jsx';
import FinanceFinancingPanel from './finance/FinanceFinancingPanel.jsx';
import FinanceReconciliationPanel from './finance/FinanceReconciliationPanel.jsx';
import FinanceExportsPanel from './finance/FinanceExportsPanel.jsx';
import ModuleProjectionsStrip from '../components/module/ModuleProjectionsStrip.jsx';
import { buildFinanceModuleProjections } from '../utils/moduleProjections.js';
import {
  buildFinanceSchedule,
  buildOfficialTreasuryView,
  buildProfitabilityView,
  isFinanceStartupMode,
  TREASURY_LABELS,
} from '../utils/financePilotageCore.js';
import FinanceDemoBanner from './finance/FinanceDemoBanner.jsx';
import FinanceDataQualityPanel from './finance/FinanceDataQualityPanel.jsx';
import FinanceInsightPanel from './finance/FinanceInsightPanel.jsx';
import FinanceMissingProofPanel from './finance/FinanceMissingProofPanel.jsx';
import {
  buildCashFlowForecast,
  buildExecutiveFinancialSituation,
  buildFinanceExportPayload,
  buildFinanceReconciliationView,
  buildFinanceStartupJourneyV2,
  buildPayablesAging,
  buildReceivablesAging,
} from '../utils/financePilotageV2.js';
import { formatFinanceHealthScore, financeHealthTone } from '../utils/financeEmptyState.js';
import {
  buildAdvancedMultiFarmContext,
  buildFinanceAlertsV3,
  buildFinanceDataQuality,
  buildFinanceDemoPresentation,
  buildFinanceDirectExports,
  buildFinancingSimulator,
  buildFinancingViewV3,
  readFinanceSimulatorParams,
} from '../utils/financePilotageV3.js';

const arr = (v) => Array.isArray(v) ? v : [];
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.valeur ?? r.value);
const TREASURY_SUBVIEW_ALIASES = {
  saisie: 'Trésorerie',
  reconciliation: 'Réconciliation',
};
const PILOTAGE_SUBVIEW_ALIASES = {
  echeancier: 'Échéancier',
  financement: 'Financement',
  annexe: 'Annexe',
};


const isUnpaid = (r = {}) => ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(low(r.statut || r.status || r.payment_status));
const isReceivable = (r = {}) => isUnpaid(r) && (['vente', 'client', 'recette'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.client_id);
const isSalesLikeReceivable = (r = {}) => ['vente', 'ventes', 'client', 'clients'].some((key) => low(`${r.categorie || ''} ${r.module_lie || ''} ${r.source_module || ''} ${r.libelle || ''}`).includes(key)) || r.client_id || r.order_id || r.sale_id;
const isPayable = (r = {}) => isUnpaid(r) && (['achat', 'fournisseur', 'depense', 'dépense', 'charge'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.fournisseur_id);


function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-positive' : tone === 'warn' ? 'text-horizon-dark' : tone === 'bad' ? 'text-urgent' : 'text-earth';
  return <div className="rounded-2xl border border-line bg-card p-4"><p className="text-xs text-slate">{label}</p><p className={`mt-1 text-xl font-semibold ${cls}`}>{value}</p></div>;
}

function FinanceInnerTabs({ tabs = [], active, onChange }) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-line bg-card p-2">
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange?.(key)}
          className={`rounded-xl px-3 py-2 text-xs font-semibold ${active === key ? 'bg-earth text-white' : 'text-earth hover:bg-white'}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);


function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="finance_pilotage" active={active} onChange={onChange} />;
}
function DettesPanel({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Dettes fournisseurs"
      intro="Achats et charges restant à payer."
      stats={[
        { label: 'Dettes', value: fmtNumber(data.payables.length), tone: data.payables.length ? 'warn' : 'good' },
        { label: 'Montant', value: fmtCurrency(data.payableAmount), tone: 'warn' },
        { label: 'Fournisseurs', value: fmtNumber(data.suppliers.length) },
        { label: 'Dettes fiches', value: fmtCurrency(data.supplierDebt), tone: data.supplierDebt ? 'warn' : 'good' },
      ]}
      rows={data.payables.map((row) => ({
        id: row.id || row.title,
        title: row.title,
        detail: row.detail,
        value: fmtCurrency(row.amount),
        module: 'achats_stock',
      }))}
      emptyLabel="Aucune dette ouverte."
      onNavigate={onNavigate}
    />
  );
}
function RentabilitePanel({ profitability = null, consolidationProps = {} }) {
  if (!profitability?.ready) {
    return (
      <section className="rounded-3xl border border-vigilance bg-vigilance-bg p-6 text-sm text-horizon-dark">
        <h2 className="text-lg font-semibold text-earth">Rentabilité</h2>
        <p className="mt-2">{profitability?.message || 'Rentabilité non encore calculable : certaines données de coûts ou de ventes sont manquantes.'}</p>
      </section>
    );
  }
  const { profit, activityBreakdown, marginRate } = profitability;
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h2 className="text-lg font-semibold text-earth">Rentabilité par activité</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Résultat opérationnel" value={fmtCurrency(profit.operatingResult)} tone={profit.operatingResult >= 0 ? 'good' : 'bad'} />
          <Stat label="Aviculture" value={fmtCurrency(activityBreakdown.aviculture)} />
          <Stat label="Bovins / animaux" value={fmtCurrency(activityBreakdown.bovins)} />
          <Stat label="Cultures" value={fmtCurrency(activityBreakdown.cultures)} />
          <Stat label="CA commercial" value={fmtCurrency(activityBreakdown.commercial)} tone="good" />
          <Stat label="Marge brute activités" value={fmtCurrency(profit.grossActivityMargin)} tone={profit.grossActivityMargin >= 0 ? 'good' : 'bad'} />
          <Stat label="Taux résultat opérationnel" value={marginRate != null ? `${marginRate} %` : '-'} />
          <Stat label="Charges structure" value={fmtCurrency(profit.structureCharges)} tone="warn" />
        </div>
      </section>
      <MarginGlossaryPanel />
      <ProfitabilityStatement {...consolidationProps} />
    </div>
  );
}
function Summary({
  data,
  navigateFinance,
  onApply,
  busyId,
  onNavigate,
  startupMode = false,
  executiveSituation = null,
  financeAlerts = [],
  multiFarm = null,
  startupJourney = null,
  exportPayload = null,
  directExports = null,
  dataQuality = null,
  financeDemo = null,
  moduleProjections = null,
}) {
  return (
    <div className="space-y-6">
      {/* Essentiels visibles : situation, stats clés, alertes, signaux métier.
          Les analyses secondaires sont repliées ci-dessous (« Voir plus »). */}
      <FinanceDemoBanner demo={financeDemo} />
      {startupMode ? <FinanceStartupPanel journey={startupJourney} onNavigate={onNavigate} setTab={navigateFinance} /> : null}
      <FinanceExecutiveSituationPanel situation={executiveSituation} onNavigateTab={navigateFinance} />
      <FinanceAlertsPanel alerts={financeAlerts} onNavigateTab={navigateFinance} insufficientData={startupMode} />
      {/* Indicateurs complémentaires uniquement : trésorerie / créances / dettes
          / marge réelle sont déjà dans « Situation financière » ci-dessus (on
          ne les répète pas). Ici : santé du dossier, position nette, preuves. */}
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Santé finance" value={formatFinanceHealthScore({ score: data.healthScore, insufficientData: data.healthInsufficient })} tone={financeHealthTone({ score: data.healthScore, insufficientData: data.healthInsufficient })} />
        <Stat label={TREASURY_LABELS.netPosition} value={fmtCurrency(data.netPosition)} tone={data.netPosition >= 0 ? 'good' : 'bad'} />
        <Stat label="Sans preuve" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} />
      </div>
      <p className="text-meta text-slate">
        Position nette = trésorerie disponible + créances − dettes. « Sans preuve » = opérations sans justificatif joint.
      </p>
      <FinanceInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApply}
        onNavigate={onNavigate}
        setTab={navigateFinance}
        busyId={busyId}
      />
      <FinanceMissingProofPanel items={data.missingProofItems} />
      <details className="rounded-3xl border border-line bg-white shadow-card">
        <summary className="cursor-pointer px-6 py-4 text-sm font-semibold text-earth">Voir plus — analyses détaillées</summary>
        <div className="space-y-6 border-t border-line p-6">
          <ModuleProjectionsStrip projections={moduleProjections} onNavigate={onNavigate} />
          <FinanceDataQualityPanel dataQuality={dataQuality} onNavigateTab={navigateFinance} />
          <FinanceMultiFarmPanel multiFarm={multiFarm} />
          <FinanceExportsPanel exportPayload={directExports || exportPayload} directOnly />
        </div>
      </details>
      <section className="rounded-3xl border border-line bg-white p-6 shadow-card">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-earth"><BarChart3 size={20} /> Workflows financiers récupérés</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate">Finance & Pilotage remet les anciens moteurs : saisie finance Hey Horizon, trésorerie, santé comptable, preuves, business plan, paiement d'investissement, création d'actifs, documents et événements métier.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <button type="button" onClick={() => { emitHorizonForm('finances', 'finance_entry', 'Nouvelle écriture', { date: new Date().toISOString().slice(0, 10) }); navigateFinance('Trésorerie'); }} className="rounded-2xl border border-positive bg-positive-bg p-4 text-left"><b className="text-earth">+ Écriture</b><p className="mt-1 text-sm text-slate">Recette ou dépense avec preuve.</p></button>
          <button type="button" onClick={() => navigateFinance('Trésorerie')} className="rounded-2xl border border-line bg-card p-4 text-left"><b className="text-earth">Trésorerie</b><p className="mt-1 text-sm text-slate">Recettes, dépenses, preuves.</p></button>
          <button type="button" onClick={() => navigateFinance('Créances')} className="rounded-2xl border border-line bg-card p-4 text-left"><b className="text-earth">Créances & dettes</b><p className="mt-1 text-sm text-slate">Restes à encaisser et à payer.</p></button>
          <button type="button" onClick={() => navigateFinance('Échéancier')} className="rounded-2xl border border-line bg-card p-4 text-left"><b className="text-earth">Échéancier</b><p className="mt-1 text-sm text-slate">Encaissements et paiements à venir.</p></button>
          <button type="button" onClick={() => navigateFinance('Investissements')} className="rounded-2xl border border-line bg-card p-4 text-left"><b className="text-earth">Investissements</b><p className="mt-1 text-sm text-slate">Budget et actifs.</p></button>
          <button type="button" onClick={() => navigateFinance('Rentabilité')} className="rounded-2xl border border-line bg-card p-4 text-left"><b className="text-earth">Rentabilité</b><p className="mt-1 text-sm text-slate">Marges et alertes ERP.</p></button>
        </div>
      </section>
    </div>
  );
}

export default function FinancePilotageRecoveredModule(props) {
  const { initialTab, onTabChange } = props;
  const controlled = Boolean(onTabChange);
  const bootstrapNav = resolveFinanceNavigation(initialTab || 'Résumé');
  const [internalTab, setInternalTab] = useState(() => bootstrapNav.tab || resolveFinanceTab(initialTab || 'Résumé'));
  const [treasurySubview, setTreasurySubview] = useState(() => bootstrapNav.treasurySubview || 'saisie');
  const [pilotageSubview, setPilotageSubview] = useState(() => bootstrapNav.pilotageSubview || 'echeancier');
  const [busyId, setBusyId] = useState(null);
  const [simulatorParams, setSimulatorParams] = useState(() => readFinanceSimulatorParams());

  const tab = controlled
    ? resolveFinanceTab(initialTab || 'Résumé')
    : internalTab;

  const applyFinanceNavigation = useCallback((nav, rawTarget = '') => {
    const resolvedTab = nav.tab || resolveFinanceTab(initialTab || 'Résumé');
    if (controlled) {
      onTabChange?.(rawTarget || resolvedTab);
    } else {
      setInternalTab(resolvedTab);
    }
    if (nav.treasurySubview) setTreasurySubview(nav.treasurySubview);
    if (nav.pilotageSubview) setPilotageSubview(nav.pilotageSubview);
  }, [controlled, initialTab, onTabChange]);

  const navigateFinance = useCallback((target = '') => {
    applyFinanceNavigation(resolveFinanceNavigation(target), target);
  }, [applyFinanceNavigation]);

  const handleTreasurySubview = useCallback((key) => {
    setTreasurySubview(key);
    if (controlled) onTabChange?.(TREASURY_SUBVIEW_ALIASES[key] || 'Trésorerie');
  }, [controlled, onTabChange]);

  const handlePilotageSubview = useCallback((key) => {
    setPilotageSubview(key);
    if (controlled) onTabChange?.(PILOTAGE_SUBVIEW_ALIASES[key] || 'Pilotage');
  }, [controlled, onTabChange]);

  const setTab = useCallback((value) => {
    applyFinanceNavigation(resolveFinanceNavigation(value), value);
  }, [applyFinanceNavigation]);

  useEffect(() => {
    if (!initialTab) return;
    const nav = resolveFinanceNavigation(initialTab);
    queueMicrotask(() => {
      if (!controlled) setInternalTab(nav.tab);
      if (nav.treasurySubview) setTreasurySubview(nav.treasurySubview);
      if (nav.pilotageSubview) setPilotageSubview(nav.pilotageSubview);
    });
  }, [controlled, initialTab]);

  const financesCrud = useCrudModule('finances');
  const investmentsCrud = useCrudModule('investissements');
  const businessPlansCrud = useCrudModule('business_plans');
  const bpInvestmentLinesCrud = useCrudModule('bp_investment_lines');
  const bpRecurringCostsCrud = useCrudModule('bp_recurring_costs');
  const bpRevenueProjectionsCrud = useCrudModule('bp_revenue_projections');
  const bpFundingSourcesCrud = useCrudModule('bp_funding_sources');
  const bpLinksCrud = useCrudModule('bp_links');
  const bpRisksCrud = useCrudModule('bp_risks');
  const documentsCrud = useCrudModule('documents');
  const eventsCrud = useCrudModule('business_events');
  const paymentsCrud = useCrudModule('payments');
  const salesCrud = useCrudModule('sales_orders');
  const clientsCrud = useCrudModule('clients');
  const suppliersCrud = useCrudModule('fournisseurs');
  const animalsCrud = useCrudModule('animaux');
  const lotsCrud = useCrudModule('avicole');
  const culturesCrud = useCrudModule('cultures');
  const equipementsCrud = useCrudModule('equipements');
  const stockCrud = useCrudModule('stock');
  const stockMovementsCrud = useCrudModule('stock_movements');
  const santeCrud = useCrudModule('sante');
  const alimentationCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const periodFiltered = Boolean(props.periodFiltered);
  const animaux = rowsOf(props.animaux, animalsCrud, false);
  const lots = rowsOf(props.lots || props.lotsData, lotsCrud, false);
  const cultures = rowsOf(props.cultures, culturesCrud, false);
  const stocks = rowsOf(props.stocks, stockCrud, false);
  const stockMovements = rowsOf(props.stockMovements, stockMovementsCrud, false);
  const sante = rowsOf(props.sante || props.vaccins, santeCrud, periodFiltered);
  const alimentationLogs = rowsOf(props.alimentationLogs, alimentationCrud, periodFiltered);
  const productionLogs = rowsOf(props.productionLogs, productionCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const payments = rowsOf(props.payments, paymentsCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const salesOrdersAll = allRows(props.salesOrdersAll, salesCrud);
  const paymentsAll = allRows(props.paymentsAll, paymentsCrud);
  const clients = rowsOf(props.clients, clientsCrud, periodFiltered);
  const suppliers = rowsOf(props.fournisseurs, suppliersCrud, periodFiltered);
  const transactions = rowsOf(props.transactions || props.finances || props.rows, financesCrud, periodFiltered);
  const transactionsAll = allRows(props.transactionsAll || props.transactions || props.finances || props.rows, financesCrud);
  const investments = rowsOf(props.investissements, investmentsCrud, false);
  const businessPlans = rowsOf(props.businessPlans, businessPlansCrud, false);
  const tasks = rowsOf(props.taches, tasksCrud, periodFiltered);
  const consolidationProps = useMemo(() => ({
    transactions,
    salesOrders: salesOrdersAll.length ? salesOrdersAll : salesOrders,
    payments: paymentsAll.length ? paymentsAll : payments,
    animaux,
    lots,
    cultures,
    stocks,
    stockMovements,
    sante,
    alimentationLogs,
    productionLogs,
    fournisseurs: suppliers,
    investissements: investments,
    businessEvents,
    transactionsAll,
    salesOrdersAll: salesOrdersAll.length ? salesOrdersAll : salesOrders,
    paymentsAll: paymentsAll.length ? paymentsAll : payments,
  }), [transactions, transactionsAll, salesOrders, salesOrdersAll, payments, paymentsAll, animaux, lots, cultures, stocks, stockMovements, sante, alimentationLogs, productionLogs, suppliers, investments, businessEvents]);

  const data = useMemo(() => {
    const treasury = buildOfficialTreasuryView(consolidationProps);
    const unpaidTx = transactions.filter(isUnpaid);
    const missingProof = transactions.filter((r) => amount(r) > 0 && !hasProof(r)).length;
    const snapshotOrders = salesOrdersAll.length ? salesOrdersAll : salesOrders;
    const snapshotPayments = paymentsAll.length ? paymentsAll : payments;
    const consolidated = treasury.finance || {};
    const orderReceivables = arr(consolidated.orderSettlements)
      .filter((item) => n(item.remaining) > 0)
      .map((item) => ({
        id: item.order?.id,
        title: item.order?.client_nom || item.order?.customer_name || 'Vente',
        detail: `${item.order?.date || item.order?.created_at || '-'} · commande`,
        amount: n(item.remaining),
      }));
    const txReceivables = transactions
      .filter(isReceivable)
      .filter((row) => !isSalesLikeReceivable(row))
      .map((row) => ({
        id: row.id,
        title: row.libelle || row.title || 'Créance',
        detail: `${row.date || row.created_at || '-'} · finance`,
        amount: amount(row),
      }));
    const receivables = [...orderReceivables, ...txReceivables];
    const supplierDebt = n(consolidated.dettesFournisseurs);
    const txPayables = transactions.filter(isPayable).map((row) => ({
      id: row.id,
      title: row.libelle || row.title || 'Dette',
      detail: `${row.date || row.created_at || '-'} · charge à payer`,
      amount: amount(row),
    }));
    const supplierPayables = suppliers
      .filter((r) => n(r.dettes ?? r.dette ?? r.solde) > 0)
      .map((r) => ({
        id: r.id,
        title: r.nom || r.name || 'Fournisseur',
        detail: 'Dette fournisseur (passif)',
        amount: n(r.dettes ?? r.dette ?? r.solde),
      }));
    const payables = [...supplierPayables, ...txPayables];
    const healthSnap = buildFinanceHealthSnapshot({ transactions, salesOrders: snapshotOrders, payments: snapshotPayments, investments, stocks });
    const coherenceRows = buildFinanceCoherenceRows(transactions, salesOrders, payments, tasks);
    const missingProofItems = aggregateMissingProofTransactions(transactions);
    const profitAlerts = healthSnap.findings.filter((f) => f.category === 'rentabilite' || /marge|rentab|charge|coût|cout/.test(low(`${f.title || ''} ${f.detail || ''}`)));
    return {
      treasuryAvailable: treasury.treasuryAvailable,
      netPosition: treasury.netPosition,
      realMargin: treasury.realMargin,
      revenue: treasury.revenue,
      income: treasury.cashCollected,
      expenses: treasury.chargesEngaged,
      unpaid: unpaidTx.reduce((s, r) => s + amount(r), 0),
      unpaidTx,
      missingProof,
      missingProofItems,
      investments,
      clients,
      suppliers,
      receivables,
      receivableAmount: treasury.receivables,
      payables,
      payableAmount: treasury.payables,
      supplierDebt,
      profitAlerts,
      healthScore: healthSnap.score,
      healthInsufficient: healthSnap.insufficientData === true,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      treasuryWarnings: treasury.warnings,
    };
  }, [consolidationProps, transactions, investments, salesOrders, salesOrdersAll, payments, paymentsAll, clients, suppliers, tasks, stocks]);
  const financeModuleProjections = useMemo(() => {
    const treasury = buildOfficialTreasuryView(consolidationProps);
    return buildFinanceModuleProjections({
      salesOrdersAll: salesOrdersAll.length ? salesOrdersAll : salesOrders,
      salesOrders,
      paymentsAll: paymentsAll.length ? paymentsAll : payments,
      payments,
      transactionsAll: transactionsAll.length ? transactionsAll : transactions,
      transactions,
      finances: transactions,
      bpRecurringCosts: rowsOf(props.bpRecurringCosts, bpRecurringCostsCrud),
      clients,
      receivable: treasury.receivables,
    });
  }, [consolidationProps, transactions, transactionsAll, salesOrders, salesOrdersAll, payments, paymentsAll, clients, props.bpRecurringCosts, bpRecurringCostsCrud]);
  const startupMode = useMemo(() => isFinanceStartupMode(consolidationProps), [consolidationProps]);
  const profitability = useMemo(() => buildProfitabilityView(consolidationProps), [consolidationProps]);
  const v2Options = useMemo(() => ({
    accessibleFarms: props.accessibleFarms || [],
    farmScope: props.farmScope,
    periodLabel: props.periodLabel,
    bpRecurringCosts: rowsOf(props.bpRecurringCosts, bpRecurringCostsCrud),
    bpFundingSources: rowsOf(props.bpFundingSources, bpFundingSourcesCrud),
    tasks,
  }), [props.accessibleFarms, props.farmScope, props.periodLabel, props.bpRecurringCosts, props.bpFundingSources, tasks, bpRecurringCostsCrud, bpFundingSourcesCrud]);

  const schedule = useMemo(
    () => buildFinanceSchedule(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const executiveSituation = useMemo(
    () => buildExecutiveFinancialSituation(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const receivablesAging = useMemo(
    () => buildReceivablesAging(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const payablesAging = useMemo(
    () => buildPayablesAging(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const cashFlowForecast = useMemo(
    () => buildCashFlowForecast(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const v3Options = useMemo(() => ({
    ...v2Options,
    loanParams: simulatorParams,
  }), [v2Options, simulatorParams]);

  const financingPropsBundle = useMemo(() => ({
    ...consolidationProps,
    businessPlans: rowsOf(props.businessPlans, businessPlansCrud),
    bpInvestmentLines: rowsOf(props.bpInvestmentLines, bpInvestmentLinesCrud),
    bpRecurringCosts: rowsOf(props.bpRecurringCosts, bpRecurringCostsCrud),
    bpFundingSources: rowsOf(props.bpFundingSources, bpFundingSourcesCrud),
    documents: rowsOf(props.documents, documentsCrud),
  }), [consolidationProps, props.businessPlans, props.bpInvestmentLines, props.bpRecurringCosts, props.bpFundingSources, props.documents, businessPlansCrud, bpInvestmentLinesCrud, bpRecurringCostsCrud, bpFundingSourcesCrud, documentsCrud]);

  const financingView = useMemo(
    () => buildFinancingViewV3(financingPropsBundle, v3Options),
    [financingPropsBundle, v3Options],
  );
  const financingSimulator = useMemo(
    () => buildFinancingSimulator(financingPropsBundle, v3Options, simulatorParams),
    [financingPropsBundle, v3Options, simulatorParams],
  );
  const dataQuality = useMemo(
    () => buildFinanceDataQuality(financingPropsBundle, v3Options),
    [financingPropsBundle, v3Options],
  );
  const financeDemo = useMemo(() => buildFinanceDemoPresentation(), []);
  const reconciliationView = useMemo(
    () => buildFinanceReconciliationView({ ...consolidationProps, tasks }, v2Options),
    [consolidationProps, tasks, v2Options],
  );
  const multiFarm = useMemo(
    () => buildAdvancedMultiFarmContext(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const startupJourney = useMemo(
    () => buildFinanceStartupJourneyV2({
      ...consolidationProps,
      documents: rowsOf(props.documents, documentsCrud),
      businessPlans: rowsOf(props.businessPlans, businessPlansCrud),
      bpFundingSources: rowsOf(props.bpFundingSources, bpFundingSourcesCrud),
    }),
    [consolidationProps, props.documents, props.businessPlans, props.bpFundingSources, documentsCrud, businessPlansCrud, bpFundingSourcesCrud],
  );
  const financeAlerts = useMemo(
    () => buildFinanceAlertsV3(financingPropsBundle, v3Options, {
      enhancedCapacity: financingView.repayment,
      dataQuality,
      financing: financingView,
      loanParams: simulatorParams,
    }),
    [financingPropsBundle, v3Options, financingView, dataQuality, simulatorParams],
  );
  const exportPayload = useMemo(
    () => buildFinanceExportPayload(consolidationProps, v2Options),
    [consolidationProps, v2Options],
  );
  const directExports = useMemo(
    () => buildFinanceDirectExports(financingPropsBundle, v3Options),
    [financingPropsBundle, v3Options],
  );
  const showFarmInSchedule = (props.accessibleFarms || []).filter((farm) => farm.status !== 'archived').length > 1
    || props.farmScope?.mode === 'all';
  const actionHandlers = {
    onNavigate: props.onNavigate,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    existingTasks: rowsOf(props.existingTasks, tasksCrud),
    existingAlerts: rowsOf(props.existingAlerts, alertsCrud),
  };
  const applyFinding = async (finding) => {
    setBusyId(finding.id);
    try {
      const result = await applyOneClickRecommendation(finding, actionHandlers);
      if (result.createdTasks || result.createdAlerts) toast.success('Action métier créée');
      else {
        toast.success('Module ouvert');
        const target = navigationOptionsForFinding(finding);
        if (target.module === 'finance_pilotage') navigateFinance(target.tab || 'Trésorerie');
      }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };
  const financeProps = {
    rows: transactions,
    transactions,
    finances: transactions,
    documents: rowsOf(props.documents, documentsCrud),
    investissements: investments,
    salesOrders: rowsOf(props.salesOrders, salesCrud),
    salesOrdersAll: salesOrdersAll.length ? salesOrdersAll : salesOrders,
    payments: rowsOf(props.payments, paymentsCrud),
    paymentsAll: paymentsAll.length ? paymentsAll : payments,
    fournisseurs: rowsOf(props.fournisseurs, suppliersCrud),
    clients: rowsOf(props.clients, clientsCrud),
    animaux,
    lots,
    cultures,
    stocks,
    stockMovements,
    sante,
    alimentationLogs,
    productionLogs,
    businessEvents,
    onCreate: props.onCreateFinanceTransaction || financesCrud.create,
    onUpdate: props.onUpdateFinanceTransaction || financesCrud.update,
    onDelete: props.onDeleteFinanceTransaction || financesCrud.remove,
    onRefresh: props.onRefreshFinances || financesCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  };
  const investmentProps = {
    rows: investments,
    investissements: investments,
    businessPlans: rowsOf(props.businessPlans, businessPlansCrud),
    bpInvestmentLines: rowsOf(props.bpInvestmentLines, bpInvestmentLinesCrud),
    bpRecurringCosts: rowsOf(props.bpRecurringCosts, bpRecurringCostsCrud),
    bpRevenueProjections: rowsOf(props.bpRevenueProjections, bpRevenueProjectionsCrud),
    bpFundingSources: rowsOf(props.bpFundingSources, bpFundingSourcesCrud),
    bpLinks: rowsOf(props.bpLinks, bpLinksCrud),
    bpRisks: rowsOf(props.bpRisks, bpRisksCrud),
    transactions,
    lots,
    animaux,
    cultures,
    onCreate: props.onCreateInvestment || investmentsCrud.create,
    onUpdate: props.onUpdateInvestment || investmentsCrud.update,
    onDelete: props.onDeleteInvestment || investmentsCrud.remove,
    onRefresh: props.onRefreshInvestments || investmentsCrud.refresh,
    onCreateBusinessPlan: props.onCreateBusinessPlan || businessPlansCrud.create,
    onUpdateBusinessPlan: props.onUpdateBusinessPlan || businessPlansCrud.update,
    onDeleteBusinessPlan: props.onDeleteBusinessPlan || businessPlansCrud.remove,
    onRefreshBusinessPlans: props.onRefreshBusinessPlans || businessPlansCrud.refresh,
    onCreateBpInvestmentLine: props.onCreateBpInvestmentLine || bpInvestmentLinesCrud.create,
    onUpdateBpInvestmentLine: props.onUpdateBpInvestmentLine || bpInvestmentLinesCrud.update,
    onDeleteBpInvestmentLine: props.onDeleteBpInvestmentLine || bpInvestmentLinesCrud.remove,
    onRefreshBpInvestmentLines: props.onRefreshBpInvestmentLines || bpInvestmentLinesCrud.refresh,
    onCreateBpRecurringCost: props.onCreateBpRecurringCost || bpRecurringCostsCrud.create,
    onUpdateBpRecurringCost: props.onUpdateBpRecurringCost || bpRecurringCostsCrud.update,
    onDeleteBpRecurringCost: props.onDeleteBpRecurringCost || bpRecurringCostsCrud.remove,
    onRefreshBpRecurringCosts: props.onRefreshBpRecurringCosts || bpRecurringCostsCrud.refresh,
    onCreateBpRevenueProjection: props.onCreateBpRevenueProjection || bpRevenueProjectionsCrud.create,
    onUpdateBpRevenueProjection: props.onUpdateBpRevenueProjection || bpRevenueProjectionsCrud.update,
    onDeleteBpRevenueProjection: props.onDeleteBpRevenueProjection || bpRevenueProjectionsCrud.remove,
    onRefreshBpRevenueProjections: props.onRefreshBpRevenueProjections || bpRevenueProjectionsCrud.refresh,
    onCreateBpFundingSource: props.onCreateBpFundingSource || bpFundingSourcesCrud.create,
    onUpdateBpFundingSource: props.onUpdateBpFundingSource || bpFundingSourcesCrud.update,
    onDeleteBpFundingSource: props.onDeleteBpFundingSource || bpFundingSourcesCrud.remove,
    onRefreshBpFundingSources: props.onRefreshBpFundingSources || bpFundingSourcesCrud.refresh,
    onCreateBpLink: props.onCreateBpLink || bpLinksCrud.create,
    onUpdateBpLink: props.onUpdateBpLink || bpLinksCrud.update,
    onDeleteBpLink: props.onDeleteBpLink || bpLinksCrud.remove,
    onRefreshBpLinks: props.onRefreshBpLinks || bpLinksCrud.refresh,
    onCreateBpRisk: props.onCreateBpRisk || bpRisksCrud.create,
    onUpdateBpRisk: props.onUpdateBpRisk || bpRisksCrud.update,
    onDeleteBpRisk: props.onDeleteBpRisk || bpRisksCrud.remove,
    onRefreshBpRisks: props.onRefreshBpRisks || bpRisksCrud.refresh,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh,
    onCreateLot: props.onCreateLot || lotsCrud.create,
    onRefreshLots: props.onRefreshLots || lotsCrud.refresh,
    onCreateAnimal: props.onCreateAnimal || animalsCrud.create,
    onRefreshAnimals: props.onRefreshAnimals || animalsCrud.refresh,
    onCreateCulture: props.onCreateCulture || culturesCrud.create,
    onRefreshCultures: props.onRefreshCultures || culturesCrud.refresh,
    onCreateEquipement: props.onCreateEquipement || equipementsCrud.create,
    onRefreshEquipements: props.onRefreshEquipements || equipementsCrud.refresh,
    onCreateStock: props.onCreateStock || stockCrud.create,
    onRefreshStock: props.onRefreshStock || stockCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  };
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-white p-4 shadow-card sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-normal text-horizon-dark font-semibold">Pilotage</p>
            <h1 className="mt-0.5 text-xl font-semibold text-earth sm:text-2xl">Finance & Pilotage</h1>
            <p className="mt-1 hidden text-sm text-slate sm:block">Trésorerie, créances, dettes - signaux métier, preuves et rentabilité.</p>
            {props.periodLabel ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <PeriodScopeBadge label={props.periodLabel} />
                <span className="rounded-full border border-line bg-card px-2 py-1 text-meta font-semibold text-slate">
                  Trésorerie & créances : cumul ferme (hors filtre période)
                </span>
              </div>
            ) : (
              <p className="mt-2 text-xs font-semibold text-slate">Trésorerie & créances : cumul ferme</p>
            )}
          </div>
          <div className="rounded-2xl border border-line bg-card px-4 py-3 text-sm"><span className="text-slate">Santé </span><b className={data.healthInsufficient ? 'text-slate' : data.healthScore >= 75 ? 'text-positive' : 'text-horizon-dark'}>{formatFinanceHealthScore({ score: data.healthScore, insufficientData: data.healthInsufficient })}</b></div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Vue finance' ? (
        <Summary
          data={data}
          navigateFinance={navigateFinance}
          onApply={applyFinding}
          busyId={busyId}
          onNavigate={props.onNavigate}
          startupMode={startupMode}
          executiveSituation={executiveSituation}
          financeAlerts={financeAlerts}
          multiFarm={multiFarm}
          startupJourney={startupJourney}
          exportPayload={exportPayload}
          directExports={directExports}
          dataQuality={dataQuality}
          financeDemo={financeDemo}
          moduleProjections={financeModuleProjections}
        />
      ) : tab === 'Trésorerie finance' ? (
        <div className="space-y-4">
          <FinanceInnerTabs
            tabs={[
              { key: 'saisie', label: 'Saisie & flux' },
              { key: 'reconciliation', label: 'Réconciliation' },
            ]}
            active={treasurySubview}
            onChange={handleTreasurySubview}
          />
          {treasurySubview === 'reconciliation' ? (
            <FinanceReconciliationPanel
              reconciliationView={reconciliationView}
              transactions={transactions}
              payments={paymentsAll.length ? paymentsAll : payments}
              salesOrders={salesOrdersAll.length ? salesOrdersAll : salesOrders}
              stocks={stocks}
              onCreateFinanceTransaction={props.onCreateFinanceTransaction || financesCrud.create}
              onRefreshFinances={props.onRefreshFinances || financesCrud.refresh}
              onNavigate={props.onNavigate}
              setTab={navigateFinance}
            />
          ) : (
            <FinancesV12 {...financeProps} />
          )}
        </div>
      ) : tab === 'Investissements & dettes finance' ? (
        <div className="space-y-4">
          <InvestissementsV9 {...investmentProps} />
          <details className="rounded-3xl border border-line bg-white shadow-card">
            <summary className="cursor-pointer px-6 py-4 font-semibold text-earth">Dettes fournisseurs</summary>
            <div className="border-t border-line p-4">
              <DettesPanel data={data} onNavigate={props.onNavigate} />
            </div>
          </details>
        </div>
      ) : tab === 'Budget & écarts finance' ? (
        <div className="space-y-4">
          <FinanceInnerTabs
            tabs={[
              { key: 'echeancier', label: 'Échéancier' },
              { key: 'financement', label: 'Financement' },
              { key: 'annexe', label: 'Annexe' },
            ]}
            active={pilotageSubview}
            onChange={handlePilotageSubview}
          />
          {pilotageSubview === 'financement' ? (
            <div className="space-y-6">
              <FinanceDemoBanner demo={financeDemo} />
              <FinanceFinancingPanel
                financing={financingView}
                simulator={financingSimulator}
                directExports={directExports}
                onNavigate={props.onNavigate}
                onSimulatorParamsChange={setSimulatorParams}
              />
            </div>
          ) : pilotageSubview === 'annexe' ? (
            <FinanceAnnexePanel documents={financeProps.documents} onNavigate={props.onNavigate} />
          ) : (
            <div className="space-y-6">
              <FinanceSchedulePanel schedule={schedule} showFarm={showFarmInSchedule} />
              <FinanceAgingPanel receivablesAging={receivablesAging} payablesAging={payablesAging} showFarm={showFarmInSchedule} />
              <FinanceCashFlowForecastPanel forecast={cashFlowForecast} />
            </div>
          )}
        </div>
      ) : tab === 'Coûts & marges finance' ? (
        <div className="space-y-4">
          <RentabilitePanel profitability={profitability} consolidationProps={consolidationProps} />
          <MarginGlossaryPanel />
          <details className="border-t border-line pt-4">
            <summary className="cursor-pointer text-sm font-semibold text-earth">Courbes de coûts et marges</summary>
            <div className="mt-4"><ModuleGraphiquesTab moduleId="finance_pilotage" transactions={transactions} payments={payments} salesOrders={salesOrders} investissements={investments} businessPlans={businessPlans} onNavigate={props.onNavigate} /></div>
          </details>
        </div>
      ) : (
        <Summary
          data={data}
          navigateFinance={navigateFinance}
          onApply={applyFinding}
          busyId={busyId}
          onNavigate={props.onNavigate}
          startupMode={startupMode}
          executiveSituation={executiveSituation}
          financeAlerts={financeAlerts}
          multiFarm={multiFarm}
          startupJourney={startupJourney}
          exportPayload={exportPayload}
          directExports={directExports}
          dataQuality={dataQuality}
          financeDemo={financeDemo}
          moduleProjections={financeModuleProjections}
        />
      )}
    </div>
  );
}
