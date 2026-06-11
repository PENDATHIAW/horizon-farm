/**
 * Horizon Farm — registre architecture canonique V1 (lecture seule).
 * Source de référence pour audits, assistants et documentation.
 * Ne recalcule pas les métriques — pointe vers les moteurs officiels.
 */

/** @typedef {'canonical'|'secondary'|'legacy'|'deprecated'} EngineRole */

export const TABLE_CANONICAL_TRUTHS = [
  {
    donnee: 'CA commercial',
    sourceCanonique: 'buildConsolidatedCommercialKpis',
    fichier: 'src/utils/commercialKpiConsolidated.js',
    consommateurs: ['CommercialRecoveredModule', 'heyHorizonCommercialAnswers', 'commercialPilotageMetrics', 'commercialExport'],
    moteursConcurrents: ['computeCommercialKpis (dashboard)', 'consolidateFinance.caConsolide (ERP)'],
    risque: 'moyen',
    action: 'CONSERVER — Commercial module vs ERP global documentés',
  },
  {
    donnee: 'CA ERP global',
    sourceCanonique: 'consolidateFinance',
    fichier: 'src/utils/financeConsolidationEngine.js',
    champ: 'caConsolide / caFacture',
    consommateurs: ['FinancePilotageRecoveredModule', 'buildOfficialTreasuryView', 'heyHorizonFinanceAnswers', 'Dashboard'],
    moteursConcurrents: ['buildConsolidatedCommercialKpis', 'computeCommercialKpis'],
    risque: 'moyen',
    action: 'CONSERVER — périmètre ERP transversal',
  },
  {
    donnee: 'Marge produit / vente',
    sourceCanonique: 'summarizeSalesMargins',
    fichier: 'src/utils/salesMarginEngine.js',
    consommateurs: ['CommercialPilotagePanel', 'commercialChartMetrics', 'Finance Rentabilité (aligné)'],
    moteursConcurrents: ['computeGlobalProfitability', 'elevageActivityPnl'],
    risque: 'élevé',
    action: 'CONSERVER — ne pas recalculer marge parallèle',
  },
  {
    donnee: 'Marge réelle ERP',
    sourceCanonique: 'consolidateFinance',
    fichier: 'src/utils/financeConsolidationEngine.js',
    champ: 'margeReelle',
    consommateurs: ['buildOfficialTreasuryView', 'FinanceExecutiveSituationPanel', 'heyHorizonFinanceAnswers'],
    moteursConcurrents: ['summarizeSalesMargins', 'operatingResult (globalProfitability)'],
    risque: 'élevé',
    action: 'CONSERVER — sémantique distincte documentée',
  },
  {
    donnee: 'Trésorerie disponible',
    sourceCanonique: 'buildOfficialTreasuryView',
    fichier: 'src/utils/financePilotageCore.js',
    champ: 'treasuryAvailable ← cashNet',
    consommateurs: ['FinancePilotageRecoveredModule', 'heyHorizonFinanceAnswers'],
    moteursConcurrents: ['computeFinancePeriodSummary (dashboard période)'],
    risque: 'moyen-élevé',
    action: 'CONSERVER',
  },
  {
    donnee: 'Créances ERP',
    sourceCanonique: 'consolidateFinance',
    fichier: 'src/utils/financeConsolidationEngine.js',
    champ: 'creancesReelles',
    consommateurs: ['Finance Créances', 'heyHorizonFinanceAnswers'],
    moteursConcurrents: ['receivableFromOrders (commercial ops)'],
    risque: 'moyen-élevé',
    action: 'CONSERVER — Finance vérité ; Commercial = opérationnel',
  },
  {
    donnee: 'Créance écriture',
    sourceCanonique: 'financeIds.receivable',
    fichier: 'src/utils/sideEffectIds.js + saleSideEffects.js',
    consommateurs: ['runNewSaleSideEffects', 'recordSalePayment'],
    moteursConcurrents: [],
    risque: 'faible',
    action: 'CONSERVER — idempotence',
  },
  {
    donnee: 'Dettes fournisseurs',
    sourceCanonique: 'consolidateFinance',
    fichier: 'src/utils/financeConsolidationEngine.js',
    champ: 'payablesTotal',
    consommateurs: ['FinancePilotage', 'AchatsStockSupplierDebtsPanel'],
    moteursConcurrents: ['buildPayablesAging', 'aggregateSupplierDebts'],
    risque: 'moyen',
    action: 'CONSERVER',
  },
  {
    donnee: 'Valorisation stock',
    sourceCanonique: 'summarizeStockValuation',
    fichier: 'src/utils/stockValuation.js',
    consommateurs: ['StocksV3', 'consolidateFinance.stockValue', 'commitStockPurchaseWorkflow'],
    moteursConcurrents: ['StockFlowPanel prix fiche'],
    risque: 'moyen',
    action: 'CONSERVER — CMUP canonique',
  },
  {
    donnee: 'Mortalité élevage (écriture)',
    sourceCanonique: 'commitElevageMortality',
    fichier: 'src/utils/elevageWorkflow.js',
    consommateurs: ['ElevageWorkflowPanels', 'whatsappCommandParser'],
    moteursConcurrents: ['mortalityRateOf (4+ implémentations lecture)'],
    risque: 'élevé',
    action: 'CONSERVER écriture — unifier lectures ultérieurement',
  },
  {
    donnee: 'Rendement cultures',
    sourceCanonique: 'buildCultureDecisionProfile',
    fichier: 'src/services/cultureDecisionEngine.js',
    consommateurs: ['CulturesV3', 'CultureOperationalHealthPanel'],
    moteursConcurrents: ['computeCultureMetrics', 'buildMaraichageRows'],
    risque: 'moyen',
    action: 'CONSERVER',
  },
  {
    donnee: 'Objectifs croissance',
    sourceCanonique: 'buildObjectifsCroissanceData',
    fichier: 'src/services/objectifsGrowthEngine.js',
    consommateurs: ['ObjectifsDecisionModule', 'VisionObjectifsEcartsTab'],
    moteursConcurrents: ['buildMonthlyTargetAttainment (commercial CA)'],
    risque: 'moyen-élevé',
    action: 'CONSERVER — domaines distincts',
  },
  {
    donnee: 'Rentabilité globale',
    sourceCanonique: 'buildProfitabilityView → computeGlobalProfitability',
    fichier: 'src/utils/financePilotageCore.js + globalProfitabilityService.js',
    consommateurs: ['Finance Rentabilité', 'heyHorizonFinanceAnswers'],
    moteursConcurrents: ['summarizeSalesMargins', 'elevageActivityPnl', 'productionHubMetrics'],
    risque: 'élevé',
    action: 'CONSERVER — lecture seule cross-module',
  },
];

export const WORKFLOW_CANONICAL_MATRIX = [
  { workflow: 'commitCommercialSale', fichier: 'commercialSaleWorkflow.js', role: 'canonical', usage: 'actif', risque: 'moyen', note: 'VentesV4 modal, WhatsApp COMMERCIAL_SALE' },
  { workflow: 'commitSaleWorkflow', fichier: 'workflowService.js', role: 'legacy', usage: 'actif', risque: 'moyen', note: 'WhatsApp vente simple uniquement' },
  { workflow: 'recordSalePayment', fichier: 'recordSalePayment.js', role: 'canonical', usage: 'actif', risque: 'faible', note: 'financeIds.paid idempotent' },
  { workflow: 'applySourceImpactFromSaleLines', fichier: 'saleSideEffects.js', role: 'canonical', usage: 'actif', risque: 'moyen', note: 'Stock à validation vente, pas livraison' },
  { workflow: 'confirmSaleDelivery', fichier: 'confirmSaleDelivery.js', role: 'canonical', usage: 'actif', risque: 'faible', note: 'Pas de 2e sortie stock' },
  { workflow: 'commitStockPurchaseWorkflow', fichier: 'stockPurchaseWorkflow.js', role: 'canonical', usage: 'actif', risque: 'faible', note: 'Réception achat Achats & Stock' },
  { workflow: 'commitPurchaseWorkflow', fichier: 'workflowService.js', role: 'legacy', usage: 'actif', risque: 'moyen', note: 'WhatsApp achat simple — pas ledger mouvements' },
  { workflow: 'runNewSaleSideEffects', fichier: 'saleSideEffects.js', role: 'canonical', usage: 'actif', risque: 'moyen', note: 'Hub finance+stock+client' },
  { workflow: 'convertQuoteToOrder', fichier: 'commercialQuoteWorkflow.js', role: 'canonical', usage: 'actif', risque: 'faible', note: 'Devis → commande' },
];

export const EVENT_AUDIT_SUMMARY = {
  dedupeGuards: [
    'findDuplicateBusinessEvent (businessEventsService)',
    'findDuplicateFinanceTransaction (financeTransactionMeta)',
    'movementAlreadyExists (stockMovementHelpers)',
    'financeIds.paid / financeIds.receivable (sideEffectIds)',
    'source_impact_applied per line (saleSideEffects)',
  ],
  duplicateRisks: [
    { id: 'EVT-DUP-2', detail: 'vente AppContext + vente_commercial_workflow', severite: 'haute' },
    { id: 'EVT-DUP-1', detail: 'recolte cultures workflow + AppContext', severite: 'moyenne' },
    { id: 'STK-PREFIX', detail: 'stock-mvt: vs stock-movement: prefixes', severite: 'faible' },
  ],
  auditEngine: 'runErpTransversalAudit (erpTransversalAudit.js)',
};

export const KPI_DUPLICATION_HOTSPOTS = [
  { kpi: 'CA', affichages: 4, moteurCanonique: 'buildConsolidatedCommercialKpis', risque: 'moyen' },
  { kpi: 'Marge', affichages: 5, moteurCanonique: 'summarizeSalesMargins / margeReelle', risque: 'élevé' },
  { kpi: 'Créances', affichages: 4, moteurCanonique: 'creancesReelles + receivableFromOrders', risque: 'moyen-élevé' },
  { kpi: 'Trésorerie', affichages: 3, moteurCanonique: 'cashNet', risque: 'moyen' },
  { kpi: 'Objectifs', affichages: 3, moteurCanonique: 'buildObjectifsCroissanceData + buildMonthlyTargetAttainment', risque: 'moyen' },
];

export const DEAD_COMPONENTS = [
  { composant: 'Dashboard.jsx', references: 0, statut: 'MASQUER', note: 'FORBIDDEN_ENTRY_FILES' },
  { composant: 'VentesV2.jsx', references: 0, statut: 'MASQUER', note: '@deprecated legacy commitSaleWorkflow' },
  { composant: 'VentesV3.jsx', references: 0, statut: 'MASQUER', note: 'stub vide' },
  { composant: 'ImpactBusiness*.jsx', references: 0, statut: 'MASQUER', note: 'remplacé InvestisseursForums' },
  { composant: 'GestionSysteme.jsx', references: 0, statut: 'MASQUER', note: 'GestionSystemeV2 canonique' },
  { composant: 'CorrectionDeploymentStatusPanel.jsx', references: 0, statut: 'CONSERVER', note: 'orphan — pas supprimé' },
];

export const ARCHITECTURE_SCORES = {
  avant: { architecture: 68, canonicalisation: 62, antiDoublons: 58, ux: 72, investisseur: 65, maintenabilite: 64, global: 65 },
  apres: { architecture: 78, canonicalisation: 82, antiDoublons: 80, ux: 82, investisseur: 74, maintenabilite: 76, global: 79 },
};

export function getCanonicalTruth(donnee = '') {
  const q = String(donnee).toLowerCase();
  return TABLE_CANONICAL_TRUTHS.find((row) => row.donnee.toLowerCase().includes(q)) || null;
}

export function getCanonicalWorkflow(name = '') {
  const q = String(name).toLowerCase();
  return WORKFLOW_CANONICAL_MATRIX.find((row) => row.workflow.toLowerCase().includes(q)) || null;
}
