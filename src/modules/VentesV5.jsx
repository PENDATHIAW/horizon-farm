import SalesAutoTasksBridge from './SalesAutoTasksBridge.jsx';
import VentesV4 from './VentesV4.jsx';

export default function VentesV5(props) {
  return <>
    <SalesAutoTasksBridge
      orders={props.rows || []}
      payments={props.paymentsList || props.payments || []}
      deliveries={props.deliveriesList || props.deliveries || []}
    />
    <VentesV4 {...props} />
  </>;
}
