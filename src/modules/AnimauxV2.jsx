import Animaux from './Animaux.jsx';
import AnimalSlaughterStockBridge from './AnimalSlaughterStockBridge.jsx';
import AnimauxEvolution from './AnimauxEvolution.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';

export default function AnimauxV2(props) {
  return (
    <div className="space-y-6">
      <Animaux {...props} />
      <AnimalSlaughterStockBridge
        rows={props.rows || []}
        businessEvents={props.businessEvents || []}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
      <DirectChargesBridge
        title="Autres charges directes animaux"
        subtitle="Ajoute les frais exceptionnels liés à un animal précis : transport, traitement spécial, abattage, emballage, etc."
        targetType="animaux"
        targets={props.rows || []}
        businessEvents={props.businessEvents || []}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onUpdateBusinessEvent={props.onUpdateBusinessEvent}
        onDeleteBusinessEvent={props.onDeleteBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
      <AnimauxEvolution
        rows={props.rows || []}
        alimentationLogs={props.alimentationLogs || []}
        vaccins={props.vaccins || []}
        businessEvents={props.businessEvents || []}
        opportunities={props.opportunities || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
