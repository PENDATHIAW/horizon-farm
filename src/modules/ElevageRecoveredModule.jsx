import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import useCrudModule from '../hooks/useCrudModule';
import { aggregateSummaryLayingRate, formatOfficialLayingRate } from '../utils/elevageLayingRate.js';
import { rowsOf } from '../utils/moduleRows';
import { shouldHandleProductionQuestionEvent } from '../utils/elevageCyclesNavigation.js';
import PeriodScopeBadge from '../components/PeriodScopeBadge.jsx';
import HeyHorizonQuickAsk from '../components/HeyHorizonQuickAsk.jsx';
import ModuleProjectionsStrip from '../components/module/ModuleProjectionsStrip.jsx';
import JournalEvenements from '../components/shared/JournalEvenements.jsx';
import { buildElevageModuleProjections } from '../utils/moduleProjections.js';
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
import ElevageTransformationTab from './elevage/ElevageTransformationTab.jsx';
import {
  openElevageTransformationForm,
  scrollToTransformationForm,
} from '../utils/elevageTransformationNavigation.js';
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
} from '../utils/elevageReproductionNavigation.js';
import { buildReproductionKpis } from '../utils/reproductionMetrics.js';
import { evaluateElevageHealthBlocks, buildSanitaryAlertsPanel } from '../utils/elevageHealthBlocks.js';
import { buildElevageTransformationRows } from '../utils/elevageTransformationJournal.js';
import ElevageLotsBandesTab from './elevage/ElevageLotsBandesTab.jsx';
import ElevageCyclesReproductionTab from './elevage/ElevageCyclesReproductionTab.jsx';
import { commitElevageEggProduction } from '../utils/elevageWorkflow.js';

const lower = (value) => String(value || '').toLowerCase();
const isClosedAnimal = (row = {}) => ['vendu', 'mort', 'vole', 'volé', 'perdu', 'abattu', 'cloture', 'clôture', 'sorti'].some((word) => lower(row.status || row.statut).includes(word));
const lotName = (row = {}) => lower(`${row.type || ''} ${row.type_lot || ''} ${row.production_type || ''} ${row.activity_type || ''} ${row.categorie || ''} ${row.name || ''} ${row.nom || ''}`);
const isPondeuse = (row = {}) => lotName(row).includes('pondeuse') || lotName(row).includes('ponte') || lotName(row).includes('oeuf') || lotName(row).includes('œuf');
const isChair = (row = {}) => lotName(row).includes('chair') || lotName(row).includes('broiler');
const isHealthLate = (row = {}) => ['retard', 'en_retard', 'a_faire_retard', 'overdue'].includes(lower(row.statut || row.status || row.etat));
const isBirthLikeEvent = (row = {}) => /naissance|mise bas|veau|agneau|chevreau/.test(lower(`${row.event_type || ''} ${row.title || ''} ${row.description || ''}`));
const DAILY_ELEVAGE_FORMS = Object.freeze({
  daily_feeding: 'feeding',
  daily_eggs: 'eggs',
  daily_mortality: 'mortality',
  daily_weighing: 'weighing',
});
const isGestanteAnimal = (row = {}) =>
  /gestante|gestation|mise bas prevue|saillie confirm|en gestation/.test(
    lower(`${row.statut_reproduction || ''} ${row.reproduction_status || ''} ${row.statut || ''} ${row.notes || ''}`),
  );
function Tabs({ active, onChange, activeFarm }) {
  return (
    <div className="space-y-2">
      <ModuleTabsBar moduleId="elevage" active={active} onChange={onChange} activeFarm={activeFarm} />
    </div>
  );
}

export default function ElevageRecoveredModule(props) {
  const controlled = Boolean(props.onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveElevageTab(props.initialTab || 'Vue d’ensemble'));
  const tab = controlled
    ? resolveElevageTab(props.initialTab || 'Vue d’ensemble')
    : internalTab;
  const [lotsSubview, setLotsSubview] = useState(() => resolveElevageLotsSubview(props.initialTab) || 'avicole');
  const [activeModal, setActiveModal] = useState(null);
  const [workflowScope, setWorkflowScope] = useState(() => resolveElevageLotsSubview(props.initialTab) || 'avicole');
  const [healthDraft, setHealthDraft] = useState(null);
  const [transformationDraft, setTransformationDraft] = useState(null);
  const [reproductionHorizonDraft, setReproductionHorizonDraft] = useState(null);
  const [cyclesProductionQuestion, setCyclesProductionQuestion] = useState(null);
  const [weekAgoReference] = useState(() => new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10));

  const applyElevageNavigation = useCallback((value) => {
    const sub = resolveElevageLotsSubview(value);
    if (sub) {
      setLotsSubview(sub);
      setWorkflowScope(sub);
    }
    if (value === 'Lots & animaux') {
      setLotsSubview('animaux');
      setWorkflowScope('animaux');
    }
    if (value === 'Production élevage') {
      setLotsSubview('avicole');
      setWorkflowScope('avicole');
    }
    const resolved = resolveElevageTab(value);
    if (controlled) props.onTabChange?.(resolved);
    else setInternalTab(resolved);
  }, [controlled, props]);

  const setTab = useCallback((next) => {
    applyElevageNavigation(next);
  }, [applyElevageNavigation]);

  useEffect(() => {
    if (!props.initialTab) return;
    queueMicrotask(() => {
      const sub = resolveElevageLotsSubview(props.initialTab);
      if (sub) {
        setLotsSubview(sub);
        setWorkflowScope(sub);
      }
      if (!controlled) setInternalTab(resolveElevageTab(props.initialTab));
    });
  }, [controlled, props.initialTab]);

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
      const dailyModal = DAILY_ELEVAGE_FORMS[formType];
      if (moduleKey === 'elevage' && dailyModal) {
        setWorkflowScope(draft?.draft_fields?.scope || 'avicole');
        setTab('Production élevage');
        setActiveModal(dailyModal);
        return;
      }
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
      const isHealthDraft = (moduleKey === 'sante' || moduleKey === 'elevage')
        && ['health_action', 'health_intervention', 'sante_intervention', 'health_document'].includes(formType);

      if (isHealthDraft) {
        setHealthDraft(draft);
        setTab('Santé');
        window.setTimeout(() => document.getElementById('hey-horizon-sante-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        return;
      }

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
  }, [setTab, setHealthDraft]);
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
    const weekAgo = props.periodStart || weekAgoReference;
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
      moduleProjections: buildElevageModuleProjections({
        productionLogs,
        lots,
      }),
    };
  }, [animals, lots, health, productionLogs, feedLogs, stocks, opportunities, salesOrders, businessEvents, props.payments, props.documents, props.periodStart, weekAgoReference, paymentsCrud, documentsCrud, periodFiltered]);

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
    user: props.user,
    activeFarm: props.activeFarm,
    farm: props.farm,
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
    onNavigate: props.onNavigate,
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
  }, [health, props, confirmSanitaryOverride]);

  const openWorkflow = useCallback((modal, context = {}) => {
    const scope = context.scope || lotsSubview || 'avicole';
    if (modal === 'eggs' && scope === 'animaux') {
      toast.error('Le ramassage œufs est réservé aux lots pondeuses (onglet Avicole & lots).');
      return;
    }
    setWorkflowScope(scope);
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
  }, [onPrepareTransformation, openWorkflowModal, lotsSubview, setTab, setHealthDraft]);
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
    onRefreshBusinessEvents: props.onRefreshBusinessEvents || eventsCrud.refresh,
    onCreateDocument: props.onCreateDocument || documentsCrud.create,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create,
    onUpdateFinanceTransaction: props.onUpdateFinanceTransaction || financesCrud.update,
    onUpdateLot: props.onUpdateLot || avicoleCrud.update,
    onUpdateAnimal: props.onUpdateAnimal || animauxCrud.update,
    onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create,
    onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh,
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
    opportunities,
    transactions: rowsOf(props.transactions, financesCrud, periodFiltered),
    handlers: transformationHandlers,
    onNavigate: guardedNavigate,
    onSuccess: refreshAfterWorkflow,
  };
  const animalProps = { rows: animals, alimentationLogs: feedLogs, vaccins: health, salesOrders, payments: rowsOf(props.payments, paymentsCrud, periodFiltered), opportunities, businessEvents, onCreate: props.onCreateAnimal || animauxCrud.create, onUpdate: props.onUpdateAnimal || animauxCrud.update, onDelete: props.onDeleteAnimal || animauxCrud.remove, onRefresh: props.onRefreshAnimals || animauxCrud.refresh, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, ...shared };
  const avicoleProps = { rows: lots, transactions: rowsOf(props.transactions, financesCrud, periodFiltered), fournisseurs: rowsOf(props.fournisseurs, null, false), documents: rowsOf(props.documents, documentsCrud, periodFiltered), tasks: rowsOf(props.tasks || props.taches, tasksCrud, periodFiltered), alertes: rowsOf(props.alertes, alertsCrud, periodFiltered), alimentationLogs: feedLogs, productionLogs, stocks, stockMovements, opportunities, businessEvents, onCreate: props.onCreateLot || avicoleCrud.create, onUpdate: props.onUpdateLot || avicoleCrud.update, onDelete: props.onDeleteLot || avicoleCrud.remove, onRefresh: props.onRefreshLots || avicoleCrud.refresh, onCreateProduction: props.onCreateProduction || productionCrud.create, onUpdateProduction: props.onUpdateProduction || productionCrud.update, onDeleteProduction: props.onDeleteProduction || productionCrud.remove, onRefreshProduction: props.onRefreshProduction || productionCrud.refresh, onCommitEggProduction: commitEggProduction, onCreateOpportunity: props.onCreateOpportunity || opportunitiesCrud.create, onUpdateOpportunity: props.onUpdateOpportunity || opportunitiesCrud.update, onRefreshOpportunities: props.onRefreshOpportunities || opportunitiesCrud.refresh, onUpdateStock: props.onUpdateStock || stockCrud.update, onCreateStockMovement: props.onCreateStockMovement || movementsCrud.create, onRefreshStockMovements: props.onRefreshStockMovements || movementsCrud.refresh, onCreateFinanceTransaction: props.onCreateFinanceTransaction || financesCrud.create, onRefreshFinances: props.onRefreshFinances || financesCrud.refresh, onCreateDocument: props.onCreateDocument || documentsCrud.create, onRefreshDocuments: props.onRefreshDocuments || documentsCrud.refresh, onCreateTask: props.onCreateTask || tasksCrud.create, onRefreshTasks: props.onRefreshTasks || tasksCrud.refresh, onCreateAlert: props.onCreateAlert || alertsCrud.create, onRefreshAlertes: props.onRefreshAlertes || alertsCrud.refresh, existingTasks: props.existingTasks || rowsOf(props.tasks || props.taches, tasksCrud, periodFiltered), existingAlerts: props.existingAlerts || rowsOf(props.alertes, alertsCrud, periodFiltered), ...shared };
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
    draft: reproductionHorizonDraft,
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

  const lotsContent = (initialSubview = lotsSubview) => (
    <ElevageLotsBandesTab
      initialSubview={initialSubview}
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
      onLotsSubviewChange={(sub) => {
        setLotsSubview(sub);
        setWorkflowScope(sub);
      }}
    />
  );

  const productionContent = (
    <div className="space-y-4">
      {lotsContent('avicole')}
      <details className="border-t border-[#eadcc2] pt-4">
        <summary className="cursor-pointer text-sm font-black text-[#2f2415]">Cycles, reproduction et transformation</summary>
        <div className="mt-4 space-y-4">
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
          <ElevageTransformationTab
            data={data}
            setTab={setTab}
            onNavigate={guardedNavigate}
            onOpenWorkflow={openWorkflow}
            onPrepareTransformation={onPrepareTransformation}
            transformationFormProps={transformationFormProps}
            animalBridgeProps={animalProps}
            avicoleBridgeProps={avicoleProps}
            healthBlocks={evaluateElevageHealthBlocks({ healthRows: health })}
            hasTransformationDraft={Boolean(transformationDraft)}
          />
        </div>
      </details>
    </div>
  );

  const content = tab === 'Santé & Biosécurité' ? (
    <SanteV8 {...healthProps} healthBlocks={evaluateElevageHealthBlocks({ healthRows: health })} sanitaryAlerts={buildSanitaryAlertsPanel(health)} />
  ) : tab === 'Production élevage' ? productionContent
    : tab === 'Historique élevage' ? <JournalEvenements events={businessEvents} farmId={props.activeFarm?.id || props.farm?.id} module="elevage" recordType={props.recordType} recordId={props.recordId} period={props.periodScope} limit={150} onNavigate={props.onNavigate} />
      : tab === 'Lots & animaux' ? lotsContent('animaux')
        : lotsContent();
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs uppercase tracking-[0.25em] text-[#9a6b12] font-black">Production</p><h1 className="mt-1 text-2xl font-black text-[#2f2415]">Élevage</h1><p className="mt-1 text-sm text-[#8a7456]">Lots, alimentation, production, santé, coûts et historique de l’élevage.</p>{props.periodLabel ? <div className="mt-2"><PeriodScopeBadge label={props.periodLabel} /></div> : null}<HeyHorizonQuickAsk moduleKey="elevage" onNavigate={guardedNavigate} onOpenAssistant={props.onOpenAssistant} className="mt-2" /></div><div className="rounded-2xl border border-[#eadcc2] bg-[#fffdf8] px-4 py-3 text-sm"><span className="text-[#8a7456]">Santé module </span><b className={data.healthScore >= 75 ? 'text-emerald-700' : 'text-amber-700'}>{data.healthScore}/100</b></div></div></section>
      <ModuleProjectionsStrip projections={data.moduleProjections} onNavigate={guardedNavigate} />
      <Tabs active={tab} onChange={setTab} activeFarm={props.activeFarm} />
      {findActiveWithdrawals(health).length ? <SanitaryWithdrawalBanner healthRows={health} /> : null}
      {content}
      <ElevageWorkflowPanels
        key={`${activeModal || 'closed'}:${workflowScope}`}
        activeModal={activeModal}
        onClose={closeWorkflow}
        context={workflowContext}
        handlers={elevageHandlers}
        feedStocks={data.feedStocks}
        lots={lots}
        animaux={animals}
        pondeuseLots={pondeuseLots}
        scope={workflowScope}
        onSuccess={refreshAfterWorkflow}
      />
      <ElevageMobileToolbar scope={lotsSubview} onOpenWorkflow={openWorkflow} onNavigate={guardedNavigate} />
    </div>
  );
}
