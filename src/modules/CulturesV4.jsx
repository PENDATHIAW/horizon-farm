import { BarChart3, ClipboardList, Sprout } from 'lucide-react';
import CulturesV3 from './CulturesV3.jsx';
import CulturesEvolution from './CulturesEvolution.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function CulturesV4(props) {
  return <div className="space-y-6 cultures-mobile-structured"><style>{`@media (max-width: 640px){.cultures-mobile-structured .rounded-2xl{border-radius:18px}.cultures-mobile-structured table{font-size:12px}.cultures-mobile-structured th,.cultures-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.cultures-mobile-structured .text-2xl{font-size:1.35rem}.cultures-mobile-structured .grid{gap:.75rem}.cultures-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <ModuleSection icon={Sprout} title="Gestion des cultures" subtitle="Parcelles, campagnes, coûts, récoltes, marge et risques."><CulturesV3 {...props} /></ModuleSection>
    <ModuleSection icon={ClipboardList} title="Cycle et historique cultures" subtitle="Entrées, sorties, ventes, pertes, récoltes et événements importants."><LifecycleHistoryPanel mode="cultures" rows={props.rows || []} salesOrders={props.salesOrders || []} deliveries={props.deliveriesList || props.deliveries || []} businessEvents={props.businessEvents || []} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Évolution cultures" subtitle="Rendement, coûts, récoltes, ventes, pertes et valeur."><CulturesEvolution rows={props.rows || []} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
