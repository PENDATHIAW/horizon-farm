/**
 * Achats & Stock V2 — registre panels (branchés / legacy / doublons).
 * Ne pas supprimer les fichiers legacy sans validation explicite.
 */

export const ACHATS_STOCK_PANEL_STATUS = {
  AchatsStockPurchasesPanel: { status: 'wired', tab: 'Achats', replaces: 'AchatsHub inline (supprimé V2)' },
  AchatsStockMovementsPanel: { status: 'wired', tab: 'Mouvements', replaces: 'MouvementsHub inline (supprimé V2)' },
  AchatsStockInsightPanel: { status: 'wired', tab: 'Résumé', note: 'Fusionné dans Summary — remplace StockIaPanel partiel' },
  AchatsStockLowStockPanel: { status: 'wired', tab: 'Résumé', note: 'Mode compact dans Résumé ; détail dans Achats' },
  AchatsStockSupplierDebtsPanel: { status: 'wired', tab: 'Résumé', note: 'Doublon partiel avec Fournisseurs — version compacte Résumé uniquement' },
  AchatsStockExpiryPanel: { status: 'wired', tab: 'Résumé' },
  AchatsStockTransferPanel: { status: 'wired', tab: 'Stock' },
  StockProductionSourcesPanel: { status: 'wired', tab: 'Stock' },
  StockFeedingElevageHint: { status: 'wired', tab: 'Stock', note: 'Remplace distribution inline — renvoie vers Élevage' },
  AchatsStockDataQualityPanel: { status: 'wired', tab: 'Résumé', note: 'V3 — écarts données stock explicites' },
  achatsStockUi: { status: 'shared', note: 'Composants UI partagés' },
  achatsStockMetrics: { status: 'shared', note: 'Todos + coherenceRowTab' },
};
