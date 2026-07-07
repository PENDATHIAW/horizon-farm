import { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';
import ModuleGraphiquesTab from '../components/module/ModuleGraphiquesTab.jsx';
import AchatsStockAnnexeTab from './achatsStock/AchatsStockAnnexeTab.jsx';
import AchatsStockStartupPanel from './achatsStock/AchatsStockStartupPanel.jsx';
import AchatsStockPurchasesPanel from './achatsStock/AchatsStockPurchasesPanel.jsx';
import AchatsStockMovementsPanel from './achatsStock/AchatsStockMovementsPanel.jsx';
import AchatsStockInsightPanel from './achatsStock/AchatsStockInsightPanel.jsx';
import AchatsStockLowStockPanel from './achatsStock/AchatsStockLowStockPanel.jsx';
import AchatsStockSupplierDebtsPanel from './achatsStock/AchatsStockSupplierDebtsPanel.jsx';
import AchatsStockExpiryPanel from './achatsStock/AchatsStockExpiryPanel.jsx';
import AchatsStockTransferPanel from './achatsStock/AchatsStockTransferPanel.jsx';
import AchatsStockDataQualityPanel from './achatsStock/AchatsStockDataQualityPanel.jsx';
import StockProductionSourcesPanel from './achatsStock/StockProductionSourcesPanel.jsx';
import StockNavigationContextBanner from './achatsStock/StockNavigationContextBanner.jsx';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import { ACHATS_STOCK_STAT_GRID, AchatsStockKpi, AchatsStockSection } from './achatsStock/achatsStockUi.jsx';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { openStockPurchaseForm } from '../utils/achatsStockFormBridge.js';
import { applyOneClickRecommendation, createSupplierFollowUpTask } from '../services/heyHorizonRecommendationActions.js';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { rowsOf } from '../utils/moduleRows';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import ModuleProjectionsStrip from '../components/module/ModuleProjectionsStrip.jsx';
import { buildStockModuleProjections } from '../utils/moduleProjections.js';
import { buildExpirySnapshot, buildExpiryLossPatch } from '../utils/stockExpiry.js';
import { summarizeStockValuation } from '../utils/stockValuation.js';
import { buildStockDataQualitySnapshot } from '../utils/stockDataQuality.js';
import {
  aggregateSupplierDebts,
  buildAchatsStockCoherenceRows,
  buildAchatsStockHealthSnapshot,
  buildAchatsStockOperationalData,
  buildStartupProgress,
  buildStockIaRecommendations,
  isAchatsStockStartupMode,
} from './achatsStock/achatsStockVisionHelpers.js';
import { resolveAchatsStockTab } from '../utils/commercialNavigation';
import StocksV5 from './StocksV5';
import FournisseursReadable from './FournisseursReadable';

const arr = (v) => (Array.isArray(v) ? v : []);
const n = (v = 0) => Number(v || 0);
const low = (v) => String(v || '').toLowerCase();
const qty = (r = {}) => n(r.quantite ?? r.quantity ?? r.stock);
const threshold = (r = {}) => n(r.seuil ?? r.threshold ?? r.stock_min ?? r.minimum_stock);
const isFeed = (r = {}) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(low(`${r.produit || r.name || r.nom || ''} ${r.categorie || r.category || ''}`));
const isPurchaseTx = (r = {}) => /achat|stock|fournisseur|approvisionnement|reception|réception/.test(low(`${r.type || ''} ${r.categorie || ''} ${r.category || ''} ${r.libelle || ''} ${r.title || ''} ${r.module_lie || ''} ${r.source_module || ''}`));
const supplierDebt = (r = {}) => n(r.dettes ?? r.dette ?? r.solde ?? r.balance ?? r.reste_a_payer);

function Tabs({ active, onChange }) {
  return <ModuleTabsBar moduleId="achats_stock" active={active} onChange={onChange} />;
}

function Summary({ data, setTab, onApply, onRelance, busyId, onNavigate, onMarkExpiry, showStartup = false }) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const iaFindings = [...(data.stockIaRecs || []), ...(data.healthFindings || [])].slice(0, 6);

  return (
    <div className="space-y-5 achats-stock-mobile">
      <style>{`
        @media (max-width: 640px) {
          .achats-stock-mobile .overflow-x-auto { max-width: 100vw; }
          .achats-stock-mobile table { font-size: 12px; }
          .achats-stock-mobile th, .achats-stock-mobile td { padding-left: 8px !important; padding-right: 8px !important; }
        }
      `}</style>

      {showStartup || data.startupProgress?.completed < data.startupProgress?.total ? (
        <AchatsStockStartupPanel progress={data.startupProgress} setTab={setTab} onNavigate={onNavigate} />
      ) : null}

      <AchatsStockSection title="Vue d'ensemble" subtitle="6 KPI essentiels — détail dans les onglets dédiés.">
        <div className={ACHATS_STOCK_STAT_GRID}>
          <AchatsStockKpi label="Santé stock" value={`${data.healthScore}/100`} tone={data.healthScore >= 75 ? 'good' : 'warn'} onClick={() => setTab('Stock')} />
          <AchatsStockKpi label="Produits" value={fmtNumber(data.stocks.length)} onClick={() => setTab('Stock')} />
          <AchatsStockKpi label="Valeur stock" value={fmtCurrency(data.valuation?.totalValue || data.stockValue)} onClick={() => setTab('Stock')} />
          <AchatsStockKpi label="Sous seuil" value={fmtNumber(data.lowStock.length)} tone={data.lowStock.length ? 'warn' : 'good'} onClick={() => setTab('Achats')} />
          <AchatsStockKpi label="Dettes" value={fmtCurrency(data.debt)} tone={data.debt ? 'warn' : 'good'} onClick={() => setTab('Fournisseurs')} />
          <AchatsStockKpi label="Péremption" value={fmtNumber(data.expiry?.soon?.length || 0)} tone={data.expiry?.soon?.length ? 'warn' : 'good'} onClick={() => setTab('Stock')} />
        </div>
      </AchatsStockSection>

      <ModuleProjectionsStrip
        projections={data.moduleProjections}
        onNavigate={onNavigate}
      />

      <AchatsStockSection title="Parcours rapide" subtitle="Actions terrain les plus fréquentes.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <button type="button" onClick={() => openStockPurchaseForm({ setTab, intent_label: 'Réception stock', draft_fields: { date: new Date().toISOString().slice(0, 10) } })} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">+ Réception</b><p className="mt-1 text-sm text-[#8a7456]">Chemin canonique achat.</p></button>
          <button type="button" onClick={() => setTab('Achats')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Achats</b><p className="mt-1 text-sm text-[#8a7456]">À payer, preuves, réappro.</p></button>
          <button type="button" onClick={() => setTab('Mouvements')} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left"><b className="text-[#2f2415]">Mouvements</b><p className="mt-1 text-sm text-[#8a7456]">Journal et filtres.</p></button>
          <button type="button" onClick={() => onNavigate?.('commercial', { tab: 'Opportunités' })} className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left"><b className="text-[#2f2415]">Commercial</b><p className="mt-1 text-sm text-[#8a7456]">Vendre stock disponible.</p></button>
        </div>
      </AchatsStockSection>

      <AchatsStockDataQualityPanel snapshot={data.dataQuality} compact />

      <CollapsibleAdvancedSection
        eyebrow="Analyse avancée"
        title="Détails stock & cohérence"
        description={`Signaux métier, seuils, dettes, péremption · ${fmtNumber(data.stockMovements.length)} mouvements enregistrés · CMUP ${data.valuation?.calculableCount || 0}/${data.valuation?.totalCount || 0}`}
        open={advancedOpen}
        onToggle={() => setAdvancedOpen((v) => !v)}
      >
        <AchatsStockInsightPanel
          findings={iaFindings}
          predictions={data.healthPredictions}
          coherenceRows={data.coherenceRows}
          onApplyFinding={onApply}
          onNavigate={onNavigate}
          setTab={setTab}
          busyId={busyId}
        />
        <AchatsStockLowStockPanel items={data.lowStock} compact setTab={setTab} />
        <AchatsStockSupplierDebtsPanel suppliers={data.supplierDebts} onRelance={onRelance} busyId={busyId} />
        <AchatsStockExpiryPanel expiry={data.expiry} setTab={setTab} onNavigate={onNavigate} onMarkLoss={onMarkExpiry} busyId={busyId} />
        <AchatsStockDataQualityPanel snapshot={data.dataQuality} />
      </CollapsibleAdvancedSection>
    </div>
  );
}

export default function AchatsStockRecoveredModule(props) {
  const controlled = Boolean(props.onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveAchatsStockTab(props.initialTab || 'Inventaire'));
  const [inventaireSection, setInventaireSection] = useState(null);
  const movementsDetailsRef = useRef(null);
  const annexeDetailsRef = useRef(null);
  const tab = controlled
    ? resolveAchatsStockTab(props.initialTab || 'Inventaire')
    : internalTab;
  const rememberInventaireSection = useCallback((value = '') => {
    const rawKey = lower(String(value || '').trim());
    if (['mouvements', 'annexe', 'graphiques'].includes(rawKey)) {
      setInventaireSection(rawKey === 'graphiques' ? 'annexe' : rawKey);
    }
  }, []);
  const setTab = useCallback((value) => {
    rememberInventaireSection(value);
    const resolved = resolveAchatsStockTab(value);
    const raw = String(value || '').trim();
    if (controlled) {
      props.onTabChange?.(raw || resolved);
      return;
    }
    setInternalTab(resolved);
  }, [controlled, props.onTabChange, rememberInventaireSection]);
  const [busyId, setBusyId] = useState(null);
  const [stockAdvancedOpen, setStockAdvancedOpen] = useState(false);

  useEffect(() => {
    if (!props.initialTab) return;
    rememberInventaireSection(props.initialTab);
    if (!controlled) setInternalTab(resolveAchatsStockTab(props.initialTab));
  }, [controlled, props.initialTab, rememberInventaireSection]);

  useEffect(() => {
    if (tab !== 'Inventaire' || !inventaireSection) return;
    const target = inventaireSection === 'mouvements' ? movementsDetailsRef.current : annexeDetailsRef.current;
    if (!target) return;
    target.open = true;
    window.setTimeout(() => target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }, [tab, inventaireSection]);

  const stockCrud = useCrudModule('stock');
  const suppliersCrud = useCrudModule('fournisseurs');
  const financesCrud = useCrudModule('finances');
  const feedCrud = useCrudModule('alimentation_logs');
  const eventsCrud = useCrudModule('business_events');
  const movementsCrud = useCrudModule('stock_movements');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const documentsCrud = useCrudModule('documents');
  const traceCrud = useCrudModule('tracabilite');
  const periodFiltered = Boolean(props.periodFiltered);
  const traceRows = rowsOf(props.tracabilite, traceCrud, false);
  const stocks = rowsOf(props.stocks || props.rows, stockCrud, false);
  const suppliers = rowsOf(props.fournisseurs || props.suppliers, suppliersCrud, false);
  const transactions = rowsOf(props.transactions || props.finances, financesCrud, periodFiltered);
  const feedLogs = rowsOf(props.alimentationLogs, feedCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const stockMovements = rowsOf(props.stockMovements, movementsCrud, false);
  const documents = rowsOf(props.documents, documentsCrud, periodFiltered);
  const santeRecords = rowsOf(props.sante || props.vaccins, null, false);
  const productionLogs = rowsOf(props.productionLogs, null, false);

  const data = useMemo(() => {
    const purchases = transactions.filter(isPurchaseTx);
    const stockEvents = businessEvents.filter((r) => /stock|aliment|mouvement|reception|réception/.test(low(`${r.event_type || ''} ${r.title || ''} ${r.module_source || ''}`)));
    const lowStock = stocks.filter((r) => threshold(r) > 0 && qty(r) <= threshold(r));
    const purchasesWithoutStock = purchases.filter((trx) => !stocks.some((s) => String(s.last_purchase_id || s.source_id) === String(trx.id)) && trx.stock_impact !== true && n(trx.montant ?? trx.amount) > 0);
    const healthSnap = buildAchatsStockHealthSnapshot({ stocks, suppliers, transactions, feedLogs });
    const coherenceRows = buildAchatsStockCoherenceRows(stocks, transactions, suppliers);
    const supplierDebts = aggregateSupplierDebts(suppliers, transactions, props.farmScope, props.accessibleFarms);
    const startupMode = isAchatsStockStartupMode({ stocks, suppliers, purchases });
    const startupProgress = buildStartupProgress({ stocks, suppliers, purchases, documents, stockMovements });
    const operational = buildAchatsStockOperationalData({
      stocks,
      suppliers,
      transactions,
      documents,
      stockMovements,
      purchases,
      purchasesWithoutStock,
      supplierDebts,
      lowStock,
    });
    const valuation = summarizeStockValuation(stocks, stockMovements, transactions);
    const expiry = buildExpirySnapshot(stocks);
    const stockIaRecs = buildStockIaRecommendations({
      stocks,
      transactions,
      stockMovements,
      purchases,
      documents,
      lowStock,
      supplierDebts,
    });
    const dataQuality = buildStockDataQualitySnapshot({
      stocks,
      stockMovements,
      santeRecords,
      productionLogs,
      suppliers,
      transactions,
    });

    return {
      stocks,
      suppliers,
      feedLogs,
      stockEvents,
      stockMovements,
      startupMode,
      startupProgress,
      operational,
      valuation,
      expiry,
      stockIaRecs,
      stockValue: valuation.totalValue,
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
      dataQuality,
      moduleProjections: buildStockModuleProjections({
        stocks,
        lowStock,
        debt: suppliers.reduce((s, r) => s + supplierDebt(r), 0),
        expirySoon: expiry?.soon?.length || 0,
      }),
    };
  }, [stocks, suppliers, transactions, feedLogs, businessEvents, stockMovements, documents, santeRecords, productionLogs, props.farmScope, props.accessibleFarms]);

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
      else { toast.success('Module ouvert'); setTab('Stock'); }
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

  const handleExpiryAction = async (row, { alertOnly = false } = {}) => {
    setBusyId(row.id);
    try {
      if (alertOnly) {
        await (props.onCreateAlert || alertsCrud.create)?.({
          title: `Péremption proche : ${row.label}`,
          message: `DLC ${row.dlc || '—'} · ${row.daysLeft} jour(s) restant(s)`,
          module_source: 'stock',
          entity_id: row.id,
          severity: 'warning',
        });
        toast.success('Alerte créée');
        return;
      }
      const stock = stocks.find((s) => String(s.id) === String(row.id));
      const patch = buildExpiryLossPatch(stock, 'Péremption — marqué perdu');
      if (!patch) throw new Error('Stock introuvable');
      await (props.onUpdateStock || stockCrud.update)?.(row.id, patch);
      toast.success('Perte enregistrée');
    } catch (e) {
      toast.error(e.message || 'Erreur');
    } finally {
      setBusyId(null);
    }
  };

  const stockProps = {
    rows: stocks,
    stockMovements,
    transactions,
    documents,
    alimentationLogs: feedLogs,
    animaux: arr(props.animaux),
    lots: arr(props.lots),
    fournisseurs: suppliers,
    opportunities: rowsOf(props.opportunities, opportunitiesCrud, periodFiltered),
    taches: rowsOf(props.taches, tasksCrud, false),
    onCreate: props.onCreateStock || stockCrud.create,
    onUpdate: props.onUpdateStock || stockCrud.update,
    onDelete: props.onDeleteStock || stockCrud.remove,
    onRefresh: props.onRefreshStock || stockCrud.refresh,
    onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create,
    onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh,
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
    accessibleFarms: props.accessibleFarms,
    farmScope: props.farmScope,
    onCreateTrace: props.onCreateTrace || traceCrud.create,
    onUpdateTrace: props.onUpdateTrace || traceCrud.update,
    onRefreshTrace: props.onRefreshTrace || traceCrud.refresh,
    existingTraces: traceRows,
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
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onUpdateTask: props.onUpdateTask || tasksCrud.update,
    onUpdateAlert: props.onUpdateAlert || alertsCrud.update,
    onNavigate: props.onNavigate,
  };

  return (
    <div className="space-y-6 achats-stock-mobile">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Gestion</p>
            <h1 className="mt-1 text-2xl font-black text-[#2f2415]">Achats & Stock</h1>
            <p className="mt-1 text-sm text-[#8a7456]">Stock agricole fiable — achats, mouvements, péremption, multi-fermes.</p>
            {props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}
          </div>
          <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm">
            <button type="button" onClick={() => setTab('Inventaire')} className="text-left">
              <span className="text-[#8a7456]">Santé </span>
              <b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b>
            </button>
          </div>
        </div>
      </section>
      <ModuleProjectionsStrip
        projections={data.moduleProjections}
        onNavigate={props.onNavigate}
      />
      <Tabs active={tab} onChange={setTab} />
      {tab === 'Inventaire' ? (
        <div className="space-y-4">
          <StockNavigationContextBanner
            stockContext={props.stockNavigationContext?.stockContext}
            searchContext={props.stockNavigationContext?.searchContext}
            contextMessage={props.stockNavigationContext?.contextMessage}
            stocks={stocks}
            onClear={props.onClearStockNavigationContext}
          />
          <StocksV5 {...stockProps} />
          <CollapsibleAdvancedSection
            eyebrow="Compléments stock"
            title="Transferts, sources & Élevage"
            description="Panels optionnels — le détail opérationnel reste dans StocksV5."
            open={stockAdvancedOpen}
            onToggle={() => setStockAdvancedOpen((v) => !v)}
          >
            <StockProductionSourcesPanel rows={stocks} onNavigate={props.onNavigate} />
            <AchatsStockTransferPanel
              stocks={stocks}
              accessibleFarms={props.accessibleFarms || []}
              farmScope={props.farmScope}
              onUpdateStock={props.onUpdateStock || stockCrud.update}
              onCreateStockMovement={props.onCreateStockMovement || movementsCrud.create}
              onCreateBusinessEvent={props.onCreateBusinessEvent || eventsCrud.create}
              onRefreshStockMovements={props.onRefreshStockMovements || movementsCrud.refresh}
              onCreateTrace={props.onCreateTrace || traceCrud.create}
              onUpdateTrace={props.onUpdateTrace || traceCrud.update}
              existingTraces={traceRows}
              existingMovements={stockMovements}
            />
          </CollapsibleAdvancedSection>
          <details ref={movementsDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Mouvements enregistrés</summary>
            <div className="mt-3">
              <AchatsStockMovementsPanel data={data} onNavigate={props.onNavigate} setTab={setTab} accessibleFarms={props.accessibleFarms || []} />
            </div>
          </details>
          <details ref={annexeDetailsRef} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4">
            <summary className="cursor-pointer font-black text-sm text-[#2f2415]">Annexe & graphiques</summary>
            <div className="mt-3 space-y-4">
              <AchatsStockAnnexeTab documents={documents} onNavigate={props.onNavigate} />
              <ModuleGraphiquesTab moduleId="achats_stock" periodFiltered={periodFiltered} stocks={stocks} alimentationLogs={feedLogs} fournisseurs={suppliers} transactions={transactions} onNavigate={props.onNavigate} />
            </div>
          </details>
        </div>
      ) : tab === 'Réceptions & achats' ? (
        <div className="space-y-4">
          <Summary
            data={data}
            setTab={setTab}
            onApply={applyFinding}
            onRelance={relanceSupplier}
            busyId={busyId}
            onNavigate={props.onNavigate}
            onMarkExpiry={handleExpiryAction}
            showStartup={data.startupMode}
          />
          <AchatsStockPurchasesPanel data={data} onNavigate={props.onNavigate} setTab={setTab} onRelance={relanceSupplier} busyId={busyId} />
        </div>
      ) : (
        <FournisseursReadable {...supplierProps} hideEvolutionSection />
      )}
    </div>
  );
}
