const num = (value = 0) => Number(value || 0);
const dayMs = 86400000;

const CHAIR_DEFAULTS = {
  targetDays: 45,
  weighingFrequencyDays: 15,
  targetWeight: 1.5,
  gainTarget: 0.035,
  gainMin: 0.025,
  gainMax: 0.055,
};

const PONDEUSE_DEFAULTS = {
  peakTargetPct: 80,
  reformStartMonths: 17,
  reformTargetMonths: 18,
  collectionMaxGapDays: 1,
};

const normalize = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function addDays(date, days) {
  const base = date ? new Date(date) : new Date();
  if (Number.isNaN(base.getTime())) return new Date().toISOString().slice(0, 10);
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / dayMs));
}

export function ageDays(lot = {}) {
  return daysBetween(lot.date_debut || lot.entry_date || lot.date_entree, new Date().toISOString().slice(0, 10));
}

export function ageMonths(lot = {}) {
  return Math.floor(ageDays(lot) / 30.44);
}

export function activeCount(lot = {}) {
  return num(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count ?? lot.effectif_initial ?? lot.effectif);
}

export function normalizeWeightHistory(lot = {}) {
  const raw = lot.weight_history || lot.historique_poids || lot.pesees || lot.weighings || [];
  let history = [];
  if (Array.isArray(raw)) history = raw;
  else if (typeof raw === 'string') {
    try { history = JSON.parse(raw); } catch { history = []; }
  }
  const entryDate = lot.date_pesee_entree || lot.date_debut || lot.entry_date;
  const entryWeight = num(lot.poids_moyen_entree || lot.weight_entry);
  const lastDate = lot.date_derniere_pesee || lot.last_weighing_date;
  const lastWeight = num(lot.poids_moyen_actuel || lot.last_weight_avg || lot.weight_avg || lot.average_weight);
  const rows = history.map((item) => ({
    date: item.date || item.date_pesee || item.weighed_at,
    poids: num(item.poids || item.weight || item.poids_moyen || item.average_weight),
    note: item.note || item.commentaire || '',
  })).filter((item) => item.date && item.poids > 0);
  if (entryDate && entryWeight > 0 && !rows.some((item) => item.date === entryDate && item.poids === entryWeight)) rows.push({ date: entryDate, poids: entryWeight, note: 'Poids moyen entrée' });
  if (lastDate && lastWeight > 0 && !rows.some((item) => item.date === lastDate && item.poids === lastWeight)) rows.push({ date: lastDate, poids: lastWeight, note: 'Dernière pesée' });
  return rows.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function computeChairLivingTarget(lot = {}) {
  const history = normalizeWeightHistory(lot);
  const first = history[0] || null;
  const last = history[history.length - 1] || first;
  const startDate = lot.date_debut || lot.entry_date || first?.date || new Date().toISOString().slice(0, 10);
  const targetDays = num(lot.duree_cycle_valeur || lot.target_days) || CHAIR_DEFAULTS.targetDays;
  const frequency = num(lot.frequence_pesee_jours || lot.weighing_frequency_days) || CHAIR_DEFAULTS.weighingFrequencyDays;
  const defaultTargetWeight = num(lot.poids_objectif_vente || lot.target_weight || lot.objectif_poids_moyen) || CHAIR_DEFAULTS.targetWeight;
  const elapsed = first && last ? Math.max(1, daysBetween(first.date, last.date)) : Math.max(1, ageDays(lot));
  const realGainPerDay = first && last && history.length >= 2 ? (last.poids - first.poids) / elapsed : 0;
  const defaultGain = defaultTargetWeight && first?.poids ? Math.max(0.001, (defaultTargetWeight - first.poids) / targetDays) : CHAIR_DEFAULTS.gainTarget;
  const adaptiveGain = realGainPerDay > 0 ? Math.max(CHAIR_DEFAULTS.gainMin, Math.min(CHAIR_DEFAULTS.gainMax, realGainPerDay)) : defaultGain;
  const livingTarget = first?.poids ? Math.round((first.poids + adaptiveGain * targetDays) * 100) / 100 : defaultTargetWeight;
  const currentAge = ageDays({ ...lot, date_debut: startDate });
  const projectedWeight = last?.poids ? Math.round((last.poids + adaptiveGain * Math.max(0, targetDays - currentAge)) * 100) / 100 : 0;
  const nextWeighingDate = addDays(last?.date || startDate, frequency);
  const today = new Date().toISOString().slice(0, 10);
  const weighingDue = nextWeighingDate <= today;
  const currentWeight = last?.poids || num(lot.poids_moyen_actuel || lot.last_weight_avg || lot.weight_avg || lot.average_weight);
  const progress = livingTarget > 0 && currentWeight > 0 ? Math.round((currentWeight / livingTarget) * 100) : 0;
  const status = (() => {
    if (!currentWeight) return 'poids_a_renseigner';
    if (currentWeight >= livingTarget || currentWeight >= defaultTargetWeight) return 'pret_vente';
    if (currentAge >= 35 && projectedWeight < defaultTargetWeight * 0.95) return 'retard_croissance';
    if (realGainPerDay > 0 && realGainPerDay < CHAIR_DEFAULTS.gainMin) return 'retard_croissance';
    if (weighingDue) return 'pesee_due';
    return 'croissance_normale';
  })();
  const action = (() => {
    if (status === 'poids_a_renseigner') return 'Renseigner le poids moyen entrée ou une pesée du lot.';
    if (status === 'pret_vente') return 'Confirmer l’opportunité de vente si le prix et les clients sont disponibles.';
    if (status === 'retard_croissance') return 'Vérifier aliment, eau, température, ventilation, densité et état sanitaire.';
    if (status === 'pesee_due') return 'Pesée à faire pour recalculer la projection.';
    return 'Croissance conforme : maintenir ration, eau, ambiance et suivi tous les 15 jours.';
  })();
  return { type: 'chair', targetDays, frequency, currentAge, currentWeight, defaultTargetWeight, livingTarget, projectedWeight, realGainPerDay: Number(realGainPerDay.toFixed(3)), adaptiveGainPerDay: Number(adaptiveGain.toFixed(3)), nextWeighingDate, weighingDue, progress, status, action, history };
}

export function expectedPontePctByAge(months = 0, lot = {}) {
  const peak = num(lot.objectif_ponte_pct || lot.peak_laying_target_pct) || PONDEUSE_DEFAULTS.peakTargetPct;
  if (months < 5) return 0;
  if (months < 6) return Math.round(peak * 0.45);
  if (months < 7) return Math.round(peak * 0.75);
  if (months < 12) return peak;
  if (months < 15) return Math.max(65, peak - 5);
  if (months < 17) return Math.max(55, peak - 12);
  if (months < 18) return Math.max(45, peak - 20);
  return Math.max(30, peak - 30);
}

export function normalizeProductionLogs(lot = {}, productionLogs = []) {
  return (Array.isArray(productionLogs) ? productionLogs : [])
    .filter((log) => String(log.lot_id || log.related_id || '') === String(lot.id))
    .map((log) => {
      const start = log.date_debut || log.start_date || log.date;
      const end = log.date_fin || log.end_date || log.date || start;
      const days = Math.max(1, daysBetween(start, end) + 1);
      const eggs = num(log.oeufs_produits ?? log.eggs_count ?? log.quantity);
      const broken = num(log.oeufs_casses ?? log.broken_eggs);
      const dailyEggs = eggs / days;
      return { ...log, start, end, days, eggs, broken, vendableEggs: Math.max(0, eggs - broken), dailyEggs: Number(dailyEggs.toFixed(1)), brokenRate: eggs > 0 ? Math.round((broken / eggs) * 100) : 0 };
    })
    .filter((log) => log.start)
    .sort((a, b) => new Date(a.start) - new Date(b.start));
}

export function computePondeuseLivingTarget(lot = {}, productionLogs = []) {
  const active = activeCount(lot);
  const months = ageMonths(lot);
  const logs = normalizeProductionLogs(lot, productionLogs);
  const last = logs[logs.length - 1] || null;
  const objectiveInitial = num(lot.objectif_ponte_pct || lot.peak_laying_target_pct) || PONDEUSE_DEFAULTS.peakTargetPct;
  const ageExpectedPct = expectedPontePctByAge(months, lot);
  const recentLogs = logs.slice(-7);
  const recentDailyEggs = recentLogs.length ? recentLogs.reduce((sum, log) => sum + log.dailyEggs, 0) / recentLogs.length : 0;
  const realLayingPct = active > 0 && recentDailyEggs > 0 ? Math.round((recentDailyEggs / active) * 100) : 0;
  const livingObjectivePct = realLayingPct > 0 ? Math.round((ageExpectedPct * 0.7) + (realLayingPct * 0.3)) : ageExpectedPct;
  const expectedEggsDay = Math.round(active * livingObjectivePct / 100);
  const gapEggsDay = recentDailyEggs ? Math.round(recentDailyEggs - expectedEggsDay) : 0;
  const today = new Date().toISOString().slice(0, 10);
  const daysSinceCollection = last?.end ? daysBetween(last.end, today) : null;
  const missingCollection = daysSinceCollection === null || daysSinceCollection > PONDEUSE_DEFAULTS.collectionMaxGapDays;
  const status = (() => {
    if (!active) return 'effectif_a_renseigner';
    if (!logs.length) return 'ramassage_a_renseigner';
    if (missingCollection) return 'ramassage_manquant';
    if (months >= PONDEUSE_DEFAULTS.reformTargetMonths) return 'reforme_cible';
    if (months >= PONDEUSE_DEFAULTS.reformStartMonths) return 'preparer_reforme';
    if (realLayingPct && realLayingPct < livingObjectivePct - 12) return 'baisse_ponte';
    if (last?.brokenRate > 5) return 'casses_elevees';
    return 'ponte_normale';
  })();
  const action = (() => {
    if (status === 'effectif_a_renseigner') return 'Renseigner l’effectif actif pour calculer le taux de ponte.';
    if (status === 'ramassage_a_renseigner') return 'Saisir le premier ramassage ou un ramassage groupé avec période couverte.';
    if (status === 'ramassage_manquant') return 'Vérifier si ramassage oublié, non saisi ou groupé sur plusieurs jours.';
    if (status === 'reforme_cible') return 'Préparer réforme/vente et renouvellement du lot.';
    if (status === 'preparer_reforme') return 'Préparer progressivement réforme, vente et nouveau lot.';
    if (status === 'baisse_ponte') return 'Vérifier alimentation, eau, chaleur, lumière, stress, santé et mortalité.';
    if (status === 'casses_elevees') return 'Réduire les casses : ramassage plus fréquent, pondoirs, manipulation et qualité coquille.';
    return 'Ponte conforme : sécuriser clients œufs et limiter les casses.';
  })();
  return { type: 'pondeuse', active, months, objectiveInitial, ageExpectedPct, livingObjectivePct, expectedEggsDay, recentDailyEggs: Number(recentDailyEggs.toFixed(1)), realLayingPct, gapEggsDay, last, logs, missingCollection, daysSinceCollection, status, action, reformStartMonths: PONDEUSE_DEFAULTS.reformStartMonths, reformTargetMonths: PONDEUSE_DEFAULTS.reformTargetMonths };
}

export function computeAvicoleLivingTarget(lot = {}, productionLogs = []) {
  return normalize(lot.type).includes('pondeuse') ? computePondeuseLivingTarget(lot, productionLogs) : computeChairLivingTarget(lot);
}
