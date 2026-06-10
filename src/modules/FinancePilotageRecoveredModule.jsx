import { BarChart3, BrainCircuit, PiggyBank, Wallet, Zap } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleListHub from '../components/module/ModuleListHub.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { navigationOptionsForFinding, resolveFinanceTab } from '../utils/commercialNavigation';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { aggregateMissingProofTransactions, buildFinanceCoherenceRows, buildFinanceHealthSnapshot } from './finance/financeVisionHelpers.js';
import { rowsOf, allRows } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
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
import FinanceHeyHorizonStrip from './finance/FinanceHeyHorizonStrip.jsx';
import {
  buildFinanceSchedule,
  buildOfficialTreasuryView,
  buildProfitabilityView,
  isFinanceStartupMode,
  TREASURY_LABELS,
} from '../utils/financePilotageCore.js';
import FinanceDemoBanner from './finance/FinanceDemoBanner.jsx';
import FinanceDataQualityPanel from './finance/FinanceDataQualityPanel.jsx';
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
  buildFinanceHeyHorizonQuestionsV3,
  buildFinancingSimulator,
  buildFinancingViewV3,
  readFinanceSimulatorParams,
} from '../utils/financePilotageV3.js';

const arr = (v) => Array.isArray(v) ? v : [];
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.valeur ?? r.value);
const isIncome = (r = {}) => ['entree', 'entrée', 'income', 'recette', 'vente'].includes(low(r.type || r.nature || r.sens || r.transaction_type));
const isExpense = (r = {}) => ['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(low(r.type || r.nature || r.sens || r.transaction_type));
const isUnpaid = (r = {}) => ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(low(r.statut || r.status || r.payment_status));
const isReceivable = (r = {}) => isUnpaid(r) && (['vente', 'client', 'recette'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.client_id);
const isSalesLikeReceivable = (r = {}) => ['vente', 'ventes', 'client', 'clients'].some((key) => low(`${r.categorie || ''} ${r.module_lie || ''} ${r.source_module || ''} ${r.libelle || ''}`).includes(key)) || r.client_id || r.order_id || r.sale_id;
const isPayable = (r = {}) => isUnpaid(r) && (['achat', 'fournisseur', 'depense', 'dépense', 'charge'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.fournisseur_id);
const remainingOf = (order = {}, payments = []) => Math.max(0, n(order.montant_total ?? order.total ?? order.amount) - n(order.montant_paye ?? order.paid_amount) - payments.filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + n(p.montant ?? p.amount), 0));

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);

function Section({ icon: Icon, title, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="mb-4 flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</h2>{children}</section>;
}
function FinanceIaPanel({ findings = [], predictions = [], onApply, busyId, onNavigate }) {
  if (!findings.length && !predictions.length) return null;
  return (
    <Section icon={BrainCircuit} title="Signaux métier finance">
      <p className="mb-3 text-sm text-[#8a7456]">Trésorerie, preuves, créances, dettes et rentabilité croisées avec le reste de l'ERP.</p>
      <div className="space-y-2">
        {findings.slice(0, 6).map((f) => (
          <div key={f.id} className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-center sm:justify-between">
            <div><b className="text-sm text-[#2f2415]">{f.title}</b><p className="text-xs text-amber-800">{f.recommended_action || f.description}</p></div>
            <div className="flex gap-2">
              {f.module === 'commercial' ? (
                <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Clients' })} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Commercial</button>
              ) : (
                <button type="button" onClick={() => onNavigate?.('documents_rapports')} className="rounded-lg border border-[#d6c3a0] bg-white px-2 py-1 text-xs font-black">Documents</button>
              )}
              <button type="button" disabled={busyId === f.id} onClick={() => onApply?.(f)} className="rounded-lg bg-[#22c55e] px-2 py-1 text-xs font-black text-[#052e16] disabled:opacity-50">{busyId === f.id ? '…' : f.auto_action === 'create_task' ? 'Créer tâche' : f.auto_action === 'create_alert' ? 'Créer alerte' : 'Appliquer'}</button>
            </div>
          </div>
        ))}
        {predictions.slice(0, 2).map((p) => (
          <div key={p.id} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-3 text-sm"><b>{p.title}</b><p className="text-xs text-[#8a7456]">{p.description}</p></div>
        ))}
      </div>
    </Section>
  );
}
function CoherencePanel({ rows = [], onApply, busyId, setTab }) {
  if (!rows.length) return null;
  return (
    <Section icon={Zap} title="Incohérences à traiter">
      {rows.slice(0, 8).map((row) => (
        <div key={row.id} className="flex flex-col gap-2 border-b border-[#eadcc2]/70 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={() => setTab(row.type === 'creance' ? 'Créances' : 'Trésorerie')} className="text-left"><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{row.detail}</p></button>
          <button type="button" disabled={busyId === row.id} onClick={() => row.finding && onApply?.(row.finding)} className="rounded-lg border border-emerald-300 px-2 py-1 text-xs font-black text-emerald-700 disabled:opacity-50">{busyId === row.id ? '…' : 'Corriger'}</button>
        </div>
      ))}
    </Section>
  );
}
function MissingProofPanel({ items = [], setTab }) {
  if (!items.length) return null;
  return (
    <Section icon={Wallet} title="Transactions sans justificatif">
      {items.slice(0, 6).map((row) => (
        <button key={row.id} type="button" onClick={() => setTab('Trésorerie')} className="flex w-full items-center justify-between border-b border-[#eadcc2]/70 py-3 text-left last:border-b-0 hover:bg-[#fffdf8]">
          <span><b className="text-[#2f2415]">{row.title}</b><p className="text-xs text-[#8a7456]">{String(row.date || '—').slice(0, 10)}</p></span>
          <span className="text-sm font-black text-amber-700">{fmtCurrency(row.amount)}</span>
        </button>
      ))}
    </Section>
  );
}
function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="finance_pilotage" active={active} onChange={onChange} />;
}
function CreancesPanel({ data, onNavigate }) {
  return (
    <ModuleListHub
      title="Créances clients"
      intro="Ventes et encaissements restants à recouvrer."
      stats={[
        { label: 'Créances', value: fmtNumber(data.receivables.length), tone: data.receivables.length ? 'warn' : 'good' },
        { label: 'Montant', value: fmtCurrency(data.receivableAmount), tone: 'warn' },
        { label: 'Clients', value: fmtNumber(data.clients.length) },
        { label: 'Impayés finance', value: fmtNumber(data.unpaidTx.length), tone: data.unpaidTx.length ? 'warn' : 'good' },
      ]}
      rows={data.receivables.map((row) => ({
        id: row.id || row.title,
        title: row.title,
        detail: row.detail,
        value: fmtCurrency(row.amount),
        onClick: () => onNavigate?.('commercial', { tab: 'Clients' }),
      }))}
      emptyLabel="Aucune créance ouverte."
      onNavigate={onNavigate}
    />
  );
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
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <h2 className="text-lg font-black text-[#2f2415]">Rentabilité</h2>
        <p className="mt-2">{profitability?.message || 'Rentabilité non encore calculable : certaines données de coûts ou de ventes sont manquantes.'}</p>
      </section>
    );
  }
  const { profit, activityBreakdown, marginRate } = profitability;
  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="text-lg font-black text-[#2f2415]">Rentabilité par activité</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Résultat opérationnel" value={fmtCurrency(profit.operatingResult)} tone={profit.operatingResult >= 0 ? 'good' : 'bad'} />
          <Stat label="Aviculture" value={fmtCurrency(activityBreakdown.aviculture)} />
          <Stat label="Bovins / animaux" value={fmtCurrency(activityBreakdown.bovins)} />
          <Stat label="Cultures" value={fmtCurrency(activityBreakdown.cultures)} />
          <Stat label="CA commercial" value={fmtCurrency(activityBreakdown.commercial)} tone="good" />
          <Stat label="Marge brute activités" value={fmtCurrency(profit.grossActivityMargin)} tone={profit.grossActivityMargin >= 0 ? 'good' : 'bad'} />
          <Stat label="Taux résultat opérationnel" value={marginRate != null ? `${marginRate} %` : '—'} />
          <Stat label="Charges structure" value={fmtCurrency(profit.structureCharges)} tone="warn" />
        </div>
      </section>
      <ProfitabilityStatement {...consolidationProps} />
    </div>
  );
}
function Summary({
  data,
  setTab,
  onApply,
  busyId,
  onNavigate,
  startupMode = false,
  executiveSituation = null,
  financeAlerts = [],
  multiFarm = null,
  startupJourney = null,
  heyHorizonQuestions = [],
  exportPayload = null,
  directExports = null,
  dataQuality = null,
  financeDemo = null,
  onOpenAssistant,
}) {
  return (
    <div className="space-y-5">
      <FinanceDemoBanner demo={financeDemo} />
      <FinanceExecutiveSituationPanel situation={executiveSituation} onNavigateTab={setTab} />
      <FinanceDataQualityPanel dataQuality={dataQuality} onNavigateTab={setTab} />
      <FinanceAlertsPanel alerts={financeAlerts} onNavigateTab={setTab} insufficientData={startupMode} />
      <FinanceMultiFarmPanel multiFarm={multiFarm} />
      {startupMode ? <FinanceStartupPanel journey={startupJourney} onNavigate={onNavigate} setTab={setTab} /> : null}
      <FinanceHeyHorizonStrip questions={heyHorizonQuestions} onNavigate={onNavigate} onOpenAssistant={onOpenAssistant} insufficientData={startupMode} />
      <FinanceExportsPanel exportPayload={directExports || exportPayload} directOnly />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-8">
        <Stat label="Santé finance" value={formatFinanceHealthScore({ score: data.healthScore, insufficientData: data.healthInsufficient })} tone={financeHealthTone({ score: data.healthScore, insufficientData: data.healthInsufficient })} />
        <Stat label={TREASURY_LABELS.treasuryAvailable} value={fmtCurrency(data.treasuryAvailable)} tone={data.treasuryAvailable >= 0 ? 'good' : 'bad'} />
        <Stat label={TREASURY_LABELS.receivables} value={fmtCurrency(data.receivableAmount)} tone={data.receivableAmount ? 'warn' : 'good'} />
        <Stat label={TREASURY_LABELS.payables} value={fmtCurrency(data.payableAmount)} tone={data.payableAmount ? 'warn' : 'good'} />
        <Stat label={TREASURY_LABELS.netPosition} value={fmtCurrency(data.netPosition)} tone={data.netPosition >= 0 ? 'good' : 'bad'} />
        <Stat label={TREASURY_LABELS.realMargin} value={fmtCurrency(data.realMargin)} tone={data.realMargin >= 0 ? 'good' : 'bad'} />
        <Stat label="Sans preuve" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} />
        <Stat label="Signaux métier" value={data.healthInsufficient ? 'En attente' : fmtNumber(data.healthFindings.length)} tone={data.healthInsufficient ? 'neutral' : data.healthFindings.length ? 'warn' : 'good'} />
      </div>
      <FinanceIaPanel findings={data.healthFindings} predictions={data.healthPredictions} onApply={onApply} busyId={busyId} onNavigate={onNavigate} />
      <MissingProofPanel items={data.missingProofItems} setTab={setTab} />
      <CoherencePanel rows={data.coherenceRows} onApply={onApply} busyId={busyId} setTab={setTab} />
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><BarChart3 size={20} /> Workflows financiers récupérés</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#8a7456]">Finance & Pilotage remet les anciens moteurs : saisie finance Hey Horizon, trésorerie, santé comptable, preuves, business plan, paiement d'investissement, création d'actifs, documents et événements métier.</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <button type="button" onClick={() => { emitHorizonForm('finances', 'finance_entry', 'Nouvelle écriture', { date: new Date().toISOString().slice(0, 10) }); setTab('Trésorerie'); }} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Écriture</b><p className="mt-1 text-sm text-[#8a7456]">Recette ou dépense avec preuve.</p></button>
          <button type="button" onClick={() => setTab('Trésorerie')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Trésorerie</b><p className="mt-1 text-sm text-[#8a7456]">Recettes, dépenses, preuves.</p></button>
          <button type="button" onClick={() => setTab('Créances')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Créances</b><p className="mt-1 text-sm text-[#8a7456]">Restes à encaisser.</p></button>
          <button type="button" onClick={() => setTab('Dettes')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Dettes</b><p className="mt-1 text-sm text-[#8a7456]">Charges à payer.</p></button>
          <button type="button" onClick={() => setTab('Échéancier')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Échéancier</b><p className="mt-1 text-sm text-[#8a7456]">Encaissements et paiements à venir.</p></button>
          <button type="button" onClick={() => setTab('Investissements')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Investissements</b><p className="mt-1 text-sm text-[#8a7456]">Budget et actifs.</p></button>
          <button type="button" onClick={() => setTab('Rentabilité')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Rentabilité</b><p className="mt-1 text-sm text-[#8a7456]">Marges et alertes ERP.</p></button>
        </div>
      </section>
    </div>
  );
}

export default function FinancePilotageRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveFinanceTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);
  const [simulatorParams, setSimulatorParams] = useState(() => readFinanceSimulatorParams());

  useEffect(() => {
    if (props.initialTab) setTab(resolveFinanceTab(props.initialTab));
  }, [props.initialTab]);
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
  const investments = rowsOf(props.investissements, investmentsCrud, periodFiltered);
  const businessPlans = rowsOf(props.businessPlans, businessPlansCrud, periodFiltered);
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
    transactionsAll: transactions,
    salesOrdersAll: salesOrdersAll.length ? salesOrdersAll : salesOrders,
    paymentsAll: paymentsAll.length ? paymentsAll : payments,
  }), [transactions, salesOrders, salesOrdersAll, payments, paymentsAll, animaux, lots, cultures, stocks, stockMovements, sante, alimentationLogs, productionLogs, suppliers, investments, businessEvents]);

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
        detail: `${item.order?.date || item.order?.created_at || '—'} · commande`,
        amount: n(item.remaining),
      }));
    const txReceivables = transactions
      .filter(isReceivable)
      .filter((row) => !isSalesLikeReceivable(row))
      .map((row) => ({
        id: row.id,
        title: row.libelle || row.title || 'Créance',
        detail: `${row.date || row.created_at || '—'} · finance`,
        amount: amount(row),
      }));
    const receivables = [...orderReceivables, ...txReceivables];
    const supplierDebt = n(consolidated.dettesFournisseurs);
    const txPayables = transactions.filter(isPayable).map((row) => ({
      id: row.id,
      title: row.libelle || row.title || 'Dette',
      detail: `${row.date || row.created_at || '—'} · charge à payer`,
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
  const heyHorizonQuestions = useMemo(
    () => buildFinanceHeyHorizonQuestionsV3(v2Options),
    [v2Options],
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
        if (target.module === 'finance_pilotage') setTab(target.tab || 'Trésorerie');
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
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Pilotage</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Finance & Pilotage</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Trésorerie, créances, dettes — signaux métier, preuves et rentabilité.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé </span><b className={data.healthInsufficient ? 'text-[#8a7456]' : data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{formatFinanceHealthScore({ score: data.healthScore, insufficientData: data.healthInsufficient })}</b></div>
        </div>
      </section>
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Résumé' ? (
        <Summary
          data={data}
          setTab={setTab}
          onApply={applyFinding}
          busyId={busyId}
          onNavigate={props.onNavigate}
          startupMode={startupMode}
          executiveSituation={executiveSituation}
          financeAlerts={financeAlerts}
          multiFarm={multiFarm}
          startupJourney={startupJourney}
          heyHorizonQuestions={heyHorizonQuestions}
          exportPayload={exportPayload}
          directExports={directExports}
          dataQuality={dataQuality}
          financeDemo={financeDemo}
          onOpenAssistant={props.onOpenAssistant}
        />
      ) : tab === 'Trésorerie' ? (
        <FinancesV12 {...financeProps} />
      ) : tab === 'Créances' ? (
        <CreancesPanel data={data} onNavigate={props.onNavigate} />
      ) : tab === 'Dettes' ? (
        <DettesPanel data={data} onNavigate={props.onNavigate} />
      ) : tab === 'Échéancier' ? (
        <div className="space-y-5">
          <FinanceSchedulePanel schedule={schedule} showFarm={showFarmInSchedule} />
          <FinanceAgingPanel receivablesAging={receivablesAging} payablesAging={payablesAging} showFarm={showFarmInSchedule} />
          <FinanceCashFlowForecastPanel forecast={cashFlowForecast} />
        </div>
      ) : tab === 'Financement' ? (
        <div className="space-y-5">
          <FinanceDemoBanner demo={financeDemo} />
          <FinanceFinancingPanel
            financing={financingView}
            simulator={financingSimulator}
            directExports={directExports}
            onNavigate={props.onNavigate}
            onSimulatorParamsChange={setSimulatorParams}
          />
        </div>
      ) : tab === 'Réconciliation' ? (
        <FinanceReconciliationPanel
          reconciliationView={reconciliationView}
          transactions={transactions}
          payments={paymentsAll.length ? paymentsAll : payments}
          salesOrders={salesOrdersAll.length ? salesOrdersAll : salesOrders}
          stocks={stocks}
          onCreateFinanceTransaction={props.onCreateFinanceTransaction || financesCrud.create}
          onRefreshFinances={props.onRefreshFinances || financesCrud.refresh}
          onNavigate={props.onNavigate}
          setTab={setTab}
        />
      ) : tab === 'Investissements' ? (
        <InvestissementsV9 {...investmentProps} />
      ) : tab === 'Rentabilité' ? (
        <RentabilitePanel profitability={profitability} consolidationProps={consolidationProps} />
      ) : tab === 'Annexe' ? (
        <FinanceAnnexePanel documents={financeProps.documents} onNavigate={props.onNavigate} />
      ) : tab === 'Graphiques' ? (
        <ModuleGraphiquesTab moduleId="finance_pilotage" transactions={transactions} payments={payments} salesOrders={salesOrders} investissements={investments} businessPlans={businessPlans} onNavigate={props.onNavigate} />
      ) : (
        <Summary
          data={data}
          setTab={setTab}
          onApply={applyFinding}
          busyId={busyId}
          onNavigate={props.onNavigate}
          startupMode={startupMode}
          executiveSituation={executiveSituation}
          financeAlerts={financeAlerts}
          multiFarm={multiFarm}
          startupJourney={startupJourney}
          heyHorizonQuestions={heyHorizonQuestions}
          exportPayload={exportPayload}
          directExports={directExports}
          dataQuality={dataQuality}
          financeDemo={financeDemo}
          onOpenAssistant={props.onOpenAssistant}
        />
      )}
    </div>
  );
}
