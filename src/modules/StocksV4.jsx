import { BarChart3, Package, Utensils } from 'lucide-react';
import { useCallback } from 'react';
import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';
import StockFeedingCostPlanner from './StockFeedingCostPlanner.jsx';

const lower = (value) => String(value || '').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);
const stockKg = (row = {}) => lower(row.unite).includes('sac') ? toNumber(row.quantite) * toNumber(row.poids_sac_kg || row.sac_kg || 50) : toNumber(row.quantite);
const nextStockQtyAfterKg = (row = {}, kg = 0) => {
  if (lower(row.unite).includes('sac')) {
    const sacKg = toNumber(row.poids_sac_kg || row.sac_kg || 50) || 50;
    return Math.max(0, toNumber(row.quantite) - (toNumber(kg) / sacKg));
  }
  return Math.max(0, toNumber(row.quantite) - toNumber(kg));
};
const targetLabel = (target = {}) => target.name || target.nom || target.tag || target.id;
const activityForFeeding = (targetType = '', target = {}) => {
  if (targetType === 'animal') {
    const text = lower(`${target.type || ''} ${target.espece || ''} ${target.name || ''}`);
    if (text.includes('ovin')) return 'ovins';
    if (text.includes('caprin') || text.includes('chevre') || text.includes('chèvre')) return 'caprins';
    return 'bovins';
  }
  const text = lower(`${target.type || ''} ${target.type_lot || ''} ${target.name || ''}`);
  return text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf') ? 'avicole_pondeuses' : 'avicole_chair';
};

function ModuleSection({ icon: Icon, title, subtitle, children }) {
  return <section className="rounded-3xl border border-[#d6c3a0] bg-white p-5 shadow-sm space-y-4"><div><p className="flex items-center gap-2 text-lg font-black text-[#2f2415]"><Icon size={20} /> {title}</p>{subtitle ? <p className="mt-1 text-sm text-[#8a7456]">{subtitle}</p> : null}</div>{children}</section>;
}

export default function StocksV4(props) {
  const updateWithLossHistory = useCallback(async (id, patch = {}) => {
    await props.onUpdate?.(id, patch);
    if (patch.last_movement_type !== 'perte') return;
    const row = (props.rows || []).find((item) => String(item.id) === String(id));
    const qty = toNumber(patch.last_movement_qty);
    if (!row || qty <= 0) return;
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'perte_stock_quantite', module_source: 'stock', entity_type: 'stock', entity_id: id, title: `Perte stock ${row.produit || row.name || row.id}`, description: `${qty} ${row.unite || ''} retiré(s) du stock. Suivi en quantité uniquement, sans dépense automatique.`, event_date: today(), severity: 'warning', quantity: qty, linked_stock_id: id, saisies_evitees: 1 });
    await props.onRefreshBusinessEvents?.();
  }, [props]);

  const applyFeedingPlan = useCallback(async (plan = {}) => {
    const stock = plan.stock;
    const target = plan.target;
    const totalKg = toNumber(plan.totalKg);
    const totalCost = toNumber(plan.totalCost);
    if (!stock?.id) throw new Error('Choisis d’abord l’aliment à utiliser');
    if (!target?.id) throw new Error('Choisis le lot ou l’animal concerné');
    if (totalKg <= 0) throw new Error('Quantité alimentation invalide');
    if (stockKg(stock) < totalKg) throw new Error('Stock aliment insuffisant pour appliquer ce plan');

    const logId = makeId('ALIM');
    const trxId = makeId('TRX');
    const targetType = plan.targetType === 'animal' ? 'animal' : 'lot_avicole';
    const nextQty = nextStockQtyAfterKg(stock, totalKg);
    const date = plan.date || today();
    const amount = Number(totalCost.toFixed(0));

    await props.onUpdate?.(stock.id, { quantite: Number(nextQty.toFixed(3)), last_movement_type: 'sortie_alimentation', last_movement_label: `Alimentation ${targetLabel(target)}`, last_movement_qty: Number(totalKg.toFixed(3)), last_movement_at: new Date().toISOString(), linked_alimentation_log_id: logId, linked_finance_transaction_id: amount > 0 ? trxId : '' });
    await props.onCreateAlimentation?.({ id: logId, date, stock_id: stock.id, produit: stock.produit || stock.name || stock.id, type_cible: targetType, cible_id: target.id, lot_id: targetType === 'lot_avicole' ? target.id : '', animal_id: targetType === 'animal' ? target.id : '', quantite: Number(totalKg.toFixed(3)), unite: 'kg', prix_unitaire: totalKg > 0 ? Number((totalCost / totalKg).toFixed(2)) : 0, montant_total: amount, cout_total: amount, sujets: toNumber(plan.subjects), jours: toNumber(plan.days), ration_kg_jour: toNumber(plan.dailyKg), cout_par_sujet: Number(toNumber(plan.costPerSubject).toFixed(0)), cout_par_sujet_jour: Number(toNumber(plan.costPerSubjectDay).toFixed(0)), source_module: 'stock', source_record_id: stock.id, linked_finance_transaction_id: amount > 0 ? trxId : '', notes: `Plan alimentation appliqué à ${targetLabel(target)}` });
    if (amount > 0) await props.onCreateFinanceTransaction?.({ id: trxId, type: 'sortie', libelle: `Alimentation ${targetLabel(target)} - ${stock.produit || stock.name || stock.id}`, montant: amount, amount, date, categorie: 'Alimentation', module_lie: 'stock', related_id: stock.id, stock_id: stock.id, alimentation_log_id: logId, source_module: 'stock', source_record_id: stock.id, source_type: targetType, source_id: target.id, target_type: targetType, target_id: target.id, activite: activityForFeeding(plan.targetType, target), statut: 'paye', notes: `Écriture finance créée depuis le plan alimentation ${logId}` });
    await props.onCreateBusinessEvent?.({ id: makeId('EVT'), event_type: 'alimentation_plan_applique', module_source: 'stock', entity_type: targetType, entity_id: target.id, title: `Alimentation ${targetLabel(target)}`, description: `${Number(totalKg.toFixed(2))} kg · coût ${amount}`, event_date: date, severity: 'info', amount, linked_stock_id: stock.id, linked_alimentation_log_id: logId, linked_finance_transaction_id: amount > 0 ? trxId : '', saisies_evitees: 4 });
    await Promise.allSettled([props.onRefresh?.(), props.onRefreshAlimentation?.(), props.onRefreshBusinessEvents?.(), props.onRefreshFinances?.()]);
  }, [props]);

  return <div className="space-y-6 stock-mobile-structured"><style>{`@media (max-width: 640px){.stock-mobile-structured .rounded-2xl{border-radius:18px}.stock-mobile-structured table{font-size:12px}.stock-mobile-structured th,.stock-mobile-structured td{padding-left:10px!important;padding-right:10px!important}.stock-mobile-structured .text-2xl{font-size:1.35rem}.stock-mobile-structured .grid{gap:.75rem}.stock-mobile-structured .overflow-x-auto{max-width:100vw}}`}</style><ModuleSection icon={Package} title="Stock courant" subtitle="Produits, quantités, seuils, entrées, sorties et pertes suivies."><StocksV3 {...props} onUpdate={updateWithLossHistory} /></ModuleSection><ModuleSection icon={Utensils} title="Alimentation des animaux et lots" subtitle="Calculer une ration, retirer le stock utilisé et suivre le coût sans double saisie."><StockFeedingCostPlanner rows={props.rows || []} animaux={props.animaux || []} lots={props.lots || []} alimentationLogs={props.alimentationLogs || []} onOpenUseFood={applyFeedingPlan} /></ModuleSection><ModuleSection icon={BarChart3} title="Évolution stock" subtitle="Graphes et historique des entrées, sorties, consommations et alertes."><StockEvolution rows={props.rows || []} alimentationLogs={props.alimentationLogs || []} onNavigate={props.onNavigate} /></ModuleSection></div>;
}
