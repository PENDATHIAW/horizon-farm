import { useMemo, useState } from 'react';
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

const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const lotText = (lot = {}) => norm(`${lot.type || ''} ${lot.type_lot || ''} ${lot.production_type || ''} ${lot.activity_type || ''} ${lot.categorie || ''} ${lot.name || ''} ${lot.nom || ''}`);
const isPondeuse = (lot = {}) => { const text = lotText(lot); return text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf') || text.includes('œuf'); };
const isChair = (lot = {}) => { const text = lotText(lot); return text.includes('chair') || text.includes('broiler'); };
const filterByActivity = (rows = [], activity) => {
  if (activity === 'pondeuse') return rows.filter(isPondeuse);
  if (activity === 'chair') return rows.filter(isChair);
  return rows;
};

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

function ActivityEntryCard({ icon: Icon, active, title, subtitle, rows = [], productionLogs = [], action, onClick }) {
  const activeRows = rows.filter(avicoleHasActiveBirds);
  const effectif = activeRows.reduce((sum, lot) => sum + avicoleActiveCount(lot), 0);
  const decisions = activeRows.map((lot) => buildAvicoleLotDecision(lot, productionLogs));
  const urgent = decisions.filter((decision) => decision.priority === 'haute').length;
  const averageSignal = decisions.length ? Math.round(decisions.reduce((sum, decision) => sum + (decision.type === 'pondeuse' ? Number(decision.layingRate || 0) : Number(decision.progress || 0)), 0) / decisions.length) : 0;
  return <button type="button" onClick={onClick} className={`rounded-3xl border p-5 text-left shadow-sm transition-all ${active ? 'border-[#2f2415] bg-[#2f2415] text-white' : 'border-[#d6c3a0] bg-white hover:border-[#b6975f] hover:shadow-md'}`}>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 min-w-0"><div className={`rounded-2xl p-3 ${active ? 'bg-white/15 text-[#ffd86b]' : 'bg-[#fff3d8] text-[#9a6b12]'}`}><Icon size={22} /></div><div className="min-w-0"><p className={`text-xl font-black break-words ${active ? 'text-white' : 'text-[#2f2415]'}`}>{title}</p><p className={`mt-1 text-sm leading-relaxed ${active ? 'text-white/75' : 'text-[#8a7456]'}`}>{subtitle}</p></div></div>
      <span className={`w-fit rounded-full px-3 py-1 text-xs font-black ${active ? 'bg-[#ffd86b] text-[#2f2415]' : 'bg-[#2f2415] text-white'}`}>{action}</span>
    </div>
    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2"><Mini active={active} label="Lots actifs" value={activeRows.length} /><Mini active={active} label="Effectif" value={fmtNumber(effectif)} /><Mini active={active} label="Signal IA" value={`${averageSignal}%`} /></div>
    <div className={`mt-3 rounded-xl border p-3 text-xs leading-relaxed ${active ? 'border-white/15 bg-white/10 text-white/80' : urgent ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{urgent ? `${urgent} action(s) IA prioritaire(s) à vérifier.` : 'Aucune urgence IA prioritaire sur cette activité.'}</div>
  </button>;
}

function Mini({ label, value, active = false }) {
  return <div className={`rounded-xl border p-3 ${active ? 'border-white/15 bg-white/10' : 'border-[#eadcc2] bg-[#fffdf8]'}`}><p className={`text-[10px] ${active ? 'text-white/60' : 'text-[#8a7456]'}`}>{label}</p><p className={`mt-1 font-black ${active ? 'text-white' : 'text-[#2f2415]'}`}>{value}</p></div>;
}

export default function AvicoleV10(props) {
  const [activity, setActivity] = useState('pondeuse');
  const rows = props.rows || [];
  const productionLogs = props.productionLogs || [];
  const pondeuses = useMemo(() => rows.filter(isPondeuse), [rows]);
  const chair = useMemo(() => rows.filter(isChair), [rows]);
  const scopedRows = useMemo(() => filterByActivity(rows, activity), [rows, activity]);
  const scopedProductionLogs = useMemo(() => productionLogs.filter((log) => activity !== 'chair' || chair.some((lot) => String(lot.id) === String(log.lot_id || log.related_id))), [productionLogs, activity, chair]);
  const scopedProps = { ...props, rows: scopedRows, productionLogs: scopedProductionLogs, opportunities: (props.opportunities || []).filter((op) => activity === 'pondeuse' ? norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('oeuf') || norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('pondeuse') : activity === 'chair' ? norm(`${op.title || ''} ${op.source_type || ''} ${op.type || ''}`).includes('chair') : true) };
  const dataMap = { sales_orders: props.salesOrders || [], payments: props.payments || [], finances: props.transactions || [], avicole: scopedRows, production_oeufs_logs: scopedProductionLogs, alimentation_logs: props.alimentationLogs || [] };
  const selectedLabel = activity === 'pondeuse' ? 'Pondeuses' : 'Poulets de chair';

  return <div className="space-y-6 avicole-mobile-final">
    <style>{`.avicole-mobile-final .objective-card-grid{align-items:stretch}@media(max-width:640px){.avicole-mobile-final .rounded-2xl{border-radius:18px}.avicole-mobile-final table{font-size:12px}.avicole-mobile-final th,.avicole-mobile-final td{padding-left:10px!important;padding-right:10px!important}.avicole-mobile-final .text-2xl{font-size:1.35rem}.avicole-mobile-final .grid{gap:.75rem}.avicole-mobile-final .overflow-x-auto{max-width:100vw}}`}</style>
    <div className="rounded-3xl border border-[#d6c3a0] bg-[#fffdf8] p-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-[#8a7456] font-black flex items-center gap-2"><Bird size={15} /> Séparation avicole</p>
      <h2 className="mt-1 text-2xl font-black text-[#2f2415]">Choisis l’activité à piloter</h2>
      <p className="mt-1 text-sm text-[#8a7456]">Le choix ci-dessous pilote tout le module : objectifs, fiches, historique, ponte, abattage et évolution.</p>
      <div className="mt-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
        <ActivityEntryCard active={activity === 'pondeuse'} icon={Egg} title="Pondeuses" subtitle="Ponte, tablettes d’œufs, baisse de ponte et réforme progressive dès 17 mois." rows={pondeuses} productionLogs={productionLogs} action="Voir pondeuses" onClick={() => setActivity('pondeuse')} />
        <ActivityEntryCard active={activity === 'chair'} icon={Drumstick} title="Poulets de chair" subtitle="Poids moyen, cycle court, vente dès 35-45 jours si objectif atteint." rows={chair} productionLogs={productionLogs} action="Voir chair" onClick={() => setActivity('chair')} />
      </div>
    </div>

    <div className="rounded-2xl border border-[#d6c3a0] bg-white p-4"><p className="text-xs uppercase tracking-[0.2em] text-[#9a6b12] font-black">Vue active</p><p className="mt-1 text-xl font-black text-[#2f2415]">{selectedLabel}</p><p className="mt-1 text-sm text-[#8a7456]">Tout ce qui suit concerne uniquement : {selectedLabel.toLowerCase()}.</p></div>

    <div className="objective-card-grid grid grid-cols-1 gap-4">
      {activity === 'pondeuse' ? <ObjectivePerformanceCard dataMap={dataMap} activity="oeufs" title="Objectif œufs / pondeuses" compact onNavigate={props.onNavigate} /> : <ObjectivePerformanceCard dataMap={dataMap} activity="poulets_chair" title="Objectif poulets de chair" compact onNavigate={props.onNavigate} />}
    </div>

    <ModuleSection icon={PackageCheck} title={`Vue opérationnelle · ${selectedLabel}`} subtitle={activity === 'pondeuse' ? 'Lots pondeuses, ponte, coûts et actions courantes.' : 'Lots chair, poids moyen, cycle, coûts et vente.'}><AvicoleBase {...scopedProps} /></ModuleSection>
    <ModuleSection icon={ClipboardList} title={`Cycle et historique · ${selectedLabel}`} subtitle="Entrées, sorties, clôtures, ventes et événements importants."><LifecycleHistoryPanel mode="avicole" rows={scopedRows} salesOrders={props.salesOrders || []} deliveries={props.deliveriesList || props.deliveries || []} businessEvents={props.businessEvents || []} /></ModuleSection>
    {activity === 'pondeuse' ? <ModuleSection icon={Egg} title="Ponte, œufs et charges directes" subtitle="Ramassage, stock d’œufs vendables et frais ponctuels liés aux pondeuses."><AvicoleJournalsBridge {...scopedProps} rows={scopedRows} productionLogs={scopedProductionLogs} businessEvents={props.businessEvents || []} /><DirectChargesBridge title="Charges directes pondeuses" subtitle="Frais liés aux lots pondeuses." targetType="avicole" targets={scopedRows} businessEvents={props.businessEvents || []} onCreateBusinessEvent={props.onCreateBusinessEvent} onUpdateBusinessEvent={props.onUpdateBusinessEvent} onDeleteBusinessEvent={props.onDeleteBusinessEvent} onRefreshBusinessEvents={props.onRefreshBusinessEvents} /></ModuleSection> : null}
    {activity === 'chair' ? <ModuleSection icon={Scissors} title="Abattage, transformation et stock" subtitle="Sortie des sujets chair, poids, transformation et stock viande vendable."><AvicoleTransformationBridge {...scopedProps} rows={scopedRows} alimentationLogs={props.alimentationLogs || []} productionLogs={scopedProductionLogs} businessEvents={props.businessEvents || []} /></ModuleSection> : null}
    <ModuleSection icon={BarChart3} title={`Évolution avicole · ${selectedLabel}`} subtitle={activity === 'pondeuse' ? 'Évolution ponte, coûts, production et mortalité.' : 'Évolution poids, coûts, ventes et mortalité.'}><AvicoleEvolution rows={scopedRows} productionLogs={scopedProductionLogs} alimentationLogs={props.alimentationLogs || []} businessEvents={props.businessEvents || []} opportunities={scopedProps.opportunities || []} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
