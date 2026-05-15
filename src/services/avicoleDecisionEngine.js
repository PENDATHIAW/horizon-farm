import { addDays, addMonths } from '../utils/decisionFormFields';

const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);

function daysSince(dateValue) {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function ageDays(lot = {}) {
  return daysSince(lot.date_debut || lot.entry_date || lot.date_entree || lot.created_at);
}

function ageMonths(lot = {}) {
  return Math.floor(ageDays(lot) / 30.44);
}

function activeCount(lot = {}) {
  const initial = num(lot.initial_count ?? lot.effectif_initial ?? lot.count);
  const exits = num(lot.mortality) + num(lot.vols) + num(lot.vendus) + num(lot.reformes) + num(lot.sorties) + num(lot.abattus);
  return Math.max(0, num(lot.current_count ?? lot.effectif_actuel) || initial - exits);
}

function latestWeight(lot = {}) {
  return num(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight);
}

function targetWeight(lot = {}) {
  return num(lot.poids_objectif_vente ?? lot.objectif_poids_moyen ?? lot.target_weight ?? lot.poids_objectif) || 1.5;
}

export function buildBroilerLotDecision(lot = {}) {
  const age = ageDays(lot);
  const weight = latestWeight(lot);
  const target = targetWeight(lot);
  const health = norm(lot.health_status || lot.sante || 'sain');
  const mortality = num(lot.mortality);
  const initial = num(lot.initial_count ?? lot.effectif_initial);
  const mortalityRate = initial > 0 ? Math.round((mortality / initial) * 100) : 0;
  const lastWeighing = lot.date_derniere_pesee || lot.date_pesee_entree || lot.date_debut || today();
  const closeToSale = age >= 30 || weight >= target * 0.85;
  const sickOrRisk = health.includes('malade') || health.includes('critique') || health.includes('surveiller') || mortalityRate >= 5;
  const frequency = sickOrRisk ? 5 : closeToSale ? 7 : 10;
  const nextWeighingDate = lot.date_prochaine_pesee_recommandee || addDays(lastWeighing, frequency);
  const expectedWeight = Math.min(target, Number((weight + (closeToSale ? 0.18 : 0.22)).toFixed(2)));

  let decision = 'Continuer croissance et suivre alimentation.';
  let priority = 'moyenne';
  if (age >= 35 && weight >= target) {
    decision = 'Vente/précommande recommandée : âge et poids objectif atteints.';
    priority = 'haute';
  } else if (age >= 35 && weight < target) {
    decision = 'Ne pas vendre trop vite : poids insuffisant, vérifier aliment/santé.';
    priority = 'haute';
  } else if (sickOrRisk) {
    decision = 'Lot à risque : contrôler santé, mortalité et alimentation.';
    priority = 'haute';
  } else if (closeToSale) {
    decision = 'Préparer clients et date de vente cible.';
  }

  return {
    type: 'chair',
    ageDays: age,
    activeCount: activeCount(lot),
    weight,
    targetWeight: target,
    nextWeighingDate,
    expectedWeight,
    frequency,
    mortalityRate,
    decision,
    priority,
  };
}

export function buildLayerLotDecision(lot = {}, productionLogs = []) {
  const ageM = ageMonths(lot);
  const count = activeCount(lot);
  const recentLogs = productionLogs.filter((log) => String(log.lot_id || log.related_id) === String(lot.id)).slice(-7);
  const eggs = recentLogs.reduce((sum, log) => sum + num(log.oeufs_vendables ?? log.oeufs_produits ?? log.quantite), 0);
  const avgEggsDay = recentLogs.length ? eggs / recentLogs.length : count * 0.72;
  const layingRate = count > 0 ? Math.round((avgEggsDay / count) * 100) : 0;
  const expectedEggsDay = Math.round(count * 0.72);
  const start = lot.date_debut || lot.entry_date || today();
  const reformStart = lot.date_debut_reforme_recommandee || addMonths(start, 17);
  const reformTarget = lot.date_reforme_cible || addMonths(start, 18);

  let decision = 'Suivre ponte, casses, aliment et rentabilité par tablette.';
  let priority = 'moyenne';
  if (ageM >= 18) {
    decision = 'Réforme recommandée : lot à 18 mois ou plus.';
    priority = 'haute';
  } else if (ageM >= 17) {
    decision = 'Préparer réforme progressive et remplacement du lot.';
    priority = 'haute';
  } else if (layingRate > 0 && layingRate < 60) {
    decision = 'Baisse de ponte : vérifier aliment, santé, chaleur, stress et âge du lot.';
    priority = 'haute';
  } else if (layingRate >= 70) {
    decision = 'Ponte correcte : sécuriser ventes et éviter rupture clients.';
  }

  return {
    type: 'pondeuse',
    ageMonths: ageM,
    activeCount: count,
    avgEggsDay: Math.round(avgEggsDay),
    expectedEggsDay,
    layingRate,
    reformStart,
    reformTarget,
    decision,
    priority,
  };
}

export function buildAvicoleLotDecision(lot = {}, productionLogs = []) {
  const type = norm(lot.type || lot.categorie);
  if (type.includes('pondeuse') || type.includes('oeuf')) return buildLayerLotDecision(lot, productionLogs);
  return buildBroilerLotDecision(lot);
}

export function applyAvicoleDecisionDefaults(payload = {}, existing = {}, productionLogs = []) {
  const base = { ...existing, ...payload };
  const decision = buildAvicoleLotDecision(base, productionLogs);
  if (decision.type === 'pondeuse') {
    return {
      ...payload,
      age_reforme_recommandee_mois: num(base.age_reforme_recommandee_mois) || 17,
      age_reforme_cible_mois: num(base.age_reforme_cible_mois) || 18,
      date_debut_reforme_recommandee: decision.reformStart,
      date_reforme_cible: decision.reformTarget,
      objectif_ponte_jour: decision.expectedEggsDay,
      taux_ponte_attendu: 72,
      decision_ia_lot: decision.decision,
      priorite_ia_lot: decision.priority,
    };
  }
  return {
    ...payload,
    poids_objectif_vente: decision.targetWeight,
    target_weight: decision.targetWeight,
    poids_attendu_prochaine_pesee: decision.expectedWeight,
    date_prochaine_pesee_recommandee: decision.nextWeighingDate,
    frequence_pesee_jours: decision.frequency,
    decision_ia_lot: decision.decision,
    priorite_ia_lot: decision.priority,
  };
}
