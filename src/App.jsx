import { lazy, Suspense, useMemo, useState } from 'react';
import {
  Beef,
  Bird,
  BookOpen,
  DollarSign,
  FileText,
  GitBranch,
  History,
  LayoutDashboard,
  ListChecks,
  Package,
  Radio,
  Receipt,
  Sprout,
  Syringe,
  TrendingUp,
  Truck,
  Users,
  Wifi,
  Wrench,
} from 'lucide-react';
import AppNotificationManager from './components/AppNotificationManager';
import AssistantPanel from './components/AssistantPanel';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './context/AuthContext';
import { useAppData } from './context/AppContext';
import useCrudModule from './hooks/useCrudModule';
import useLiveWeather from './hooks/useLiveWeather';
import useOnlineStatus from './hooks/useOnlineStatus';
import AppLayout from './layouts/AppLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';

const MODULES = {
  dashboard: lazy(() => import('./modules/Dashboard')),
  animaux: lazy(() => import('./modules/Animaux')),
  avicole: lazy(() => import('./modules/AvicoleV8')),
  sante: lazy(() => import('./modules/SanteV5')),
  finances: lazy(() => import('./modules/FinancesV10')),
  comptabilite: lazy(() => import('./modules/ComptabiliteV4')),
  investissements: lazy(() => import('./modules/InvestissementsV8')),
  impact_business: lazy(() => import('./modules/ImpactBusiness')),
  stock: lazy(() => import('./modules/StocksV3')),
  clients: lazy(() => import('./modules/Clients')),
  fournisseurs: lazy(() => import('./modules/Fournisseurs')),
  tracabilite: lazy(() => import('./modules/Tracabilite')),
  alertes: lazy(() => import('./modules/AlertesCenter')),
  sync: lazy(() => import('./modules/Sync')),
  cultures: lazy(() => import('./modules/CulturesV3')),
  smartfarm: lazy(() => import('./modules/SmartFarm')),
  ventes: lazy(() => import('./modules/VentesV2')),
  documents: lazy(() => import('./modules/DocumentsV2')),
  taches: lazy(() => import('./modules/TachesV2')),
  rh: lazy(() => import('./modules/RH')),
  rapports: lazy(() => import('./modules/Rapports')),
  equipements: lazy(() => import('./modules/Equipements')),
  audit_logs: lazy(() => import('./modules/AuditLogs')),
};

export default function App() {
  const [active, setActive] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [assistantOpen, setAssistantOpen] = useState(false);

  const { user, loading: authLoading, signOut, canAccess } = useAuth();
  const { dataMap, refreshModule, flushOfflineQueue } = useAppData();
  const { online, lastOnlineAt } = useOnlineStatus();
  const { weather: liveMeteo, loading: weatherLoading, source: weatherSource } = useLiveWeather();

  const animauxCrud = useCrudModule('animaux');
  const avicoleCrud = useCrudModule('avicole');
  const santeCrud = useCrudModule('sante');
  const veterinairesCrud = useCrudModule('veterinaires');
  const financesCrud = useCrudModule('finances');
  const investissementsCrud = useCrudModule('investissements');
  const businessPlansCrud = useCrudModule('business_plans');
  const bpInvestmentLinesCrud = useCrudModule('bp_investment_lines');
  const bpRecurringCostsCrud = useCrudModule('bp_recurring_costs');
  const bpRevenueProjectionsCrud = useCrudModule('bp_revenue_projections');
  const bpFundingSourcesCrud = useCrudModule('bp_funding_sources');
  const bpLinksCrud = useCrudModule('bp_links');
  const bpRisksCrud = useCrudModule('bp_risks');
  const stockCrud = useCrudModule('stock');
  const clientsCrud = useCrudModule('clients');
  const fournisseursCrud = useCrudModule('fournisseurs');
  const tracabiliteCrud = useCrudModule('tracabilite');
  const culturesCrud = useCrudModule('cultures');
  const documentsCrud = useCrudModule('documents');
  const tachesCrud = useCrudModule('taches');
  const rapportsCrud = useCrudModule('rapports');
  const equipementsCrud = useCrudModule('equipements');
  const auditLogsCrud = useCrudModule('audit_logs');
  const alimentationLogsCrud = useCrudModule('alimentation_logs');
  const productionOeufsLogsCrud = useCrudModule('production_oeufs_logs');
  const sensorDevicesCrud = useCrudModule('sensor_devices');
  const cameraDevicesCrud = useCrudModule('camera_devices');
  const businessEventsCrud = useCrudModule('business_events');
  const alertesCenterCrud = useCrudModule('alertes_center');
  const whatsappTemplatesCrud = useCrudModule('whatsapp_templates');
  const whatsappLogsCrud = useCrudModule('whatsapp_logs');
  const salesOrdersCrud = useCrudModule('sales_orders');
  const salesOrderItemsCrud = useCrudModule('sales_order_items');
  const deliveriesCrud = useCrudModule('deliveries');
  const invoicesCrud = useCrudModule('invoices');
  const paymentsCrud = useCrudModule('payments');
  const salesOpportunitiesCrud = useCrudModule('sales_opportunities');

  const vaccinsRetard = (dataMap.sante || []).filter((v) => v.statut === 'retard').length;
  const stocksCritiques = (dataMap.stock || []).filter((s) => Number(s.quantite || 0) <= Number(s.seuil || 0)).length;
  const animauxMalades = (dataMap.animaux || []).filter((a) => a.health_status === 'malade').length;
  const culturesRisque = (dataMap.cultures || []).filter((c) => Number(c.score_sante || 0) < 80 || c.statut === 'perdu').length;
  const lotsAlerte = (dataMap.avicole || []).filter((lot) => Number(lot.mortality || 0) > Number(lot.initial_count || 0) * 0.04 || Number(lot.scoresSante || 100) < 88).length;
  const financesAlerte = (dataMap.finances || []).filter((trx) => ['impaye', 'partiel'].includes(trx.statut)).length;
  const fournisseursAlerte = (dataMap.fournisseurs || []).filter((f) => Number(f.dettes || 0) > 0 || f.statut === 'a_risque').length;
  const equipementsAlerte = (dataMap.equipements || []).filter((e) => ['panne', 'maintenance', 'hors_service'].includes(e.status)).length;
  const tachesAlerte = (dataMap.taches || []).filter((t) => t.priority === 'critique' || t.status === 'retard').length;
  const notifs = vaccinsRetard + stocksCritiques + animauxMalades + culturesRisque + lotsAlerte + financesAlerte + fournisseursAlerte + equipementsAlerte + tachesAlerte + (online ? 0 : 1);

  const refreshAll = async () => {
    await Promise.allSettled([
      refreshModule('animaux'), refreshModule('avicole'), refreshModule('sante'), refreshModule('veterinaires'), refreshModule('finances'), refreshModule('investissements'), refreshModule('business_plans'), refreshModule('bp_investment_lines'), refreshModule('bp_recurring_costs'), refreshModule('bp_revenue_projections'), refreshModule('bp_funding_sources'), refreshModule('bp_links'), refreshModule('bp_risks'), refreshModule('stock'), refreshModule('clients'), refreshModule('fournisseurs'), refreshModule('tracabilite'), refreshModule('cultures'), refreshModule('ventes'), refreshModule('documents'), refreshModule('taches'), refreshModule('rapports'), refreshModule('equipements'), refreshModule('audit_logs'), refreshModule('alimentation_logs'), refreshModule('production_oeufs_logs'), refreshModule('sensor_devices'), refreshModule('camera_devices'), refreshModule('business_events'), refreshModule('alertes_center'), refreshModule('whatsapp_templates'), refreshModule('whatsapp_logs'), refreshModule('sales_orders'), refreshModule('sales_order_items'), refreshModule('deliveries'), refreshModule('invoices'), refreshModule('payments'), refreshModule('sales_opportunities')
    ]);
  };

  const navItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard }, { id: 'animaux', label: 'Animaux', icon: Beef }, { id: 'avicole', label: 'Avicole', icon: Bird }, { id: 'sante', label: 'Sante & Vaccins', icon: Syringe, hasAlert: vaccinsRetard > 0 }, { id: 'finances', label: 'Finances', icon: DollarSign }, { id: 'comptabilite', label: 'Comptabilite', icon: BookOpen }, { id: 'investissements', label: 'Investissements', icon: TrendingUp }, { id: 'impact_business', label: 'Impact & Valeur ERP', icon: TrendingUp, hasAlert: vaccinsRetard > 0 || stocksCritiques > 0 || animauxMalades > 0 || lotsAlerte > 0 }, { id: 'stock', label: 'Stock', icon: Package, hasAlert: stocksCritiques > 0 }, { id: 'clients', label: 'Clients & WhatsApp', icon: Users }, { id: 'ventes', label: 'Ventes', icon: Receipt }, { id: 'fournisseurs', label: 'Fournisseurs', icon: Truck }, { id: 'tracabilite', label: 'Tracabilite', icon: GitBranch }, { id: 'alertes', label: 'Centre Alertes', icon: History, hasAlert: (dataMap.alertes_center || []).filter((a) => a.status === 'nouvelle').length > 0 }, { id: 'cultures', label: 'Cultures', icon: Sprout, hasAlert: culturesRisque > 0 }, { id: 'documents', label: 'Documents', icon: FileText }, { id: 'taches', label: 'Taches', icon: ListChecks }, { id: 'rh', label: 'RH & Équipe', icon: Users }, { id: 'rapports', label: 'Rapports', icon: FileText }, { id: 'equipements', label: 'Equipements', icon: Wrench }, { id: 'smartfarm', label: 'Smart Farm', icon: Radio }, { id: 'audit_logs', label: 'Audit Logs', icon: History }, { id: 'sync', label: 'Sync Offline', icon: Wifi, hasAlert: !online },
  ].filter((item) => item.id === 'rh' || canAccess(item.id)), [vaccinsRetard, stocksCritiques, culturesRisque, online, canAccess, dataMap.alertes_center, animauxMalades, lotsAlerte]);

  const reportData = { animaux: animauxCrud.rows, lots: avicoleCrud.rows, sante: santeCrud.rows, stocks: stockCrud.rows, cultures: culturesCrud.rows, salesOrders: salesOrdersCrud.rows, payments: paymentsCrud.rows, transactions: financesCrud.rows, clients: clientsCrud.rows, fournisseurs: fournisseursCrud.rows, taches: tachesCrud.rows, alertes: alertesCenterCrud.rows, equipements: equipementsCrud.rows };

  const moduleProps = {
    dashboard: { lotsData: avicoleCrud.rows, animaux: animauxCrud.rows, vaccins: santeCrud.rows, stocks: stockCrud.rows, clients: clientsCrud.rows, cultures: culturesCrud.rows, salesOrders: salesOrdersCrud.rows, payments: paymentsCrud.rows, transactions: financesCrud.rows, alimentationLogs: alimentationLogsCrud.rows, productionLogs: productionOeufsLogsCrud.rows, opportunities: salesOpportunitiesCrud.rows, taches: tachesCrud.rows, alertes: alertesCenterCrud.rows, equipements: equipementsCrud.rows, businessEvents: businessEventsCrud.rows, meteo: liveMeteo, onNavigate: setActive, onRefresh: refreshAll },
    animaux: { rows: animauxCrud.rows, alimentationLogs: alimentationLogsCrud.rows, vaccins: santeCrud.rows, opportunities: salesOpportunitiesCrud.rows, loading: animauxCrud.loading, onCreate: animauxCrud.create, onUpdate: animauxCrud.update, onDelete: animauxCrud.remove, onRefresh: animauxCrud.refresh, onCreateOpportunity: salesOpportunitiesCrud.create, onUpdateOpportunity: salesOpportunitiesCrud.update, onRefreshOpportunities: salesOpportunitiesCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    avicole: { rows: avicoleCrud.rows, alimentationLogs: alimentationLogsCrud.rows, productionLogs: productionOeufsLogsCrud.rows, loading: avicoleCrud.loading || productionOeufsLogsCrud.loading, onCreate: avicoleCrud.create, onUpdate: avicoleCrud.update, onDelete: avicoleCrud.remove, onRefresh: avicoleCrud.refresh, onCreateProduction: productionOeufsLogsCrud.create, onUpdateProduction: productionOeufsLogsCrud.update, onDeleteProduction: productionOeufsLogsCrud.remove, onRefreshProduction: productionOeufsLogsCrud.refresh, opportunities: salesOpportunitiesCrud.rows, onCreateOpportunity: salesOpportunitiesCrud.create, onUpdateOpportunity: salesOpportunitiesCrud.update, onRefreshOpportunities: salesOpportunitiesCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    sante: { rows: santeCrud.rows, vets: veterinairesCrud.rows, loading: santeCrud.loading, vetsLoading: veterinairesCrud.loading, onCreate: santeCrud.create, onUpdate: santeCrud.update, onDelete: santeCrud.remove, onRefresh: santeCrud.refresh, onCreateVet: veterinairesCrud.create, onUpdateVet: veterinairesCrud.update, onDeleteVet: veterinairesCrud.remove, onRefreshVets: veterinairesCrud.refresh, animaux: animauxCrud.rows, lots: avicoleCrud.rows, stocks: stockCrud.rows, transactions: financesCrud.rows, onCreateFinanceTransaction: financesCrud.create, onRefreshFinances: financesCrud.refresh },
    finances: { rows: financesCrud.rows, loading: financesCrud.loading, onCreate: financesCrud.create, onUpdate: financesCrud.update, onDelete: financesCrud.remove, onRefresh: financesCrud.refresh, animaux: animauxCrud.rows, lots: avicoleCrud.rows, cultures: culturesCrud.rows, stocks: stockCrud.rows, investissements: investissementsCrud.rows, clients: clientsCrud.rows, fournisseurs: fournisseursCrud.rows, alimentationLogs: alimentationLogsCrud.rows, businessPlans: businessPlansCrud.rows, salesOrders: salesOrdersCrud.rows, payments: paymentsCrud.rows },
    comptabilite: { transactions: financesCrud.rows, finances: financesCrud.rows, salesOrders: salesOrdersCrud.rows, payments: paymentsCrud.rows, clients: clientsCrud.rows, fournisseurs: fournisseursCrud.rows, stocks: stockCrud.rows, animaux: animauxCrud.rows, lots: avicoleCrud.rows, cultures: culturesCrud.rows, sante: santeCrud.rows, investissements: investissementsCrud.rows, equipements: equipementsCrud.rows, documents: documentsCrud.rows, onRefreshFinances: financesCrud.refresh, onNavigate: setActive },
    investissements: { rows: investissementsCrud.rows, loading: investissementsCrud.loading || businessPlansCrud.loading, onCreate: investissementsCrud.create, onUpdate: investissementsCrud.update, onDelete: investissementsCrud.remove, onRefresh: investissementsCrud.refresh, businessPlans: businessPlansCrud.rows, bpInvestmentLines: bpInvestmentLinesCrud.rows, bpRecurringCosts: bpRecurringCostsCrud.rows, bpRevenueProjections: bpRevenueProjectionsCrud.rows, bpFundingSources: bpFundingSourcesCrud.rows, bpLinks: bpLinksCrud.rows, bpRisks: bpRisksCrud.rows, transactions: financesCrud.rows, lots: avicoleCrud.rows, animaux: animauxCrud.rows, cultures: culturesCrud.rows, onCreateBusinessPlan: businessPlansCrud.create, onUpdateBusinessPlan: businessPlansCrud.update, onDeleteBusinessPlan: businessPlansCrud.remove, onRefreshBusinessPlans: businessPlansCrud.refresh, onCreateBpInvestmentLine: bpInvestmentLinesCrud.create, onUpdateBpInvestmentLine: bpInvestmentLinesCrud.update, onDeleteBpInvestmentLine: bpInvestmentLinesCrud.remove, onCreateBpRecurringCost: bpRecurringCostsCrud.create, onUpdateBpRecurringCost: bpRecurringCostsCrud.update, onDeleteBpRecurringCost: bpRecurringCostsCrud.remove, onCreateBpRevenueProjection: bpRevenueProjectionsCrud.create, onUpdateBpRevenueProjection: bpRevenueProjectionsCrud.update, onDeleteBpRevenueProjection: bpRevenueProjectionsCrud.remove, onCreateBpFundingSource: bpFundingSourcesCrud.create, onUpdateBpFundingSource: bpFundingSourcesCrud.update, onDeleteBpFundingSource: bpFundingSourcesCrud.remove, onCreateBpRisk: bpRisksCrud.create, onUpdateBpRisk: bpRisksCrud.update, onDeleteBpRisk: bpRisksCrud.remove, onCreateFinanceTransaction: financesCrud.create, onRefreshFinances: financesCrud.refresh, onCreateLot: avicoleCrud.create, onRefreshLots: avicoleCrud.refresh, onCreateAnimal: animauxCrud.create, onRefreshAnimals: animauxCrud.refresh, onCreateCulture: culturesCrud.create, onRefreshCultures: culturesCrud.refresh },
    impact_business: { animaux: animauxCrud.rows, lots: avicoleCrud.rows, productionLogs: productionOeufsLogsCrud.rows, sante: santeCrud.rows, stocks: stockCrud.rows, transactions: financesCrud.rows, salesOrders: salesOrdersCrud.rows, payments: paymentsCrud.rows, alertes: alertesCenterCrud.rows, taches: tachesCrud.rows, documents: documentsCrud.rows, whatsappLogs: whatsappLogsCrud.rows, businessEvents: businessEventsCrud.rows, onNavigate: setActive },
    stock: { rows: stockCrud.rows, alimentationLogs: alimentationLogsCrud.rows, animaux: animauxCrud.rows, lots: avicoleCrud.rows, fournisseurs: fournisseursCrud.rows, opportunities: salesOpportunitiesCrud.rows, taches: tachesCrud.rows, loading: stockCrud.loading, onCreate: stockCrud.create, onUpdate: stockCrud.update, onDelete: stockCrud.remove, onRefresh: stockCrud.refresh, onCreateAlimentation: alimentationLogsCrud.create, onUpdateAlimentation: alimentationLogsCrud.update, onDeleteAlimentation: alimentationLogsCrud.remove, onRefreshAlimentation: alimentationLogsCrud.refresh, onCreateFinanceTransaction: financesCrud.create, onRefreshFinances: financesCrud.refresh, onCreateOpportunity: salesOpportunitiesCrud.create, onUpdateOpportunity: salesOpportunitiesCrud.update, onRefreshOpportunities: salesOpportunitiesCrud.refresh, onCreateTask: tachesCrud.create, onUpdateTask: tachesCrud.update, onRefreshTasks: tachesCrud.refresh, onCreateAlert: alertesCenterCrud.create, onRefreshAlertes: alertesCenterCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    clients: { rows: clientsCrud.rows, loading: clientsCrud.loading, salesOrders: salesOrdersCrud.rows, payments: paymentsCrud.rows, transactions: financesCrud.rows, onCreate: clientsCrud.create, onUpdate: clientsCrud.update, onDelete: clientsCrud.remove, onRefresh: clientsCrud.refresh },
    fournisseurs: { rows: fournisseursCrud.rows, stocks: stockCrud.rows, tasks: tachesCrud.rows, loading: fournisseursCrud.loading, onCreate: fournisseursCrud.create, onUpdate: fournisseursCrud.update, onDelete: fournisseursCrud.remove, onRefresh: fournisseursCrud.refresh, onUpdateStock: stockCrud.update, onRefreshStock: stockCrud.refresh, onCreateTask: tachesCrud.create, onRefreshTasks: tachesCrud.refresh, onCreateAlert: alertesCenterCrud.create, onRefreshAlertes: alertesCenterCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    tracabilite: { rows: tracabiliteCrud.rows, events: businessEventsCrud.rows, animaux: animauxCrud.rows, lots: avicoleCrud.rows, cultures: culturesCrud.rows, loading: tracabiliteCrud.loading || businessEventsCrud.loading, onCreate: businessEventsCrud.create, onUpdate: businessEventsCrud.update, onDelete: businessEventsCrud.remove, onNavigate: setActive, onRefresh: async () => { await tracabiliteCrud.refresh(); await businessEventsCrud.refresh(); } },
    alertes: { alertes: alertesCenterCrud.rows, transactions: financesCrud.rows, animaux: animauxCrud.rows, lots: avicoleCrud.rows, stocks: stockCrud.rows, cultures: culturesCrud.rows, sensorDevices: sensorDevicesCrud.rows, loading: alertesCenterCrud.loading, onCreate: alertesCenterCrud.create, onUpdate: alertesCenterCrud.update, onDelete: alertesCenterCrud.remove, onRefresh: alertesCenterCrud.refresh, onNavigate: setActive, whatsappTemplates: whatsappTemplatesCrud.rows, whatsappLogs: whatsappLogsCrud.rows, onSendWhatsApp: async (alerte, recipient = 'responsable') => { await whatsappLogsCrud.create({ alert_id: alerte.id, recipient, message: `${alerte.title || 'Alerte Horizon Farm'}\n${alerte.message || ''}\nAction recommandee: ${alerte.action_recommandee || 'Verifier dans Horizon Farm.'}`, status: 'simule', provider: 'simulation', sent_at: new Date().toISOString() }); await whatsappLogsCrud.refresh(); } },
    cultures: { rows: culturesCrud.rows, opportunities: salesOpportunitiesCrud.rows, loading: culturesCrud.loading, onCreate: culturesCrud.create, onUpdate: culturesCrud.update, onDelete: culturesCrud.remove, onRefresh: culturesCrud.refresh, onCreateOpportunity: salesOpportunitiesCrud.create, onUpdateOpportunity: salesOpportunitiesCrud.update, onRefreshOpportunities: salesOpportunitiesCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    ventes: { rows: salesOrdersCrud.rows, orderItems: salesOrderItemsCrud.rows, deliveriesList: deliveriesCrud.rows, invoicesList: invoicesCrud.rows, paymentsList: paymentsCrud.rows, opportunities: salesOpportunitiesCrud.rows, animaux: animauxCrud.rows, lots: avicoleCrud.rows, cultures: culturesCrud.rows, stocks: stockCrud.rows, clients: clientsCrud.rows, transactions: financesCrud.rows, businessEvents: businessEventsCrud.rows, documents: documentsCrud.rows, loading: salesOrdersCrud.loading, onCreate: salesOrdersCrud.create, onUpdate: salesOrdersCrud.update, onDelete: salesOrdersCrud.remove, onRefresh: salesOrdersCrud.refresh, onRefreshOpportunities: salesOpportunitiesCrud.refresh, onCreateItem: salesOrderItemsCrud.create, onUpdateItem: salesOrderItemsCrud.update, onDeleteItem: salesOrderItemsCrud.remove, onCreateDelivery: deliveriesCrud.create, onUpdateDelivery: deliveriesCrud.update, onDeleteDelivery: deliveriesCrud.remove, onCreateInvoice: invoicesCrud.create, onUpdateInvoice: invoicesCrud.update, onDeleteInvoice: invoicesCrud.remove, onCreatePayment: paymentsCrud.create, onUpdatePayment: paymentsCrud.update, onDeletePayment: paymentsCrud.remove, onCreateOpportunity: salesOpportunitiesCrud.create, onUpdateOpportunity: salesOpportunitiesCrud.update, onDeleteOpportunity: salesOpportunitiesCrud.remove, onUpdateAnimal: animauxCrud.update, onUpdateLot: avicoleCrud.update, onUpdateCulture: culturesCrud.update, onUpdateStock: stockCrud.update, onCreateFinanceTransaction: financesCrud.create, onCreateTrace: tracabiliteCrud.create, onCreateBusinessEvent: businessEventsCrud.create, onUpdateClient: clientsCrud.update },
    documents: { rows: documentsCrud.rows, animaux: animauxCrud.rows, lots: avicoleCrud.rows, cultures: culturesCrud.rows, clients: clientsCrud.rows, fournisseurs: fournisseursCrud.rows, transactions: financesCrud.rows, finances: financesCrud.rows, loading: documentsCrud.loading, onCreate: documentsCrud.create, onUpdate: documentsCrud.update, onDelete: documentsCrud.remove, onRefresh: documentsCrud.refresh },
    taches: { rows: tachesCrud.rows, alertes: alertesCenterCrud.rows, loading: tachesCrud.loading, onCreate: tachesCrud.create, onUpdate: tachesCrud.update, onDelete: tachesCrud.remove, onRefresh: tachesCrud.refresh, onUpdateAlert: alertesCenterCrud.update, onRefreshAlertes: alertesCenterCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    rh: { onRefresh: refreshAll },
    rapports: { rows: rapportsCrud.rows, data: reportData, loading: rapportsCrud.loading, onCreate: rapportsCrud.create, onUpdate: rapportsCrud.update, onDelete: rapportsCrud.remove, onRefresh: rapportsCrud.refresh, onCreateDocument: documentsCrud.create, onRefreshDocuments: documentsCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    equipements: { rows: equipementsCrud.rows, tasks: tachesCrud.rows, loading: equipementsCrud.loading, onCreate: equipementsCrud.create, onUpdate: equipementsCrud.update, onDelete: equipementsCrud.remove, onRefresh: equipementsCrud.refresh, onCreateTask: tachesCrud.create, onUpdateTask: tachesCrud.update, onRefreshTasks: tachesCrud.refresh, onCreateAlert: alertesCenterCrud.create, onRefreshAlertes: alertesCenterCrud.refresh, onCreateFinanceTransaction: financesCrud.create, onRefreshFinances: financesCrud.refresh, onCreateDocument: documentsCrud.create, onRefreshDocuments: documentsCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    audit_logs: { rows: auditLogsCrud.rows, loading: auditLogsCrud.loading, onCreate: auditLogsCrud.create, onUpdate: auditLogsCrud.update, onDelete: auditLogsCrud.remove, onRefresh: auditLogsCrud.refresh },
    smartfarm: { meteo: liveMeteo, online, sensors: sensorDevicesCrud.rows, cameras: cameraDevicesCrud.rows, tasks: tachesCrud.rows, sensorLoading: sensorDevicesCrud.loading, cameraLoading: cameraDevicesCrud.loading, onCreateSensor: sensorDevicesCrud.create, onUpdateSensor: sensorDevicesCrud.update, onDeleteSensor: sensorDevicesCrud.remove, onRefreshSensors: sensorDevicesCrud.refresh, onCreateCamera: cameraDevicesCrud.create, onUpdateCamera: cameraDevicesCrud.update, onDeleteCamera: cameraDevicesCrud.remove, onRefreshCameras: cameraDevicesCrud.refresh, onCreateTask: tachesCrud.create, onRefreshTasks: tachesCrud.refresh, onCreateAlert: alertesCenterCrud.create, onRefreshAlertes: alertesCenterCrud.refresh, onCreateBusinessEvent: businessEventsCrud.create, onRefreshBusinessEvents: businessEventsCrud.refresh },
    sync: { onRefreshAll: refreshAll, onFlushOffline: flushOfflineQueue, online, lastOnlineAt, dataMap },
  };

  const Module = MODULES[active];

  if (authLoading) return <div className="min-h-screen bg-[#f8f5ef] text-[#2f2415] flex items-center justify-center"><div className="text-center"><div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-[#c9a96a] animate-pulse" /><p className="text-sm font-semibold text-[#8a7456]">Chargement Horizon Farm...</p></div></div>;
  if (!user) return <LoginPage />;

  return <AppLayout navItems={navItems} active={active} setActive={setActive} sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} online={online} meteo={liveMeteo} weatherLoading={weatherLoading} weatherSource={weatherSource} notifs={notifs} user={user} onSignOut={signOut} dataMap={dataMap} onOpenAssistant={() => setAssistantOpen(true)}><AppNotificationManager dataMap={dataMap} onNavigate={setActive} /><ErrorBoundary resetKey={active} moduleName={navItems.find((item) => item.id === active)?.label || active} onBackToDashboard={() => setActive('dashboard')}><Suspense fallback={<div className="text-sm text-[#8a7456]">Chargement du module...</div>}><HomePage Module={Module} moduleProps={moduleProps[active] || {}} /></Suspense></ErrorBoundary><AssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} dataMap={dataMap} onNavigate={setActive} /></AppLayout>;
}
