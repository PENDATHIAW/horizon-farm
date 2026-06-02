import { PiggyBank, Scale, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation } from '../services/heyHorizonRecommendationActions.js';
import { auditFinanceReconciliation } from '../services/financeReconciliationService.js';
import { navigationOptionsForFinding, resolveFinanceTab } from '../utils/commercialNavigation';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { rowsOf, allRows } from '../utils/moduleRows';
import FinanceCreancesPanel from './finance/FinanceCreancesPanel.jsx';
import FinanceDettesPanel from './finance/FinanceDettesPanel.jsx';
import FinanceInsightPanel from './finance/FinanceInsightPanel.jsx';
import FinanceMissingProofPanel from './finance/FinanceMissingProofPanel.jsx';
import FinanceRentabilitePanel from './finance/FinanceRentabilitePanel.jsx';
import { buildFinanceSummaryTodos, uniqueTodoCount } from './finance/financeMetrics.js';
import {
  FINANCE_ACTION_GRID,
  FINANCE_STAT_GRID,
  FinanceActionCard,
  FinanceKpi,
  FinanceSection,
  FinanceTodoRow,
} from './finance/financeUi.jsx';
import { aggregateMissingProofTransactions, buildFinanceCoherenceRows, buildFinanceHealthSnapshot } from './finance/financeVisionHelpers.js';
import FinanceReconciliationPanel from './FinanceReconciliationPanel.jsx';
import FinancesV12 from './FinancesV12';
import InvestissementsV9 from './InvestissementsV9';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const amount = (r = {}) => n(r.montant ?? r.amount ?? r.total ?? r.valeur ?? r.value);
const isIncome = (r = {}) => ['entree', 'entrée', 'income', 'recette', 'vente'].includes(low(r.type || r.nature || r.sens || r.transaction_type));
const isExpense = (r = {}) => ['sortie', 'expense', 'depense', 'dépense', 'achat', 'charge'].includes(low(r.type || r.nature || r.sens || r.transaction_type));
const isUnpaid = (r = {}) => ['impaye', 'impayé', 'partiel', 'a_payer', 'à payer', 'due', 'unpaid'].includes(low(r.statut || r.status || r.payment_status));
const isReceivable = (r = {}) => isUnpaid(r) && (['vente', 'client', 'recette'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.client_id);
const isPayable = (r = {}) => isUnpaid(r) && (['achat', 'fournisseur', 'depense', 'dépense', 'charge'].some((x) => low(`${r.type || ''} ${r.categorie || ''} ${r.libelle || ''}`).includes(x)) || r.fournisseur_id);
const hasProof = (r = {}) => Boolean(r.document_id || r.proof_url || r.justificatif_id || r.file_url || r.url);
const remainingOf = (order = {}, payments = []) =>
  Math.max(0, n(order.montant_total ?? order.total ?? order.amount) - n(order.montant_paye ?? order.paid_amount) - payments.filter((p) => String(p.order_id || p.sale_id) === String(order.id)).reduce((s, p) => s + n(p.montant ?? p.amount), 0));

function Summary({ data, setTab, onApply, busyId, onNavigate }) {
  const todos = buildFinanceSummaryTodos(data).slice(0, 6);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <FinanceSection
        title="Parcours finance & pilotage"
        subtitle="Écritures sur Trésorerie · encaissements sur Commercial → Ventes · dettes sur Achats & Stock → Fournisseurs · rentabilité sur Centre décisionnel."
      >
        <div className={FINANCE_ACTION_GRID}>
          <FinanceActionCard
            icon={Wallet}
            title="+ Écriture"
            text="Recette ou dépense avec preuve."
            onClick={() => {
              emitHorizonForm('finances', 'finance_entry', 'Nouvelle écriture', { date: today });
              setTab('Trésorerie');
            }}
          />
          <FinanceActionCard
            icon={Scale}
            title="Trésorerie"
            text={`${data.missingProof} sans justificatif.`}
            onClick={() => setTab('Trésorerie')}
          />
          <FinanceActionCard
            title="Créances"
            text={`${fmtCurrency(data.receivableAmount)} à encaisser.`}
            onClick={() => setTab('Créances')}
          />
          <FinanceActionCard
            icon={PiggyBank}
            title="Dettes"
            text={`${fmtCurrency(data.payableAmount)} à payer.`}
            onClick={() => setTab('Dettes')}
          />
          <FinanceActionCard
            icon={TrendingUp}
            title="Rentabilité"
            text={`Marge ${fmtCurrency(data.margin)}.`}
            onClick={() => setTab('Rentabilité')}
          />
          <FinanceActionCard
            title="Rapprochement"
            text={`${data.reconciliationGaps} écart(s) paiements.`}
            onClick={() => setTab('Rapprochement')}
          />
        </div>
      </FinanceSection>

      <div className={FINANCE_STAT_GRID}>
        <FinanceKpi label="Santé finance" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <FinanceKpi label="Solde" value={fmtCurrency(data.balance)} tone={data.balance >= 0 ? 'good' : 'bad'} onClick={() => setTab('Graphiques')} />
        <FinanceKpi label="Créances" value={fmtCurrency(data.receivableAmount)} tone={data.receivableAmount ? 'warn' : 'good'} onClick={() => setTab('Créances')} />
        <FinanceKpi label="Sans preuve" value={fmtNumber(data.missingProof)} tone={data.missingProof ? 'warn' : 'good'} onClick={() => setTab('Trésorerie')} />
      </div>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-[#2f2415]">À traiter aujourd&apos;hui</h2>
            <p className="text-[11px] text-[#8a7456]">Encaissements, paiements, justificatifs — actions directes.</p>
          </div>
          {data.todoCount > 0 ? (
            <button type="button" onClick={() => setTab(todos[0]?.tab || 'Trésorerie')} className="text-xs font-black text-[#9a6b12]">
              Voir →
            </button>
          ) : null}
        </div>
        {todos.length ? (
          <div className="divide-y divide-[#eadcc2]/60">
            {todos.map((row) => (
              <FinanceTodoRow
                key={row.id}
                title={row.title}
                detail={row.detail}
                actionLabel={row.actionTab ? 'Module lié' : 'Ouvrir'}
                onOpen={() => setTab(row.tab)}
                onAction={() => {
                  if (row.actionTab === 'commercial') onNavigate?.('commercial', { tab: row.commercialTab || 'Ventes' });
                  else if (row.actionTab === 'achats_stock') onNavigate?.('achats_stock', { tab: row.achatsTab || 'Fournisseurs' });
                  else setTab(row.tab);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
            Trésorerie, preuves et créances sont à jour.
          </div>
        )}
      </section>

      <FinanceInsightPanel
        findings={data.healthFindings}
        predictions={data.healthPredictions}
        coherenceRows={data.coherenceRows}
        onApplyFinding={onApply}
        onNavigate={onNavigate}
        setTab={setTab}
        busyId={busyId}
      />
    </div>
  );
}

function TresorerieTab({ financeProps, missingProofItems }) {
  return (
    <div className="space-y-4">
      {missingProofItems.length ? <FinanceMissingProofPanel items={missingProofItems} /> : null}
      <FinancesV12 {...financeProps} />
    </div>
  );
}

export default function FinancePilotageRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveFinanceTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);

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
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const periodFiltered = Boolean(props.periodFiltered);
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

  const data = useMemo(() => {
    const income = transactions.filter(isIncome).reduce((s, r) => s + amount(r), 0);
    const expenses = transactions.filter((r) => isExpense(r) || (!isIncome(r) && amount(r) > 0)).reduce((s, r) => s + amount(r), 0);
    const unpaidTx = transactions.filter(isUnpaid);
    const missingProofItems = aggregateMissingProofTransactions(transactions);
    const snapshotOrders = salesOrdersAll.length ? salesOrdersAll : salesOrders;
    const snapshotPayments = paymentsAll.length ? paymentsAll : payments;
    const orderReceivables = snapshotOrders
      .map((order) => ({
        id: order.id,
        title: order.client_nom || order.customer_name || 'Vente',
        detail: `${order.date || order.created_at || '—'} · commande`,
        amount: remainingOf(order, snapshotPayments),
      }))
      .filter((row) => row.amount > 0);
    const txReceivables = transactions
      .filter(isReceivable)
      .map((row) => ({
        id: row.id,
        title: row.libelle || row.title || 'Créance',
        detail: `${row.date || row.created_at || '—'} · finance`,
        amount: amount(row),
      }));
    const receivables = [...orderReceivables, ...txReceivables];
    const supplierDebt = suppliers.reduce((s, r) => s + n(r.dettes ?? r.dette ?? r.solde ?? r.balance), 0);
    const txPayables = transactions
      .filter(isPayable)
      .map((row) => ({
        id: row.id,
        title: row.libelle || row.title || 'Dette',
        detail: `${row.date || row.created_at || '—'} · finance`,
        amount: amount(row),
      }));
    const supplierPayables = suppliers
      .filter((r) => n(r.dettes ?? r.dette ?? r.solde) > 0)
      .map((r) => ({
        id: r.id,
        title: r.nom || r.name || 'Fournisseur',
        detail: 'Dette fournisseur',
        amount: n(r.dettes ?? r.dette ?? r.solde),
      }));
    const payables = [...txPayables, ...supplierPayables];
    const healthSnap = buildFinanceHealthSnapshot({
      transactions,
      salesOrders: snapshotOrders,
      payments: snapshotPayments,
      investments,
      stocks: rowsOf(props.stocks, stockCrud, false),
    });
    const coherenceRows = buildFinanceCoherenceRows(transactions, snapshotOrders, snapshotPayments, tasks);
    const profitAlerts = healthSnap.findings.filter(
      (f) => f.category === 'rentabilite' || /marge|rentab|charge|coût|cout/.test(low(`${f.title || ''} ${f.detail || ''}`)),
    );
    const reconciliationAudit = auditFinanceReconciliation({
      payments: snapshotPayments,
      finances: transactions,
      sales_orders: snapshotOrders,
    });
    const summaryTodos = buildFinanceSummaryTodos({ receivables, payables, missingProofItems });

    return {
      income,
      expenses,
      balance: income - expenses,
      margin: income - expenses,
      unpaidTx,
      missingProof: missingProofItems.length,
      missingProofItems,
      investments,
      clients,
      suppliers,
      receivables,
      receivableAmount: receivables.reduce((s, r) => s + r.amount, 0),
      payables,
      payableAmount: payables.reduce((s, r) => s + r.amount, 0) + supplierDebt,
      supplierDebt,
      profitAlerts,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      reconciliationGaps: reconciliationAudit.paymentGaps?.length || 0,
      todoCount: uniqueTodoCount(summaryTodos),
    };
  }, [transactions, investments, salesOrders, salesOrdersAll, payments, paymentsAll, clients, suppliers, tasks, props.stocks, stockCrud]);

  const tabBadges = useMemo(
    () => ({
      Trésorerie: data.missingProof || undefined,
      Créances: data.receivables.length || undefined,
      Dettes: data.payables.length || undefined,
      Rapprochement: data.reconciliationGaps || undefined,
      Rentabilité: data.profitAlerts.length || undefined,
    }),
    [data.missingProof, data.receivables.length, data.payables.length, data.reconciliationGaps, data.profitAlerts.length],
  );

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
      if (result.createdTasks || result.createdAlerts) toast.success('Action IA créée');
      else {
        toast.success('Module ouvert');
        const target = navigationOptionsForFinding(finding);
        if (target.module === 'finance_pilotage') setTab(target.tab || 'Trésorerie');
        else props.onNavigate?.(target.module, { tab: target.tab });
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
    payments: rowsOf(props.payments, paymentsCrud),
    fournisseurs: rowsOf(props.fournisseurs, suppliersCrud),
    clients: rowsOf(props.clients, clientsCrud),
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
    lots: rowsOf(props.lots, lotsCrud),
    animaux: rowsOf(props.animaux, animalsCrud),
    cultures: rowsOf(props.cultures, culturesCrud),
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
            <p className="mt-1 text-sm text-[#8a7456]">Trésorerie, créances, dettes — signaux IA légers, détail sur chaque onglet.</p>
            {props.periodLabel ? (
              <div className="mt-2">
                <PeriodScopeBadge label={props.periodLabel} />
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className={`rounded-full border px-3 py-1 text-xs font-black ${data.healthScore >= 75 ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              Santé {data.healthScore}/100
            </span>
            {data.receivableAmount > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                Créances {fmtCurrency(data.receivableAmount)}
              </span>
            ) : null}
            {data.missingProof > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                {data.missingProof} sans preuve
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="finance_pilotage" active={tab} onChange={setTab} tabBadges={tabBadges} wrap />

      {tab === 'Résumé' ? (
        <Summary data={data} setTab={setTab} onApply={applyFinding} busyId={busyId} onNavigate={props.onNavigate} />
      ) : tab === 'Trésorerie' ? (
        <TresorerieTab financeProps={financeProps} missingProofItems={data.missingProofItems} />
      ) : tab === 'Rapprochement' ? (
        <FinanceReconciliationPanel
          payments={payments}
          salesOrders={salesOrders}
          transactions={transactions}
          onCreateFinanceTransaction={props.onCreateFinanceTransaction || financesCrud.create}
          onRefreshFinances={props.onRefreshFinances || financesCrud.refresh}
        />
      ) : tab === 'Créances' ? (
        <FinanceCreancesPanel data={data} onNavigate={props.onNavigate} />
      ) : tab === 'Dettes' ? (
        <FinanceDettesPanel data={data} onNavigate={props.onNavigate} />
      ) : tab === 'Investissements' ? (
        <InvestissementsV9 {...investmentProps} />
      ) : tab === 'Rentabilité' ? (
        <FinanceRentabilitePanel data={data} onNavigate={props.onNavigate} setTab={setTab} />
      ) : tab === 'Annexe' ? (
        <ModuleAnnexeTab moduleId="finance_pilotage" dataMap={{ finances: transactions, payments, sales_orders: salesOrders }} onNavigate={props.onNavigate} />
      ) : (
        <ModuleGraphiquesTab
          moduleId="finance_pilotage"
          transactions={transactions}
          payments={payments}
          salesOrders={salesOrders}
          investissements={investments}
          businessPlans={businessPlans}
          onNavigate={props.onNavigate}
        />
      )}
    </div>
  );
}
