import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { MODULE_REGISTRY, NAV_MODULE_ORDER } from './config/modules.config';
import { MODULE_ENTRY_POINTS, resolveActiveModuleId } from './config/moduleEntryPoints';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { computeNavAlertCounts, navAlertFlags } from './services/erpHealthRules';
import { scheduleErpHealthEngine, scheduleErpHealthOnCriticalChange } from './services/erpHealthEngine';
import { trackNavOpen } from './services/erpRules/surveillanceUxRules.js';
import { composeActionTraceShared, composeDecisionDataMap, composeInternalResources, composeReportData } from './services/moduleDataComposer';
import { refreshAllModules, refreshSalesWorkflow } from './services/workflowRefresh';
import { resolveCommercialTab, resolveElevageTab, resolveAchatsStockTab, resolveFinanceTab, resolveActiviteSuiviTab, resolveDocumentsTab, resolveRhTab, resolveObjectifsTab, resolveCentreTab, resolveInvestisseursTab, resolveRouteModule, defaultTabForLegacyModule, isCommercialReconciliationAlias } from './utils/commercialNavigation';
import { parseErpDeepLinkFromSearch, stripErpDeepLinkParamsFromUrl } from './utils/erpDeepLink.js';
import { resolveCulturesTab } from './utils/culturesNavigation.js';
import { farmCostSettingsService } from './services/farmCostSettingsService';
import { pruneHeavyLocalStorage } from './utils/safeLocalStorage';
import { archiveHealthMirrorTasks, findHealthMirrorTasksToArchive } from './utils/pruneHealthMirrorTasks.js';
import AppNotificationManager from './components/AppNotificationManager';
import ErpInterconnectionBridge from './components/ErpInterconnectionBridge';
import AssistantPanel from './components/AssistantPanel';
import ErrorBoundary from './components/ErrorBoundary';
import ProductionUpdateBanner from './components/ProductionUpdateBanner';
import { useAuth } from './context/AuthContext';
import { useAppData } from './context/AppContext';
import useCrudModules from './hooks/useCrudModules';
import useLiveWeather from './hooks/useLiveWeather';
import useOnlineStatus from './hooks/useOnlineStatus';
import usePeriodScope from './hooks/usePeriodScope';
import useFarmScope from './hooks/useFarmScope';
import useFarmScopedCrud from './hooks/useFarmScopedCrud';
import AppLayout from './layouts/AppLayout';
import { applyFarmScopeToDataMap, applyFarmScopeToProps } from './utils/applyFarmScope';
import FarmActivityNotice from './components/FarmActivityNotice';
import { applyPeriodScopeToDataMap, applyPeriodScopeToProps } from './utils/applyPeriodScope';
import { farmsService, getDefaultFarmRecord } from './services/farmsService';
import { formatFarmScopeLabel, normalizeFarmScope, resolveFarmContext } from './utils/farmScope';
import { enrichAssistantDataMap } from './utils/assistantDataMap.js';
import { mergeDemoFarms } from './utils/farmDemoMode.js';
import { scheduleHeyHorizonQuery } from './utils/openHeyHorizonAssistant.js';
import { clearPeriodFilterCache } from './utils/periodFilterCache';
import { formatPeriodScopeLabel, isAllTimeScope, normalizePeriodScope } from './utils/periodScope';
import LoginPage from './pages/LoginPage';

const MODULES = Object.fromEntries(
  Object.entries(MODULE_ENTRY_POINTS).map(([id, loader]) => [id, lazy(() => lazyWithRetry(loader))]),
);
const CRUD_KEYS = ['animaux','avicole','sante','veterinaires','finances','investissements','business_plans','bp_investment_lines','bp_recurring_costs','bp_revenue_projections','bp_funding_sources','bp_links','bp_risks','stock','stock_movements','clients','fournisseurs','tracabilite','cultures','documents','taches','rapports','equipements','audit_logs','alimentation_logs','production_oeufs_logs','sensor_devices','camera_devices','business_events','alertes_center','whatsapp_templates','whatsapp_logs','sales_orders','sales_order_items','deliveries','invoices','payments','sales_opportunities'];
const rows = (crud) => crud?.rows || [];
const arr = (value) => (Array.isArray(value) ? value : []);
const crudRowsMap = (c) => Object.fromEntries(CRUD_KEYS.map((key) => [key, rows(c[key])]));

export default function App() {
  const [active, setActiveState] = useState('dashboard');
  const [commercialTab, setCommercialTab] = useState('Pilotage');
  const [elevageTab, setElevageTab] = useState('Lots & bandes');
  const [centreTab, setCentreTab] = useState('Urgences & risques');
  const [objectifsTab, setObjectifsTab] = useState('Suivi du Business Plan');
  const [achatsStockTab, setAchatsStockTab] = useState('Inventaire');
  const [achatsStockContext, setAchatsStockContext] = useState(null);
  const [financeTab, setFinanceTab] = useState('Résumé');
  const [culturesTab, setCulturesTab] = useState('Parcelles & campagnes');
  const [activiteSuiviTab, setActiviteSuiviTab] = useState('Cockpit & décisions');
  const [documentsRapportsTab, setDocumentsRapportsTab] = useState('Centre de contrôle');
  const [rhTab, setRhTab] = useState('Cockpit RH & Maintenance');
  const [gestionSystemeTab, setGestionSystemeTab] = useState('Vue admin');
  const [investisseursTab, setInvestisseursTab] = useState('room');
  const [farmsPanelAction, setFarmsPanelAction] = useState(null);
  const openAssistantRef = useRef(() => {});
  const deepLinkAppliedRef = useRef(false);
  const navigateModule = useCallback((moduleId, options = {}) => {
    const tab = options?.tab || options?.commercialTab || options?.elevageTab || options?.achatsStockTab || options?.financeTab || options?.culturesTab || options?.activiteSuiviTab || options?.documentsRapportsTab || options?.rhTab;
    const resolved = resolveRouteModule(moduleId);

    if (resolved !== 'achats_stock') {
      setAchatsStockContext(null);
    }

    if (resolved === 'commercial') {
      if (isCommercialReconciliationAlias(tab)) {
        setFinanceTab('Réconciliation');
        trackNavOpen('finance_pilotage');
        setActiveState('finance_pilotage');
        return;
      }
      setCommercialTab(resolveCommercialTab(tab || defaultTabForLegacyModule(moduleId) || 'Pilotage'));
      trackNavOpen('commercial');
      setActiveState('commercial');
      return;
    }
    if (resolved === 'elevage') {
      const rawTab = tab || defaultTabForLegacyModule(moduleId) || 'Lots & bandes';
      setElevageTab(rawTab);
      if (options?.productionQuestion) {
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('horizon-production-question', {
            detail: { questionId: options.productionQuestion, moduleId: 'elevage' },
          }));
        }, 320);
      }
      trackNavOpen('elevage');
      setActiveState('elevage');
      return;
    }
    if (resolved === 'achats_stock') {
      setAchatsStockTab(tab || defaultTabForLegacyModule(moduleId) || 'Inventaire');
      if (options.stockContext || options.searchContext || options.contextMessage) {
        setAchatsStockContext({
          stockContext: options.stockContext || null,
          searchContext: options.searchContext || null,
          contextMessage: options.contextMessage || null,
        });
      } else if (!options.preserveStockContext) {
        setAchatsStockContext(null);
      }
      trackNavOpen('achats_stock');
      setActiveState('achats_stock');
      return;
    }
    if (resolved === 'finance_pilotage') {
      setFinanceTab(tab || defaultTabForLegacyModule(moduleId) || 'Résumé');
      trackNavOpen('finance_pilotage');
      setActiveState('finance_pilotage');
      return;
    }
    if (resolved === 'cultures') {
      setCulturesTab(tab || defaultTabForLegacyModule(moduleId) || 'Parcelles & campagnes');
      trackNavOpen('cultures');
      setActiveState('cultures');
      return;
    }
    if (resolved === 'activite_suivi') {
      setActiviteSuiviTab(resolveActiviteSuiviTab(tab || defaultTabForLegacyModule(moduleId) || 'Cockpit & décisions'));
      trackNavOpen('activite_suivi');
      setActiveState('activite_suivi');
      return;
    }
    if (resolved === 'documents_rapports') {
      setDocumentsRapportsTab(resolveDocumentsTab(tab || defaultTabForLegacyModule(moduleId) || 'Centre de contrôle'));
      trackNavOpen('documents_rapports');
      setActiveState('documents_rapports');
      return;
    }
    if (resolved === 'rh') {
      setRhTab(resolveRhTab(tab || defaultTabForLegacyModule(moduleId) || 'Cockpit RH & Maintenance'));
      trackNavOpen('rh');
      setActiveState('rh');
      return;
    }
    if (resolved === 'gestion_systeme') {
      if (tab) setGestionSystemeTab(tab);
      if (options?.farmsAction) setFarmsPanelAction(options.farmsAction);
      trackNavOpen('gestion_systeme');
      setActiveState('gestion_systeme');
      return;
    }
    if (resolved === 'investisseurs_forums') {
      if (tab) setInvestisseursTab(resolveInvestisseursTab(tab));
      trackNavOpen('investisseurs_forums');
      setActiveState('investisseurs_forums');
      return;
    }
    if (resolved === 'centre_ia' || resolved === 'objectifs_croissance') {
      if (tab) {
        if (resolved === 'centre_ia') setCentreTab(resolveCentreTab(tab));
        else setObjectifsTab(resolveObjectifsTab(tab));
      }
      if (options?.productionQuestion) {
        window.setTimeout(() => {
          window.dispatchEvent(new CustomEvent('horizon-production-question', {
            detail: { questionId: options.productionQuestion, moduleId: resolved },
          }));
        }, 320);
      }
      if (options?.heyHorizonQuery) {
        window.setTimeout(() => openAssistantRef.current?.(options.heyHorizonQuery), 400);
      }
      trackNavOpen(resolved);
      setActiveState(resolved);
      return;
    }
    trackNavOpen(resolved);
    setActiveState(resolved);
  }, []);
  const setActive = navigateModule;
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const openAssistantWithQuery = useCallback((query) => {
    setAssistantOpen(true);
    scheduleHeyHorizonQuery(query, 180);
  }, []);
  useEffect(() => {
    openAssistantRef.current = openAssistantWithQuery;
  }, [openAssistantWithQuery]);
  const { user, loading: authLoading, signOut, canAccess } = useAuth();
  useEffect(() => {
    if (!user?.id || authLoading || deepLinkAppliedRef.current) return undefined;
    const target = parseErpDeepLinkFromSearch(window.location.search);
    if (!target?.module) return undefined;
    deepLinkAppliedRef.current = true;
    const timer = window.setTimeout(() => {
      navigateModule(target.module, {
        tab: target.tab || undefined,
        heyHorizonQuery: target.heyHorizon || undefined,
      });
      window.history.replaceState({}, '', stripErpDeepLinkParamsFromUrl());
    }, 420);
    return () => window.clearTimeout(timer);
  }, [user?.id, authLoading, navigateModule]);
  const { dataMap, refreshModule, flushOfflineQueue } = useAppData();
  const { online, lastOnlineAt } = useOnlineStatus();
  const { weather: liveMeteo, loading: weatherLoading, source: weatherSource } = useLiveWeather();
  const [accessibleFarms, setAccessibleFarms] = useState(() => farmsService.getCachedAccessibleFarms());
  const effectiveAccessibleFarms = useMemo(
    () => mergeDemoFarms(accessibleFarms),
    [accessibleFarms],
  );
  const [farmScope, setFarmScope] = useFarmScope(effectiveAccessibleFarms);
  const [periodScope, setPeriodScope] = usePeriodScope();
  const [, startPeriodTransition] = useTransition();
  const handlePeriodScopeChange = useCallback((next) => {
    startPeriodTransition(() => setPeriodScope(next));
  }, [setPeriodScope]);
  const handleFarmScopeChange = useCallback((next) => {
    startPeriodTransition(() => setFarmScope(next));
  }, [setFarmScope]);
  const refreshAccessibleFarms = useCallback(async () => {
    if (!user?.id) return;
    const farms = await farmsService.loadAccessibleFarms(user.id);
    setAccessibleFarms(farms);
  }, [user]);
  const handleManageFarms = useCallback(() => {
    setGestionSystemeTab('Fermes');
    setFarmsPanelAction(null);
    setActiveState('gestion_systeme');
  }, []);
  const handleFarmActivityAction = useCallback(() => {
    setGestionSystemeTab('Fermes');
    setFarmsPanelAction('edit');
    setActiveState('gestion_systeme');
  }, []);
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    (async () => {
      const farms = await farmsService.loadAccessibleFarms(user.id);
      if (cancelled) return;
      setAccessibleFarms(farms);
      await farmsService.ensureDefaultFarm(user.id, user?.user_metadata?.company_id || user?.company_id || null);
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.user_metadata?.company_id, user?.company_id]);
  const farmContext = useMemo(
    () => resolveFarmContext(farmScope, effectiveAccessibleFarms),
    [farmScope, effectiveAccessibleFarms],
  );
  const activeFarm = farmContext.activeFarm || getDefaultFarmRecord(effectiveAccessibleFarms);
  const periodLabel = useMemo(() => formatPeriodScopeLabel(periodScope), [periodScope]);
  const periodScopeKey = useMemo(() => JSON.stringify(periodScope), [periodScope]);
  const cRaw = useCrudModules();
  const c = useFarmScopedCrud(cRaw, farmScope, effectiveAccessibleFarms, activeFarm);
  const mirrorPruneBusy = useRef(false);
  const crudFingerprint = useMemo(() => {
    const workflowSignal = (key, moduleRows = []) => {
      const list = arr(moduleRows);
      if (key === 'sales_orders') {
        const receivable = list.reduce((sum, row) => sum + Math.max(0, Number(row.reste_a_payer ?? row.remaining ?? 0)), 0);
        const toDeliver = list.filter((row) => {
          const status = String(row.statut_livraison || row.delivery_status || row.status_livraison || '').toLowerCase();
          return status && !['livre', 'livré', 'recupere', 'récupéré', 'delivered', 'termine', 'terminé'].includes(status);
        }).length;
        return `${list.length}:${Math.round(receivable)}:${toDeliver}`;
      }
      if (key === 'payments') {
        const totalPaid = list.reduce((sum, row) => sum + Number(row.montant ?? row.amount ?? row.montant_paye ?? 0), 0);
        return `${list.length}:${Math.round(totalPaid)}`;
      }
      if (key === 'deliveries') {
        const done = list.filter((row) => ['livree', 'livre', 'livré', 'delivered'].includes(String(row.statut || row.status || '').toLowerCase())).length;
        return `${list.length}:${done}`;
      }
      return String(list.length);
    };
    return CRUD_KEYS.map((key) => `${key}:${workflowSignal(key, rows(c[key]))}`).join('|');
  }, [c]);
  useEffect(() => {
    clearPeriodFilterCache();
  }, [crudFingerprint]);
  const base = (key) => ({ rows: rows(c[key]), loading: c[key]?.loading, onCreate: c[key]?.create, onUpdate: c[key]?.update, onDelete: c[key]?.remove, onRefresh: c[key]?.refresh });

  const alertCounts = useMemo(() => computeNavAlertCounts(crudRowsMap(c)), [c]);
  const alertFlags = useMemo(() => navAlertFlags(alertCounts, online), [alertCounts, online]);
  const notifs = alertCounts.notifs + (online ? 0 : 1);
  const refreshAll = useCallback(async () => refreshAllModules(refreshModule), [refreshModule]);
  const refreshSalesWorkflowFn = useCallback(async () => refreshSalesWorkflow(c), [c]);
  const farmComparisonData = useMemo(() => ({
    salesOrdersAll: rows(c.sales_orders),
    paymentsAll: rows(c.payments),
    transactionsAll: rows(c.finances),
    stocks: rows(c.stock),
    alertes: rows(c.alertes_center),
    taches: rows(c.taches),
    animaux: rows(c.animaux),
    lotsData: rows(c.avicole),
    cultures: rows(c.cultures),
    productionLogs: rows(c.production_oeufs_logs),
    businessPlans: rows(c.business_plans),
    investissements: rows(c.investissements),
    sensorDevices: rows(c.sensor_devices),
    cameraDevices: rows(c.camera_devices),
    meteo: liveMeteo,
  }), [c, liveMeteo, crudFingerprint]);
  const decisionDataMapRaw = useMemo(
    () => applyFarmScopeToDataMap(
      composeDecisionDataMap({ crud: c, dataMap, liveMeteo }),
      farmScope,
      { accessibleFarms: effectiveAccessibleFarms, activeFarm },
    ),
    [c, dataMap, liveMeteo, farmScope, effectiveAccessibleFarms, activeFarm],
  );

  const healthAutoActions = useMemo(() => (data) => ({
    existingTasks: arr(data.taches || data.tasks),
    existingAlerts: arr(data.alertes_center || data.alertes),
    onCreateTask: c.taches.create,
    onCreateAlert: c.alertes_center.create,
    onUpdateAlert: c.alertes_center.update,
    onCreateBusinessEvent: c.business_events.create,
  }), [c.taches.create, c.alertes_center.create, c.alertes_center.update, c.business_events.create]);

  useEffect(() => scheduleErpHealthEngine(
    () => decisionDataMapRaw,
    null,
    60 * 60 * 1000,
    healthAutoActions,
  ), [decisionDataMapRaw, healthAutoActions]);

  useEffect(() => { pruneHeavyLocalStorage(); }, []);

  useEffect(() => {
    const tasks = rows(c.taches);
    const mirrors = findHealthMirrorTasksToArchive(tasks);
    if (!mirrors.length || typeof c.taches?.update !== 'function' || mirrorPruneBusy.current) return;

    mirrorPruneBusy.current = true;
    void archiveHealthMirrorTasks(tasks, c.taches.update).finally(() => {
      mirrorPruneBusy.current = false;
    });
  }, [c.taches]);

  useEffect(() => {
    const trigger = scheduleErpHealthOnCriticalChange(() => decisionDataMapRaw, null, healthAutoActions);
    trigger(decisionDataMapRaw);
    return () => trigger(decisionDataMapRaw);
  }, [crudFingerprint, healthAutoActions, decisionDataMapRaw]);

  const navItems = useMemo(() => NAV_MODULE_ORDER
    .filter((id) => canAccess(id))
    .map((id) => ({
    id,
    label: MODULE_REGISTRY[id]?.label || id,
    icon: MODULE_REGISTRY[id]?.icon,
    hasAlert: alertFlags[id],
  })), [alertFlags, canAccess]);
  const moduleProps = useMemo(() => {
  const syncActivityProps = { onRefreshAll: refreshAll, onFlushOffline: flushOfflineQueue, online, lastOnlineAt, dataMap, tasks: rows(c.taches), alertes: rows(c.alertes_center), businessEvents: rows(c.business_events), businessEventsAll: rows(c.business_events), auditLogs: rows(c.audit_logs), auditLogsAll: rows(c.audit_logs), auditLoading: c.audit_logs.loading, onRefreshAuditLogs: c.audit_logs.refresh, onNavigate: setActive, onCreateTask: c.taches.create, onUpdateTask: c.taches.update, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onUpdateAlert: c.alertes_center.update, onRefreshAlertes: c.alertes_center.refresh, onUpdateSalesOrder: c.sales_orders.update, onRefreshSalesOrders: c.sales_orders.refresh, onUpdateOpportunity: c.sales_opportunities.update, onRefreshOpportunities: c.sales_opportunities.refresh, onCreateDocument: c.documents.create, onUpdateDocument: c.documents.update, onRefreshDocuments: c.documents.refresh, onCreateBusinessEvent: c.business_events.create, onRefreshBusinessEvents: c.business_events.refresh, onCreateFinanceTransaction: c.finances.create, onUpdateFinanceTransaction: c.finances.update, onRefreshFinances: c.finances.refresh, onUpdatePayment: c.payments.update, onRefreshPayments: c.payments.refresh, onCreateStock: c.stock.create, onUpdateStock: c.stock.update, onRefreshStock: c.stock.refresh, onUpdateAlimentation: c.alimentation_logs.update, onRefreshAlimentation: c.alimentation_logs.refresh, onCreateSensor: c.sensor_devices.create, onRefreshSensors: c.sensor_devices.refresh, onCreateCamera: c.camera_devices.create, onRefreshCameras: c.camera_devices.refresh, onCreateSmartfarmEvent: c.smartfarm_events.create, onUpdateSmartfarmEvent: c.smartfarm_events.update, onRefreshSmartfarmEvents: c.smartfarm_events.refresh };
  const shared = { onNavigate: setActive, onCreateBusinessEvent: c.business_events.create, onRefreshBusinessEvents: c.business_events.refresh };
  const bpCallbacks = {
    onCreateBpInvestmentLine: c.bp_investment_lines.create, onUpdateBpInvestmentLine: c.bp_investment_lines.update, onDeleteBpInvestmentLine: c.bp_investment_lines.remove, onRefreshBpInvestmentLines: c.bp_investment_lines.refresh,
    onCreateBpRecurringCost: c.bp_recurring_costs.create, onUpdateBpRecurringCost: c.bp_recurring_costs.update, onDeleteBpRecurringCost: c.bp_recurring_costs.remove, onRefreshBpRecurringCosts: c.bp_recurring_costs.refresh,
    onCreateBpRevenueProjection: c.bp_revenue_projections.create, onUpdateBpRevenueProjection: c.bp_revenue_projections.update, onDeleteBpRevenueProjection: c.bp_revenue_projections.remove, onRefreshBpRevenueProjections: c.bp_revenue_projections.refresh,
    onCreateBpFundingSource: c.bp_funding_sources.create, onUpdateBpFundingSource: c.bp_funding_sources.update, onDeleteBpFundingSource: c.bp_funding_sources.remove, onRefreshBpFundingSources: c.bp_funding_sources.refresh,
    onCreateBpLink: c.bp_links.create, onUpdateBpLink: c.bp_links.update, onDeleteBpLink: c.bp_links.remove, onRefreshBpLinks: c.bp_links.refresh,
    onCreateBpRisk: c.bp_risks.create, onUpdateBpRisk: c.bp_risks.update, onDeleteBpRisk: c.bp_risks.remove, onRefreshBpRisks: c.bp_risks.refresh,
  };
  const reportData = composeReportData(c);
  const actionTraceShared = composeActionTraceShared(c, online);
  const internalResourcesShared = composeInternalResources(c);
  return {
    dashboard: { user, dataFingerprint: crudFingerprint, lotsData: rows(c.avicole), animaux: rows(c.animaux), vaccins: rows(c.sante), stocks: rows(c.stock), clients: rows(c.clients), fournisseurs: rows(c.fournisseurs), cultures: rows(c.cultures), salesOrders: rows(c.sales_orders), salesOrdersAll: rows(c.sales_orders), payments: rows(c.payments), paymentsAll: rows(c.payments), transactions: rows(c.finances), transactionsAll: rows(c.finances), deliveries: rows(c.deliveries), documents: rows(c.documents), alimentationLogs: rows(c.alimentation_logs), productionLogs: rows(c.production_oeufs_logs), opportunities: rows(c.sales_opportunities), businessPlans: rows(c.business_plans), bpRecurringCosts: rows(c.bp_recurring_costs), investissements: rows(c.investissements), taches: rows(c.taches), alertes: rows(c.alertes_center), equipements: rows(c.equipements), sensorDevices: rows(c.sensor_devices), cameraDevices: rows(c.camera_devices), businessEvents: rows(c.business_events), meteo: liveMeteo, weatherLoading, onNavigate: setActive, onRefresh: refreshAll, onOpenAssistant: openAssistantWithQuery, onManageFarms: handleManageFarms, farmComparisonData },
    assistant_erp: {
      dataMap: decisionDataMapRaw,
      salesOrders: rows(c.sales_orders),
      salesOrdersAll: rows(c.sales_orders),
      payments: rows(c.payments),
      paymentsAll: rows(c.payments),
      transactions: rows(c.finances),
      transactionsAll: rows(c.finances),
      onNavigate: setActive,
      onOpenAssistant: openAssistantWithQuery,
      onCreateTask: c.taches.create,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onCreateBusinessEvent: c.business_events.create,
      onCreateWhatsappLog: c.whatsapp_logs.create,
      whatsappWorkflowHandlers: {
        onCreatePayment: c.payments.create,
        onUpdatePayment: c.payments.update,
        onCreateInvoice: c.invoices.create,
        onUpdateOrder: c.sales_orders.update,
        onCreateFinanceTransaction: c.finances.create,
        onUpdateFinanceTransaction: c.finances.update,
        onCreateDocument: c.documents.create,
        onCreateBusinessEvent: c.business_events.create,
        onCreateAlert: c.alertes_center.create,
        onUpdateAlert: c.alertes_center.update,
        onCreateTask: c.taches.create,
        onUpdateClient: c.clients.update,
        onCreateOrUpdateStock: async (row) => {
          const stocks = rows(c.stock);
          const existing = stocks.find((s) => String(s.id) === String(row.id));
          if (existing) return c.stock.update(row.id, row);
          return c.stock.create(row);
        },
        onUpdateStock: c.stock.update,
        onCreateStock: c.stock.create,
        onUpdateLot: c.avicole.update,
        onUpdateAnimal: c.animaux.update,
        onCreateTrace: c.tracabilite.create,
        onUpdateOpportunity: c.sales_opportunities.update,
      },
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
      businessEvents: rows(c.business_events),
      businessEventsAll: rows(c.business_events),
    }, centre_ia: { initialTab: centreTab, onTabChange: (nextTab) => setCentreTab(resolveCentreTab(nextTab)), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), stocks: rows(c.stock), clients: rows(c.clients), alertes: rows(c.alertes_center), taches: rows(c.taches), documents: rows(c.documents), opportunities: rows(c.sales_opportunities), businessPlans: rows(c.business_plans), investissements: rows(c.investissements), productionLogs: rows(c.production_oeufs_logs), alimentationLogs: rows(c.alimentation_logs), marketPrices: dataMap.market_prices || [], marketCalendarEvents: dataMap.market_calendar_events || [], salesOrders: rows(c.sales_orders), salesOrdersAll: rows(c.sales_orders), payments: rows(c.payments), paymentsAll: rows(c.payments), transactions: rows(c.finances), transactionsAll: rows(c.finances), smartfarmEvents: dataMap.smartfarm_events || [], sensors: rows(c.sensor_devices), cameras: rows(c.camera_devices), meteo: liveMeteo, dataMap: decisionDataMapRaw, onNavigate: setActive, onCreateTask: c.taches.create, onRefreshTasks: c.taches.refresh, onCreateBusinessEvent: c.business_events.create, onRefreshBusinessEvents: c.business_events.refresh, onCreateAlert: c.alertes_center.create, onUpdateAlert: c.alertes_center.update, onRefreshAlertes: c.alertes_center.refresh, onOpenAssistant: openAssistantWithQuery, existingTasks: rows(c.taches), existingAlerts: rows(c.alertes_center) }, objectifs_croissance: { initialTab: objectifsTab, onTabChange: (nextTab) => setObjectifsTab(resolveObjectifsTab(nextTab)), dataMap: decisionDataMapRaw, animaux: rows(c.animaux), lots: rows(c.avicole), productionLogs: rows(c.production_oeufs_logs), cultures: rows(c.cultures), stocks: rows(c.stock), clients: rows(c.clients), alertes: rows(c.alertes_center), taches: rows(c.taches), documents: rows(c.documents), opportunities: rows(c.sales_opportunities), businessPlans: rows(c.business_plans), investissements: rows(c.investissements), salesOrders: rows(c.sales_orders), salesOrdersAll: rows(c.sales_orders), payments: rows(c.payments), paymentsAll: rows(c.payments), transactions: rows(c.finances), transactionsAll: rows(c.finances), onNavigate: setActive, onCreateBusinessPlan: c.business_plans.create, onRefreshBusinessPlans: c.business_plans.refresh, onCreateCulture: c.cultures.create, onRefreshCultures: c.cultures.refresh, onCreateTask: c.taches.create, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onUpdateAlert: c.alertes_center.update, onRefreshAlertes: c.alertes_center.refresh, onCreateBusinessEvent: c.business_events.create, onRefreshBusinessEvents: c.business_events.refresh, existingTasks: rows(c.taches), existingAlerts: rows(c.alertes_center) },
    elevage: {
      initialTab: elevageTab,
      onTabChange: (nextTab) => setElevageTab(resolveElevageTab(nextTab)),
      animaux: rows(c.animaux),
      lots: rows(c.avicole),
      sante: rows(c.sante),
      stocks: rows(c.stock),
      alimentationLogs: rows(c.alimentation_logs),
      businessEvents: rows(c.business_events),
      productionLogs: rows(c.production_oeufs_logs),
      stockMovements: rows(c.stock_movements),
      onNavigate: setActive,
      onOpenAssistant: openAssistantWithQuery,
      onCreateTask: c.taches.create,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onCreateBusinessEvent: c.business_events.create,
      onCreateAlimentation: c.alimentation_logs.create,
      onUpdateStock: c.stock.update,
      onRefreshStock: c.stock.refresh,
      onCreateStockMovement: c.stock_movements.create,
      onRefreshStockMovements: c.stock_movements.refresh,
      onRefreshTasks: c.taches.refresh,
      onRefreshAlertes: c.alertes_center.refresh,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
    },
    commercial: {
      initialTab: commercialTab,
      onTabChange: (nextTab) => setCommercialTab(resolveCommercialTab(nextTab)),
      clients: rows(c.clients),
      salesOrders: rows(c.sales_orders),
      salesOrdersAll: rows(c.sales_orders),
      orderItems: rows(c.sales_order_items),
      payments: rows(c.payments),
      paymentsAll: rows(c.payments),
      invoices: rows(c.invoices),
      deliveries: rows(c.deliveries),
      opportunities: rows(c.sales_opportunities),
      animals: rows(c.animaux),
      animaux: rows(c.animaux),
      lots: rows(c.avicole),
      cultures: rows(c.cultures),
      stocks: rows(c.stock),
      alimentationLogs: rows(c.alimentation_logs),
      productionLogs: rows(c.production_oeufs_logs),
      vaccins: rows(c.sante),
      businessEvents: rows(c.business_events),
      transactions: rows(c.finances),
      businessPlans: rows(c.business_plans),
      investissements: rows(c.investissements),
      documents: rows(c.documents),
      alertes: rows(c.alertes_center),
      onNavigate: navigateModule,
      onOpenAssistant: openAssistantWithQuery,
      onRefreshWorkflow: refreshSalesWorkflowFn,
      onCreate: c.sales_orders.create,
      onUpdate: c.sales_orders.update,
      onDelete: c.sales_orders.remove,
      onRefresh: c.sales_orders.refresh,
      onCreatePayment: c.payments.create,
      onUpdatePayment: c.payments.update,
      onDeletePayment: c.payments.remove,
      onRefreshPayments: c.payments.refresh,
      onCreateDelivery: c.deliveries.create,
      onUpdateDelivery: c.deliveries.update,
      onDeleteDelivery: c.deliveries.remove,
      onRefreshDeliveries: c.deliveries.refresh,
      onCreateInvoice: c.invoices.create,
      onUpdateInvoice: c.invoices.update,
      onDeleteInvoice: c.invoices.remove,
      onRefreshInvoices: c.invoices.refresh,
      onCreateDocument: c.documents.create,
      onUpdateDocument: c.documents.update,
      onRefreshDocuments: c.documents.refresh,
      onCreateClient: c.clients.create,
      onUpdateClient: c.clients.update,
      onDeleteClient: c.clients.remove,
      onRefreshClients: c.clients.refresh,
      onCreateOpportunity: c.sales_opportunities.create,
      onUpdateOpportunity: c.sales_opportunities.update,
      onDeleteOpportunity: c.sales_opportunities.remove,
      onRefreshOpportunities: c.sales_opportunities.refresh,
      onCreateTask: c.taches.create,
      onDeleteTask: c.taches.remove,
      onUpdateTask: c.taches.update,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onDeleteAlert: c.alertes_center.remove,
      onCreateFinanceTransaction: c.finances.create,
      onUpdateFinanceTransaction: c.finances.update,
      onDeleteFinanceTransaction: c.finances.remove,
      onCreateBusinessEvent: c.business_events.create,
      onRefreshTasks: c.taches.refresh,
      onRefreshAlertes: c.alertes_center.refresh,
      existingTasks: rows(c.taches),
      tracabilite: rows(c.tracabilite),
      tracabiliteAll: rows(c.tracabilite),
      onCreateTrace: c.tracabilite.create,
      onUpdateTrace: c.tracabilite.update,
      onRefreshTrace: c.tracabilite.refresh,
      existingAlerts: rows(c.alertes_center),
    },
    achats_stock: {
      initialTab: achatsStockTab,
      onTabChange: (nextTab) => setAchatsStockTab(resolveAchatsStockTab(nextTab)),
      stockNavigationContext: achatsStockContext,
      onClearStockNavigationContext: () => setAchatsStockContext(null),
      stocks: rows(c.stock),
      fournisseurs: rows(c.fournisseurs),
      suppliers: rows(c.fournisseurs),
      transactions: rows(c.finances),
      finances: rows(c.finances),
      alimentationLogs: rows(c.alimentation_logs),
      businessEvents: rows(c.business_events),
      stockMovements: rows(c.stock_movements),
      alertes: rows(c.alertes_center),
      documents: rows(c.documents),
      animaux: rows(c.animaux),
      lots: rows(c.avicole),
      opportunities: rows(c.sales_opportunities),
      onCreateOpportunity: c.sales_opportunities.create,
      onUpdateOpportunity: c.sales_opportunities.update,
      onRefreshOpportunities: c.sales_opportunities.refresh,
      onNavigate: setActive,
      onCreateStock: c.stock.create,
      onUpdateStock: c.stock.update,
      onDeleteStock: c.stock.remove,
      onRefreshStock: c.stock.refresh,
      onCreateStockMovement: c.stock_movements.create,
      onRefreshStockMovements: c.stock_movements.refresh,
      onCreateFinanceTransaction: c.finances.create,
      onUpdateFinanceTransaction: c.finances.update,
      onRefreshFinances: c.finances.refresh,
      onCreateDocument: c.documents.create,
      onRefreshDocuments: c.documents.refresh,
      onCreateSupplier: c.fournisseurs.create,
      onUpdateSupplier: c.fournisseurs.update,
      onDeleteSupplier: c.fournisseurs.remove,
      onRefreshSuppliers: c.fournisseurs.refresh,
      onCreateTask: c.taches.create,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onCreateBusinessEvent: c.business_events.create,
      onRefreshTasks: c.taches.refresh,
      onRefreshAlertes: c.alertes_center.refresh,
      onRefreshBusinessEvents: c.business_events.refresh,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
      sante: rows(c.sante),
      productionLogs: rows(c.production_oeufs_logs),
      tracabilite: rows(c.tracabilite),
      onCreateTrace: c.tracabilite.create,
      onUpdateTrace: c.tracabilite.update,
      onRefreshTrace: c.tracabilite.refresh,
      ...shared,
    },
    finance_pilotage: {
      initialTab: financeTab,
      onTabChange: (nextTab) => setFinanceTab(resolveFinanceTab(nextTab)),
      transactions: rows(c.finances),
      transactionsAll: rows(c.finances),
      finances: rows(c.finances),
      documents: rows(c.documents),
      investissements: rows(c.investissements),
      businessPlans: rows(c.business_plans),
      bpInvestmentLines: rows(c.bp_investment_lines),
      bpRecurringCosts: rows(c.bp_recurring_costs),
      bpRevenueProjections: rows(c.bp_revenue_projections),
      bpFundingSources: rows(c.bp_funding_sources),
      bpLinks: rows(c.bp_links),
      bpRisks: rows(c.bp_risks),
      payments: rows(c.payments),
      paymentsAll: rows(c.payments),
      salesOrders: rows(c.sales_orders),
      salesOrdersAll: rows(c.sales_orders),
      fournisseurs: rows(c.fournisseurs),
      clients: rows(c.clients),
      stocks: rows(c.stock),
      stockMovements: rows(c.stock_movements),
      animaux: rows(c.animaux),
      lots: rows(c.avicole),
      cultures: rows(c.cultures),
      sante: rows(c.sante),
      alimentationLogs: rows(c.alimentation_logs),
      productionLogs: rows(c.production_oeufs_logs),
      businessEvents: rows(c.business_events),
      onNavigate: navigateModule,
      onOpenAssistant: openAssistantWithQuery,
      onCreateTask: c.taches.create,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onCreateBusinessEvent: c.business_events.create,
      onCreateFinanceTransaction: c.finances.create,
      onUpdateFinanceTransaction: c.finances.update,
      onDeleteFinanceTransaction: c.finances.remove,
      onRefreshFinances: c.finances.refresh,
      onCreateDocument: c.documents.create,
      onRefreshDocuments: c.documents.refresh,
      onCreateInvestment: c.investissements.create,
      onUpdateInvestment: c.investissements.update,
      onDeleteInvestment: c.investissements.remove,
      onRefreshInvestments: c.investissements.refresh,
      onCreateBusinessPlan: c.business_plans.create,
      onUpdateBusinessPlan: c.business_plans.update,
      onDeleteBusinessPlan: c.business_plans.remove,
      onRefreshBusinessPlans: c.business_plans.refresh,
      ...bpCallbacks,
      onRefreshTasks: c.taches.refresh,
      onRefreshAlertes: c.alertes_center.refresh,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
    },
    activite_suivi: {
      initialTab: activiteSuiviTab,
      onTabChange: (nextTab) => setActiviteSuiviTab(resolveActiviteSuiviTab(nextTab)),
      alertes: rows(c.alertes_center),
      taches: rows(c.taches),
      tasks: rows(c.taches),
      tracabilite: rows(c.tracabilite),
      tracabiliteAll: rows(c.tracabilite),
      businessEvents: rows(c.business_events),
      businessEventsAll: rows(c.business_events),
      auditLogs: rows(c.audit_logs),
      auditLogsAll: rows(c.audit_logs),
      onNavigate: setActive,
      onCreateTask: c.taches.create,
      onUpdateTask: c.taches.update,
      onRefreshTasks: c.taches.refresh,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onRefreshAlertes: c.alertes_center.refresh,
      onCreateBusinessEvent: c.business_events.create,
      onRefreshBusinessEvents: c.business_events.refresh,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
    },
    documents_rapports: {
      initialTab: documentsRapportsTab,
      onTabChange: (nextTab) => setDocumentsRapportsTab(resolveDocumentsTab(nextTab)),
      documents: rows(c.documents),
      rapports: rows(c.rapports),
      reports: rows(c.rapports),
      transactions: rows(c.finances),
      finances: rows(c.finances),
      salesOrders: rows(c.sales_orders),
      payments: rows(c.payments),
      animaux: rows(c.animaux),
      lots: rows(c.avicole),
      cultures: rows(c.cultures),
      stocks: rows(c.stock),
      clients: rows(c.clients),
      fournisseurs: rows(c.fournisseurs),
      businessPlans: rows(c.business_plans),
      investissements: rows(c.investissements),
      businessEvents: rows(c.business_events),
      onNavigate: setActive,
      onCreateTask: c.taches.create,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onCreateBusinessEvent: c.business_events.create,
      onCreateDocument: c.documents.create,
      onRefreshDocuments: c.documents.refresh,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
    },
    animaux: { ...base('animaux'), alimentationLogs: rows(c.alimentation_logs), vaccins: rows(c.sante), businessEvents: rows(c.business_events), salesOrders: rows(c.sales_orders), payments: rows(c.payments), opportunities: rows(c.sales_opportunities), onCreateOpportunity: c.sales_opportunities.create, onUpdateOpportunity: c.sales_opportunities.update, onRefreshOpportunities: c.sales_opportunities.refresh, ...shared },
    avicole: { ...base('avicole'), transactions: rows(c.finances), alimentationLogs: rows(c.alimentation_logs), productionLogs: rows(c.production_oeufs_logs), onCreateProduction: c.production_oeufs_logs.create, onUpdateProduction: c.production_oeufs_logs.update, onDeleteProduction: c.production_oeufs_logs.remove, onRefreshProduction: c.production_oeufs_logs.refresh, opportunities: rows(c.sales_opportunities), onCreateOpportunity: c.sales_opportunities.create, onUpdateOpportunity: c.sales_opportunities.update, onRefreshOpportunities: c.sales_opportunities.refresh, ...shared },
    sante: { ...base('sante'), vets: rows(c.veterinaires), onCreateVet: c.veterinaires.create, onUpdateVet: c.veterinaires.update, onDeleteVet: c.veterinaires.remove, onRefreshVets: c.veterinaires.refresh, animaux: rows(c.animaux), lots: rows(c.avicole), stocks: rows(c.stock), stockMovements: rows(c.stock_movements), transactions: rows(c.finances), documents: rows(c.documents), tasks: rows(c.taches), alertes: rows(c.alertes_center), onCreateTask: c.taches.create, onUpdateTask: c.taches.update, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onUpdateAlert: c.alertes_center.update, onRefreshAlertes: c.alertes_center.refresh, onCreateFinanceTransaction: c.finances.create, onRefreshFinances: c.finances.refresh, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, onUpdateStock: c.stock.update, onRefreshStock: c.stock.refresh, onCreateStockMovement: c.stock_movements.create, onRefreshStockMovements: c.stock_movements.refresh, onNavigate: setActive },
    finances: { ...base('finances'), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), stocks: rows(c.stock), investissements: rows(c.investissements), clients: rows(c.clients), fournisseurs: rows(c.fournisseurs), documents: rows(c.documents), alimentationLogs: rows(c.alimentation_logs), businessPlans: rows(c.business_plans), salesOrders: rows(c.sales_orders), payments: rows(c.payments), ...shared },
    comptabilite: { transactions: rows(c.finances), finances: rows(c.finances), salesOrders: rows(c.sales_orders), payments: rows(c.payments), clients: rows(c.clients), fournisseurs: rows(c.fournisseurs), stocks: rows(c.stock), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), sante: rows(c.sante), investissements: rows(c.investissements), equipements: rows(c.equipements), documents: rows(c.documents), onRefreshFinances: c.finances.refresh, onNavigate: setActive },
    investissements: { ...base('investissements'), businessPlans: rows(c.business_plans), bpInvestmentLines: rows(c.bp_investment_lines), bpRecurringCosts: rows(c.bp_recurring_costs), bpRevenueProjections: rows(c.bp_revenue_projections), bpFundingSources: rows(c.bp_funding_sources), bpLinks: rows(c.bp_links), bpRisks: rows(c.bp_risks), transactions: rows(c.finances), lots: rows(c.avicole), animaux: rows(c.animaux), cultures: rows(c.cultures), onCreateBusinessPlan: c.business_plans.create, onUpdateBusinessPlan: c.business_plans.update, onDeleteBusinessPlan: c.business_plans.remove, onRefreshBusinessPlans: c.business_plans.refresh, ...bpCallbacks, onCreateFinanceTransaction: c.finances.create, onRefreshFinances: c.finances.refresh, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, onCreateLot: c.avicole.create, onRefreshLots: c.avicole.refresh, onCreateAnimal: c.animaux.create, onRefreshAnimals: c.animaux.refresh, onCreateCulture: c.cultures.create, onRefreshCultures: c.cultures.refresh, onCreateEquipement: c.equipements.create, onRefreshEquipements: c.equipements.refresh, onCreateStock: c.stock.create, onRefreshStock: c.stock.refresh, ...shared },
    impact_business: { animaux: rows(c.animaux), lots: rows(c.avicole), productionLogs: rows(c.production_oeufs_logs), sante: rows(c.sante), stocks: rows(c.stock), transactions: rows(c.finances), transactionsAll: rows(c.finances), salesOrders: rows(c.sales_orders), salesOrdersAll: rows(c.sales_orders), payments: rows(c.payments), paymentsAll: rows(c.payments), alertes: rows(c.alertes_center), taches: rows(c.taches), documents: rows(c.documents), whatsappLogs: rows(c.whatsapp_logs), businessEvents: rows(c.business_events), businessEventsAll: rows(c.business_events), auditLogs: rows(c.audit_logs), auditLogsAll: rows(c.audit_logs), cultures: rows(c.cultures), clients: rows(c.clients), fournisseurs: rows(c.fournisseurs), investissements: rows(c.investissements), businessPlans: rows(c.business_plans), alimentationLogs: rows(c.alimentation_logs), onCreateTask: c.taches.create, onRefreshTasks: c.taches.refresh, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, onCreateAlert: c.alertes_center.create, onRefreshAlertes: c.alertes_center.refresh, ...shared },
    investisseurs_forums: { initialTab: investisseursTab, onTabChange: (nextTab) => setInvestisseursTab(resolveInvestisseursTab(nextTab)), dataMap: decisionDataMapRaw, crud: c, meteo: liveMeteo, documents: rows(c.documents), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), stocks: rows(c.stock), clients: rows(c.clients), fournisseurs: rows(c.fournisseurs), salesOrders: rows(c.sales_orders), salesOrdersAll: rows(c.sales_orders), payments: rows(c.payments), paymentsAll: rows(c.payments), transactions: rows(c.finances), transactionsAll: rows(c.finances), businessPlans: rows(c.business_plans), investissements: rows(c.investissements), businessEvents: rows(c.business_events), alertes: rows(c.alertes_center), onNavigate: setActive, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, ...shared },
    stock: { ...base('stock'), alimentationLogs: rows(c.alimentation_logs), animaux: rows(c.animaux), lots: rows(c.avicole), fournisseurs: rows(c.fournisseurs), opportunities: rows(c.sales_opportunities), taches: rows(c.taches), onCreateAlimentation: c.alimentation_logs.create, onUpdateAlimentation: c.alimentation_logs.update, onDeleteAlimentation: c.alimentation_logs.remove, onRefreshAlimentation: c.alimentation_logs.refresh, onCreateFinanceTransaction: c.finances.create, onRefreshFinances: c.finances.refresh, onCreateOpportunity: c.sales_opportunities.create, onUpdateOpportunity: c.sales_opportunities.update, onRefreshOpportunities: c.sales_opportunities.refresh, onCreateTask: c.taches.create, onUpdateTask: c.taches.update, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onRefreshAlertes: c.alertes_center.refresh, ...shared },
    clients: { ...base('clients'), salesOrders: rows(c.sales_orders), payments: rows(c.payments), transactions: rows(c.finances), onNavigate: setActive },
    fournisseurs: { ...base('fournisseurs'), stocks: rows(c.stock), tasks: rows(c.taches), transactions: rows(c.finances), finances: rows(c.finances), documents: rows(c.documents), onUpdateStock: c.stock.update, onRefreshStock: c.stock.refresh, onCreateTask: c.taches.create, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onRefreshAlertes: c.alertes_center.refresh, ...shared },
    tracabilite: { ...base('tracabilite'), ...actionTraceShared, events: rows(c.business_events), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), onCreate: c.business_events.create, onUpdate: c.business_events.update, onDelete: c.business_events.remove, onNavigate: setActive, onRefresh: async () => { await c.tracabilite.refresh(); await c.business_events.refresh(); } },
    alertes: { ...actionTraceShared, alertes: rows(c.alertes_center), transactions: rows(c.finances), animaux: rows(c.animaux), lots: rows(c.avicole), stocks: rows(c.stock), cultures: rows(c.cultures), sensorDevices: rows(c.sensor_devices), loading: c.alertes_center.loading, onCreate: c.alertes_center.create, onUpdate: c.alertes_center.update, onDelete: c.alertes_center.remove, onRefresh: c.alertes_center.refresh, onCreateTask: c.taches.create, onUpdateTask: c.taches.update, onRefreshTasks: c.taches.refresh, onNavigate: setActive, whatsappTemplates: rows(c.whatsapp_templates), whatsappLogs: rows(c.whatsapp_logs), onSendWhatsApp: async (alerte, recipient = 'responsable') => { await c.whatsapp_logs.create({ alert_id: alerte.id, recipient, message: `${alerte.title || 'Alerte Horizon Farm'}\n${alerte.message || ''}\nAction recommandee: ${alerte.action_recommandee || 'Verifier dans Horizon Farm.'}`, status: 'simule', provider: 'simulation', sent_at: new Date().toISOString() }); await c.whatsapp_logs.refresh(); } },
    cultures: { ...base('cultures'), initialTab: culturesTab, onTabChange: (nextTab) => setCulturesTab(nextTab), documents: rows(c.documents), transactions: rows(c.finances), salesOrders: rows(c.sales_orders), payments: rows(c.payments), deliveriesList: rows(c.deliveries), stocks: rows(c.stock), stockMovements: rows(c.stock_movements), opportunities: rows(c.sales_opportunities), businessEvents: rows(c.business_events), clients: rows(c.clients), onCreateOpportunity: c.sales_opportunities.create, onUpdateOpportunity: c.sales_opportunities.update, onRefreshOpportunities: c.sales_opportunities.refresh, onCreateStock: c.stock.create, onUpdateStock: c.stock.update, onRefreshStock: c.stock.refresh, onRefreshStocks: c.stock.refresh, onCreateStockMovement: c.stock_movements.create, onRefreshStockMovements: c.stock_movements.refresh, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, onCreateTrace: c.tracabilite.create, onCreateInvoice: c.invoices.create, onCreateOrder: c.sales_orders.create, onCreatePayment: c.payments.create, ...shared },
    ventes: { ...base('sales_orders'), orderItems: rows(c.sales_order_items), deliveriesList: rows(c.deliveries), invoicesList: rows(c.invoices), paymentsList: rows(c.payments), opportunities: rows(c.sales_opportunities), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), stocks: rows(c.stock), alimentationLogs: rows(c.alimentation_logs), productionLogs: rows(c.production_oeufs_logs), vaccins: rows(c.sante), clients: rows(c.clients), transactions: rows(c.finances), businessEvents: rows(c.business_events), documents: rows(c.documents), alertes: rows(c.alertes_center), onRefreshWorkflow: refreshSalesWorkflowFn, onRefreshOpportunities: c.sales_opportunities.refresh, onCreateItem: c.sales_order_items.create, onUpdateItem: c.sales_order_items.update, onDeleteItem: c.sales_order_items.remove, onCreateDelivery: c.deliveries.create, onUpdateDelivery: c.deliveries.update, onDeleteDelivery: c.deliveries.remove, onRefreshDeliveries: c.deliveries.refresh, onCreateInvoice: c.invoices.create, onUpdateInvoice: c.invoices.update, onDeleteInvoice: c.invoices.remove, onRefreshInvoices: c.invoices.refresh, onCreatePayment: c.payments.create, onUpdatePayment: c.payments.update, onDeletePayment: c.payments.remove, onRefreshPayments: c.payments.refresh, onCreateOpportunity: c.sales_opportunities.create, onUpdateOpportunity: c.sales_opportunities.update, onDeleteOpportunity: c.sales_opportunities.remove, onUpdateAnimal: c.animaux.update, onRefreshAnimals: c.animaux.refresh, onUpdateLot: c.avicole.update, onRefreshLots: c.avicole.refresh, onUpdateCulture: c.cultures.update, onRefreshCultures: c.cultures.refresh, onUpdateStock: c.stock.update, onRefreshStocks: c.stock.refresh, onCreateFinanceTransaction: c.finances.create, onRefreshFinances: c.finances.refresh, onCreateTrace: c.tracabilite.create, onCreateBusinessEvent: c.business_events.create, onRefreshBusinessEvents: c.business_events.refresh, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, onCreateAlert: c.alertes_center.create, onRefreshAlertes: c.alertes_center.refresh, onUpdateClient: c.clients.update, onNavigate: setActive },
    documents: { ...base('documents'), animaux: rows(c.animaux), lots: rows(c.avicole), cultures: rows(c.cultures), clients: rows(c.clients), fournisseurs: rows(c.fournisseurs), transactions: rows(c.finances), finances: rows(c.finances), salesOrders: rows(c.sales_orders), payments: rows(c.payments), invoices: rows(c.invoices), businessPlans: rows(c.business_plans), investissements: rows(c.investissements), onNavigate: setActive },
    taches: { ...base('taches'), ...actionTraceShared, alertes: rows(c.alertes_center), animaux: rows(c.animaux), lots: rows(c.avicole), stocks: rows(c.stock), sensorDevices: rows(c.sensor_devices), onUpdateAlert: c.alertes_center.update, onRefreshAlertes: c.alertes_center.refresh, ...shared },
    rh: {
      ...internalResourcesShared,
      initialTab: rhTab,
      onTabChange: (nextTab) => setRhTab(resolveRhTab(nextTab)),
      alertes: rows(c.alertes_center),
      onNavigate: setActive,
      onRefresh: refreshAll,
      onCreateFinanceTransaction: c.finances.create,
      onRefreshFinances: c.finances.refresh,
      onCreateDocument: c.documents.create,
      onRefreshDocuments: c.documents.refresh,
      onCreateTask: c.taches.create,
      onUpdateTask: c.taches.update,
      onRefreshTasks: c.taches.refresh,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onRefreshAlertes: c.alertes_center.refresh,
      onCreateBusinessEvent: c.business_events.create,
      onRefreshBusinessEvents: c.business_events.refresh,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
      ...shared,
    },
    rapports: { ...base('rapports'), data: reportData, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, onCreateTask: c.taches.create, onRefreshTasks: c.taches.refresh, ...shared },
    equipements: { ...base('equipements'), ...internalResourcesShared, tasks: rows(c.taches), alertes: rows(c.alertes_center), onCreateTask: c.taches.create, onUpdateTask: c.taches.update, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onUpdateAlert: c.alertes_center.update, onRefreshAlertes: c.alertes_center.refresh, onCreateFinanceTransaction: c.finances.create, onRefreshFinances: c.finances.refresh, onCreateDocument: c.documents.create, onRefreshDocuments: c.documents.refresh, ...shared },
    audit_logs: syncActivityProps, smartfarm: { meteo: liveMeteo, online, smartfarmEvents: dataMap.smartfarm_events || [], sensors: rows(c.sensor_devices), cameras: rows(c.camera_devices), tasks: rows(c.taches), alertes: rows(c.alertes_center), dataMap, sensorLoading: c.sensor_devices.loading, cameraLoading: c.camera_devices.loading, onCreateSensor: c.sensor_devices.create, onUpdateSensor: c.sensor_devices.update, onDeleteSensor: c.sensor_devices.remove, onRefreshSensors: c.sensor_devices.refresh, onCreateCamera: c.camera_devices.create, onUpdateCamera: c.camera_devices.update, onDeleteCamera: c.camera_devices.remove, onRefreshCameras: c.camera_devices.refresh, onCreateSmartfarmEvent: c.smartfarm_events.create, onUpdateSmartfarmEvent: c.smartfarm_events.update, onRefreshSmartfarmEvents: c.smartfarm_events.refresh, onCreateTask: c.taches.create, onRefreshTasks: c.taches.refresh, onCreateAlert: c.alertes_center.create, onRefreshAlertes: c.alertes_center.refresh, onCreateBusinessEvent: c.business_events.create, onRefreshBusinessEvents: c.business_events.refresh, ...shared },
    gestion_systeme: {
      ...internalResourcesShared,
      initialTab: gestionSystemeTab,
      onTabChange: setGestionSystemeTab,
      accessibleFarms: effectiveAccessibleFarms,
      companyId: user?.user_metadata?.company_id || user?.company_id || null,
      onFarmsChanged: refreshAccessibleFarms,
      farmsPanelAction,
      farmComparisonData,
      onManageFarms: handleManageFarms,
      alertes: rows(c.alertes_center),
      businessEvents: rows(c.business_events),
      businessEventsAll: rows(c.business_events),
      auditLogs: rows(c.audit_logs),
      auditLogsAll: rows(c.audit_logs),
      online,
      lastOnlineAt,
      dataMap: decisionDataMapRaw,
      onNavigate: setActive,
      onRefreshAll: refreshAll,
      onFlushOffline: flushOfflineQueue,
      onCreateTask: c.taches.create,
      onCreateAlert: c.alertes_center.create,
      onUpdateAlert: c.alertes_center.update,
      onCreateBusinessEvent: c.business_events.create,
      existingTasks: rows(c.taches),
      existingAlerts: rows(c.alertes_center),
    },
    sync: syncActivityProps,
    sync_activity: syncActivityProps,
  };
  }, [c, user, liveMeteo, decisionDataMapRaw, crudFingerprint, centreTab, objectifsTab, commercialTab, elevageTab, culturesTab, achatsStockTab, achatsStockContext, financeTab, activiteSuiviTab, documentsRapportsTab, rhTab, gestionSystemeTab, investisseursTab, farmsPanelAction, accessibleFarms, effectiveAccessibleFarms, refreshAccessibleFarms, online, lastOnlineAt, dataMap, refreshAll, refreshSalesWorkflowFn, navigateModule, setActive, flushOfflineQueue, handleManageFarms, farmComparisonData, openAssistantWithQuery]);

  const activeModuleProps = useMemo(
    () => applyFarmScopeToProps(
      applyPeriodScopeToProps(moduleProps[resolveActiveModuleId(active)] || moduleProps[active] || {}, periodScope, { cacheGeneration: crudFingerprint }),
      farmScope,
      { accessibleFarms: effectiveAccessibleFarms, activeFarm, moduleId: resolveActiveModuleId(active) },
    ),
    [moduleProps, active, periodScopeKey, crudFingerprint, commercialTab, elevageTab, culturesTab, achatsStockTab, financeTab, activiteSuiviTab, documentsRapportsTab, rhTab, centreTab, objectifsTab, periodScope, farmScope, effectiveAccessibleFarms, activeFarm],
  );
  const scopedAssistantDataMap = useMemo(
    () => {
      const periodActive = assistantOpen && !isAllTimeScope(periodScope);
      const base = periodActive
        ? applyPeriodScopeToDataMap(dataMap, periodScope, crudFingerprint)
        : dataMap;
      const farmScoped = applyFarmScopeToDataMap(base, farmScope, { accessibleFarms: effectiveAccessibleFarms, activeFarm });
      if (!assistantOpen) return farmScoped;
      return enrichAssistantDataMap(farmScoped, {
        salesOrdersAll: rows(c.sales_orders),
        paymentsAll: rows(c.payments),
        transactionsAll: rows(c.finances),
        periodFiltered: periodActive,
        periodScope: normalizePeriodScope(periodScope),
        periodLabel: formatPeriodScopeLabel(periodScope),
        farmScope: normalizeFarmScope(farmScope, effectiveAccessibleFarms),
        farmScopeLabel: formatFarmScopeLabel(farmScope, effectiveAccessibleFarms),
        activeFarm,
        accessibleFarms: effectiveAccessibleFarms,
      });
    },
    [assistantOpen, dataMap, periodScopeKey, crudFingerprint, periodScope, farmScope, effectiveAccessibleFarms, activeFarm, c.sales_orders, c.payments, c.finances],
  );

  if (authLoading) return <div className="min-h-screen bg-[#f6efe2] flex items-center justify-center text-[#2f2415] font-black">Chargement Horizon Farm...</div>;
  if (!user) return <LoginPage />;
  const resolvedActive = resolveActiveModuleId(active);
  const ActiveModule = MODULES[resolvedActive] || MODULES.dashboard;

  const activeModuleLabel = MODULE_REGISTRY[resolvedActive]?.label || MODULE_REGISTRY[active]?.label || resolvedActive;

  return <>
    <ProductionUpdateBanner />
    <AppLayout navItems={navItems} active={resolvedActive} onNavigate={setActive} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} user={user} signOut={signOut} online={online} notifs={notifs} weather={liveMeteo} weatherLoading={weatherLoading} weatherSource={weatherSource} onOpenAssistant={() => openAssistantWithQuery()} periodScope={periodScope} onPeriodScopeChange={handlePeriodScopeChange} farmScope={normalizeFarmScope(farmScope, effectiveAccessibleFarms)} accessibleFarms={effectiveAccessibleFarms} onFarmScopeChange={handleFarmScopeChange} activeFarm={activeFarm} onManageFarms={handleManageFarms}>
    <FarmActivityNotice message={activeModuleProps.farmActivityNotice} farmName={activeFarm?.name} actionLabel={activeModuleProps.farmActivityNoticeDetail?.actionLabel} onAction={activeModuleProps.farmActivityNoticeDetail ? handleFarmActivityAction : undefined} />
    <ErrorBoundary moduleName={activeModuleLabel} resetKey={resolvedActive} onBackToDashboard={() => setActive('dashboard')}><Suspense fallback={<div className="rounded-3xl border border-[#d6c3a0] bg-white p-6 text-[#8a7456]">Chargement du module...</div>}><ActiveModule {...activeModuleProps} periodLabel={periodLabel} farmScopeLabel={formatFarmScopeLabel(farmScope, effectiveAccessibleFarms)} /></Suspense></ErrorBoundary>
    <AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} dataMap={scopedAssistantDataMap} onNavigate={setActive} onCreateBusinessEvent={c.business_events.create} />
    <ErpInterconnectionBridge cruds={c} />
    <AppNotificationManager />
  </AppLayout></>;
}
