const num = (value = 0) => Number(value || 0);
const norm = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const cropProfiles = {
  tomates: { cycle: 90, water: 'élevé', soil: ['sablo-limoneux', 'limoneux', 'deck-dior'], risk: 'maladie/prix marché', unit: 'kg' },
  tomate: { cycle: 90, water: 'élevé', soil: ['sablo-limoneux', 'limoneux', 'deck-dior'], risk: 'maladie/prix marché', unit: 'kg' },
  poivrons: { cycle: 100, water: 'moyen à élevé', soil: ['sablo-limoneux', 'limoneux', 'deck-dior'], risk: 'maladie/eau', unit: 'kg' },
  poivron: { cycle: 100, water: 'moyen à élevé', soil: ['sablo-limoneux', 'limoneux', 'deck-dior'], risk: 'maladie/eau', unit: 'kg' },
  piments: { cycle: 100, water: 'moyen', soil: ['sablo-limoneux', 'limoneux'], risk: 'maladie/prix', unit: 'kg' },
  oignons: { cycle: 120, water: 'moyen', soil: ['sableux', 'sablo-limoneux'], risk: 'stockage/prix', unit: 'kg' },
  pomme_de_terre: { cycle: 90, water: 'moyen', soil: ['sablo-limoneux'], risk: 'semences/eau/maladie', unit: 'kg' },
};

function profileFor(culture = {}) {
  const raw = norm(`${culture.type || ''} ${culture.nom || ''}`).replaceAll(' ', '_');
  return cropProfiles[raw] || cropProfiles[raw.replace(/s$/, '')] || { cycle: 90, water: 'à confirmer', soil: ['à confirmer'], risk: 'sol/eau/marché à confirmer', unit: culture.unite_recolte || 'kg' };
}

function addDays(dateValue, days) {
  const base = dateValue ? new Date(dateValue) : new Date();
  if (Number.isNaN(base.getTime())) return '';
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

export function buildCultureDecisionProfile(culture = {}) {
  const profile = profileFor(culture);
  const surface = num(culture.surface_exploitable ?? culture.surface);
  const expectedYield = num(culture.rendement_attendu ?? culture.quantite_prevue);
  const realYield = num(culture.rendement_reel ?? culture.quantite_recoltee);
  const lossQty = num(culture.pertes ?? culture.quantite_perdue ?? culture.quantite_sinistree);
  const lossValue = num(culture.valeur_perte_estimee ?? culture.perte_estimee ?? culture.montant_sinistre);
  const status = norm(culture.statut || '');
  const water = norm(culture.eau_disponible || culture.disponibilite_eau || '');
  const soil = norm(culture.type_sol || culture.sol || '');
  const startDate = culture.date_semis || culture.date_debut_campagne || culture.date_plantation;
  const harvestDate = culture.date_recolte_prevue || addDays(startDate, profile.cycle);
  const hasSoil = Boolean(soil);
  const hasWater = Boolean(water);
  const soilOk = hasSoil ? profile.soil.some((item) => soil.includes(norm(item))) || soil.includes('bon') || soil.includes('propice') : false;
  const waterOk = hasWater ? !['non', 'faible', 'insuffisant'].some((bad) => water.includes(bad)) : false;
  const yieldGap = expectedYield > 0 && realYield > 0 ? Math.round(((realYield - expectedYield) / expectedYield) * 100) : null;

  let priority = 'moyenne';
  let decision = 'Valider sol, eau, cycle et débouché avant investissement fort.';
  if (['perdu', 'sinistre'].includes(status)) {
    priority = status === 'perdu' ? 'haute' : 'moyenne';
    decision = status === 'perdu'
      ? 'Culture clôturée en perte : arrêter les charges, historiser le sinistre et analyser la cause avant relance.'
      : 'Perte culturale déclarée : sécuriser les actions correctives et recalculer la quantité vendable.';
  } else if (lossQty > 0 || lossValue > 0) {
    priority = 'haute';
    decision = 'Perte culturale à suivre : vérifier eau, ravageurs, maladie et ajuster la prévision de vente.';
  } else if (!hasSoil || !hasWater) {
    priority = 'haute';
    decision = 'Décision incomplète : renseigner type de sol et eau disponible avant recommandation forte.';
  } else if (!soilOk || !waterOk) {
    priority = 'haute';
    decision = 'Risque culture : sol ou eau à vérifier avant d’augmenter la surface.';
  } else if (yieldGap !== null && yieldGap < -15) {
    priority = 'haute';
    decision = 'Rendement en retard : analyser eau, intrants, maladie et marché avant nouvelle campagne.';
  } else if (culture.quantite_disponible > 0 || realYield > 0) {
    decision = 'Récolte disponible : prioriser vente, stockage et clients avant pertes post-récolte.';
  } else if (harvestDate) {
    decision = 'Culture planifiée : sécuriser intrants, eau et débouchés avant récolte.';
  }

  return {
    crop: culture.type || culture.nom || 'Culture',
    cycleDays: num(culture.cycle_days || culture.duree_cycle || culture.jours_avant_recolte) || profile.cycle,
    waterNeed: profile.water,
    preferredSoil: profile.soil.join(', '),
    risk: profile.risk,
    surface,
    expectedYield,
    realYield,
    lossQty,
    lossValue,
    yieldGap,
    harvestDate,
    soilOk,
    waterOk,
    decision,
    priority,
  };
}

export function applyCultureDecisionDefaults(payload = {}, existing = {}) {
  const base = { ...existing, ...payload };
  const profile = buildCultureDecisionProfile(base);
  return {
    ...payload,
    cycle_days: profile.cycleDays,
    jours_avant_recolte: profile.cycleDays,
    date_recolte_prevue: payload.date_recolte_prevue || profile.harvestDate,
    rendement_attendu: num(payload.rendement_attendu ?? payload.quantite_prevue) || profile.expectedYield,
    quantite_prevue: num(payload.quantite_prevue ?? payload.rendement_attendu) || profile.expectedYield,
    pertes: num(payload.pertes ?? payload.quantite_perdue) || profile.lossQty,
    valeur_perte_estimee: num(payload.valeur_perte_estimee ?? payload.perte_estimee) || profile.lossValue,
    decision_ia_culture: profile.decision,
    priorite_ia_culture: profile.priority,
    besoin_eau_reference: profile.waterNeed,
    sol_reference: profile.preferredSoil,
    risque_reference: profile.risk,
  };
}

export default buildCultureDecisionProfile;
