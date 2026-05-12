import { useState } from 'react';
import CollapsibleAdvancedSection from '../components/CollapsibleAdvancedSection.jsx';
import SalesEvolution from './SalesEvolution.jsx';
import SalesMarginsBridge from './SalesMarginsBridge.jsx';
import VentesV2 from './VentesV2.jsx';

export default function VentesV3(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const payments = props.paymentsList || props.payments || [];
  return (
    <div className="space-y-6">
      <VentesV2 {...props} />
      <CollapsibleAdvancedSection
        title="Ventes : marges, contrôles et évolution"
        description="La gestion des commandes reste simple. Les marges détaillées et les graphes sont disponibles ici."
        open={showAdvanced}
        onToggle={() => setShowAdvanced((value) => !value)}
      >
        <SalesMarginsBridge
          rows={props.rows || []}
          payments={payments}
          transactions={props.transactions || []}
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
        <SalesEvolution
          rows={props.rows || []}
          payments={payments}
          onNavigate={props.onNavigate}
        />
      </CollapsibleAdvancedSection>
    </div>
  );
}
