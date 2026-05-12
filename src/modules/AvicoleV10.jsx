import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import AvicoleBase from './AvicoleBase.jsx';
import AvicoleEvolution from './AvicoleEvolution.jsx';
import AvicoleHealthBridge from './AvicoleHealthBridge.jsx';
import AvicoleJournalsBridge from './AvicoleJournalsBridge.jsx';
import AvicoleSaleReadinessBridge from './AvicoleSaleReadinessBridge.jsx';
import AvicoleTransformationBridge from './AvicoleTransformationBridge.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import GrowthPerformanceOverview from './GrowthPerformanceOverview.jsx';

function AdvancedSection({ open, onToggle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white shadow-sm overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between gap-3 p-5 text-left">
        <div>
          <p className="text-xs uppercase tracking-widest text-[#8a7456]">Analyse avancée</p>
          <h3 className="text-lg font-black text-[#2f2415]">Volailles : ventes, croissance, santé, journaux, charges et évolution</h3>
          <p className="mt-1 text-sm text-[#8a7456]">Les analyses détaillées sont regroupées ici pour garder le module principal lisible. Les graphes d’évolution sont conservés.</p>
        </div>
        {open ? <ChevronDown className="text-[#8a7456]" /> : <ChevronRight className="text-[#8a7456]" />}
      </button>
      {open ? <div className="border-t border-[#eadcc2] p-5 space-y-6 bg-[#fffdf8]/40">{children}</div> : null}
    </section>
  );
}

export default function AvicoleV10(props) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  return (
    <div className="space-y-6 avicole-mobile-final">
      <style>{`@media (max-width: 640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>
      <AvicoleBase {...props} />
      <AdvancedSection open={showAdvanced} onToggle={() => setShowAdvanced((value) => !value)}>
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
        <GrowthPerformanceOverview
          mode="avicole"
          rows={props.rows || []}
          alimentationLogs={props.alimentationLogs || []}
          productionLogs={props.productionLogs || []}
          businessEvents={props.businessEvents || []}
        />
        <AvicoleTransformationBridge
          rows={props.rows || []}
          alimentationLogs={props.alimentationLogs || []}
          productionLogs={props.productionLogs || []}
          businessEvents={props.businessEvents || []}
          onUpdate={props.onUpdate}
          onRefresh={props.onRefresh}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
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
      </AdvancedSection>
    </div>
  );
}
