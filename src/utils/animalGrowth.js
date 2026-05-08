const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const diffDays = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86400000));
};

export const parseWeightHistory = (animal = {}) => {
  const raw = animal.poids_history || animal.weight_history || animal.historique_poids || animal.pesees || [];
  let list = [];

  if (Array.isArray(raw)) list = raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      list = Array.isArray(parsed) ? parsed : [];
    } catch {
      list = [];
    }
  }

  const normalized = list
    .map((item) => ({
      date: item.date || item.date_pesee || item.recorded_at,
      poids: Number(item.poids || item.weight || item.valeur || 0),
      note: item.note || item.commentaire || '',
    }))
    .filter((item) => item.date && item.poids > 0)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const currentWeight = Number(animal.poids || animal.weight || 0);
  const currentDate = new Date().toISOString().slice(0, 10);
  if (currentWeight > 0 && !normalized.some((item) => item.poids === currentWeight && item.date === currentDate)) {
    normalized.push({ date: currentDate, poids: currentWeight, note: 'Poids actuel' });
  }

  return normalized;
};

export const buildGrowthSummary = (animal = {}) => {
  const history = parseWeightHistory(animal);
  const first = history[0] || null;
  const last = history[history.length - 1] || null;
  const previous = history.length > 1 ? history[history.length - 2] : null;
  const birthDate = toDate(animal.date_naissance || animal.naissance);
  const entryDate = toDate(animal.date_entree_ferme || animal.date_achat || animal.created_at);
  const startDate = toDate(first?.date) || entryDate || birthDate;
  const endDate = toDate(last?.date) || new Date();
  const days = diffDays(startDate, endDate);
  const gain = first && last ? Number(last.poids || 0) - Number(first.poids || 0) : 0;
  const averageDailyGain = days > 0 ? gain / days : 0;
  const recentGain = previous && last ? Number(last.poids || 0) - Number(previous.poids || 0) : 0;
  const recentDays = previous && last ? diffDays(toDate(previous.date), toDate(last.date)) : 0;
  const recentAverageDailyGain = recentDays > 0 ? recentGain / recentDays : averageDailyGain;

  let status = 'a_suivre';
  let label = 'Suivi a completer';
  if (history.length >= 2) {
    if (averageDailyGain >= 0.5) {
      status = 'bonne_croissance';
      label = 'Bonne croissance';
    } else if (averageDailyGain >= 0.2) {
      status = 'croissance_moyenne';
      label = 'Croissance moyenne';
    } else if (averageDailyGain >= 0) {
      status = 'croissance_lente';
      label = 'Croissance lente';
    } else {
      status = 'perte_poids';
      label = 'Perte de poids';
    }
  }

  const recommendation = (() => {
    if (history.length < 2) return 'Ajouter au moins deux pesees pour suivre la croissance.';
    if (averageDailyGain < 0) return 'Verifier sante, parasites, alimentation et stress: perte de poids detectee.';
    if (averageDailyGain < 0.2) return 'Croissance faible: controler ration, eau, dents, parasites et conditions de logement.';
    if (averageDailyGain < 0.5) return 'Croissance correcte mais ameliorable: ajuster ration et regularite des pesees.';
    return 'Croissance satisfaisante: maintenir ration et suivi toutes les 2 a 4 semaines.';
  })();

  return {
    history,
    first,
    last,
    previous,
    days,
    gain,
    averageDailyGain,
    recentGain,
    recentDays,
    recentAverageDailyGain,
    status,
    label,
    recommendation,
  };
};
