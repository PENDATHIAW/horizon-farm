import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { fmtCurrency, fmtNumber } from '../utils/format';
import { aggregateSummaryLayingRate, formatOfficialLayingRate } from '../utils/elevageLayingRate.js';
import { rowsOf } from '../utils/moduleRows';
import { shouldHandleProductionQuestionEvent } from '../utils/elevageCyclesNavigation.js';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../components/HeyHorizonQuickAsk.jsx';
import {
  resolveElevageTab,
  resolveElevageLotsSubview,
} from '../utils/commercialNavigation';
import { buildElevageHealthSnapshot } from './elevage/elevageVisionHelpers.js';
import { buildElevageStartupProgress, isElevageStartupMode } from './elevage/elevageStartupHelpers.js';
import ElevageWorkflowPanels, { buildElevageHandlers, useElevageWorkflowContext } from './elevage/ElevageWorkflowPanels.jsx';
import ElevageMobileToolbar from './elevage/ElevageMobileToolbar.jsx';
import { buildProductionHubSnapshot } from '../utils/productionHubMetrics.js';
import { buildElevageActivityPnl, isBovinAnimal, isChairLot, isPondeuseLot } from '../utils/elevageActivityPnl.js';
import { buildElevageCostAwareInsights } from '../utils/elevageIaInsights.js';
import { buildElevageTransformationRows } from '../utils/elevageTransformationJournal.js';
import ElevageTransformationJournal from '../components/ElevageTransformationJournal.jsx';
import TransformationOfficialForm from './elevage/TransformationOfficialForm.jsx';
import {
  openElevageTransformationForm,
  scrollToTransformationForm,
} from '../utils/elevageTransformationNavigation.js';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AvicoleTransformationBridge from './AvicoleTransformationBridge.jsx';
import SanteV8 from './SanteV8';
import SanitaryWithdrawalBanner from './elevage/SanitaryWithdrawalBanner.jsx';
import {
  openElevageHealthForm,
  scrollToHealthInterventionForm,
} from '../utils/elevageHealthNavigation.js';
import {
  blockSanitaryAction,
  findActiveWithdrawals,
  SANITARY_ACTIONS,
} from '../utils/sanitaryWithdrawal.js';
import {
  openElevageReproductionForm,
  scrollToReproductionWorkflowForm,
  buildReproductionWorkflowDraft,
} from '../utils/elevageReproductionNavigation.js';
import { buildReproductionKpis } from '../utils/reproductionMetrics.js';
import { evaluateElevageHealthBlocks, buildSanitaryAlertsPanel } from '../utils/elevageHealthBlocks.js';
import { buildTransformationCostBreakdown } from '../utils/elevageTransformationCost.js';
import ElevageLotsBandesTab from './elevage/ElevageLotsBandesTab.jsx';
import ElevageCyclesReproductionTab from './elevage/ElevageCyclesReproductionTab.jsx';

const lower = (value) => String(value || '').toLowerCase();
const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => lower(row.status || row.statut).includes(word));
const lotName = (row = {}) => lower(`${row.type || ''} ${row.type_lot || ''} ${row.production_type || ''} ${row.activity_type || ''} ${row.categorie || ''} ${row.name || ''} ${row.nom || ''}`);
const isPondeuse = (row = {}) => lotName(row).includes('pondeuse') || lotName(row).includes('ponte') || lotName(row).includes('oeuf') || lotName(row).includes('œuf');
const isChair = (row = {}) => lotName(row).includes('chair') || lotName(row).includes('broiler');
const isHealthLate = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(row.statut || row.status || row.etat));
const isBirthLikeEvent = (row = {}) => /naissance|mise bas|veau|agneau|chevreau/.test(lower(`${row.event_type || ''} ${row.title || ''} ${row.description || ''}`));
const isGestanteAnimal = (row = {}) =>
  /gestante|gestation|mise bas prevue|saillie confirm|en gestation/.test(
    lower(`${row.statut_reproduction || ''} ${row.reproduction_status || ''} ${row.statut || ''} ${row.notes || ''}`),
  );
const today = () => new Date().toISOString().slice(0, 10);

function Stat({ label, value, tone = 'neutral' }) {
  const cls = tone === 'good' ? 'text-emerald-600' : tone === 'warn' ? 'text-amber-600' : tone === 'bad' ? 'text-red-600' : 'text-[#2f2415]';
  return <div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4"><p className="text-xs text-[#8a7456]">{label}</p><p className={`mt-1 text-xl font-black ${cls}`}>{value}</p></div>;
}
function Tabs({ active, onChange, activeFarm }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="elevage" active={active} onChange={onChange} activeFarm={activeFarm} />
    </div>
  );
}
function ActionCard({ title, text, onClick }) { return <button type="button" onClick={onClick} className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] p-4 text-left transition hover:bg-[#dcfce7]"><b className="text-[#2f2415]">{title}</b><p className="mt-1 text-sm text-[#8a7456]">{text}</p></button>; }
function BusinessHub({ title, intro, stats, children, extra }) { return <div className="space-y-5"><div className="grid grid-cols-2 gap-3 xl:grid-cols-4">{stats.map((s) => <Stat key={s.label} {...s} />)}</div>{extra}<section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><h2 className="text-lg font-black text-[#2f2415]">{title}</h2><p className="mt-2 text-sm leading-relaxed text-[#8a7456]">{intro}</p><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{children}</div></section></div>; }
function TransformationHub({ data, setTab, onNavigate, onOpenWorkflow, onPrepareTransformation, transformationFormProps, animalBridgeProps, avicoleBridgeProps, healthBlocks }) {
  const salesCount = data.transformationSalesCount ?? data.transformationRows?.filter((r) => r.kind === 'vente').length ?? 0;
  const sampleAnimal = data.animals?.find((a) => !isClosedAnimal(a));
  const costSample = sampleAnimal
    ? buildTransformationCostBreakdown(sampleAnimal, data.marginContext || {}, 'animal')
    : null;
  const prepareSale = () => onNavigate?.('commercial', { tab: 'Ventes', contextMessage: 'Préparation vente depuis Transformation — validation humaine obligatoire.' });
  const scrollToAbattage = () => {
    document.getElementById('elevage-animal-slaughter-bridge')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-5">
      {healthBlocks?.blocked ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <b>Transformation / vente bloquée (sanitaire)</b>
          <p className="mt-1 text-xs">{healthBlocks.messages.join(' ')}</p>
        </div>
      ) : null}
      {costSample?.total > 0 ? (
        <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm">
          <h3 className="text-sm font-black text-[#2f2415]">Coût de revient (exemple animal)</h3>
          <p className="mt-1 text-lg font-black text-emerald-700">{costSample.totalLabel}</p>
          <ul className="mt-2 text-xs text-[#8a7456] space-y-1">
            {costSample.lines.map((l) => (
              <li key={l.label}>{l.label} : {fmtCurrency(l.value)}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <BusinessHub
        title="Transformation"
        intro="Canal officiel abattage / conversion vivant → produit fini. Journal, coût de revient et stock viande après validation."
        stats={[
          { label: 'Ventes journalisées', value: fmtNumber(salesCount), tone: salesCount ? 'good' : 'warn' },
          { label: 'Animaux sortis', value: fmtNumber(data.closedAnimals) },
          { label: 'Mortalité lots', value: fmtNumber(data.recentMortality), tone: data.recentMortality ? 'warn' : 'good' },
          { label: 'Lignes journal', value: fmtNumber(data.transformationRows?.length || 0) },
        ]}
      >
        <ActionCard title="+ Nouvelle transformation" text="Formulaire officiel — abattage, réforme, produit fini." onClick={() => onPrepareTransformation?.({ transformType: 'abattage' })} />
        <ActionCard title="+ Mortalité lot avicole" text="Workflow officiel — effectif, alertes, perte finance." onClick={() => onOpenWorkflow?.('mortality')} />
        <ActionCard title="+ Sortie / abattage animal" text="Journal d’abattage animal → stock viande (section ci-dessous)." onClick={scrollToAbattage} />
        <ActionCard title="+ Clôturer lot" text="Réforme, prêt vente ou abattage lot." onClick={() => onOpenWorkflow?.('transform')} />
        <ActionCard title="Préparer vente" text="Ouvre Commercial pré-rempli — jamais vente auto." onClick={prepareSale} />
        <ActionCard title="Lots à vendre" text={`${data.lotsToSell.length} lot(s) matures.`} onClick={() => setTab('Lots & bandes')} />
      </BusinessHub>
      {transformationFormProps ? <TransformationOfficialForm {...transformationFormProps} /> : null}
      <ElevageTransformationJournal rows={data.transformationRows || []} onOpenCommercial={() => onNavigate?.('commercial', { tab: 'Ventes' })} />
      {animalBridgeProps ? (
        <div id="elevage-animal-slaughter-bridge">
          <AnimalSlaughterStockBridge {...animalBridgeProps} />
        </div>
      ) : null}
      {avicoleBridgeProps ? <AvicoleTransformationBridge {...avicoleBridgeProps} /> : null}
    </div>
  );
}
export default function ElevageRecoveredModule(props) {
  const [tab, setTabState] = useState(() => resolveElevageTab(props.initialTab));
  const [lotsSubview, setLotsSubview] = useState(() => resolveElevageLotsSubview(props.initialTab) || 'avicole');
  const [activeModal, setActiveModal] = useState(null);
  const [healthDraft, setHealthDraft] = useState(null);
  const [transformationDraft, setTransformationDraft] = useState(null);
  const [reproductionHorizonDraft, setReproductionHorizonDraft] = useState(null);
  const [cyclesProductionQuestion, setCyclesProductionQuestion] = useState(null);

  const setTab = useCallback((next) => {
    const sub = resolveElevageLotsSubview(next);
    if (sub) setLotsSubview(sub);
    setTabState(resolveElevageTab(next));
  }, []);

  useEffect(() => {
    if (props.initialTab) {
      const sub = resolveElevageLotsSubview(props.initialTab);
      if (sub) setLotsSubview(sub);
      setTabState(resolveElevageTab(props.initialTab));
    }
  }, [props.initialTab]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      if (!shouldHandleProductionQuestionEvent(detail)) return;
      if (detail.moduleId === 'elevage' || !detail.moduleId) {
        setTab('Cycles & Reproduction');
        if (detail.questionId) setCyclesProductionQuestion(detail.questionId);
      }
    };
    window.addEventListener('horizon-production-question', handler);
    return () => window.removeEventListener('horizon-production-question', handler);
  }, [setTab]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event.detail || {};
      const draft = detail.draft;
      const moduleKey = String(detail.module || draft?.primary_module || '').toLowerCase();
      const formType = draft?.form_type || '';
      const birthModes = ['naissance_ferme', 'reproduction_interne'];
      const mode = String(draft?.draft_fields?.mode_acquisition || '').toLowerCase();
      const isReproModule = moduleKey === 'elevage' || moduleKey === 'reproduction';
      const isBirthCreation = moduleKey === 'animaux' && formType === 'animal_creation' && birthModes.includes(mode);
      const isReproWorkflow = [
        'reproduction_saillie',
        'reproduction_gestation',
        'reproduction_mise_bas',
        'reproduction_document',
      ].includes(formType);
      if (!isReproModule && !isBirthCreation && !isReproWorkflow) return;
      setReproductionHorizonDraft(draft);
      setTab('Cycles & Reproduction');
      window.setTimeout(() => {
        if (isReproWorkflow || isReproModule) scrollToReproductionWorkflowForm();
        else document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
    };
    window.addEventListener('horizon-open-form', handler);
    return () => window.removeEventListener('horizon-open-form', handler);
  }, [setTab]);
  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const santeCrud = useCrudModule('sante');
  const vetsCrud = useCrudModule('veterinaires');
  const feedCrud = useCrudModule('alimentation_logs');
  const productionCrud = useCrudModule('production_oeufs_logs');
  const eventsCrud = useCrudModule('business_events');
  const opportunitiesCrud = useCrudModule('sales_opportunities');
  const salesCrud = useCrudModule('sales_orders');
  const paymentsCrud = useCrudModule('payments');
  const financesCrud = useCrudModule('finances');
  const stockCrud = useCrudModule('stock');
  const movementsCrud = useCrudModule('stock_movements');
  const documentsCrud = useCrudModule('documents');
  const tasksCrud = useCrudModule('taches');
  const alertsCrud = useCrudModule('alertes_center');
  const periodFiltered = Boolean(props.periodFiltered);

  const animals = rowsOf(props.animaux, animauxCrud, false);
  const lots = rowsOf(props.lots, avicoleCrud, false);
  const health = rowsOf(props.sante, santeCrud, periodFiltered);
  const productionLogs = rowsOf(props.productionLogs, productionCrud, periodFiltered);
  const feedLogs = rowsOf(props.alimentationLogs, feedCrud, periodFiltered);
  const stocks = rowsOf(props.stocks, stockCrud, false);
  const stockMovements = rowsOf(props.stockMovements, movementsCrud, false);
  const opportunities = rowsOf(props.opportunities, opportunitiesCrud, periodFiltered);
  const salesOrders = rowsOf(props.salesOrders, salesCrud, periodFiltered);
  const businessEvents = rowsOf(props.businessEvents, eventsCrud, periodFiltered);
  const data = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
    const reproduction = buildReproductionKpis({
      animaux: animals,
      businessEvents,
      periodStart: props.periodStart || weekAgo,
    });
    const eggs7d = productionLogs.filter((row) => String(row.date || row.created_at || '').slice(0, 10) >= weekAgo).reduce((s, row) => s + Number(row.oeufs_produits || row.eggs_count || row.oeufs || 0), 0);
    const feedCost = feedLogs.reduce((s, row) => s + Number(row.montant_total || row.cout_total || row.cost || row.montant || 0), 0);
    const recentMortality = lots.reduce((s, lot) => s + Number(lot.mortality || 0), 0) + businessEvents.filter((row) => /mort|perte|deces|décès/.test(lower(`${row.event_type || ''} ${row.title || ''}`))).length;
    const lotsToSell = lots.filter((row) => ['pret_vente', 'prêt vente', 'a_vendre', 'à vendre', 'maturite', 'maturité'].some((x) => lower(`${row.status || ''} ${row.statut || ''} ${row.notes || ''}`).includes(x)));
    const marginContext = { feedLogs, alimentationLogs: feedLogs, productionLogs, healthEvents: health, businessEvents, vaccins: health };
    const healthSnap = buildElevageHealthSnapshot({ animaux: animals, lots, feedLogs, productionLogs, stocks, sante: health });
    const layingSummary = aggregateSummaryLayingRate(lots, productionLogs, 7);
    const activityPnl = buildElevageActivityPnl({
      lots,
      animaux: animals,
      feedLogs,
      productionLogs,
      healthEvents: health,
      businessEvents,
      salesOrders,
    });
    const costAwareInsights = buildElevageCostAwareInsights({
      lots,
      animaux: animals,
      feedLogs,
      productionLogs,
      healthEvents: health,
      stocks,
      findings: healthSnap.findings,
    });
    return {
      animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents,
      activeAnimals: animals.filter((row) => !isClosedAnimal(row)).length,
      closedAnimals: animals.filter(isClosedAnimal).length,
      pondeuses: lots.filter(isPondeuse).length,
      chair: lots.filter(isChair).length,
      healthLate: health.filter(isHealthLate).length,
      feedStocks: stocks.filter((row) => /aliment|feed|provende|son|mais|maïs|foin|fourrage/.test(lower(`${row.produit || row.name || row.nom || ''} ${row.categorie || row.category || ''}`))),
      females: reproduction.females,
      birthLikeEvents: businessEvents.filter(isBirthLikeEvent).length,
      recentBirthEvents: businessEvents.filter(isBirthLikeEvent).slice(0, 6),
      gestantesList: animals.filter((a) => !isClosedAnimal(a) && isGestanteAnimal(a)).slice(0, 8),
      gestantesCount: animals.filter((a) => !isClosedAnimal(a) && isGestanteAnimal(a)).length,
      reproduction,
      livestockEvents: businessEvents.filter((row) => /animal|avicole|elevage|élevage|sante|santé/.test(lower(`${row.module_source || ''} ${row.event_type || ''} ${row.title || ''}`))),
      eggs7d, feedCost, recentMortality, lotsToSell,
      healthScore: healthSnap.score,
      healthFindings: healthSnap.findings,
      transformationRows: (() => {
        const trPayments = rowsOf(props.payments, paymentsCrud, periodFiltered);
        return buildElevageTransformationRows({ animals, lots, salesOrders, businessEvents, payments: trPayments });
      })(),
      transformationSalesCount: (() => {
        const trPayments = rowsOf(props.payments, paymentsCrud, periodFiltered);
        return buildElevageTransformationRows({ animals, lots, salesOrders, businessEvents, payments: trPayments }).filter((row) => row.kind === 'vente').length;
      })(),
      healthPredictions: healthSnap.predictions,
      layingRateLabel: formatOfficialLayingRate(layingSummary),
      layingRateCalculable: layingSummary.calculable,
      layingRate: layingSummary.rate,
      activityPnl,
      costAwareInsights,
      marginContext,
      pondeuseLots: lots.filter(isPondeuseLot),
      chairLots: lots.filter(isChairLot),
      bovins: animals.filter(isBovinAnimal),
      productionSnapshot: buildProductionHubSnapshot({
        lots,
        animaux: animals,
        productionLogs,
        stocks,
        feedLogs,
        healthEvents: health,
        transformationRows: (() => {
          const trPayments = rowsOf(props.payments, paymentsCrud, periodFiltered);
          return buildElevageTransformationRows({ animals, lots, salesOrders, businessEvents, payments: trPayments });
        })(),
        documents: rowsOf(props.documents, documentsCrud, periodFiltered),
        opportunities,
        marginContext: { feedLogs, alimentationLogs: feedLogs, productionLogs, healthEvents: health, businessEvents },
      }),
    };
  }, [animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents, props.payments, props.documents, props.periodStart, paymentsCrud, documentsCrud, periodFiltered]);

  const workflowContext = useElevageWorkflowContext({
    lots,
    animaux: animals,
    stocks,
    transactions: rowsOf(props.transactions, financesCrud, periodFiltered),
    tasks: rowsOf(props.tasks, tasksCrud, false),
    alertes: rowsOf(props.alertes, alertsCrud, false),
    businessEvents,
    alimentationLogs: feedLogs,
    productionLogs,
    sante: health,
    stockMovements,
  });

  const elevageHandlers = buildElevageHandlers({
    onCreateAlimentation: props.onCreateAlimentation || feedCrud.create,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create,
    onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh,
    stockMovements,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateHealth: props.onCreateHealth || santeCrud.create,
    onUpdateHealth: props.onUpdateHealth || santeCrud.update,
    onUpdateLot: props.onUpdateLot || avicoleCrud.update,
    onUpdateAnimal: props.onUpdateAnimal || animauxCrud.update,
    onCreateTask: props.onCreateTask || tasksCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onCreateProduction: props.onCreateProduction || productionCrud.create,
    onCreateWeightRecord: props.onCreateWeightRecord,
  });

  const refreshAfterWorkflow = useCallback(async () => {
    await Promise.allSettled([
      feedCrud.refresh?.(),
      productionCrud.refresh?.(),
      stockCrud.refresh?.(),
      movementsCrud.refresh?.(),
      avicoleCrud.refresh?.(),
      animauxCrud.refresh?.(),
      santeCrud.refresh?.(),
      eventsCrud.refresh?.(),
      financesCrud.refresh?.(),
      alertsCrud.refresh?.(),
      tasksCrud.refresh?.(),
    ]);
  }, [feedCrud, productionCrud, stockCrud, movementsCrud, avicoleCrud, animauxCrud, santeCrud, eventsCrud, financesCrud, alertsCrud, tasksCrud]);

  const commitEggProduction = useCallback(async (formPartial = {}) => {
    const result = await commitElevageEggProduction({
      form: formPartial,
      context: workflowContext,
      handlers: elevageHandlers,
    });
    await refreshAfterWorkflow();
    if (result.packagingGap) toast(result.packagingGap, { icon: 'ℹ️' });
    return result;
  }, [workflowContext, elevageHandlers, refreshAfterWorkflow]);

  const clearHealthDraft = useCallback(() => setHealthDraft(null), []);
  const clearTransformationDraft = useCallback(() => setTransformationDraft(null), []);
  const clearReproductionDraft = useCallback(() => setReproductionHorizonDraft(null), []);

  const onPrepareTransformation = useCallback((context = {}) => {
    openElevageTransformationForm({
      setTab,
      setTransformationDraft,
      context: {
        animalId: context.animalId || context.animal_id,
        lotId: context.lotId || context.lot_id,
        transformType: context.transformType || context.kind || 'abattage',
        activity: context.activity,
        notes: context.notes,
      },
      onAfterOpen: () => {
        scrollToTransformationForm();
        toast.success('Transformation — formulaire officiel ouvert');
      },
    });
  }, [setTab]);

  const onOpenReproductionWorkflow = useCallback((workflow = 'gestation', context = {}) => {
    openElevageReproductionForm({
      setTab,
      setReproductionDraft: setReproductionHorizonDraft,
      workflow,
      context,
      onAfterOpen: () => {
        scrollToReproductionWorkflowForm();
        toast.success('Reproduction — workflow officiel ouvert');
      },
    });
  }, [setTab]);

  const openWorkflowModal = useCallback((modal) => {
    setActiveModal(modal);
  }, []);

  const confirmSanitaryOverride = useCallback((message) => {
    if (typeof window === 'undefined') return false;
    return window.confirm(
      `${message}\n\nException terrain : confirmer pour continuer malgré le délai sanitaire actif ?`,
    );
  }, []);

  const guardedNavigate = useCallback((module, opts = {}) => {
    if (module === 'commercial') {
      const block = blockSanitaryAction({
        healthRows: health,
        action: SANITARY_ACTIONS.SALE,
        animalId: opts.animalId || opts.animal_id,
        lotId: opts.lotId || opts.lot_id,
      });
      if (block.blocked) {
        if (!confirmSanitaryOverride(block.message)) {
          toast.error(block.message);
          return;
        }
        toast('Exception terrain — vente avec délai sanitaire actif', { icon: '⚠️' });
      }
    }
    props.onNavigate?.(module, opts);
  }, [health, props.onNavigate, confirmSanitaryOverride]);

  const openWorkflow = useCallback((modal, context = {}) => {
    if (modal === 'health') {
      openElevageHealthForm({
        setTab,
        setHealthDraft,
        context: {
          animalId: context.animalId || context.animal_id,
          lotId: context.lotId || context.lot_id,
          typeIntervention: context.typeIntervention || context.type_intervention,
          date: context.date,
          nom: context.nom,
          notes: context.notes,
        },
        onAfterOpen: () => {
          scrollToHealthInterventionForm();
          toast.success('Intervention santé — formulaire complet ouvert');
        },
      });
      return;
    }
    if (modal === 'transform') {
      onPrepareTransformation({
        lotId: context.lotId || context.lot_id,
        animalId: context.animalId || context.animal_id,
        transformType: context.kind || context.transformType || 'abattage',
      });
      return;
    }
    openWorkflowModal(modal);
  }, [onPrepareTransformation, openWorkflowModal]);
  const closeWorkflow = useCallback(() => setActiveModal(null), []);

  const startupProgress = useMemo(() => buildElevageStartupProgress({
    lots,
    animaux: animals,
    feedStocks: data.feedStocks,
    feedLogs,
    health,
    productionLogs,
    opportunities,
    salesOrders,
  }), [lots, animals, data.feedStocks, feedLogs, health, productionLogs, opportunities, salesOrders]);

  const showStartup = useMemo(() => isElevageStartupMode({
    lots,
    animaux: animals,
    feedLogs,
    health,
    productionLogs,
  }), [lots, animals, feedLogs, health, productionLogs]);

  const pondeuseLots = useMemo(() => lots.filter(isPondeuse), [lots]);

  const shared = { onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create, onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh, onNavigate: guardedNavigate, onPrepareTransformation };

  const transformationHandlers = {
    onCreateStock: props.onCreateStock || stockCrud.create,
    onUpdateStock: props.onUpdateStock || stockCrud.update,
    onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onUpdateLot: props.onUpdateLot || avicoleCrud.update,
    onUpdateAnimal: props.onUpdateAnimal || animauxCrud.update,
  };

  const transformationFormProps = {
    transformationDraft,
    onClearDraft: clearTransformationDraft,
    animaux: animals,
    lots,
    stocks,
    healthRows: health,
    alimentationLogs: feedLogs,
    productionLogs,
    businessEvents,
    handlers: transformationHandlers,
    onNavigate: guardedNavigate,
    onSuccess: refreshAfterWorkflow,
  };
  const animalProps = { rows: animals, alimentationLogs: feedLogs, vaccins: health, salesOrders, payments: rowsOf(props.payments, paymentsCrud, periodFiltered), opportunities, businessEvents, onCreate: props.onCreateAnimal || animauxCrud.create, onUpdate: props.onUpdateAnimal || animauxCrud.update, onDelete: props.onDeleteAnimal || animauxCrud.remove, onRefresh: props.onRefreshAnimals || animauxCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const avicoleProps = { rows: lots, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), alimentationLogs: feedLogs, productionLogs, stocks, stockMovements, opportunities, businessEvents, onCreate: props.onCreateLot || avicoleCrud.create, onUpdate: props.onUpdateLot || avicoleCrud.update, onDelete: props.onDeleteLot || avicoleCrud.remove, onRefresh: props.onRefreshLots || avicoleCrud.refresh, onCreateProduction: props.onCreateProduction || productionCrud.create, onUpdateProduction: props.onUpdateProduction || productionCrud.update, onDeleteProduction: props.onDeleteProduction || productionCrud.remove, onRefreshProduction: props.onRefreshProduction || productionCrud.refresh, onCommitEggProduction: commitEggProduction, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create, onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, ...shared };
  const healthProps = { rows: health, vets: rowsOf(props.veterinaires, vetsCrud, false), animaux: animals, lots, stocks, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), documents: rowsOf(props.documents, documentsCrud, periodFiltered), tasks: rowsOf(props.tasks, tasksCrud, false), alertes: rowsOf(props.alertes, alertsCrud, false), healthDraft, onClearHealthDraft: clearHealthDraft, onCreate: props.onCreateHealth || santeCrud.create, onUpdate: props.onUpdateHealth || santeCrud.update, onDelete: props.onDeleteHealth || santeCrud.remove, onRefresh: props.onRefreshHealth || santeCrud.refresh, onCreateVet: props.onCreateVet || vetsCrud.create, onUpdateVet: props.onUpdateVet || vetsCrud.update, onDeleteVet: props.onDeleteVet || vetsCrud.remove, onRefreshVets: props.onRefreshVets || vetsCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onUpdateTask: props.onUpdateTask || tasksCrud.update, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onUpdateAlert: props.onUpdateAlert || alertsCrud.update, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onNavigate: guardedNavigate };
  const cyclesDataMap = useMemo(
    () => ({
      ...props.dataMap,
      animaux: animals,
      lots,
      avicole: lots,
      production_oeufs_logs: productionLogs,
      productionLogs,
      alimentation_logs: feedLogs,
      stock: stocks,
      stocks,
      sales_orders: salesOrders,
      finances: rowsOf(props.transactions, financesCrud, periodFiltered),
      sante: health,
    }),
    [props.dataMap, animals, lots, productionLogs, feedLogs, stocks, salesOrders, props.transactions, financesCrud, periodFiltered, health],
  );

  const reproductionFormProps = {
    draft: reproductionHorizonDraft || buildReproductionWorkflowDraft({ workflow: 'gestation' }),
    animaux: animals,
    documents: rowsOf(props.documents, documentsCrud, periodFiltered),
    onUpdateAnimal: props.onUpdateAnimal || animauxCrud.update,
    onCreateAnimal: props.onCreateAnimal || animauxCrud.create,
    onCreateBusinessEvent: props.onCreateBusinessEvent || eventsCrud.create,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onCreateAlert: props.onCreateAlert || alertsCrud.create,
    onRefresh: refreshAfterWorkflow,
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh,
    onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh,
    onClose: clearReproductionDraft,
    onOpenBirthDraft: (ctx) => {
      setLotsSubview('animaux');
      setTab('Lots & bandes');
      window.setTimeout(() => {
        document.getElementById('hey-horizon-animal-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      if (ctx?.animalId) toast.success('Fiche jeune — complétez la création animal');
    },
  };

  const content = tab === 'Lots & bandes' ? (
    <ElevageLotsBandesTab
      initialSubview={lotsSubview}
      avicoleProps={avicoleProps}
      animalProps={animalProps}
      productionHubProps={{
        snapshot: data.productionSnapshot,
        lots,
        animaux: animals,
        marginContext: data.marginContext,
        onNavigate: guardedNavigate,
        onOpenWorkflow: openWorkflow,
      }}
      showStartup={showStartup}
      startupProgress={startupProgress}
      onNavigate={guardedNavigate}
      onOpenWorkflow={openWorkflow}
      onSetTab={setTab}
    />
  ) : tab === 'Cycles & Reproduction' ? (
    <ElevageCyclesReproductionTab
      cyclesPanelProps={{
        dataMap: cyclesDataMap,
        lots,
        animaux: animals,
        productionLogs,
        alertes: rowsOf(props.alertes, alertsCrud, false),
        onNavigate: guardedNavigate,
        setTab,
        farmScopeLabel: props.farmScopeLabel,
        farmScope: props.farmScope,
        farmFiltered: props.farmFiltered,
        initialProductionQuestion: cyclesProductionQuestion,
        meteo: props.meteo,
      }}
      reproductionData={data}
      reproductionFormProps={reproductionFormProps}
      onOpenReproductionWorkflow={onOpenReproductionWorkflow}
      onNavigate={guardedNavigate}
    />
  ) : tab === 'Santé' ? (
    <SanteV8 {...healthProps} healthBlocks={evaluateElevageHealthBlocks({ healthRows: health })} sanitaryAlerts={buildSanitaryAlertsPanel(health)} />
  ) : tab === 'Transformation' ? (
    <TransformationHub
      data={data}
      setTab={setTab}
      onNavigate={guardedNavigate}
      onOpenWorkflow={openWorkflow}
      onPrepareTransformation={onPrepareTransformation}
      transformationFormProps={transformationFormProps}
      animalBridgeProps={animalProps}
      avicoleBridgeProps={avicoleProps}
      healthBlocks={evaluateElevageHealthBlocks({ healthRows: health })}
    />
  ) : (
    <ElevageLotsBandesTab
      initialSubview={lotsSubview}
      avicoleProps={avicoleProps}
      animalProps={animalProps}
      productionHubProps={{
        snapshot: data.productionSnapshot,
        lots,
        animaux: animals,
        marginContext: data.marginContext,
        onNavigate: guardedNavigate,
        onOpenWorkflow: openWorkflow,
      }}
      showStartup={showStartup}
      startupProgress={startupProgress}
      onNavigate={guardedNavigate}
      onOpenWorkflow={openWorkflow}
      onSetTab={setTab}
    />
  );
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm text-[#8a7456]">Lots & bandes, cycles & reproduction, santé et transformation — 4 onglets métier.</p>{props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}<HeyHorizonQuickAsk moduleKey="elevage" onNavigate={guardedNavigate} onOpenAssistant={props.onOpenAssistant} className="mt-2" /></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé module </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div></div></section>
      <Tabs active={tab} onChange={setTab} activeFarm={props.activeFarm} />
      {findActiveWithdrawals(health).length ? <SanitaryWithdrawalBanner healthRows={health} /> : null}
      {content}
      <ElevageWorkflowPanels
        activeModal={activeModal}
        onClose={closeWorkflow}
        context={workflowContext}
        handlers={elevageHandlers}
        feedStocks={data.feedStocks}
        lots={lots}
        animaux={animals}
        pondeuseLots={pondeuseLots}
        onSuccess={refreshAfterWorkflow}
      />
      <ElevageMobileToolbar onOpenWorkflow={openWorkflow} onNavigate={guardedNavigate} />
    </div>
  );
}
