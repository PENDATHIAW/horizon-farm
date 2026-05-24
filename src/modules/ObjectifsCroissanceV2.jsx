import ActivityCycleGoalsPanel from './ActivityCycleGoalsPanel.jsx';
import BpKpiHealth from './BpKpiHealth.jsx';
import ObjectifsCroissance from './ObjectifsCroissance.jsx';

export default function ObjectifsCroissanceV2(props) {
  const dataMap = props.dataMap || {};
  return <div className="space-y-6">
    <BpKpiHealth
      salesOrders={dataMap.salesOrders || dataMap.sales_orders || []}
      payments={dataMap.payments || []}
      transactions={dataMap.transactions || dataMap.finances || []}
      investments={dataMap.investissements || []}
      onNavigate={props.onNavigate}
    />
    <ActivityCycleGoalsPanel dataMap={dataMap} onNavigate={props.onNavigate} />
    <ObjectifsCroissance {...props} />
  </div>;
}