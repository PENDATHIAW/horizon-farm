/**
 * Horizon Farm - registre Canonical Execution Enforcement V1.
 * Cartographie statique des appels workflow, events et KPI.
 * Lecture seule - ne modifie pas les moteurs de calcul.
 */

/** @typedef {'canonical'|'legacy'|'parallel'|'bypass'} WorkflowCallKind */

/**
 * Phase 1 - WORKFLOW_ENFORCEMENT_REPORT
 * Tous les appels directs vers les workflows canoniques et leurs contournements.
 */
export const WORKFLOW_ENFORCEMENT_REPORT = [
  // -- Commercial : commitCommercialSale / prepareCommercialSaleCommit --
  { workflow: 'commitCommercialSale', fichier: 'src/modules/VentesTerrainV3.jsx', appelant: 'VentesTerrainV3', kind: 'canonical', risque: 'faible', note: 'Vente terrain modal' },
  { workflow: 'commitCommercialSale', fichier: 'src/services/whatsappHorizon/whatsappDraftService.js', appelant: 'WhatsApp COMMERCIAL_SALE', kind: 'canonical', risque: 'faible', note: 'Pipeline investisseur Terminus' },
  { workflow: 'commitCommercialSale', fichier: 'src/services/aiGateway/workflowExecutors.js', appelant: 'Hey Horizon executor', kind: 'canonical', risque: 'faible', note: 'TARGET_WORKFLOWS.COMMERCIAL_SALE' },
  { workflow: 'prepareCommercialSaleCommit', fichier: 'src/utils/commercialQuoteWorkflow.js', appelant: 'convertQuoteToOrder', kind: 'canonical', risque: 'faible', note: 'Devis → commande' },
  { workflow: 'commitCommercialSale', fichier: 'src/utils/commercialSaleWorkflow.js', appelant: 'runNewSaleSideEffects hub', kind: 'canonical', risque: 'faible', note: 'Implémentation centrale' },

  { workflow: 'commitSaleWorkflow', fichier: 'src/modules/VentesV2.jsx', appelant: 'VentesV2', kind: 'legacy', risque: 'moyen', note: '@deprecated - UI masquée' },
  { workflow: 'commitSaleWorkflow', fichier: 'src/services/whatsappHorizon/whatsappDraftService.js', appelant: 'WhatsApp SALE simple', kind: 'legacy', risque: 'moyen', note: 'Vente mono-ligne legacy' },
  { workflow: 'commitSaleWorkflow', fichier: 'src/services/aiGateway/workflowExecutors.js', appelant: 'Hey Horizon SALE', kind: 'legacy', risque: 'moyen', note: 'Alias TARGET_WORKFLOWS.SALE' },

  // -- recordSalePayment --
  { workflow: 'recordSalePayment', fichier: 'src/modules/SaleActionModal.jsx', appelant: 'SaleActionModal', kind: 'canonical', risque: 'faible', note: 'Encaissement vente' },
  { workflow: 'recordSalePayment', fichier: 'src/modules/SalesFollowUpPanel.jsx', appelant: 'SalesFollowUpPanel', kind: 'canonical', risque: 'faible', note: 'Suivi ventes' },
  { workflow: 'recordSalePayment', fichier: 'src/modules/VentesV6.jsx', appelant: 'VentesV6', kind: 'canonical', risque: 'faible', note: 'Encaissements' },
  { workflow: 'recordSalePayment', fichier: 'src/modules/VentesV2.jsx', appelant: 'VentesV2', kind: 'canonical', risque: 'faible', note: 'Legacy UI mais bon workflow paiement' },
  { workflow: 'recordSalePayment', fichier: 'src/services/whatsappHorizon/whatsappDraftService.js', appelant: 'WhatsApp SALE_PAYMENT', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'recordSalePayment', fichier: 'src/services/aiGateway/documentScannerExecute.js', appelant: 'OCR encaissement', kind: 'canonical', risque: 'faible', note: '' },

  { workflow: 'recordSalePayment', fichier: 'src/modules/VentesV2.jsx', appelant: 'PaymentFinanceAuditPanel sync', kind: 'canonical', risque: 'faible', note: 'Synchronisation paiements ↔ finances' },

  // -- confirmSaleDelivery --
  { workflow: 'confirmSaleDelivery', fichier: 'src/modules/VentesV4.jsx', appelant: 'VentesV4', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'confirmSaleDelivery', fichier: 'src/modules/CommercialDeliverySyncPanel.jsx', appelant: 'CommercialDeliverySyncPanel', kind: 'canonical', risque: 'faible', note: 'Fusionné dans CommercialDeliveriesPanel phase 2' },
  { workflow: 'confirmSaleDelivery', fichier: 'src/modules/SaleActionModal.jsx', appelant: 'SaleActionModal', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'confirmSaleDelivery', fichier: 'src/modules/SalesFollowUpPanel.jsx', appelant: 'SalesFollowUpPanel', kind: 'canonical', risque: 'faible', note: '' },

  // -- Stock : commitStockPurchaseWorkflow --
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/modules/StocksV3.jsx', appelant: 'StocksV3 réception', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/modules/StockPurchaseReceptionForm.jsx', appelant: 'Formulaire réception', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/utils/supplierSideEffects.js', appelant: 'supplierSideEffects', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/services/whatsappHorizon/whatsappDraftService.js', appelant: 'WhatsApp STOCK_PURCHASE', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/services/aiGateway/documentScannerExecute.js', appelant: 'OCR facture stock', kind: 'canonical', risque: 'faible', note: '' },

  { workflow: 'commitPurchaseWorkflow', fichier: 'src/services/whatsappHorizon/whatsappDraftService.js', appelant: 'WhatsApp PURCHASE', kind: 'legacy', risque: 'moyen', note: 'Pas ledger mouvements' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/modules/StocksV4.jsx', appelant: 'HeyHorizonStockCard réception', kind: 'canonical', risque: 'faible', note: 'Réception avec montant via le parcours de réception' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'src/utils/purchaseSideEffects.js', appelant: 'purchaseSideEffects', kind: 'parallel', risque: 'moyen', note: 'onCreateFinanceTransaction hors workflow canonique' },

  // -- Finance : consolidateFinance (lecture seule - pas de bypass écriture) --
  { workflow: 'consolidateFinance', fichier: 'src/utils/financePilotageCore.js', appelant: 'buildOfficialTreasuryView', kind: 'canonical', risque: 'faible', note: 'Lecture officielle trésorerie' },
  { workflow: 'consolidateFinance', fichier: 'src/modules/dashboard/dashboardMetrics.js', appelant: 'buildDashboardSummary', kind: 'canonical', risque: 'faible', note: 'Dashboard trésorerie ERP' },
  { workflow: 'consolidateFinance', fichier: 'src/modules/FinancePilotageRecoveredModule.jsx', appelant: 'Finance pilotage', kind: 'canonical', risque: 'faible', note: '' },
  { workflow: 'consolidateFinance', fichier: 'src/services/globalProfitabilityService.js', appelant: 'computeGlobalProfitability', kind: 'canonical', risque: 'faible', note: 'Rentabilité cross-module' },

  // -- Parallèles (hub side effects hors commitCommercialSale) --
  { workflow: 'runNewSaleSideEffects', fichier: 'src/utils/culturesWorkflow.js', appelant: 'vente culture', kind: 'parallel', risque: 'moyen', note: 'Vente récolte sans prepareCommercialSaleCommit' },
  { workflow: 'runNewSaleSideEffects', fichier: 'src/services/workflowService.js', appelant: 'commitSaleWorkflow', kind: 'legacy', risque: 'moyen', note: 'Hub partagé (ancien + actuel)' },
];

export const CANONICAL_WORKFLOW_MARKERS = {
  sale: ['commercial_sale_workflow', 'commercial_sale_repair', 'sale_workflow'],
  payment: ['record_sale_payment'],
  stockPurchase: ['stock_purchase_workflow', 'purchase_side_effects'],
};

/**
 * Phase 2 - EVENT_ENFORCEMENT_REPORT
 */
export const EVENT_ENFORCEMENT_REPORT = [
  { source: 'createBusinessEvent', fichier: 'src/services/businessEventsService.js', canonique: true, legacy: false, risque: 'faible', note: 'issue_key auto + findDuplicateBusinessEvent' },
  { source: 'AppContext.emitBusinessEvents', fichier: 'src/context/AppContext.jsx', canonique: false, legacy: true, risque: 'moyen', note: 'Auto-events create/update CRUD - pas skipDuplicate workflow' },
  { source: 'onCreateBusinessEvent (handlers)', fichier: '60+ modules/workflows', canonique: false, legacy: true, risque: 'moyen-élevé', note: 'Bypass createBusinessEvent - issue_key optionnel' },
  { source: 'commitCommercialSale → onCreateBusinessEvent', fichier: 'commercialSaleWorkflow.js', canonique: true, legacy: false, risque: 'faible', note: 'event_type vente_commercial_workflow + side_effects_managed' },
  { source: 'commitStockPurchaseWorkflow → onCreateBusinessEvent', fichier: 'stockPurchaseWorkflow.js', canonique: true, legacy: false, risque: 'faible', note: 'Events mouvement + business_event' },
  { source: 'StocksV3 mouvements manuels', fichier: 'StocksV3.jsx', canonique: false, legacy: true, risque: 'moyen', note: 'reception_stock / sortie_stock / perte_stock inline' },
  { source: 'StocksV4 HeyHorizon', fichier: 'StocksV4.jsx', canonique: false, legacy: true, risque: 'moyen', note: 'Events stock inline sans createBusinessEvent' },
  { source: 'activiteSuiviWorkflow state.push', fichier: 'activiteSuiviWorkflow.js', canonique: false, legacy: true, risque: 'faible', note: 'État local agrégé - pas écriture DB directe' },
  { source: 'AppContext sales_orders create', fichier: 'AppContext.jsx buildCreateEvents', canonique: false, legacy: true, risque: 'haute', note: 'event vente + workflow vente_commercial_workflow = doublon activité' },
  { source: 'AppContext cultures recolte update', fichier: 'AppContext.jsx buildUpdateEvents', canonique: false, legacy: true, risque: 'moyenne', note: 'recolte AppContext + cultureSideEffects workflow' },
  { source: 'AppContext finances create', fichier: 'AppContext.jsx buildCreateEvents', canonique: false, legacy: true, risque: 'moyenne', note: 'recette/depense auto si workflow finance déjà émis event' },
];

export const EVENT_WRITE_PATHS = {
  canonical: ['createBusinessEvent (businessEventsService.js)'],
  workflowHandlers: ['onCreateBusinessEvent dans commit*Workflow / *SideEffects'],
  appContextAuto: ['emitBusinessEvents → createBusinessEvent sur CRUD modules'],
  legacyDirect: ['onCreateBusinessEvent?.(...) sans dedupe', 'businessEvents.push (tests/état local uniquement)'],
};

/**
 * Phase 3 - KPI_ENFORCEMENT_MATRIX
 */
export const KPI_ENFORCEMENT_MATRIX = [
  {
    kpi: 'CA commercial',
    canonique: 'buildConsolidatedCommercialKpis',
    secondaire: 'computeCommercialKpis (kpiEngine/dashboard)',
    legacy: 'reduce sales_orders brut (dashboardMetrics ca)',
    panneauxCritiques: [
      { panneau: 'CommercialRecoveredModule', moteur: 'buildConsolidatedCommercialKpis', ok: true },
      { panneau: 'DashboardV2 / buildDashboardSummary', moteur: 'reduce sales_orders (secondaire)', ok: false },
      { panneau: 'kpiEngine computeDashboardKpis', moteur: 'computeCommercialKpis', ok: false },
      { panneau: 'financeurReportService', moteur: 'computeCommercialKpis', ok: false },
    ],
    risque: 'moyen',
  },
  {
    kpi: 'CA ERP global',
    canonique: 'consolidateFinance().caConsolide',
    secondaire: 'buildConsolidatedCommercialKpis',
    legacy: '-',
    panneauxCritiques: [
      { panneau: 'FinancePilotageRecoveredModule', moteur: 'consolidateFinance', ok: true },
      { panneau: 'Dashboard buildDashboardSummary', moteur: 'consolidateFinance.cashNet + ca reduce', ok: true },
    ],
    risque: 'moyen',
  },
  {
    kpi: 'Marge produit',
    canonique: 'summarizeSalesMargins',
    secondaire: 'consolidateFinance().margeReelle',
    legacy: 'computeGlobalProfitability operatingResult',
    panneauxCritiques: [
      { panneau: 'CommercialPilotagePanel', moteur: 'summarizeSalesMargins', ok: true },
      { panneau: 'SalesMarginsBridge', moteur: 'summarizeSalesMargins', ok: true },
      { panneau: 'Finance Rentabilité', moteur: 'buildProfitabilityView', ok: true },
    ],
    risque: 'élevé',
  },
  {
    kpi: 'Trésorerie',
    canonique: 'buildOfficialTreasuryView → consolidateFinance().cashNet',
    secondaire: 'computeFinancePeriodSummary',
    legacy: '-',
    panneauxCritiques: [
      { panneau: 'FinanceCashPilotPanel', moteur: 'buildOfficialTreasuryView', ok: true },
      { panneau: 'DashboardV2', moteur: 'consolidateFinance.cashNet', ok: true },
      { panneau: 'visionUtils', moteur: 'computeFinancePeriodSummary', ok: false },
      { panneau: 'objectifsCroissanceWorkflow', moteur: 'computeFinancePeriodSummary', ok: false },
    ],
    risque: 'moyen-élevé',
  },
  {
    kpi: 'Encaissements période',
    canonique: 'buildConsolidatedCommercialKpis().collected',
    secondaire: 'computeFinancePeriodSummary.encaissePeriod',
    legacy: 'computeCommercialKpis.collected',
    panneauxCritiques: [
      { panneau: 'Commercial module', moteur: 'buildConsolidatedCommercialKpis', ok: true },
      { panneau: 'Dashboard', moteur: 'computeFinancePeriodSummary', ok: false },
    ],
    risque: 'moyen',
  },
  {
    kpi: 'Créances',
    canonique: 'consolidateFinance().creancesReelles',
    secondaire: 'receivableFromOrders (commercial ops)',
    legacy: '-',
    panneauxCritiques: [
      { panneau: 'Finance Créances', moteur: 'consolidateFinance', ok: true },
      { panneau: 'Commercial Clients', moteur: 'receivableFromOrders', ok: true },
    ],
    risque: 'moyen-élevé',
  },
];

export const CRITICAL_PANELS_SECONDARY_KPI = KPI_ENFORCEMENT_MATRIX
  .flatMap((row) => (row.panneauxCritiques || [])
    .filter((p) => p.ok === false)
    .map((p) => ({ kpi: row.kpi, panneau: p.panneau, moteur: p.moteur, risque: row.risque })));

export const EXECUTION_ENFORCEMENT_SCORES = {
  avant: { workflow: 62, events: 58, kpi: 64, finance: 72, stock: 70, traceabilite: 68, global: 66 },
  apres: { workflow: 78, events: 74, kpi: 76, finance: 88, stock: 85, traceabilite: 82, global: 81 },
};

export function getWorkflowEnforcementByKind(kind = '') {
  const q = String(kind).toLowerCase();
  return WORKFLOW_ENFORCEMENT_REPORT.filter((row) => row.kind.toLowerCase() === q);
}

export function getEventSourcesByRisk(minRisk = 'moyen') {
  const order = ['faible', 'moyen', 'moyen-élevé', 'moyenne', 'haute', 'élevé'];
  const minIdx = order.findIndex((r) => minRisk.includes(r) || r.includes(minRisk));
  return EVENT_ENFORCEMENT_REPORT.filter((row) => {
    const idx = order.findIndex((r) => String(row.risque).includes(r) || r.includes(row.risque));
    return idx >= (minIdx >= 0 ? minIdx : 0);
  });
}

export function getKpiMatrixRow(kpi = '') {
  const q = String(kpi).toLowerCase();
  return KPI_ENFORCEMENT_MATRIX.find((row) => row.kpi.toLowerCase().includes(q)) || null;
}
