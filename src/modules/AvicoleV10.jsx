import { BarChart3, ClipboardList, Egg, PackageCheck, Scissors } from 'lucide-react';
import AvicoleBase from './AvicoleBase.jsx';
import AvicoleEvolution from './AvicoleEvolution.jsx';
import AvicoleJournalsBridge from './AvicoleJournalsBridge.jsx';
import AvicoleTransformationBridge from './AvicoleTransformationBridge.jsx';
import DirectChargesBridge from './DirectChargesBridge.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4">
      <div>
        <p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>
        {subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export default function AvicoleV10(props) {
  return (
    <div className="space-y-6 avicole-mobile-final">
      <style>{`@media (max-width: 640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>

      <ModuleSection
        icon={PackageCheck}
        title="Vue opérationnelle avicole"
        subtitle="Lots, effectifs, ponte, coûts directs essentiels et actions de gestion courante."
      >
        <AvicoleBase {...props} />
      </ModuleSection>

      <ModuleSection
        icon={ClipboardList}
        title="Cycle et historique"
        subtitle="Lecture simple des entrées, sorties, clôtures, ventes et événements importants."
      >
        <LifecycleHistoryPanel
          mode="avicole"
          rows={props.rows || []}
          salesOrders={props.salesOrders || []}
          deliveries={props.deliveriesList || props.deliveries || []}
          businessEvents={props.businessEvents || []}
        />
      </ModuleSection>

      <ModuleSection
        icon={Egg}
        title="Ponte, œufs et charges directes"
        subtitle="Ramassage des œufs, stock d’œufs vendables, frais ponctuels et événements liés aux lots."
      >
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
          subtitle="Frais exceptionnels liés à un lot : transport, emballage, traitement spécial ou main-d’œuvre ponctuelle."
          targetType="avicole"
          targets={props.rows || []}
          businessEvents={props.businessEvents || []}
          onCreateBusinessEvent={props.onCreateBusinessEvent}
          onUpdateBusinessEvent={props.onUpdateBusinessEvent}
          onDeleteBusinessEvent={props.onDeleteBusinessEvent}
          onRefreshBusinessEvents={props.onRefreshBusinessEvents}
        />
      </ModuleSection>

      <ModuleSection
        icon={Scissors}
        title="Abattage, transformation et stock"
        subtitle="Sortie des sujets chair, poids, transformation et création éventuelle de stock viande vendable."
      >
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
      </ModuleSection>

      <ModuleSection
        icon={BarChart3}
        title="Évolution avicole"
        subtitle="Graphes conservés : chair, ponte, coûts, ventes, production et mortalité."
      >
        <AvicoleEvolution
          rows={props.rows || []}
          productionLogs={props.productionLogs || []}
          alimentationLogs={props.alimentationLogs || []}
          businessEvents={props.businessEvents || []}
          opportunities={props.opportunities || []}
          onNavigate={props.onNavigate}
        />
      </ModuleSection>
    </div>
  );
}
