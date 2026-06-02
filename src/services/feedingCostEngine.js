import { toNumber } from '../utils/format';
import { makeId } from '../utils/ids';
import { stockKgAvailable } from '../utils/stockFreshProduct';

const lower = (value) => String(value || '').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

export const DEFAULT_FEEDING_RULES = {
  chair: { label: 'Poulets de chair', dailyKg: 0.1, days: 35, note: 'Base pratique : env. 7 sacs / 100 sujets / 35 jours' },
  pondeuse: { label: 'Pondeuses', dailyKg: 0.135, days: 30, note: '120 à 150 g/jour, valeur par défaut 135 g' },
  bovin: { label: 'Bovins', dailyKg: 4.5, days: 90, note: '3 à 6 kg/jour concentré, valeur moyenne 4,5 kg' },
  ovin: { label: 'Ovins', dailyKg: 0.75, days: 90, note: '0,5 à 1 kg/jour, valeur moyenne 0,75 kg' },
  caprin: { label: 'Caprins', dailyKg: 0.6, days: 90, note: '0,4 à 0,8 kg/jour, valeur moyenne 0,6 kg' },
};

export function unitPrice(stock = {}) {
  const raw = toNumber(stock.prixUnit ?? stock.prixunit ?? stock.prix_unitaire ?? stock.unit_price);
  if (lower(stock.unite).includes('sac')) {
    const sacKg = toNumber(stock.poids_sac_kg || stock.sac_kg || 50) || 50;
    return raw / sacKg;
  }
  return raw;
}

export function nextStockQtyAfterKg(stock = {}, kg = 0) {
  const sacKg = toNumber(stock.poids_sac_kg || stock.sac_kg || 50) || 50;
  if (lower(stock.unite).includes('sac')) {
    return Math.max(0, toNumber(stock.quantite) - toNumber(kg) / sacKg);
  }
  return Math.max(0, toNumber(stock.quantite) - toNumber(kg));
}

export function activityForFeeding(targetType = '', target = {}) {
  if (targetType === 'animal') {
    const text = lower(`${target.type || ''} ${target.espece || ''}`);
    if (text.includes('ovin')) return 'ovins';
    if (text.includes('caprin') || text.includes('chevre') || text.includes('chèvre')) return 'caprins';
    return 'bovins';
  }
  const text = lower(`${target.type || ''} ${target.type_lot || ''} ${target.name || ''}`);
  return text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf') ? 'avicole_pondeuses' : 'avicole_chair';
}

export function calculateFeedingPlan({
  stock,
  subjects = 0,
  days = 1,
  dailyKg = 0,
  sacKg = 50,
}) {
  const subjectsN = Math.max(0, toNumber(subjects));
  const daysN = Math.max(1, toNumber(days));
  const daily = Math.max(0, toNumber(dailyKg));
  const totalKg = subjectsN * daysN * daily;
  const sacsNeeded = totalKg / Math.max(1, toNumber(sacKg));
  const pricePerKg = unitPrice(stock);
  const totalCost = totalKg * pricePerKg;
  const costPerSubject = subjectsN ? totalCost / subjectsN : 0;
  const costPerSubjectDay = subjectsN && daysN ? totalCost / subjectsN / daysN : 0;
  const availableKg = stock ? stockKgAvailable(stock) : 0;
  const coverageDays = subjectsN && daily ? availableKg / (subjectsN * daily) : 0;
  const missingKg = Math.max(0, totalKg - availableKg);
  return {
    totalKg,
    totalCost,
    costPerSubject,
    costPerSubjectDay,
    availableKg,
    coverageDays,
    missingKg,
    sacsNeeded,
    pricePerKg,
  };
}

/** Apply feeding: stock deduction + alimentation_logs + optional finance + business event */
export async function applyFeedingDistribution(plan = {}, handlers = {}) {
  const stock = plan.stock;
  const target = plan.target;
  const totalKg = toNumber(plan.totalKg);
  const totalCost = toNumber(plan.totalCost);
  if (!stock?.id) throw new Error('Choisis d’abord l’aliment à utiliser');
  if (!target?.id) throw new Error('Choisis le lot ou l’animal concerné');
  if (totalKg <= 0) throw new Error('Quantité alimentation invalide');
  if (stockKgAvailable(stock) < totalKg) throw new Error('Stock aliment insuffisant pour appliquer ce plan');

  const logId = makeId('ALIM');
  const trxId = makeId('TRX');
  const targetType = plan.targetType === 'animal' ? 'animal' : 'lot_avicole';
  const nextQty = nextStockQtyAfterKg(stock, totalKg);
  const date = plan.date || today();
  const amount = Number(totalCost.toFixed(0));
  const targetLabel = target.name || target.nom || target.tag || target.id;

  await handlers.onUpdateStock?.(stock.id, {
    quantite: Number(nextQty.toFixed(3)),
    last_movement_type: 'sortie_alimentation',
    last_movement_label: `Alimentation ${targetLabel}`,
    last_movement_qty: Number(totalKg.toFixed(3)),
    last_movement_at: new Date().toISOString(),
    linked_alimentation_log_id: logId,
    linked_finance_transaction_id: amount > 0 ? trxId : '',
    skip_stock_movement_event: true,
  });

  await handlers.onCreateAlimentation?.({
    id: logId,
    date,
    stock_id: stock.id,
    produit: stock.produit || stock.name || stock.id,
    type_cible: targetType,
    cible_id: target.id,
    lot_id: targetType === 'lot_avicole' ? target.id : '',
    animal_id: targetType === 'animal' ? target.id : '',
    quantite: Number(totalKg.toFixed(3)),
    unite: 'kg',
    prix_unitaire: totalKg > 0 ? Number((totalCost / totalKg).toFixed(2)) : 0,
    montant_total: amount,
    cout_total: amount,
    sujets: toNumber(plan.subjects),
    jours: toNumber(plan.days),
    ration_kg_jour: toNumber(plan.dailyKg),
    cout_par_sujet: Number(toNumber(plan.costPerSubject).toFixed(0)),
    cout_par_sujet_jour: Number(toNumber(plan.costPerSubjectDay).toFixed(0)),
    source_module: plan.source_module || 'elevage',
    source_record_id: target.id,
    linked_finance_transaction_id: amount > 0 ? trxId : '',
    notes: plan.notes || `Distribution ${totalKg.toFixed(1)} kg · ${targetLabel}`,
  });

  if (amount > 0 && handlers.onCreateFinanceTransaction) {
    await handlers.onCreateFinanceTransaction({
      id: trxId,
      type: 'sortie',
      libelle: `Alimentation ${targetLabel} - ${stock.produit || stock.id}`,
      montant: amount,
      amount,
      date,
      categorie: 'Alimentation',
      module_lie: 'stock',
      related_id: stock.id,
      stock_id: stock.id,
      alimentation_log_id: logId,
      source_module: plan.source_module || 'elevage',
      source_record_id: target.id,
      source_type: targetType,
      source_id: target.id,
      target_type: targetType,
      target_id: target.id,
      activite: activityForFeeding(plan.targetType, target),
      statut: 'paye',
      notes: 'Dépense alimentation depuis distribution élevage/stock.',
    });
  }

  if (handlers.onCreateBusinessEvent) {
    await handlers.onCreateBusinessEvent({
      id: makeId('EVT'),
      event_type: 'alimentation_plan_applique',
      module_source: plan.source_module || 'elevage',
      entity_type: targetType,
      entity_id: target.id,
      title: `Alimentation ${targetLabel}`,
      description: `${Number(totalKg.toFixed(2))} kg · coût ${amount} FCFA`,
      event_date: date,
      severity: 'info',
      amount,
      linked_stock_id: stock.id,
      linked_alimentation_log_id: logId,
      linked_finance_transaction_id: amount > 0 ? trxId : '',
      saisies_evitees: 4,
    });
  }

  await Promise.allSettled([
    handlers.onRefreshStock?.(),
    handlers.onRefreshAlimentation?.(),
    handlers.onRefreshBusinessEvents?.(),
    handlers.onRefreshFinances?.(),
  ]);
}
