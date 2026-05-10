import SalesMarginsBridge from './SalesMarginsBridge.jsx';
import VentesV2 from './VentesV2.jsx';

export default function VentesV3(props) {
  return (
    <div className="space-y-6">
      <VentesV2 {...props} />
      <SalesMarginsBridge
        rows={props.rows || []}
        lots={props.lots || []}
        animaux={props.animaux || []}
        cultures={props.cultures || []}
        stocks={props.stocks || []}
        alimentationLogs={props.alimentationLogs || []}
        productionLogs={props.productionLogs || []}
        vaccins={props.vaccins || []}
        businessEvents={props.businessEvents || []}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
      />
    </div>
  );
}
