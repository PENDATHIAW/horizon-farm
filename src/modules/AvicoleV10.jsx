import { BarChart3, Bird, ClipboardList, Drumstick, Egg, PackageCheck, Scissors } from 'lucide-react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import { buildAvicoleLotDecision } from '../services/avicoleDecisionEngine';
import { fmtNumber } from '../utils/format';
import { avicoleActiveCount, avicoleHasActiveBirds } from '../utils/avicoleMetrics';
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

function ActivityEntryCard({ icon: Icon, title, subtitle, rows = [], productionLogs = [], action, onClick }) {
  const activeRows = rows.filter(avicoleHasActiveBirds);
  const effectif = activeRows.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0);
  const decisions = activeRows.map((lot) => buildAvicoleLotDecision(lot, productionLogs));
  const urgent = decisions.filter((decision) => decision.priority === 'haute').length;
  const averageSignal = decisions.length ? Math.round(decisions.reduce((sum, decision) => sum + (decision.type === 'pondeuse' ? Number(decision.layingRate || 0) : Number(decision.progress || 0)), 0) / decisions.length) : 0;

  return (
    <button type="button" onClick={onClick} className="rounded-3xl border border-[#d6c3a0] bg-white p-5 text-left shadow-sm hover:border-[#b6975f] hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-[#fff3d8] p-3 text-[#9a6b12]"><Icon size={22} /></div>
          <div>
            <p className="text-xl font-black text-[#2f2415]">{title}</p>
            <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p>
          </div>
        </div>
        <span className="rounded-full bg-[#2f2415] px-3 py-1 text-xs font-black text-white">{action}</span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Mini label="Lots actifs" value={activeRows.length} />
        <Mini label="Effectif" value={fmtNumber(effectif)} />
        <Mini label="Signal IA" value={`${averageSignal}%`} />
      </div>
      <div className={`mt-3 rounded-xl border p-3 text-xs ${urgent ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
        {urgent ? `${urgent} action(s) IA prioritaire(s) à vérifier.` : 'Aucune urgence IA prioritaire sur cette activité.'}
      </div>
    </button>
  );
}

function Mini({ label, value }) {
  return <div className="rounded-xl border border-[#eadcc2] bg-[#fffdf8] p-3"><p className="text-[10px] text-[#8a7456]">{label}</p><p className="mt-1 font-black text-[#2f2415]">{value}</p></div>;
}

export default function AvicoleV10(props) {
  const rows = props.rows || [];
  const productionLogs = props.productionLogs || [];
  const pondeuses = rows.filter((lot) => lot.type === 'Pondeuse');
  const chair = rows.filter((lot) => lot.type === 'Chair');
  const dataMap = {
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.transactions || [],
    avicole: rows,
    production_oeufs_logs: productionLogs,
    alimentation_logs: props.alimentationLogs || [],
  };

  return (
    <div className="space-y-6 avicole-mobile-final">
      <style>{`
        .avicole-mobile-final .objective-card-grid { align-items: stretch; }
        @media (max-width: 640px){
          .avicole-mobile-final .rounded-2xl{border-radius:18px}
          .avicole-mobile-final table{font-size:12px}
          .avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}
          .avicole-mobile-final .text-2xl{font-size:1.35rem}
          .avicole-mobile-final .grid{gap:.75rem}
          .avicole-mobile-final .overflow-x-auto{max-width:100vw}
        }
      `}</style>

      <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
        <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Bird size={15} /> Séparation avicole</p>
        <h2 className="mt-1 text-2xl font-black text-[#2f2415]">Pondeuses et poulets de chair ne se pilotent pas pareil</h2>
        <p className="mt-1 text-sm text-[#8a7456]">Le module commence par distinguer les deux activités : ponte/réforme pour les pondeuses, poids/cycle court/vente pour le chair.</p>
        <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
          <ActivityEntryCard icon={Egg} title="Pondeuses" subtitle="Ponte, tablettes d’œufs, baisse de ponte et réforme progressive dès 17 mois." rows={pondeuses} productionLogs={productionLogs} action="Ponte & réforme" onClick={() => props.onNavigate?.('centre_ia')} />
          <ActivityEntryCard icon={Drumstick} title="Poulets de chair" subtitle="Poids moyen, cycle court, vente dès 35-45 jours si objectif atteint." rows={chair} productionLogs={productionLogs} action="Poids & vente" onClick={() => props.onNavigate?.('centre_ia')} />
        </div>
      </div>

      <div className="objective-card-grid grid grid-cols-1 2xl:grid-cols-2 gap-4">
        <ObjectivePerformanceCard dataMap={dataMap} activity="oeufs" title="Objectif œufs / pondeuses" compact onNavigate={props.onNavigate} />
        <ObjectivePerformanceCard dataMap={dataMap} activity="poulets_chair" title="Objectif poulets de chair" compact onNavigate={props.onNavigate} />
      </div>

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
          rows={rows}
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
          rows={rows}
          productionLogs={productionLogs}
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
          targets={rows}
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
          rows={rows}
          alimentationLogs={props.alimentationLogs || []}
          productionLogs={productionLogs}
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
          rows={rows}
          productionLogs={productionLogs}
          alimentationLogs={props.alimentationLogs || []}
          businessEvents={props.businessEvents || []}
          opportunities={props.opportunities || []}
          onNavigate={props.onNavigate}
        />
      </ModuleSection>
    </div>
  );
}
