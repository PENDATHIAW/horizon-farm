import { BarChart3, ClipboardList, Sprout } from 'lucide-react';
import ObjectivePerformanceCard from '../components/ObjectivePerformanceCard.jsx';
import CulturesV3 from './CulturesV3.jsx';
import CulturesEvolution from './CulturesEvolution.jsx';
import LifecycleHistoryPanel from './LifecycleHistoryPanel.jsx';

const toNumber = (value = 0) => Number(value || 0);
const today = () => new Date().toISOString().slice(0, 10);
const lossQty = (row = {}) => toNumber(row.pertes ?? row.quantite_perdue ?? row.quantite_sinistree);
const lossValue = (row = {}) => toNumber(row.valeur_perte_estimee ?? row.perte_estimee ?? row.montant_sinistre);
const isLossStatus = (row = {}) => ['sinistre', 'perdu'].includes(String(row.statut || '').toLowerCase());

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function CulturesV4(props) {
  const dataMap = {
    sales_orders: props.salesOrders || [],
    payments: props.payments || [],
    finances: props.transactions || [],
    cultures: props.rows || [],
  };

  const createLossEvent = async (before = {}, after = {}, source = 'modification culture') => {
    const qtyIncrease = lossQty(after) > lossQty(before);
    const valueIncrease = lossValue(after) > lossValue(before);
    const statusBecameLoss = !isLossStatus(before) && isLossStatus(after);
    if (!qtyIncrease && !valueIncrease && !statusBecameLoss) return;
    const deltaValue = Math.max(0, lossValue(after) - lossValue(before));
    try {
      await props.onCreateBusinessEvent?.({
        id: `EVT-CULT-${Date.now()}`,
        module: 'cultures',
        source_type: 'culture',
        source_id: after.id,
        title: `Perte culturale · ${after.nom || after.type || after.id}`,
        description: [
          `Source: ${source}`,
          `Statut: ${after.statut || 'non renseigné'}`,
          `Pertes: ${lossQty(before)} → ${lossQty(after)} ${after.unite_recolte || ''}`.trim(),
          `Valeur estimée: ${lossValue(before)} → ${lossValue(after)}`,
        ].join('\n'),
        severity: after.statut === 'perdu' ? 'critique' : 'warning',
        status: 'nouveau',
        date: today(),
        type_evenement: 'perte_culturale',
        montant: deltaValue || lossValue(after),
      });
      await props.onRefreshBusinessEvents?.();
    } catch (error) {
      console.warn('Perte culturale non consignée en événement', error);
    }
  };

  const wrappedCreate = async (payload) => {
    await props.onCreate?.(payload);
    await createLossEvent({}, payload, 'création culture');
  };

  const wrappedUpdate = async (id, payload) => {
    const before = (props.rows || []).find((row) => String(row.id) === String(id)) || {};
    const after = { ...before, ...payload, id };
    await props.onUpdate?.(id, payload);
    await createLossEvent(before, after, 'modification fiche culture');
  };

  return <div className="space-y-6 cultures-mobile-structured"><style>{`@media (max-width: 640px){.cultures-mobile-structured .rounded-2xl{border-radius:18px}.cultures-mobile-structured table{font-size:12px}.cultures-mobile-structured th,.cultures-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.cultures-mobile-structured .text-2xl{font-size:1.35rem}.cultures-mobile-structured .grid{gap:.75rem}.cultures-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style>
    <ObjectivePerformanceCard dataMap={dataMap} activity="cultures" title="Objectif & Performance cultures" onNavigate={props.onNavigate} />
    <ModuleSection icon={Sprout} title="Gestion des cultures" subtitle="Parcelles, campagnes, coûts, récoltes, marge et risques."><CulturesV3 {...props} onCreate={wrappedCreate} onUpdate={wrappedUpdate} /></ModuleSection>
    <ModuleSection icon={ClipboardList} title="Cycle et historique cultures" subtitle="Entrées, sorties, ventes, pertes, récoltes et événements importants."><LifecycleHistoryPanel mode="cultures" rows={props.rows || []} salesOrders={props.salesOrders || []} deliveries={props.deliveriesList || props.deliveries || []} businessEvents={props.businessEvents || []} /></ModuleSection>
    <ModuleSection icon={BarChart3} title="Évolution cultures" subtitle="Rendement, coûts, récoltes, ventes, pertes et valeur."><CulturesEvolution rows={props.rows || []} onNavigate={props.onNavigate} /></ModuleSection>
  </div>;
}
