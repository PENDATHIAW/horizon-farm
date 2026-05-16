import { addDays, addMonths } from '../utils/decisionFormFields';
import { computeChairLivingTarget, computePondeuseLivingTarget } from './avicoleLivingTargets';

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
  const living = computeChairLivingTarget(lot);
  const health = norm(lot.health_status || lot.sante || 'sain');
  const mortality = num(lot.mortality);
  const initial = num(lot.initial_count ?? lot.effectif_initial);
  const mortalityRate = initial > 0 ? Math.round((mortality / initial) * 100) : 0;
  const sickOrRisk = health.includes('malade') || health.includes('critique') || health.includes('surveiller') || mortalityRate >= 5;

  let decision = living.action || 'Continuer croissance et suivre alimentation.';
  let priority = ['pret_vente', 'retard_croissance', 'pesee_due'].includes(living.status) ? 'haute' : 'moyenne';
  if (sickOrRisk) {
    decision = 'Lot à risque : contrôler santé, mortalité et alimentation.';
    priority = 'haute';
  }

  return {
    type: 'chair',
    ageDays: living.currentAge || ageDays(lot),
    activeCount: activeCount(lot),
    weight: living.currentWeight || latestWeight(lot),
    targetWeight: living.livingTarget || targetWeight(lot),
    initialTargetWeight: living.defaultTargetWeight || targetWeight(lot),
    livingTargetWeight: living.livingTarget || targetWeight(lot),
    projectedWeight: living.projectedWeight,
    nextWeighingDate: living.nextWeighingDate,
    expectedWeight: living.projectedWeight || living.livingTarget,
    frequency: living.frequency,
    mortalityRate,
    realGainPerDay: living.realGainPerDay,
    adaptiveGainPerDay: living.adaptiveGainPerDay,
    status: living.status,
    progress: living.progress,
    decision,
    priority,
  };
}

export function buildLayerLotDecision(lot = {}, productionLogs = []) {
  const living = computePondeuseLivingTarget(lot, productionLogs);
  const start = lot.date_debut || lot.entry_date || today();
  const reformStart = lot.date_debut_reforme_recommandee || addMonths(start, living.reformStartMonths || 17);
  const reformTarget = lot.date_reforme_cible || addMonths(start, living.reformTargetMonths || 18);

  let priority = ['baisse_ponte', 'ramassage_manquant', 'casses_elevees', 'preparer_reforme', 'reforme_cible'].includes(living.status) ? 'haute' : 'moyenne';

  return {
    type: 'pondeuse',
    ageMonths: living.months || ageMonths(lot),
    activeCount: living.active || activeCount(lot),
    avgEggsDay: Math.round(living.recentDailyEggs || 0),
    expectedEggsDay: living.expectedEggsDay || 0,
    layingRate: living.realLayingPct || 0,
    objectiveInitial: living.objectiveInitial || 80,
    objectiveLivingPct: living.livingObjectivePct || 0,
    objectiveAgePct: living.ageExpectedPct || 0,
    gapEggsDay: living.gapEggsDay || 0,
    reformStart,
    reformTarget,
    status: living.status,
    decision: living.action,
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
      objectif_ponte_pct: decision.objectiveInitial || 80,
      objectif_ponte_vivant_pct: decision.objectiveLivingPct,
      objectif_ponte_jour: decision.expectedEggsDay,
      taux_ponte_attendu: decision.objectiveLivingPct || 80,
      ecart_ponte_jour: decision.gapEggsDay,
      decision_ia_lot: decision.decision,
      priorite_ia_lot: decision.priority,
    };
  }
  return {
    ...payload,
    poids_objectif_vente: decision.livingTargetWeight || decision.targetWeight,
    target_weight: decision.livingTargetWeight || decision.targetWeight,
    poids_objectif_initial: decision.initialTargetWeight,
    poids_attendu_prochaine_pesee: decision.expectedWeight,
    date_prochaine_pesee_recommandee: decision.nextWeighingDate,
    frequence_pesee_jours: decision.frequency,
    gain_reel_jour: decision.realGainPerDay,
    statut_croissance_ia: decision.status,
    decision_ia_lot: decision.decision,
    priorite_ia_lot: decision.priority,
  };
}
