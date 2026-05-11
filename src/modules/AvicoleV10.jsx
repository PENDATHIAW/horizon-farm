import AvicoleBase from './AvicoleBase.jsx';
import AvicoleEvolution from './AvicoleEvolution.jsx';
import AvicoleHealthBridge from './AvicoleHealthBridge.jsx';
import AvicoleJournalsBridge from './AvicoleJournalsBridge.jsx';
import AvicoleSaleReadinessBridge from './AvicoleSaleReadinessBridge.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import GrowthPerformanceOverview from './GrowthPerformanceOverview.jsx';

export default function AvicoleV10(props) {
  return (
    <div className="space-y-6 avicole-mobile-final">
      <style>{`@media (max-width: 640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>
      <AvicoleSaleReadinessBridge
        rows={props.rows || []}
        opportunities={props.opportunities || []}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
        onCreateOpportunity={props.onCreateOpportunity}
        onUpdateOpportunity={props.onUpdateOpportunity}
        onRefreshOpportunities={props.onRefreshOpportunities}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
      <AvicoleBase {...props} />
      <GrowthPerformanceOverview
        mode="avicole"
        rows={props.rows || []}
        alimentationLogs={props.alimentationLogs || []}
        productionLogs={props.productionLogs || []}
        businessEvents={props.businessEvents || []}
      />
      <AvicoleHealthBridge
        rows={props.rows || []}
        productionLogs={props.productionLogs || []}
        alimentationLogs={props.alimentationLogs || []}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
      />
      <AvicoleJournalsBridge
        rows={props.rows || []}
        productionLogs={props.productionLogs || []}
        businessEvents={props.businessEvents || []}
        onCreateProduction={props.onCreateProduction}
        onUpdateProduction={props.onUpdateProduction}
        onDeleteProduction={props.onDeleteProduction}
        onRefreshProduction={props.onRefreshProduction}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onUpdateBusinessEvent={props.onUpdateBusinessEvent}
        onDeleteBusinessEvent={props.onDeleteBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        onUpdate={props.onUpdate}
        onRefresh={props.onRefresh}
      />
      <DirectChargesBridge
        title="Charges directes avicoles"
        subtitle="Frais exceptionnels liés à un lot : emballage, découpe, traitement spécial ou main-d’œuvre ponctuelle."
        targetType="avicole"
        targets={props.rows || []}
        businessEvents={props.businessEvents || []}
        onCreateBusinessEvent={props.onCreateBusinessEvent}
        onUpdateBusinessEvent={props.onUpdateBusinessEvent}
        onDeleteBusinessEvent={props.onDeleteBusinessEvent}
        onRefreshBusinessEvents={props.onRefreshBusinessEvents}
      />
      <AvicoleEvolution
        rows={props.rows || []}
        productionLogs={props.productionLogs || []}
        alimentationLogs={props.alimentationLogs || []}
        businessEvents={props.businessEvents || []}
        opportunities={props.opportunities || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
