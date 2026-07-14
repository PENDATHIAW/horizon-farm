/**
 * Référentiel Code_Souche - standards zootechniques par atelier.
 * Chaque lot avicole/bovin peut référencer un code via `code_souche` ou `breed_code`.
 */

export const WORKSHOPS = {
  pondeuses: { label: 'Pondeuses', activity: 'oeufs', unit: 'tablette' },
  poulets_chair: { label: 'Poulets de chair', activity: 'poulets_chair', unit: 'sujet' },
  bovins: { label: 'Embouche bovine', activity: 'bovins', unit: 'tête' },
  maraichage: { label: 'Maraîchage (futur)', activity: 'cultures', unit: 'kg' },
};

/** Courbe taux de ponte théorique (%), âge en jours depuis J-0 (mise en place). */
const LAYING_RATE_BY_AGE = {
  0: 0, 30: 0, 60: 0, 90: 0, 120: 5, 150: 45, 180: 78, 210: 88, 240: 92,
  270: 93, 300: 92, 330: 90, 360: 88, 390: 85, 420: 82, 450: 78, 480: 72,
  510: 65, 540: 55,
};

/** Poids théorique chair (g) - courbe Cobb simplifiée. */
const BROILER_WEIGHT_G = {
  0: 42, 7: 185, 14: 480, 21: 900, 28: 1450, 35: 1950, 42: 2300,
};

/** Poids théorique bovins embouche (kg). */
const CATTLE_WEIGHT_KG = {
  0: 150, 30: 165, 60: 185, 90: 210, 120: 235, 150: 260, 180: 285, 210: 310, 240: 330, 270: 350,
};

export const BREED_STOCK_REFERENTIAL = {
  PONDEUSE_RHODE: {
    code: 'PONDEUSE_RHODE',
    label: 'Pondeuse Rhode Island',
    workshop: 'pondeuses',
    activity: 'oeufs',
    metric: 'laying_rate',
    curve: LAYING_RATE_BY_AGE,
    tolerancePct: 5,
    feedOvercostPerPointPct: 1200,
  },
  PONDEUSE_LOHMANN: {
    code: 'PONDEUSE_LOHMANN',
    label: 'Pondeuse Lohmann Brown',
    workshop: 'pondeuses',
    activity: 'oeufs',
    metric: 'laying_rate',
    curve: Object.fromEntries(Object.entries(LAYING_RATE_BY_AGE).map(([k, v]) => [k, Math.min(95, v + 2)])),
    tolerancePct: 5,
    feedOvercostPerPointPct: 1200,
  },
  CHAIR_COBB: {
    code: 'CHAIR_COBB',
    label: 'Chair Cobb 500',
    workshop: 'poulets_chair',
    activity: 'poulets_chair',
    metric: 'weight_g',
    curve: BROILER_WEIGHT_G,
    targetDays: 42,
    tolerancePct: 8,
    feedOvercostPerDayDelay: 8500,
  },
  CHAIR_ROSS: {
    code: 'CHAIR_ROSS',
    label: 'Chair Ross 308',
    workshop: 'poulets_chair',
    activity: 'poulets_chair',
    metric: 'weight_g',
    curve: Object.fromEntries(Object.entries(BROILER_WEIGHT_G).map(([k, v]) => [k, Math.round(v * 0.98)])),
    targetDays: 42,
    tolerancePct: 8,
    feedOvercostPerDayDelay: 8500,
  },
  BOVIN_ZEBU_EMBOUCHE: {
    code: 'BOVIN_ZEBU_EMBOUCHE',
    label: 'Zébu embouche locale',
    workshop: 'bovins',
    activity: 'bovins',
    metric: 'weight_kg',
    curve: CATTLE_WEIGHT_KG,
    gmqTargetG: 800,
    tolerancePct: 10,
    feedOvercostPerDayDelay: 15000,
  },
};

const DEFAULT_BY_WORKSHOP = {
  pondeuses: 'PONDEUSE_RHODE',
  poulets_chair: 'CHAIR_COBB',
  bovins: 'BOVIN_ZEBU_EMBOUCHE',
};

const norm = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function inferWorkshopFromLot(lot = {}) {
  const text = norm(`${lot.type || ''} ${lot.categorie || ''} ${lot.production_type || ''} ${lot.name || ''} ${lot.nom || ''}`);
  if (text.includes('pondeuse') || text.includes('ponte') || text.includes('oeuf')) return 'pondeuses';
  if (text.includes('chair') || text.includes('broiler') || text.includes('poulet')) return 'poulets_chair';
  if (text.includes('bovin') || text.includes('boeuf') || text.includes('zebu') || text.includes('embouche')) return 'bovins';
  return '';
}

export function resolveBreedCode(entity = {}) {
  const explicit = String(entity.code_souche || entity.breed_code || entity.codeSouche || '').trim().toUpperCase();
  if (explicit && BREED_STOCK_REFERENTIAL[explicit]) return explicit;
  const workshop = inferWorkshopFromLot(entity) || inferWorkshopFromLot({ type: entity.type || entity.espece });
  return DEFAULT_BY_WORKSHOP[workshop] || null;
}

export function getBreedStock(code) {
  return BREED_STOCK_REFERENTIAL[code] || null;
}

/** Interpolation linéaire sur la courbe de standards à un âge donné (jours). */
export function theoreticalStandardAtAge(breedCode, ageDays) {
  const breed = getBreedStock(breedCode);
  if (!breed || ageDays < 0) return null;
  const curve = breed.curve || {};
  const keys = Object.keys(curve).map(Number).sort((a, b) => a - b);
  if (!keys.length) return null;
  if (ageDays <= keys[0]) return curve[keys[0]];
  if (ageDays >= keys[keys.length - 1]) return curve[keys[keys.length - 1]];
  let lower = keys[0];
  let upper = keys[keys.length - 1];
  keys.forEach((k) => {
    if (k <= ageDays) lower = k;
    if (k >= ageDays && upper >= k) upper = k;
  });
  if (lower === upper) return curve[lower];
  const ratio = (ageDays - lower) / (upper - lower);
  return curve[lower] + (curve[upper] - curve[lower]) * ratio;
}

export function listBreedCodes() {
  return Object.values(BREED_STOCK_REFERENTIAL);
}
