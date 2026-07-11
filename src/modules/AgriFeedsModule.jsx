import { useCallback, useMemo, useState } from 'react';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { resolveAgriFeedsTab } from '../utils/agriFeedsNavigation.js';
import AgriFeedsDashboardTab from './agriFeeds/tabs/AgriFeedsDashboardTab.jsx';
import Phase1BenchmarkTab from './agriFeeds/tabs/Phase1BenchmarkTab.jsx';
import MaterialsSuppliersTab from './agriFeeds/tabs/MaterialsSuppliersTab.jsx';
import FormulationsTab from './agriFeeds/tabs/FormulationsTab.jsx';
import ProductionTab from './agriFeeds/tabs/ProductionTab.jsx';
import TrialsComparisonTab from './agriFeeds/tabs/TrialsComparisonTab.jsx';
import CommercialTab from './agriFeeds/tabs/CommercialTab.jsx';
import QualityReportingTab from './agriFeeds/tabs/QualityReportingTab.jsx';

const arr = (value) => (Array.isArray(value) ? value : []);
const crudRows = (crud, key) => arr(crud?.[key]?.rows);

export default function AgriFeedsModule(props) {
  const { initialTab, onTabChange } = props;
  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveAgriFeedsTab(initialTab || 'Tableau de bord'));
  const tab = controlled
    ? resolveAgriFeedsTab(initialTab || 'Tableau de bord')
    : internalTab;

  const setTab = useCallback((value) => {
    const resolved = resolveAgriFeedsTab(value);
    if (controlled) {
      onTabChange?.(resolved);
      return;
    }
    setInternalTab(resolved);
  }, [controlled, onTabChange]);

  const dataMap = useMemo(() => ({
    ...(props.dataMap || {}),
    alimentation_logs: arr(props.alimentationLogs ?? props.dataMap?.alimentation_logs ?? crudRows(props.crud, 'alimentation_logs')),
    stock: arr(props.stocks ?? props.dataMap?.stock ?? crudRows(props.crud, 'stock')),
    stocks: arr(props.stocks ?? props.dataMap?.stocks ?? crudRows(props.crud, 'stock')),
    avicole: arr(props.lots ?? props.dataMap?.avicole ?? crudRows(props.crud, 'avicole')),
    lots: arr(props.lots ?? props.dataMap?.lots ?? crudRows(props.crud, 'avicole')),
    animaux: arr(props.animaux ?? props.dataMap?.animaux ?? crudRows(props.crud, 'animaux')),
    fournisseurs: arr(props.fournisseurs ?? props.dataMap?.fournisseurs ?? crudRows(props.crud, 'fournisseurs')),
    finances: arr(props.transactions ?? props.dataMap?.finances ?? crudRows(props.crud, 'finances')),
    transactions: arr(props.transactions ?? props.dataMap?.transactions ?? crudRows(props.crud, 'finances')),
    clients: arr(props.clients ?? props.dataMap?.clients ?? crudRows(props.crud, 'clients')),
    sales_orders: arr(props.salesOrders ?? props.dataMap?.sales_orders ?? crudRows(props.crud, 'sales_orders')),
    sales_order_items: arr(props.orderItems ?? props.dataMap?.sales_order_items ?? crudRows(props.crud, 'sales_order_items')),
    payments: arr(props.payments ?? props.dataMap?.payments ?? crudRows(props.crud, 'payments')),
    invoices: arr(props.invoices ?? props.dataMap?.invoices ?? crudRows(props.crud, 'invoices')),
    deliveries: arr(props.deliveries ?? props.dataMap?.deliveries ?? crudRows(props.crud, 'deliveries')),
    alertes_center: arr(props.alertes ?? props.dataMap?.alertes_center ?? crudRows(props.crud, 'alertes_center')),
    business_events: arr(props.businessEvents ?? props.dataMap?.business_events ?? crudRows(props.crud, 'business_events')),
    rapports: arr(props.rapports ?? props.dataMap?.rapports ?? crudRows(props.crud, 'rapports')),
    audit_logs: arr(props.auditLogs ?? props.dataMap?.audit_logs ?? crudRows(props.crud, 'audit_logs')),
    production_oeufs_logs: arr(props.productionLogs ?? props.dataMap?.production_oeufs_logs ?? crudRows(props.crud, 'production_oeufs_logs')),
    feed_raw_materials: arr(props.feedRawMaterials ?? props.dataMap?.feed_raw_materials ?? crudRows(props.crud, 'feed_raw_materials')),
    feed_raw_batches: arr(props.feedRawBatches ?? props.dataMap?.feed_raw_batches ?? crudRows(props.crud, 'feed_raw_batches')),
    feed_formulas: arr(props.feedFormulas ?? props.dataMap?.feed_formulas ?? crudRows(props.crud, 'feed_formulas')),
    feed_formula_versions: arr(props.feedFormulaVersions ?? props.dataMap?.feed_formula_versions ?? crudRows(props.crud, 'feed_formula_versions')),
    feed_formula_ingredients: arr(props.feedFormulaIngredients ?? props.dataMap?.feed_formula_ingredients ?? crudRows(props.crud, 'feed_formula_ingredients')),
    feed_facility_zones: arr(props.feedFacilityZones ?? props.dataMap?.feed_facility_zones ?? crudRows(props.crud, 'feed_facility_zones')),
    feed_trials: arr(props.feedTrials ?? props.dataMap?.feed_trials ?? crudRows(props.crud, 'feed_trials')),
    feed_phase1_comparisons: arr(props.feedPhase1Comparisons ?? props.dataMap?.feed_phase1_comparisons ?? crudRows(props.crud, 'feed_phase1_comparisons')),
    feed_production_orders: arr(props.feedProductionOrders ?? props.dataMap?.feed_production_orders ?? crudRows(props.crud, 'feed_production_orders')),
    feed_finished_batches: arr(props.feedFinishedBatches ?? props.dataMap?.feed_finished_batches ?? crudRows(props.crud, 'feed_finished_batches')),
    feed_quality_checks: arr(props.feedQualityChecks ?? props.dataMap?.feed_quality_checks ?? crudRows(props.crud, 'feed_quality_checks')),
  }), [props]);

  const workflowHandlers = {
    onCreateFeedRawMaterial: props.onCreateFeedRawMaterial || props.crud?.feed_raw_materials?.create,
    onCreateFeedRawBatch: props.onCreateFeedRawBatch || props.crud?.feed_raw_batches?.create,
    onUpdateFeedRawBatch: props.onUpdateFeedRawBatch || props.crud?.feed_raw_batches?.update,
    onCreateStock: props.onCreateStock || props.crud?.stock?.create,
    onUpdateStock: props.onUpdateStock || props.crud?.stock?.update,
    onCreateStockMovement: props.onCreateStockMovement || props.crud?.stock_movements?.create,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || props.crud?.finances?.create,
    onUpdateSupplier: props.onUpdateSupplier || props.crud?.fournisseurs?.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || props.crud?.business_events?.create,
    onCreateAlert: props.onCreateAlert || props.crud?.alertes_center?.create,
    onCreateFeedFormula: props.onCreateFeedFormula || props.crud?.feed_formulas?.create,
    onUpdateFeedFormula: props.onUpdateFeedFormula || props.crud?.feed_formulas?.update,
    onCreateFeedFormulaVersion: props.onCreateFeedFormulaVersion || props.crud?.feed_formula_versions?.create,
    onCreateFeedFormulaIngredient: props.onCreateFeedFormulaIngredient || props.crud?.feed_formula_ingredients?.create,
    onCreateFeedProductionOrder: props.onCreateFeedProductionOrder || props.crud?.feed_production_orders?.create,
    onUpdateFeedProductionOrder: props.onUpdateFeedProductionOrder || props.crud?.feed_production_orders?.update,
    onCreateFeedFinishedBatch: props.onCreateFeedFinishedBatch || props.crud?.feed_finished_batches?.create,
    onUpdateFeedFinishedBatch: props.onUpdateFeedFinishedBatch || props.crud?.feed_finished_batches?.update,
    onCreateFeedQualityCheck: props.onCreateFeedQualityCheck || props.crud?.feed_quality_checks?.create,
    onCreateFeedTrial: props.onCreateFeedTrial || props.crud?.feed_trials?.create,
    onUpdateFeedTrial: props.onUpdateFeedTrial || props.crud?.feed_trials?.update,
    onCreateFeedPhase1Comparison: props.onCreateFeedPhase1Comparison || props.crud?.feed_phase1_comparisons?.create,
    onUpdateFeedPhase1Comparison: props.onUpdateFeedPhase1Comparison || props.crud?.feed_phase1_comparisons?.update,
    onCreateSaleOrder: props.onCreateSaleOrder || props.crud?.sales_orders?.create,
    onCreateSaleOrderItem: props.onCreateSaleOrderItem || props.crud?.sales_order_items?.create,
    onUpdateClient: props.onUpdateClient || props.crud?.clients?.update,
    onCreateReport: props.onCreateReport || props.crud?.rapports?.create,
    onCreateAuditLog: props.onCreateAuditLog || props.crud?.audit_logs?.create,
    stocks: arr(props.stocks ?? crudRows(props.crud, 'stock')),
  };

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xl font-black text-[#2f2415]">AGRI FEEDS</p>
        <p className="text-sm text-[#8a7456] mt-1 max-w-3xl leading-relaxed">
          Production d’aliments animaux pilotée par la donnée — Phase 2 de Horizon Farm.
          La Phase 1 construit d’abord la référence à partir des aliments du marché.
        </p>
      </header>

      <ModuleTabsBar moduleId="agri_feeds" active={tab} onChange={setTab} wrap activeFarm={props.activeFarm} />

      {tab === 'Tableau de bord' ? (
        <AgriFeedsDashboardTab dataMap={dataMap} onNavigateTab={setTab} />
      ) : null}
      {tab === 'Référence Phase 1' ? <Phase1BenchmarkTab dataMap={dataMap} /> : null}
      {tab === 'Matières & fournisseurs' ? (
        <MaterialsSuppliersTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'Formulations' ? (
        <FormulationsTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'Production' ? (
        <ProductionTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'Tests & comparaison' ? (
        <TrialsComparisonTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'Commercial' ? <CommercialTab dataMap={dataMap} {...workflowHandlers} /> : null}
      {tab === 'Qualité & reporting' ? (
        <QualityReportingTab dataMap={dataMap} {...workflowHandlers} userRole={props.userRole || props.role || 'manager'} />
      ) : null}
    </div>
  );
}
