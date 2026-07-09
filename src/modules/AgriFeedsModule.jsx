import { useCallback, useEffect, useMemo, useState } from 'react';
import { Wheat } from 'lucide-react';
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

export default function AgriFeedsModule(props) {
  const controlled = Boolean(props.onTabChange);
  const [internalTab, setInternalTab] = useState(() => resolveAgriFeedsTab(props.initialTab || 'Tableau de bord'));
  const tab = controlled
    ? resolveAgriFeedsTab(props.initialTab || 'Tableau de bord')
    : internalTab;

  const setTab = useCallback((value) => {
    const resolved = resolveAgriFeedsTab(value);
    if (controlled) {
      props.onTabChange?.(resolved);
      return;
    }
    setInternalTab(resolved);
  }, [controlled, props.onTabChange]);

  useEffect(() => {
    if (controlled || !props.initialTab) return;
    setInternalTab(resolveAgriFeedsTab(props.initialTab));
  }, [controlled, props.initialTab]);

  const dataMap = useMemo(() => ({
    ...(props.dataMap || {}),
    alimentation_logs: arr(props.alimentationLogs ?? props.dataMap?.alimentation_logs),
    stock: arr(props.stocks ?? props.dataMap?.stock),
    stocks: arr(props.stocks ?? props.dataMap?.stocks),
    avicole: arr(props.lots ?? props.dataMap?.avicole),
    lots: arr(props.lots ?? props.dataMap?.lots),
    animaux: arr(props.animaux ?? props.dataMap?.animaux),
    fournisseurs: arr(props.fournisseurs ?? props.dataMap?.fournisseurs),
    finances: arr(props.transactions ?? props.dataMap?.finances),
    transactions: arr(props.transactions ?? props.dataMap?.transactions),
    clients: arr(props.clients ?? props.dataMap?.clients),
    sales_orders: arr(props.salesOrders ?? props.dataMap?.sales_orders),
    production_oeufs_logs: arr(props.productionLogs ?? props.dataMap?.production_oeufs_logs),
    feed_raw_materials: arr(props.feedRawMaterials ?? props.dataMap?.feed_raw_materials),
    feed_raw_batches: arr(props.feedRawBatches ?? props.dataMap?.feed_raw_batches),
    feed_formulas: arr(props.feedFormulas ?? props.dataMap?.feed_formulas),
    feed_formula_versions: arr(props.feedFormulaVersions ?? props.dataMap?.feed_formula_versions),
    feed_formula_ingredients: arr(props.feedFormulaIngredients ?? props.dataMap?.feed_formula_ingredients),
    feed_facility_zones: arr(props.feedFacilityZones ?? props.dataMap?.feed_facility_zones),
    feed_trials: arr(props.dataMap?.feed_trials),
    feed_production_orders: arr(props.feedProductionOrders ?? props.dataMap?.feed_production_orders),
    feed_finished_batches: arr(props.feedFinishedBatches ?? props.dataMap?.feed_finished_batches),
    feed_quality_checks: arr(props.feedQualityChecks ?? props.dataMap?.feed_quality_checks),
  }), [props]);

  const workflowHandlers = {
    onCreateFeedRawMaterial: props.onCreateFeedRawMaterial,
    onCreateFeedRawBatch: props.onCreateFeedRawBatch,
    onUpdateFeedRawBatch: props.onUpdateFeedRawBatch,
    onCreateStock: props.onCreateStock,
    onUpdateStock: props.onUpdateStock,
    onCreateStockMovement: props.onCreateStockMovement,
    onCreateFinanceTransaction: props.onCreateFinanceTransaction,
    onUpdateSupplier: props.onUpdateSupplier,
    onCreateBusinessEvent: props.onCreateBusinessEvent,
    onCreateAlert: props.onCreateAlert,
    onCreateFeedFormula: props.onCreateFeedFormula,
    onUpdateFeedFormula: props.onUpdateFeedFormula,
    onCreateFeedFormulaVersion: props.onCreateFeedFormulaVersion,
    onCreateFeedFormulaIngredient: props.onCreateFeedFormulaIngredient,
    onCreateFeedProductionOrder: props.onCreateFeedProductionOrder,
    onUpdateFeedProductionOrder: props.onUpdateFeedProductionOrder,
    onCreateFeedFinishedBatch: props.onCreateFeedFinishedBatch,
    onCreateFeedQualityCheck: props.onCreateFeedQualityCheck,
    stocks: arr(props.stocks),
  };

  return (
    <div className="space-y-4">
      <header className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5">
        <p className="text-xl font-black text-[#2f2415] flex items-center gap-2">
          <Wheat size={22} /> AGRI FEEDS
        </p>
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
      {tab === 'Tests & comparaison' ? <TrialsComparisonTab dataMap={dataMap} /> : null}
      {tab === 'Commercial' ? <CommercialTab dataMap={dataMap} /> : null}
      {tab === 'Qualité & reporting' ? <QualityReportingTab dataMap={dataMap} /> : null}
    </div>
  );
}
