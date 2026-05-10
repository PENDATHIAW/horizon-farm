import SalesEvolution from './SalesEvolution.jsx';
import VentesV2 from './VentesV2.jsx';

export default function VentesV3(props) {
  return (
    <div className="space-y-6">
      <VentesV2 {...props} />
      <SalesEvolution
        rows={props.rows || []}
        payments={props.paymentsList || props.payments || []}
        opportunities={props.opportunities || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
