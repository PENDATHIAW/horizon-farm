import SalesAutoTasksBridge from './SalesAutoTasksBridge.jsx';
import VentesV6 from './VentesV6.jsx';

export default function VentesV5(props) {
  return <>
    <SalesAutoTasksBridge
      orders={props.rows || []}
      payments={props.paymentsList || props.payments || []}
      deliveries={props.deliveriesList || props.deliveries || []}
    />
    <VentesV6 {...props} />
  </>;
}
