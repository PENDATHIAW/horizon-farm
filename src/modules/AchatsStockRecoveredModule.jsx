import { PackageCheck, ShoppingBag, Warehouse } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleAnnexeTab from '../components/module/ModuleAnnexeTab.jsx';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { emitHorizonForm } from '../services/formModalManager';
import { applyOneClickRecommendation, createSupplierFollowUpTask } from '../services/heyHorizonRecommendationActions.js';
import { resolveAchatsStockTab, navigateForIaFinding } from '../utils/commercialNavigation';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import AchatsStockInsightPanel from './achatsStock/AchatsStockInsightPanel.jsx';
import AchatsStockLowStockPanel from './achatsStock/AchatsStockLowStockPanel.jsx';
import AchatsStockMovementsPanel from './achatsStock/AchatsStockMovementsPanel.jsx';
import AchatsStockPurchasesPanel from './achatsStock/AchatsStockPurchasesPanel.jsx';
import AchatsStockSupplierDebtsPanel from './achatsStock/AchatsStockSupplierDebtsPanel.jsx';
import { buildAchatsStockSummaryTodos, uniqueTodoCount } from './achatsStock/achatsStockMetrics.js';
import StockProductionSourcesPanel from './achatsStock/StockProductionSourcesPanel.jsx';
import {
  ACHATS_STOCK_ACTION_GRID,
  ACHATS_STOCK_STAT_GRID,
  AchatsStockActionCard,
  AchatsStockKpi,
  AchatsStockSection,
  AchatsStockTodoRow,
} from './achatsStock/achatsStockUi.jsx';
import { aggregateSupplierDebts, buildAchatsStockCoherenceRows, buildAchatsStockHealthSnapshot } from './achatsStock/achatsStockVisionHelpers.js';
import FournisseursReadable from './FournisseursReadable';
import StocksV5 from './StocksV5';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const valueOf = (r = {}) => qty(r) * n(r.prix_unitaire ?? r.unit_price ?? r.price ?? r.cout_unitaire);
const isFeed = (r = {}) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(low(`${r.produit || r.name || r.nom || ''} ${r.categorie || r.category || ''}`));
const isPurchaseTx = (r = {}) => /achat|stock|fournisseur|approvisionnement|reception|réception/.test(low(`${r.type || ''} ${r.categorie || ''} ${r.category || ''} ${r.libelle || ''} ${r.title || ''} ${r.module_lie || ''} ${r.source_module || ''}`));
const supplierDebt = (r = {}) => n(r.dettes ?? r.dette ?? r.solde ?? r.balance ?? r.reste_a_payer);

function Summary({ data, setTab, onApply, onRelance, busyId, onNavigate }) {
  const todos = buildAchatsStockSummaryTodos(data).slice(0, 6);
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-5">
      <AchatsStockSection
        title="Parcours achats & stock"
        subtitle="Réception sur Stock · dettes sur Fournisseurs · achats finance sur Achats · distributions aliment sur Élevage → Alimentation."
      >
        <div className={ACHATS_STOCK_ACTION_GRID}>
          <AchatsStockActionCard
            icon={Warehouse}
            title="+ Achat stock"
            text="Réception, fournisseur, impact finance."
            onClick={() => {
              emitHorizonForm('stock', 'stock_purchase', 'Réception stock', { date: today });
              setTab('Stock');
            }}
          />
          <AchatsStockActionCard
            icon={PackageCheck}
            title="Stock & seuils"
            text={`${data.lowStock.length} produit(s) sous seuil.`}
            onClick={() => setTab('Stock')}
          />
          <AchatsStockActionCard
            icon={ShoppingBag}
            title="Achats finance"
            text={`${data.purchasesWithoutStock.length} sans entrée stock.`}
            onClick={() => setTab('Achats')}
          />
          <AchatsStockActionCard
            title="Fournisseurs & dettes"
            text={`${fmtCurrency(data.debt)} à planifier.`}
            onClick={() => setTab('Fournisseurs')}
          />
        </div>
      </AchatsStockSection>

      <div className={ACHATS_STOCK_STAT_GRID}>
        <AchatsStockKpi label="Santé stock" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} />
        <AchatsStockKpi label="Valeur stock" value={fmtCurrency(data.stockValue)} onClick={() => setTab('Graphiques')} />
        <AchatsStockKpi label="Sous seuil" value={fmtNumber(data.lowStock.length)} tone={data.lowStock.length ? 'warn' : 'good'} onClick={() => setTab('Stock')} />
        <AchatsStockKpi label="Dettes fournisseurs" value={fmtCurrency(data.debt)} tone={data.debt ? 'warn' : 'good'} onClick={() => setTab('Fournisseurs')} />
      </div>

      <section className="rounded-2xl border border-[#d6c3a0] bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-black text-[#2f2415]">À traiter aujourd&apos;hui</h2>
            <p className="text-[11px] text-[#8a7456]">Réappro, entrées stock manquantes, dettes fournisseurs.</p>
          </div>
          {data.todoCount > 0 ? (
            <button type="button" onClick={() => setTab(todos[0]?.tab || 'Stock')} className="text-xs font-black text-[#9a6b12]">
              Voir →
            </button>
          ) : null}
        </div>
        {todos.length ? (
          <div className="divide-y divide-[#eadcc2]/60">
            {todos.map((row) => (
              <AchatsStockTodoRow
                key={row.id}
                title={row.title}
                detail={row.detail}
                actionLabel={row.actionType === 'relance' ? 'Tâche paiement' : 'Ouvrir'}
                busy={row.actionType === 'relance' && busyId === (row.supplier?.id || row.supplier?.name)}
                onOpen={() => setTab(row.tab)}
                onAction={() => {
                  if (row.actionType === 'relance') onRelance?.(row.supplier);
                  else setTab(row.tab);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
            Stock, achats et fournisseurs sont à jour.
          </div>
        )}
      </section>

      <AchatsStockInsightPanel
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

function StockTab({ stockProps, lowStock }) {
  return (
    <div className="space-y-4">
      <StockProductionSourcesPanel rows={stockProps.rows || []} onNavigate={stockProps.onNavigate} />
      {lowStock.length ? <AchatsStockLowStockPanel items={lowStock} /> : null}
      <StocksV5 {...stockProps} />
    </div>
  );
}

function FournisseursTab({ supplierProps, supplierDebts, onRelance, busyId }) {
  return (
    <div className="space-y-4">
      <AchatsStockSupplierDebtsPanel suppliers={supplierDebts} onRelance={onRelance} busyId={busyId} />
      <FournisseursReadable {...supplierProps} />
    </div>
  );
}

export default function AchatsStockRecoveredModule(props) {
  const [tab, setTab] = useState(() => resolveAchatsStockTab(props.initialTab));
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    if (props.initialTab) setTab(resolveAchatsStockTab(props.initialTab));
  }, [props.initialTab]);

  const stockCrud = useCrudModule('stock');
  const culturesCrud = useCrudModule('cultures');
  const suppliersCrud = useCrudModule('fournisseurs');
  const financesCrud = useCrudModule('finances');
  const feedCrud = useCrudModule('alimentation_logs');
  const eventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const documentsCrud = useCrudModule('documents');
  const periodFiltered = Boolean(props.periodFiltered);
  const stocks = rowsOf(props.stocks || props.rows, stockCrud, false);
  const suppliers = rowsOf(props.fournisseurs || props.suppliers, suppliersCrud, false);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const feedLogs = rowsOf(props.alimentationLogs, feedCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);

  const data = useMemo(() => {
    const purchases = transactions.filter(isPurchaseTx);
    const stockEvents = businessEvents.filter((r) => /stock|aliment|mouvement|reception|réception/.test(low(`${r.event_type || ''} ${r.title || ''} ${r.module_source || ''}`)));
    const lowStock = stocks.filter((r) => threshold(r) > 0 && qty(r) <= threshold(r));
    const purchasesWithoutStock = purchases.filter(
      (trx) => !stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) && trx.stock_impact !== true && n(trx.montant ?? trx.amount) > 0,
    );
    const healthSnap = buildAchatsStockHealthSnapshot({ stocks, suppliers, transactions, feedLogs });
    const coherenceRows = buildAchatsStockCoherenceRows(stocks, transactions, suppliers, arr(props.lots), arr(props.animaux), cultures);
    const supplierDebts = aggregateSupplierDebts(suppliers);
    const summaryTodos = buildAchatsStockSummaryTodos({ lowStock, purchasesWithoutStock, supplierDebts });
    return {
      stocks,
      suppliers,
      feedLogs,
      stockEvents,
      stockValue: stocks.reduce((s, r) => s + valueOf(r), 0),
      lowStock,
      feedStocks: stocks.filter(isFeed),
      purchases,
      purchaseAmount: purchases.reduce((s, r) => s + n(r.montant ?? r.amount), 0),
      purchasesWithoutStock,
      debt: suppliers.reduce((s, r) => s + supplierDebt(r), 0),
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      healthPredictions: healthSnap.predictions,
      coherenceRows,
      supplierDebts,
      todoCount: uniqueTodoCount(summaryTodos),
    };
  }, [stocks, suppliers, transactions, feedLogs, businessEvents]);

  const tabBadges = useMemo(
    () => ({
      Stock: data.lowStock.length || undefined,
      Achats: data.purchasesWithoutStock.length || undefined,
      Fournisseurs: data.supplierDebts.length || undefined,
    }),
    [data.lowStock.length, data.purchasesWithoutStock.length, data.supplierDebts.length],
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
        navigateForIaFinding(finding, props.onNavigate);
        setTab(resolveAchatsStockTab(finding.tab || 'Stock'));
      }
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const relanceSupplier = async (supplier) => {
    setBusyId(supplier.id || supplier.name);
    try {
      await createSupplierFollowUpTask({
        supplierName: supplier.name,
        amount: fmtCurrency(supplier.total),
        supplierId: supplier.id,
        handlers: actionHandlers,
      });
      toast.success(`Tâche paiement créée pour ${supplier.name}`);
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const stockProps = {
    rows: stocks,
    alimentationLogs: feedLogs,
    animaux: arr(props.animaux),
    lots: arr(props.lots),
    cultures,
    fournisseurs: suppliers,
    opportunities: rowsOf(props.opportunities, opportunitiesCrud, periodFiltered),
    taches: rowsOf(props.taches, tasksCrud, false),
    onCreate: props.onCreateStock || stockCrud.create,
    onUpdate: props.onUpdateStock || stockCrud.update,
    onDelete: props.onDeleteStock || stockCrud.remove,
    onRefresh: props.onRefreshStock || stockCrud.refresh,
    onCreateAlimentation: props.onCreateAlimentation || feedCrud.create,
    onUpdateAlimentation: props.onUpdateAlimentation || feedCrud.update,
    onDeleteAlimentation: props.onDeleteAlimentation || feedCrud.remove,
    onRefreshAlimentation: props.onRefreshAlimentation || feedCrud.refresh,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onRefreshFinances: props.onRefreshFinances || financesCrud.refresh,
    onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create,
    onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update,
    onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  };

  const supplierProps = {
    rows: suppliers,
    stocks,
    tasks: rowsOf(props.tasks, tasksCrud, false),
    transactions,
    finances: transactions,
    documents: rowsOf(props.documents, documentsCrud, periodFiltered),
    onCreate: props.onCreateSupplier || suppliersCrud.create,
    onUpdate: props.onUpdateSupplier || suppliersCrud.update,
    onDelete: props.onDeleteSupplier || suppliersCrud.remove,
    onRefresh: props.onRefreshSuppliers || suppliersCrud.refresh,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onRefreshStock: props.onRefreshStock || stockCrud.refresh,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onNavigate: props.onNavigate,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Achats & Stock</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Approvisionnement, inventaire, fournisseurs — signaux IA légers, détail sur chaque onglet.</p>
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
            {data.lowStock.length > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                {data.lowStock.length} sous seuil
              </span>
            ) : null}
            {data.debt > 0 ? (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">
                Dettes {fmtCurrency(data.debt)}
              </span>
            ) : null}
          </div>
        </div>
      </section>

      <ModuleTabsBar moduleId="achats_stock" active={tab} onChange={setTab} tabBadges={tabBadges} wrap />

      {tab === 'Résumé' ? (
        <Summary data={data} setTab={setTab} onApply={applyFinding} onRelance={relanceSupplier} busyId={busyId} onNavigate={props.onNavigate} />
      ) : tab === 'Stock' ? (
        <StockTab stockProps={stockProps} lowStock={data.lowStock} />
      ) : tab === 'Achats' ? (
        <AchatsStockPurchasesPanel data={data} setTab={setTab} onNavigate={props.onNavigate} />
      ) : tab === 'Fournisseurs' ? (
        <FournisseursTab supplierProps={supplierProps} supplierDebts={data.supplierDebts} onRelance={relanceSupplier} busyId={busyId} />
      ) : tab === 'Mouvements' ? (
        <AchatsStockMovementsPanel data={data} onNavigate={props.onNavigate} setTab={setTab} />
      ) : tab === 'Annexe' ? (
        <ModuleAnnexeTab moduleId="achats_stock" dataMap={{ stock: stocks, alimentation_logs: feedLogs, fournisseurs: suppliers }} onNavigate={props.onNavigate} />
      ) : (
        <ModuleGraphiquesTab moduleId="achats_stock" periodFiltered={periodFiltered} stocks={stocks} alimentationLogs={feedLogs} fournisseurs={suppliers} transactions={transactions} onNavigate={props.onNavigate} />
      )}
    </div>
  );
}
