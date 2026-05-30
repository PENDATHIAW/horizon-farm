const arr = (value) => (Array.isArray(value) ? value : []);
const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const dayMs = 86400000;

export function ageInDays(startDate, now = new Date()) {
  if (!startDate) return 0;
  const date = new Date(startDate);
  if (Number.isNaN(date.getTime())) return 0;
  return Math.max(0, Math.floor((new Date(now).getTime() - date.getTime()) / dayMs));
}

export function daysBetween(startDate, endDate) {
  if (!startDate || !endDate) return 0;
  const a = new Date(startDate);
  const b = new Date(endDate);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.max(0, Math.floor((b.getTime() - a.getTime()) / dayMs));
}

export function buildWeightHistory(entity = {}, options = {}) {
  const history = arr(entity.weight_history || entity.historique_poids || entity.pesees || entity.weighings).map((item) => ({
    date: item.date || item.date_pesee || item.weighed_at,
    weight: num(item.weight ?? item.poids ?? item.poids_moyen ?? item.average_weight),
    target: num(item.target ?? item.objectif ?? item.poids_objectif),
    source: item.source || 'historique',
  })).filter((item) => item.date && item.weight > 0);

  const entryDate = entity.date_entree_ferme || entity.date_achat || entity.date_debut || entity.entry_date || options.entryDate;
  const entryWeight = num(entity.poids_entree ?? entity.weight_entry ?? entity.poids_moyen_entree ?? options.entryWeight);
  if (entryDate && entryWeight > 0 && !history.some((item) => item.date === entryDate)) {
    history.unshift({ date: entryDate, weight: entryWeight, target: entryWeight, source: 'entrée' });
  }

  const currentDate = entity.date_derniere_pesee || entity.last_weighing_date || options.currentDate || new Date().toISOString().slice(0, 10);
  const currentWeight = num(entity.poids ?? entity.poids_actuel ?? entity.weight ?? entity.poids_moyen_actuel ?? entity.last_weight_avg ?? entity.weight_avg ?? entity.average_weight ?? options.currentWeight);
  if (currentDate && currentWeight > 0 && !history.some((item) => item.date === currentDate && item.weight === currentWeight)) {
    history.push({ date: currentDate, weight: currentWeight, target: num(entity.poids_objectif ?? entity.target_weight ?? entity.poids_objectif_vente ?? options.targetWeight), source: 'actuel' });
  }

  return history.sort((a, b) => new Date(a.date) - new Date(b.date));
}

export function projectGrowth(entity = {}, options = {}) {
  const entryDate = entity.date_entree_ferme || entity.date_achat || entity.date_debut || entity.entry_date || options.entryDate;
  const targetDays = num(options.targetDays ?? entity.delai_cible_jours ?? entity.duree_cycle_valeur) || 90;
  const targetWeight = num(options.targetWeight ?? entity.poids_objectif ?? entity.target_weight ?? entity.poids_objectif_vente ?? entity.objectif_poids_moyen) || 0;
  const history = buildWeightHistory(entity, options);
  const first = history[0] || null;
  const last = history[history.length - 1] || null;
  const currentAgeDays = ageInDays(entryDate);
  const elapsed = first && last ? Math.max(1, daysBetween(first.date, last.date)) : Math.max(1, currentAgeDays);
  const gainPerDay = first && last ? (last.weight - first.weight) / elapsed : 0;
  const projectedWeight = last ? Math.max(0, last.weight + gainPerDay * Math.max(0, targetDays - currentAgeDays)) : 0;
  const progress = targetWeight > 0 && last ? Math.round((last.weight / targetWeight) * 100) : 0;
  const projectedProgress = targetWeight > 0 ? Math.round((projectedWeight / targetWeight) * 100) : 0;
  const gap = targetWeight > 0 ? projectedWeight - targetWeight : 0;

  let status = 'a_surveiller';
  let label = 'À surveiller';
  if (targetWeight > 0 && last?.weight >= targetWeight) { status = 'pret_vente'; label = 'Prêt à la vente'; }
  else if (targetWeight > 0 && projectedProgress >= 95) { status = 'conforme'; label = 'Croissance conforme'; }
  else if (targetWeight > 0 && projectedProgress >= 80) { status = 'risque_retard'; label = 'Risque de retard'; }
  else if (targetWeight > 0) { status = 'retard'; label = 'Retard de croissance'; }

  const action = (() => {
    if (status === 'pret_vente') return 'Confirmer la mise en opportunité de vente si le marché et le prix sont bons.';
    if (status === 'conforme') return 'Maintenir ration, abreuvement et calendrier de pesée.';
    if (status === 'risque_retard') return 'Programmer une pesée de contrôle et vérifier ration, eau, température et santé.';
    return 'Agir rapidement : contrôler santé, aliment, abreuvement, densité/stress et revoir la date cible si nécessaire.';
  })();

  return { history, currentAgeDays, targetDays, targetWeight, currentWeight: last?.weight || 0, entryWeight: first?.weight || 0, gainPerDay: Number(gainPerDay.toFixed(3)), projectedWeight: Number(projectedWeight.toFixed(2)), progress, projectedProgress, gap: Number(gap.toFixed(2)), status, label, action };
}

export function buildPondeuseProductionProfile(lot = {}, productionLogs = []) {
  const activeCount = num(lot.current_count ?? lot.effectif_actuel ?? lot.initial_count ?? lot.effectif);
  const logs = arr(productionLogs).filter((log) => String(log.lot_id || log.related_id || '') === String(lot.id));
  const sorted = logs.sort((a, b) => new Date(a.date || a.date_debut || 0) - new Date(b.date || b.date_debut || 0));
  const normalizedLogs = sorted.map((log) => {
    const start = log.date_debut || log.start_date || log.date;
    const end = log.date_fin || log.end_date || log.date || start;
    const days = Math.max(1, daysBetween(start, end) + 1);
    const eggs = num(log.oeufs_produits ?? log.eggs_count ?? log.quantity);
    const broken = num(log.oeufs_casses ?? log.broken_eggs);
    const dailyEggs = eggs / days;
    const rate = activeCount > 0 ? Math.round((dailyEggs / activeCount) * 100) : 0;
    return { ...log, start, end, days, eggs, broken, dailyEggs: Number(dailyEggs.toFixed(1)), layingRate: rate };
  });
  const last = normalizedLogs[normalizedLogs.length - 1] || null;
  const missingCollectionAlert = (() => {
    if (!last?.end) return 'Aucun ramassage renseigné.';
    const daysSince = ageInDays(last.end);
    if (daysSince >= 2) return `Aucun ramassage renseigné depuis ${daysSince} jours : confirmer oubli, pause ou ramassage groupé.`;
    return '';
  })();
  const layingRate = last?.layingRate || 0;
  const status = layingRate >= 70 ? 'bon' : layingRate >= 50 ? 'a_surveiller' : 'alerte';
  const action = status === 'bon'
    ? 'Ponte correcte : sécuriser les ventes et limiter les casses.'
    : status === 'a_surveiller'
      ? 'Surveiller poids moyen, aliment, eau, lumière et stress.'
      : 'Analyser rapidement santé, ration, chaleur, lumière, casses et mortalité.';
  return { activeCount, logs: normalizedLogs, last, layingRate, status, action, missingCollectionAlert };
}

export function hasActiveSaleOpportunity(entityId, sourceType, opportunities = []) {
  const closed = ['converti', 'converted', 'annule', 'annulé', 'ignore', 'ignoré', 'perdu', 'cloture', 'clôturé'];
  return arr(opportunities).some((opp) => {
    const sameSource = String(opp.source_id || opp.entity_id || opp.related_id || '') === String(entityId);
    const sameType = !sourceType || norm(opp.source_type || opp.type_source || opp.type || '').includes(norm(sourceType));
    const isClosed = closed.some((status) => norm(opp.status || opp.statut).includes(status));
    return sameSource && sameType && !isClosed;
  });
}

export function saleOpportunityGuard(entity = {}, sourceType = '', opportunities = []) {
  const exists = hasActiveSaleOpportunity(entity.id, sourceType, opportunities);
  return {
    canCreate: !exists,
    exists,
    message: exists ? 'Une opportunité de vente active existe déjà pour cette fiche. Ouvrir ou mettre à jour l’opportunité existante.' : 'Aucune opportunité active détectée : création possible après confirmation.',
  };
}

export default projectGrowth;
