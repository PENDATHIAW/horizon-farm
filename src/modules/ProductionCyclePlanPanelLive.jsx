import useCrudModule from '../hooks/useCrudModule';
import ProductionCyclePlanPanel from './ProductionCyclePlanPanel.jsx';

const rows = (crud) => crud?.rows || [];

export default function ProductionCyclePlanPanelLive(props) {
  const lots = useCrudModule('avicole');
  const animaux = useCrudModule('animaux');
  const production = useCrudModule('production_oeufs_logs');

  return (
    <ProductionCyclePlanPanel
      {...props}
      lots={props.lots?.length ? props.lots : rows(lots)}
      animaux={props.animaux?.length ? props.animaux : rows(animaux)}
      productionLogs={props.productionLogs?.length ? props.productionLogs : rows(production)}
    />
  );
}
