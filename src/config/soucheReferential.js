/** Référentiel souches — standards officiels de croissance et ponte (clé de pointage par âge). */

export const SANITARY_VACUUM_DAYS = 10;

export const SOUCHE_REFERENTIAL = {
  'cobb-500': {
    label: 'Cobb 500',
    activity: 'chair',
    gmqTarget: 55,
    /** GMQ théorique (g/j) par jour d'âge — interpolation linéaire entre points. */
    gmqByDay: { 1: 12, 7: 28, 14: 42, 21: 52, 28: 58, 35: 55, 42: 50 },
    icTarget: { min: 1.6, max: 1.9 },
  },
  'ross-308': {
    label: 'Ross 308',
    activity: 'chair',
    gmqTarget: 54,
    gmqByDay: { 1: 11, 7: 27, 14: 41, 21: 51, 28: 57, 35: 54, 42: 49 },
    icTarget: { min: 1.6, max: 1.9 },
  },
  'novogen-brown': {
    label: 'Novogen Brown',
    activity: 'pondeuse',
    peakLayingPct: 88,
    /** Taux ponte théorique (%) par semaine d'âge. */
    layingByWeek: { 18: 5, 20: 45, 24: 75, 28: 86, 32: 88, 40: 88, 48: 85, 60: 80, 72: 72, 80: 65 },
  },
  'lohmann-brown': {
    label: 'Lohmann Brown',
    activity: 'pondeuse',
    peakLayingPct: 92,
    layingByWeek: { 18: 5, 20: 48, 24: 78, 28: 90, 32: 92, 40: 91, 48: 88, 60: 82, 72: 74, 80: 68 },
  },
  'isa-brown': {
    label: 'ISA Brown',
    activity: 'pondeuse',
    peakLayingPct: 90,
    layingByWeek: { 18: 5, 20: 46, 24: 76, 28: 88, 32: 90, 40: 89, 48: 86, 60: 80, 72: 73, 80: 66 },
  },
  'goba': {
    label: 'Goba / croisement local',
    activity: 'bovin',
    gmqTarget: 850,
    gmqByDay: { 30: 650, 60: 780, 90: 850, 120: 900, 180: 950, 270: 880 },
  },
  'broutard-local': {
    label: 'Broutard local',
    activity: 'bovin',
    gmqTarget: 800,
    gmqByDay: { 30: 600, 60: 720, 90: 800, 120: 850, 180: 900, 270: 820 },
  },
};

const lower = (v = '') => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export function listSoucheOptions() {
  return Object.entries(SOUCHE_REFERENTIAL).map(([code, row]) => ({ value: code, label: row.label, activity: row.activity }));
}

/** Résout le code souche depuis un lot ou animal. */
export function resolveSoucheCode(entity = {}) {
  const explicit = lower(entity.code_souche || entity.souche_code || '');
  if (explicit && SOUCHE_REFERENTIAL[explicit]) return explicit;
  const raw = lower(`${entity.souche || ''} ${entity.strain || ''} ${entity.race || ''} ${entity.type || ''}`);
  if (raw.includes('cobb')) return 'cobb-500';
  if (raw.includes('ross')) return 'ross-308';
  if (raw.includes('lohmann')) return 'lohmann-brown';
  if (raw.includes('isa')) return 'isa-brown';
  if (raw.includes('novogen')) return 'novogen-brown';
  if (raw.includes('goba')) return 'goba';
  const type = lower(entity.type || entity.espece || '');
  if (type.includes('pondeuse') || type.includes('ponde')) return 'novogen-brown';
  if (type.includes('chair') || type.includes('poulet')) return 'cobb-500';
  if (type.includes('bovin') || type.includes('embouche')) return 'goba';
  return null;
}

function interpolateCurve(curve = {}, age) {
  const points = Object.keys(curve).map(Number).sort((a, b) => a - b);
  if (!points.length) return 0;
  if (age <= points[0]) return curve[points[0]];
  if (age >= points[points.length - 1]) return curve[points[points.length - 1]];
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    if (age >= a && age <= b) {
      const ratio = (age - a) / Math.max(1, b - a);
      return curve[a] + (curve[b] - curve[a]) * ratio;
    }
  }
  return curve[points[points.length - 1]];
}

export function theoreticalLayingPct(soucheCode, ageWeeks) {
  const ref = SOUCHE_REFERENTIAL[soucheCode];
  if (!ref?.layingByWeek) return 0;
  return interpolateCurve(ref.layingByWeek, ageWeeks);
}

export function theoreticalGmq(soucheCode, ageDays) {
  const ref = SOUCHE_REFERENTIAL[soucheCode];
  if (!ref?.gmqByDay) return ref?.gmqTarget || 0;
  return interpolateCurve(ref.gmqByDay, ageDays);
}
