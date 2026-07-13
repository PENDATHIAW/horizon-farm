import { useCallback, useMemo, useState } from 'react';
import ModuleTabsBar from '../components/module/ModuleTabsBar.jsx';
import { resolveAgriFeedsTab } from '../utils/agriFeedsNavigation.js';
import AgriFeedsDashboardTab from './agriFeeds/tabs/AgriFeedsDashboardTab.jsx';
import MaterialsSuppliersTab from './agriFeeds/tabs/MaterialsSuppliersTab.jsx';
import FormulationsTab from './agriFeeds/tabs/FormulationsTab.jsx';
import ProductionTab from './agriFeeds/tabs/ProductionTab.jsx';
import TrialsComparisonTab from './agriFeeds/tabs/TrialsComparisonTab.jsx';
import CommercialTab from './agriFeeds/tabs/CommercialTab.jsx';
import QualityReportingTab from './agriFeeds/tabs/QualityReportingTab.jsx';
import CostsDecisionsTab from './agriFeeds/tabs/CostsDecisionsTab.jsx';
import useAgriFeedsData from './agriFeeds/hooks/useAgriFeedsData.js';

const arr = (value) => (Array.isArray(value) ? value : []);
const crudRows = (crud, key) => arr(crud?.[key]?.rows);

export default function AgriFeedsModule(props) {
  const { initialTab, onTabChange } = props;
  const agriFeedsCrud = useAgriFeedsData({ activeFarm: props.activeFarm });
  const controlled = Boolean(onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveAgriFeedsTab(initialTab || 'Vue d’ensemble'));
  const tab = controlled
    ? resolveAgriFeedsTab(initialTab || 'Vue d’ensemble')
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
    feed_raw_materials: arr(props.feedRawMaterials ?? props.dataMap?.feed_raw_materials ?? crudRows(agriFeedsCrud, 'feed_raw_materials')),
    feed_raw_batches: arr(props.feedRawBatches ?? props.dataMap?.feed_raw_batches ?? crudRows(agriFeedsCrud, 'feed_raw_batches')),
    feed_formulas: arr(props.feedFormulas ?? props.dataMap?.feed_formulas ?? crudRows(agriFeedsCrud, 'feed_formulas')),
    feed_formula_versions: arr(props.feedFormulaVersions ?? props.dataMap?.feed_formula_versions ?? crudRows(agriFeedsCrud, 'feed_formula_versions')),
    feed_formula_ingredients: arr(props.feedFormulaIngredients ?? props.dataMap?.feed_formula_ingredients ?? crudRows(agriFeedsCrud, 'feed_formula_ingredients')),
    feed_facility_zones: arr(props.feedFacilityZones ?? props.dataMap?.feed_facility_zones ?? crudRows(agriFeedsCrud, 'feed_facility_zones')),
    feed_trials: arr(props.feedTrials ?? props.dataMap?.feed_trials ?? crudRows(agriFeedsCrud, 'feed_trials')),
    feed_phase1_comparisons: arr(props.feedPhase1Comparisons ?? props.dataMap?.feed_phase1_comparisons ?? crudRows(agriFeedsCrud, 'feed_phase1_comparisons')),
    feed_production_orders: arr(props.feedProductionOrders ?? props.dataMap?.feed_production_orders ?? crudRows(agriFeedsCrud, 'feed_production_orders')),
    feed_finished_batches: arr(props.feedFinishedBatches ?? props.dataMap?.feed_finished_batches ?? crudRows(agriFeedsCrud, 'feed_finished_batches')),
    feed_quality_checks: arr(props.feedQualityChecks ?? props.dataMap?.feed_quality_checks ?? crudRows(agriFeedsCrud, 'feed_quality_checks')),
  }), [props, agriFeedsCrud]);

  const workflowHandlers = {
    onCreateFeedRawMaterial: props.onCreateFeedRawMaterial || agriFeedsCrud.feed_raw_materials.create,
    onCreateFeedRawBatch: props.onCreateFeedRawBatch || agriFeedsCrud.feed_raw_batches.create,
    onUpdateFeedRawBatch: props.onUpdateFeedRawBatch || agriFeedsCrud.feed_raw_batches.update,
    onCreateStock: props.onCreateStock || props.crud?.stock?.create,
    onUpdateStock: props.onUpdateStock || props.crud?.stock?.update,
    onCreateStockMovement: props.onCreateStockMovement || props.crud?.stock_movements?.create,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction || props.crud?.finances?.create,
    onUpdateSupplier: props.onUpdateSupplier || props.crud?.fournisseurs?.update,
    onCreateBusinessEvent: props.onCreateBusinessEvent || props.crud?.business_events?.create,
    onCreateAlert: props.onCreateAlert || props.crud?.alertes_center?.create,
    onCreateFeedFormula: props.onCreateFeedFormula || agriFeedsCrud.feed_formulas.create,
    onUpdateFeedFormula: props.onUpdateFeedFormula || agriFeedsCrud.feed_formulas.update,
    onCreateFeedFormulaVersion: props.onCreateFeedFormulaVersion || agriFeedsCrud.feed_formula_versions.create,
    onCreateFeedFormulaIngredient: props.onCreateFeedFormulaIngredient || agriFeedsCrud.feed_formula_ingredients.create,
    onCreateFeedProductionOrder: props.onCreateFeedProductionOrder || agriFeedsCrud.feed_production_orders.create,
    onUpdateFeedProductionOrder: props.onUpdateFeedProductionOrder || agriFeedsCrud.feed_production_orders.update,
    onCreateFeedFinishedBatch: props.onCreateFeedFinishedBatch || agriFeedsCrud.feed_finished_batches.create,
    onUpdateFeedFinishedBatch: props.onUpdateFeedFinishedBatch || agriFeedsCrud.feed_finished_batches.update,
    onCreateFeedQualityCheck: props.onCreateFeedQualityCheck || agriFeedsCrud.feed_quality_checks.create,
    onCreateFeedTrial: props.onCreateFeedTrial || agriFeedsCrud.feed_trials.create,
    onUpdateFeedTrial: props.onUpdateFeedTrial || agriFeedsCrud.feed_trials.update,
    onCreateFeedPhase1Comparison: props.onCreateFeedPhase1Comparison || agriFeedsCrud.feed_phase1_comparisons.create,
    onUpdateFeedPhase1Comparison: props.onUpdateFeedPhase1Comparison || agriFeedsCrud.feed_phase1_comparisons.update,
    onCreateSaleOrder: props.onCreateSaleOrder || props.crud?.sales_orders?.create,
    onCreateSaleOrderItem: props.onCreateSaleOrderItem || props.crud?.sales_order_items?.create,
    onUpdateClient: props.onUpdateClient || props.crud?.clients?.update,
    onCreateReport: props.onCreateReport || props.crud?.rapports?.create,
    onCreateAuditLog: props.onCreateAuditLog || props.crud?.audit_logs?.create,
    stocks: arr(props.stocks ?? crudRows(props.crud, 'stock')),
  };

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-line bg-card p-6">
        <p className="text-xl font-semibold text-earth">AGRI FEEDS</p>
        <p className="text-sm text-slate mt-1 max-w-3xl leading-relaxed">
          Production d’aliments animaux pilotée par les coûts, les essais, la qualité et les performances réelles.
        </p>
      </header>

      <ModuleTabsBar moduleId="agri_feeds" active={tab} onChange={setTab} wrap activeFarm={props.activeFarm} />

      {tab === 'AgriFeedsOverviewView' ? (
        <AgriFeedsDashboardTab dataMap={dataMap} onNavigateTab={setTab} />
      ) : null}
      {tab === 'AgriFeedsMaterialsView' ? (
        <MaterialsSuppliersTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'AgriFeedsFormulationsView' ? (
        <FormulationsTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'AgriFeedsProductionView' ? (
        <ProductionTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'AgriFeedsTrialsView' ? (
        <TrialsComparisonTab dataMap={dataMap} {...workflowHandlers} />
      ) : null}
      {tab === 'AgriFeedsCommercialView' ? <CommercialTab dataMap={dataMap} {...workflowHandlers} /> : null}
      {tab === 'AgriFeedsQualityView' ? (
        <QualityReportingTab dataMap={dataMap} {...workflowHandlers} userRole={props.userRole || props.role || 'manager'} />
      ) : null}
      {tab === 'AgriFeedsCostsView' ? <CostsDecisionsTab dataMap={dataMap} /> : null}
    </div>
  );
}
