import useCrudModule from '../hooks/useCrudModule';
import FinancialPlanPanel from './FinancialPlanPanel.jsx';

const rows = (crud) => crud?.rows || [];

export default function FinancialPlanPanelLive(props) {
  const sales = useCrudModule('sales_orders');
  const payments = useCrudModule('payments');
  const finances = useCrudModule('finances');
  const animaux = useCrudModule('animaux');
  const lots = useCrudModule('avicole');
  const stock = useCrudModule('stock');
  const alimentation = useCrudModule('alimentation_logs');
  const production = useCrudModule('production_oeufs_logs');

  return (
    <FinancialPlanPanel
      {...props}
      salesOrders={props.salesOrders?.length ? props.salesOrders : rows(sales)}
      payments={props.payments?.length ? props.payments : rows(payments)}
      transactions={props.transactions?.length ? props.transactions : rows(finances)}
      animaux={props.animaux?.length ? props.animaux : rows(animaux)}
      lots={props.lots?.length ? props.lots : rows(lots)}
      stocks={props.stocks?.length ? props.stocks : rows(stock)}
      alimentationLogs={props.alimentationLogs?.length ? props.alimentationLogs : rows(alimentation)}
      productionLogs={props.productionLogs?.length ? props.productionLogs : rows(production)}
    />
  );
}
