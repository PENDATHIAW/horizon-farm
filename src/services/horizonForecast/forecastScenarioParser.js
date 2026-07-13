/**
 * Parse les questions projet Horizon Forecast en scénarios structurés.
 */

const low = (v) => String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const FORECAST_SCENARIO_TYPES = {
  BROILER_CHICKS: 'broiler_chicks',
  CATTLE_PURCHASE: 'cattle_purchase',
  BUILDING_EXPANSION: 'building_expansion',
  LAYER_INCREASE: 'layer_increase',
  BROILER_BAND: 'broiler_band',
  GENERIC: 'generic',
};

const SCENARIO_PATTERNS = [
  {
    type: FORECAST_SCENARIO_TYPES.BROILER_CHICKS,
    patterns: [/poussin/, /lancer.*chair/, /bande.*chair/, /1000.*poulet/, /poulets.*chair/],
    defaultLabel: 'Lancement poussins chair',
  },
  {
    type: FORECAST_SCENARIO_TYPES.CATTLE_PURCHASE,
    patterns: [/bovin/, /vache/, /veau/, /acheter.*bov/, /embouche.*bov/],
    defaultLabel: 'Achat bovins',
  },
  {
    type: FORECAST_SCENARIO_TYPES.BUILDING_EXPANSION,
    patterns: [/batiment/, /bâtiment/, /agrandir/, /construction/, /hangar/, /poulailler/],
    defaultLabel: 'Agrandissement bâtiment',
  },
  {
    type: FORECAST_SCENARIO_TYPES.LAYER_INCREASE,
    patterns: [/pondeuse/, /pondeuses/, /augmenter.*pondeuse/, /production.*oeuf/, /œuf/],
    defaultLabel: 'Augmentation pondeuses',
  },
  {
    type: FORECAST_SCENARIO_TYPES.BROILER_BAND,
    patterns: [/nouvelle bande/, /rentab.*bande/, /rentab.*chair/, /cycle.*chair/],
    defaultLabel: 'Nouvelle bande chair',
  },
];

function extractQuantity(text) {
  const q = low(text);
  const match = q.match(/(\d[\d\s.,]*)\s*(poussin|sujet|bovin|vache|tête|tete|pondeuse|sujets|m2|m²|sac)/);
  if (match) {
    const n = Number(String(match[1]).replace(/\s/g, '').replace(',', '.'));
    if (Number.isFinite(n) && n > 0) return Math.round(n);
  }
  const plain = q.match(/\b(\d{2,5})\b/);
  if (plain) return Number(plain[1]);
  return null;
}

function extractHorizonMonths(text) {
  const q = low(text);
  if (/mois prochain|prochain mois/.test(q)) return 1;
  if (/dans\s+(\d+)\s+mois/.test(q)) {
    const m = q.match(/dans\s+(\d+)\s+mois/);
    return Number(m[1]) || 1;
  }
  if (/ce mois|ce mois-ci/.test(q)) return 0;
  return 1;
}

function matchScenario(text) {
  const q = low(text);
  for (const entry of SCENARIO_PATTERNS) {
    if (entry.patterns.some((p) => p.test(q))) return entry;
  }
  return { type: FORECAST_SCENARIO_TYPES.GENERIC, defaultLabel: 'Projet à évaluer', patterns: [] };
}

/**
 * @returns {{
 *   phrase: string,
 *   scenarioType: string,
 *   label: string,
 *   quantity: number|null,
 *   horizonMonths: number,
 *   rentabilityQuestion: boolean,
 * }}
 */
export function parseForecastScenario(phrase = '') {
  const text = String(phrase || '').trim();
  const matched = matchScenario(text);
  const quantity = extractQuantity(text);
  const horizonMonths = extractHorizonMonths(text);
  const rentabilityQuestion = /rentab|rentable|marge|roi|retour/.test(low(text));

  return {
    phrase: text,
    scenarioType: matched.type,
    label: matched.defaultLabel,
    quantity,
    horizonMonths,
    rentabilityQuestion,
  };
}

export function defaultQuantityForScenario(scenarioType) {
  switch (scenarioType) {
    case FORECAST_SCENARIO_TYPES.BROILER_CHICKS:
    case FORECAST_SCENARIO_TYPES.BROILER_BAND:
      return 1000;
    case FORECAST_SCENARIO_TYPES.CATTLE_PURCHASE:
      return 10;
    case FORECAST_SCENARIO_TYPES.LAYER_INCREASE:
      return 1000;
    default:
      return null;
  }
}

export function resolveScenarioQuantity(parsed = {}) {
  if (parsed.quantity > 0) return parsed.quantity;
  return defaultQuantityForScenario(parsed.scenarioType);
}

export default parseForecastScenario;
