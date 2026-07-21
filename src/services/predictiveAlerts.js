/**
 * Alertes prédictives - anticipation, pas constat.
 *
 * On ne signale plus seulement « stock à zéro » ou « soin en retard » : on projette
 * ce qui VA arriver et le délai pour agir. Quatre familles :
 *  - rupture de stock (couverture en jours dérivée des consommations) ;
 *  - sujets/lots qui atteignent le poids cible → préparer la vente ;
 *  - créances sur le point de franchir J+30 → relancer avant ;
 *  - décrochage de ponte (baisse anormale) → signal sanitaire.
 *
 * Chaque alerte est déjà au format « alerte ERP » (id, title, message, severity,
 * module_source, entity_*, action_recommandee, decision_key) : elle peut donc
 * alimenter le centre d'alertes et, via buildTaskFromAlert, une tâche routée RACI.
 */

const arr = (v) => (Array.isArray(v) ? v : []);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const lower = (v) => String(v || '').toLowerCase();
const today = () => new Date().toISOString().slice(0, 10);

const addDays = (isoOrDate, days) => {
  const d = new Date(isoOrDate || today());
  if (Number.isNaN(d.getTime())) return today();
  d.setDate(d.getDate() + Math.round(days));
  return d.toISOString().slice(0, 10);
};
const daysBetween = (fromIso, toIso) => {
  const a = new Date(fromIso); const b = new Date(toIso || today());
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  return Math.floor((b - a) / 86400000);
};

/** Sévérité selon le délai avant l'échéance projetée. */
export function severityForHorizon(horizonDays) {
  const h = num(horizonDays);
  if (h <= 2) return 'critique';
  if (h <= 7) return 'haute';
  return 'moyenne';
}

const qtyOf = (r = {}) => num(r.quantite ?? r.quantity ?? r.stock);

/** Rupture de stock projetée : couverture < horizon jours. */
export function projectStockRuptures(stocks = [], alimentationLogs = [], { horizonDays = 7, referenceDate = '' } = {}) {
  const usage = new Map();
  arr(alimentationLogs).forEach((l) => {
    const id = String(l.stock_id || l.produit_id || '');
    if (id) usage.set(id, (usage.get(id) || 0) + num(l.quantite ?? l.quantite_kg));
  });
  const ref = referenceDate || today();

  return arr(stocks).flatMap((row) => {
    const explicit = num(row.consommation_jour ?? row.daily_use ?? row.usage_daily);
    const logged = usage.get(String(row.id)) || 0;
    const perDay = explicit > 0 ? explicit : (logged > 0 ? logged / 30 : 0);
    if (perDay <= 0) return [];
    const daysLeft = Math.floor(qtyOf(row) / perDay);
    if (daysLeft > horizonDays) return [];
    const name = row.nom || row.produit || row.name || 'Intrant';
    const rupture = addDays(ref, daysLeft);
    return [{
      id: `pred-stock-${row.id}`,
      type: 'rupture_stock_projetee',
      severity: severityForHorizon(daysLeft),
      horizon_days: daysLeft,
      predicted_date: rupture,
      title: `Rupture ${name} dans ${daysLeft} j`,
      message: `${name} : ${Math.round(qtyOf(row))} restant, ~${Math.round(perDay)}/j → rupture prévue le ${rupture}.`,
      action_recommandee: `Réapprovisionner ${name} avant le ${rupture}`,
      module_source: 'achats_stock',
      entity_type: 'stock',
      entity_id: row.id,
      decision_key: `stock:${row.id}:reappro`,
      source: 'predictive.stock_coverage',
    }];
  });
}

const targetOf = (a = {}) => num(a.poids_cible ?? a.poids_objectif ?? a.target_weight);
const weightOf = (a = {}) => num(a.poids_actuel ?? a.poids ?? a.weight_avg);
const gmqOf = (a = {}) => num(a.gmq ?? a.gmq_reel);

/** Sujets/lots qui atteignent le poids cible sous l'horizon → préparer la vente. */
export function projectSaleReadiness(animaux = [], lots = [], { horizonDays = 10, referenceDate = '' } = {}) {
  const ref = referenceDate || today();
  const out = [];

  arr(animaux).forEach((a) => {
    if (['vendu', 'mort'].includes(lower(a.status || a.statut))) return;
    const cible = targetOf(a); const poids = weightOf(a);
    if (cible <= 0 || poids <= 0) return;
    if (poids >= cible) {
      out.push(makeReadinessAlert({ id: a.id, name: a.nom || a.name || a.id, kind: 'animal', days: 0, date: ref, ready: true }));
      return;
    }
    const gmq = gmqOf(a);
    if (gmq <= 0) return;
    const days = Math.ceil((cible - poids) / gmq);
    if (days >= 0 && days <= horizonDays) {
      out.push(makeReadinessAlert({ id: a.id, name: a.nom || a.name || a.id, kind: 'animal', days, date: addDays(ref, days), ready: false }));
    }
  });

  arr(lots).forEach((l) => {
    if (!lower(l.type || l.type_lot).includes('chair')) return;
    if (['vendu', 'termine', 'terminé'].includes(lower(l.status || l.phase))) return;
    const cible = num(l.poids_cible); const poids = num(l.weight_avg);
    if (cible <= 0 || poids <= 0) return;
    if (l.ready_to_sell || poids >= cible) {
      out.push(makeReadinessAlert({ id: l.id, name: l.nom || l.name || l.id, kind: 'lot_avicole', days: 0, date: ref, ready: true }));
    }
  });

  return out;
}

function makeReadinessAlert({ id, name, kind, days, date, ready }) {
  return {
    id: `pred-vente-${id}`,
    type: 'poids_cible_atteint',
    severity: ready ? 'haute' : severityForHorizon(days),
    horizon_days: days,
    predicted_date: date,
    title: ready ? `${name} prêt à la vente` : `${name} prêt à vendre dans ${days} j`,
    message: ready
      ? `${name} a atteint le poids cible : créer l'opportunité de vente.`
      : `${name} atteindra le poids cible vers le ${date} (~${days} j).`,
    action_recommandee: `Préparer la vente de ${name}`,
    module_source: 'elevage',
    entity_type: kind,
    entity_id: id,
    decision_key: `${kind}:${id}:vente`,
    source: 'predictive.sale_readiness',
  };
}

const orderTotal = (o = {}) => num(o.montant_total ?? o.total ?? o.amount ?? o.montant);
const orderRemaining = (o = {}) => num(o.reste_a_payer ?? Math.max(0, orderTotal(o) - num(o.total_paye ?? o.montant_paye)));

/** Créances sur le point de franchir J+30 (fenêtre d'anticipation). */
export function projectReceivableAging(salesOrders = [], { referenceDate = '', threshold = 30, horizonDays = 5 } = {}) {
  const ref = referenceDate || today();
  return arr(salesOrders).flatMap((o) => {
    if (orderRemaining(o) <= 0) return [];
    const age = daysBetween(o.date || o.date_vente || o.created_at, ref);
    if (age == null) return [];
    const daysToThreshold = threshold - age;
    if (daysToThreshold < 0 || daysToThreshold > horizonDays) return [];
    const client = o.client_label || o.client_name || o.client_id || 'Client';
    return [{
      id: `pred-creance-${o.id}`,
      type: 'creance_bientot_agee',
      severity: severityForHorizon(daysToThreshold),
      horizon_days: daysToThreshold,
      predicted_date: addDays(ref, daysToThreshold),
      title: `Créance ${client} franchit J+30 dans ${daysToThreshold} j`,
      message: `${client} : ${Math.round(orderRemaining(o))} FCFA dus depuis ${age} j. Relancer avant l'échéance J+${threshold}.`,
      action_recommandee: `Relancer ${client} avant J+${threshold}`,
      module_source: 'commercial',
      entity_type: 'creance',
      entity_id: o.id,
      decision_key: `creance:${o.id}:relance`,
      source: 'predictive.receivable_aging',
    }];
  });
}

const eggsOf = (r = {}) => num(r.oeufs_produits ?? r.oeufs ?? r.quantite);

/** Décrochage de ponte : baisse anormale de la production récente d'un lot. */
export function detectLayingDrop(lots = [], productionLogs = [], { recentDays = 3, dropPct = 10, referenceDate = '' } = {}) {
  const ref = referenceDate || today();
  const byLot = new Map();
  arr(productionLogs).forEach((l) => {
    const id = String(l.lot_id || '');
    if (!id) return;
    if (!byLot.has(id)) byLot.set(id, []);
    byLot.get(id).push({ date: l.date, eggs: eggsOf(l) });
  });

  const pondeuses = arr(lots).filter((l) => lower(l.type || l.type_lot).includes('pondeuse'));
  return pondeuses.flatMap((lot) => {
    const logs = (byLot.get(String(lot.id)) || []).filter((r) => r.eggs > 0)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    if (logs.length < recentDays * 2) return [];
    const recent = logs.slice(-recentDays);
    const prior = logs.slice(-recentDays * 2, -recentDays);
    const avg = (rows) => rows.reduce((s, r) => s + r.eggs, 0) / rows.length;
    const recentAvg = avg(recent); const priorAvg = avg(prior);
    if (priorAvg <= 0) return [];
    const drop = ((priorAvg - recentAvg) / priorAvg) * 100;
    if (drop < dropPct) return [];
    return [{
      id: `pred-ponte-${lot.id}`,
      type: 'decrochage_ponte',
      severity: drop >= dropPct * 2 ? 'critique' : 'haute',
      horizon_days: 0,
      predicted_date: ref,
      title: `Décrochage ponte ${lot.nom || lot.name || lot.id} (-${Math.round(drop)} %)`,
      message: `Ponte en baisse de ${Math.round(drop)} % sur ${recentDays} j (${Math.round(recentAvg)} vs ${Math.round(priorAvg)} œufs/j). Vérifier eau, aliment, santé.`,
      action_recommandee: 'Diagnostic sanitaire/alimentaire du lot pondeuse',
      module_source: 'elevage',
      entity_type: 'lot_avicole',
      entity_id: lot.id,
      decision_key: `lot:${lot.id}:ponte_diagnostic`,
      source: 'predictive.laying_drop',
    }];
  });
}

const SEVERITY_RANK = { critique: 0, haute: 1, moyenne: 2 };

/**
 * Agrège toutes les alertes prédictives, triées par sévérité puis horizon.
 * @returns { alerts, summary }
 */
export function buildPredictiveAlerts(data = {}, options = {}) {
  const lots = data.avicole || data.lots || [];
  const alerts = [
    ...projectStockRuptures(data.stock || data.stocks || [], data.alimentation_logs || data.alimentationLogs || [], { ...options }),
    ...projectSaleReadiness(data.animaux || [], lots, { ...options }),
    ...projectReceivableAging(data.sales_orders || data.salesOrders || [], { ...options }),
    ...detectLayingDrop(lots, data.production_oeufs_logs || data.productionLogs || [], { ...options }),
  ].sort((a, b) => (SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]) || (a.horizon_days - b.horizon_days));

  return {
    alerts,
    summary: {
      total: alerts.length,
      critique: alerts.filter((a) => a.severity === 'critique').length,
      haute: alerts.filter((a) => a.severity === 'haute').length,
      byType: alerts.reduce((acc, a) => { acc[a.type] = (acc[a.type] || 0) + 1; return acc; }, {}),
    },
  };
}

export default buildPredictiveAlerts;
