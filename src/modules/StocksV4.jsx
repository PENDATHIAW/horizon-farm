import { useCallback } from 'react';
import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import StocksV3 from './StocksV3.jsx';
import StockEvolution from './StockEvolution.jsx';
import StockFeedingCostPlanner from './StockFeedingCostPlanner.jsx';

const unitPrice = (row = {}) => toNumber(row.prixUnit ?? row.prixunit ?? row.prix_unitaire ?? row.unit_price ?? row.prix_achat);
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

export default function StocksV4(props) {
  const updateWithLossFinance = useCallback(async (id, patch = {}) => {
    await props.onUpdate?.(id, patch);
    if (patch.last_movement_type !== 'perte') return;
    const row = (props.rows || []).find((item) => String(item.id) === String(id));
    const qty = toNumber(patch.last_movement_qty);
    const amount = qty * unitPrice(row);
    if (!row || qty <= 0 || amount <= 0) return;
    const alreadyLinked = patch.last_loss_finance_id || patch.loss_finance_recorded;
    if (alreadyLinked) return;
    await props.onCreateFinanceTransaction?.({
      id: makeId('TRX'),
      type: 'sortie',
      libelle: `Perte stock ${row.produit || row.name || row.id}`,
      montant: amount,
      date: today(),
      categorie: 'Perte stock',
      module_lie: 'stock',
      related_id: id,
      source_module: 'stock',
      source_record_id: id,
      statut: 'paye',
      notes: `${qty} ${row.unite || ''} perdu(s)`,
    });
    await props.onRefreshFinances?.();
  }, [props]);

  const applyFeedingPlan = useCallback(async (plan = {}) => {
    const stock = plan.stock;
    const target = plan.target;
    const totalKg = toNumber(plan.totalKg);
    const totalCost = toNumber(plan.totalCost);
    if (!stock?.id) throw new Error('Stock aliment manquant');
    if (!target?.id) throw new Error('Lot ou animal manquant');
    if (totalKg <= 0) throw new Error('Quantité alimentation invalide');
    const availableKg = stockKg(stock);
    if (availableKg < totalKg) throw new Error('Stock aliment insuffisant pour appliquer ce plan');
    const logId = makeId('ALIM');
    const targetType = plan.targetType === 'animal' ? 'animal' : 'lot_avicole';
    const nextQty = nextStockQtyAfterKg(stock, totalKg);
    await props.onUpdate?.(stock.id, {
      quantite: Number(nextQty.toFixed(3)),
      last_movement_type: 'sortie_alimentation',
      last_movement_label: `Alimentation ${targetLabel(target)}`,
      last_movement_qty: Number(totalKg.toFixed(3)),
      last_movement_at: new Date().toISOString(),
      linked_alimentation_log_id: logId,
    });
    await props.onCreateAlimentation?.({
      id: logId,
      date: plan.date || today(),
      stock_id: stock.id,
      produit: stock.produit || stock.name || stock.id,
      type_cible: targetType,
      cible_id: target.id,
      lot_id: targetType === 'lot_avicole' ? target.id : '',
      animal_id: targetType === 'animal' ? target.id : '',
      quantite: Number(totalKg.toFixed(3)),
      unite: 'kg',
      prix_unitaire: totalKg > 0 ? Number((totalCost / totalKg).toFixed(2)) : 0,
      montant_total: Number(totalCost.toFixed(0)),
      cout_total: Number(totalCost.toFixed(0)),
      sujets: toNumber(plan.subjects),
      jours: toNumber(plan.days),
      ration_kg_jour: toNumber(plan.dailyKg),
      cout_par_sujet: Number(toNumber(plan.costPerSubject).toFixed(0)),
      cout_par_sujet_jour: Number(toNumber(plan.costPerSubjectDay).toFixed(0)),
      source_module: 'stock',
      source_record_id: stock.id,
      notes: `Plan alimentation appliqué à ${targetLabel(target)}`,
    });
    await props.onCreateBusinessEvent?.({
      id: makeId('EVT'),
      event_type: 'alimentation_plan_applique',
      module_source: 'stock',
      entity_type: targetType,
      entity_id: target.id,
      title: `Alimentation ${targetLabel(target)}`,
      description: `${Number(totalKg.toFixed(2))} kg · coût ${Number(totalCost.toFixed(0))}`,
      event_date: plan.date || today(),
      severity: 'info',
      amount: Number(totalCost.toFixed(0)),
      linked_stock_id: stock.id,
      linked_alimentation_log_id: logId,
      saisies_evitees: 3,
    });
    await Promise.allSettled([props.onRefresh?.(), props.onRefreshAlimentation?.(), props.onRefreshBusinessEvents?.()]);
  }, [props]);

  return (
    <div className="space-y-6">
      <StocksV3 {...props} onUpdate={updateWithLossFinance} />
      <StockFeedingCostPlanner
        rows={props.rows || []}
        animaux={props.animaux || []}
        lots={props.lots || []}
        alimentationLogs={props.alimentationLogs || []}
        onOpenUseFood={applyFeedingPlan}
      />
      <StockEvolution
        rows={props.rows || []}
        alimentationLogs={props.alimentationLogs || []}
        onNavigate={props.onNavigate}
      />
    </div>
  );
}
