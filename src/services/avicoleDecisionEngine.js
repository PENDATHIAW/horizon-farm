import { addDays, addMonths } from '../utils/decisionFormFields';
import { computeChairLivingTarget, computePondeuseLivingTarget } from './avicoleLivingTargets';

const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const today = () => new Date().toISOString().slice(0, 10);
const addReminderDay = (dateValue) => dateValue ? addDays(dateValue, -1) : '';

function daysSince(dateValue) {
  if (!dateValue) return 0;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}
function ageDays(lot = {}) { return daysSince(lot.date_debut || lot.entry_date || lot.date_entree || lot.created_at); }
function ageMonths(lot = {}) { return Math.floor(ageDays(lot) / 30.44); }
function activeCount(lot = {}) { const initial = num(lot.initial_count ?? lot.effectif_initial ?? lot.count); const exits = num(lot.mortality) + num(lot.vols) + num(lot.vendus) + num(lot.reformes) + num(lot.sorties) + num(lot.abattus); return Math.max(0, num(lot.current_count ?? lot.effectif_actuel) || initial - exits); }
function latestWeight(lot = {}) { return num(lot.poids_moyen_actuel ?? lot.last_weight_avg ?? lot.weight_avg ?? lot.average_weight); }
function targetWeight(lot = {}) { return num(lot.poids_objectif_vente ?? lot.objectif_poids_moyen ?? lot.target_weight ?? lot.poids_objectif) || 1.5; }
function mortalityRateOf(lot = {}) { const initial = num(lot.initial_count ?? lot.effectif_initial); return initial > 0 ? Math.round((num(lot.mortality) / initial) * 100) : 0; }
function isLotClosedByLoss(lot = {}) { const status = norm(lot.status || lot.statut || ''); return ['perdu', 'perdu_mortalite', 'cloture_perte'].includes(status) || (activeCount(lot) <= 0 && num(lot.initial_count ?? lot.effectif_initial) > 0); }

export function buildBroilerLotDecision(lot = {}) {
  const living = computeChairLivingTarget(lot);
  const health = norm(lot.health_status || lot.sante || 'sain');
  const mortalityRate = mortalityRateOf(lot);
  const closedByLoss = isLotClosedByLoss(lot);
  const sickOrRisk = health.includes('malade') || health.includes('critique') || health.includes('surveiller') || mortalityRate >= 5;
  const reminderDate = addReminderDay(living.nextWeighingDate);
  let decision = living.action || 'Continuer croissance et suivre alimentation.';
  let priority = ['pret_vente', 'retard_croissance', 'pesee_due'].includes(living.status) ? 'haute' : 'moyenne';
  if (closedByLoss) { decision = 'Lot clôturé en perte : arrêter les charges actives, conserver l’historique et analyser la cause avant relance.'; priority = 'haute'; }
  else if (mortalityRate >= 5) { decision = 'Morts élevés dans le lot : contrôler santé, eau, alimentation et reporter la vente recommandée.'; priority = 'haute'; }
  else if (mortalityRate >= 3) { decision = 'Morts à surveiller : vérifier conditions du lot avant décision commerciale.'; priority = 'moyenne'; }
  else if (sickOrRisk) { decision = 'Lot à risque : contrôler santé, mortalité et alimentation.'; priority = 'haute'; }
  return { type: 'chair', ageDays: living.currentAge || ageDays(lot), activeCount: activeCount(lot), weight: living.currentWeight || latestWeight(lot), targetWeight: living.livingTarget || targetWeight(lot), initialTargetWeight: living.defaultTargetWeight || targetWeight(lot), livingTargetWeight: living.livingTarget || targetWeight(lot), projectedWeight: living.projectedWeight, nextWeighingDate: living.nextWeighingDate, reminderWeighingDate: reminderDate, expectedWeight: living.projectedWeight || living.livingTarget, frequency: living.frequency, mortalityRate, realGainPerDay: living.realGainPerDay, adaptiveGainPerDay: living.adaptiveGainPerDay, status: closedByLoss ? 'cloture_perte' : living.status, progress: closedByLoss ? 0 : living.progress, decision, priority };
}

export function buildLayerLotDecision(lot = {}, productionLogs = []) {
  const living = computePondeuseLivingTarget(lot, productionLogs);
  const start = lot.date_debut || lot.entry_date || today();
  const reformStart = lot.date_debut_reforme_recommandee || addMonths(start, living.reformStartMonths || 17);
  const reformTarget = lot.date_reforme_cible || addMonths(start, living.reformTargetMonths || 18);
  const mortalityRate = mortalityRateOf(lot);
  const closedByLoss = isLotClosedByLoss(lot);
  let priority = ['baisse_ponte', 'ramassage_manquant', 'casses_elevees', 'preparer_reforme', 'reforme_cible'].includes(living.status) ? 'haute' : 'moyenne';
  let decision = living.action;
  if (closedByLoss) { decision = 'Lot pondeuses clôturé en perte : arrêter les charges actives, conserver l’historique et analyser la cause avant nouvelle bande.'; priority = 'haute'; }
  else if (mortalityRate >= 5) { decision = 'Morts élevés dans les pondeuses : vérifier santé, eau, aliment et impact sur objectif ponte vivant.'; priority = 'haute'; }
  else if (mortalityRate >= 3) { decision = 'Morts à surveiller dans le lot pondeuses : contrôler rapidement les conditions du bâtiment.'; priority = 'moyenne'; }
  return { type: 'pondeuse', ageMonths: living.months || ageMonths(lot), activeCount: living.active || activeCount(lot), avgEggsDay: Math.round(living.recentDailyEggs || 0), expectedEggsDay: living.expectedEggsDay || 0, layingRate: living.realLayingPct || 0, objectiveInitial: living.objectiveInitial || 80, objectiveLivingPct: living.livingObjectivePct || 0, objectiveAgePct: living.ageExpectedPct || 0, gapEggsDay: living.gapEggsDay || 0, reformStart, reformTarget, mortalityRate, status: closedByLoss ? 'cloture_perte' : living.status, decision, priority };
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
    return { ...payload, age_reforme_recommandee_mois: num(base.age_reforme_recommandee_mois) || 17, age_reforme_cible_mois: num(base.age_reforme_cible_mois) || 18, date_debut_reforme_recommandee: decision.reformStart, date_reforme_cible: decision.reformTarget, objectif_ponte_pct: decision.objectiveInitial || 80, objectif_ponte_vivant_pct: decision.objectiveLivingPct, objectif_ponte_jour: decision.expectedEggsDay, taux_ponte_attendu: decision.objectiveLivingPct || 80, ecart_ponte_jour: decision.gapEggsDay, decision_ia_lot: decision.decision, priorite_ia_lot: decision.priority };
  }
  return { ...payload, poids_objectif_vente: decision.livingTargetWeight || decision.targetWeight, target_weight: decision.livingTargetWeight || decision.targetWeight, poids_objectif_initial: decision.initialTargetWeight, poids_attendu_prochaine_pesee: decision.expectedWeight, date_prochaine_pesee_recommandee: decision.nextWeighingDate, rappel_pesee: decision.reminderWeighingDate, date_rappel_pesee: decision.reminderWeighingDate, frequence_pesee_jours: decision.frequency, gain_reel_jour: decision.realGainPerDay, statut_croissance_ia: decision.status, decision_ia_lot: decision.decision, priorite_ia_lot: decision.priority };
}
