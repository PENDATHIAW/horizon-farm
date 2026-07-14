/**
 * Achats & Stock V2 - registre unités agricoles partagé (Stock + Commercial).
 */

import {
  COMMERCIAL_UNIT_GROUPS,
  formatCommercialUnit,
  normalizeCommercialUnit,
  unitLabel,
  unitsForProductType,
} from './commercialUnits.js';
import { toNumber } from './format.js';

export { COMMERCIAL_UNIT_GROUPS, formatCommercialUnit, normalizeCommercialUnit, unitLabel, unitsForProductType };

export const EGGS_PER_TABLET = 30;
export const EGGS_PER_PLATEAU = 30;
export const EGGS_PER_ALVEOLE = 1;

export const AGRICULTURAL_UNIT_GROUPS = {
  oeufs: ['unité', 'unite', 'tablette', 'plateau', 'alvéole', 'alveole', 'caisse', 'œuf', 'oeuf'],
  poulets: ['tête', 'tete', 'kg', 'poulet entier', 'poulet abattu'],
  bovins: ['tête', 'tete', 'kg vif', 'carcasse', 'kg viande', 'kg'],
  cultures: ['kg', 'botte', 'sac', 'caisse', 'panier'],
  intrants: ['sac', 'kg', 'litre', 'bidon', 'dose', 'boîte', 'boite', 'carton'],
  surfaces: ['m²', 'm2', 'hectare', 'ha'],
};

/** Conversions œufs connues et fiables (alignées Commercial V3). */
export const EGG_UNIT_CONVERSIONS = {
  unite: 1,
  unité: 1,
  oeuf: 1,
  œuf: 1,
  alveole: EGGS_PER_ALVEOLE,
  alvéole: EGGS_PER_ALVEOLE,
  tablette: EGGS_PER_TABLET,
  plateau: EGGS_PER_PLATEAU,
};

const clean = (value) => String(value || '').trim().toLowerCase();

export function unitsForStockCategory(category = '') {
  const cat = clean(category);
  if (cat.includes('oeuf') || cat.includes('emballage')) return AGRICULTURAL_UNIT_GROUPS.oeufs;
  if (cat.includes('aliment') || cat.includes('intrant') || cat.includes('semence') || cat.includes('engrais') || cat.includes('phyto')) {
    return AGRICULTURAL_UNIT_GROUPS.intrants;
  }
  if (cat.includes('recolte') || cat.includes('récolte') || cat.includes('culture')) return AGRICULTURAL_UNIT_GROUPS.cultures;
  if (cat.includes('viande') && cat.includes('bovin')) return AGRICULTURAL_UNIT_GROUPS.bovins;
  if (cat.includes('viande') || cat.includes('avicole')) return AGRICULTURAL_UNIT_GROUPS.poulets;
  return [...AGRICULTURAL_UNIT_GROUPS.intrants, ...AGRICULTURAL_UNIT_GROUPS.cultures];
}

export function normalizeAgriculturalUnit(unit = '', context = '') {
  const normalized = normalizeCommercialUnit(unit, context);
  const u = clean(normalized);
  const all = Object.values(AGRICULTURAL_UNIT_GROUPS).flat();
  const match = all.find((item) => clean(item) === u);
  return match || normalized || 'unité';
}

/** Convertit une quantité œufs vers unité cible si conversion connue. */
export function convertEggQuantity(quantity = 0, fromUnit = '', toUnit = 'unité') {
  const qty = toNumber(quantity);
  const from = clean(fromUnit);
  const to = clean(toUnit);
  if (!qty || from === to) return qty;
  const fromFactor = EGG_UNIT_CONVERSIONS[from];
  const toFactor = EGG_UNIT_CONVERSIONS[to];
  if (!fromFactor || !toFactor) return null;
  const eggs = qty * fromFactor;
  return eggs / toFactor;
}

export function formatAgriculturalUnit(quantity = 0, unit = '') {
  const labelText = unitLabel(unit);
  const qty = toNumber(quantity);
  return `${qty} ${labelText}`;
}

export function isKnownEggConversion(fromUnit = '', toUnit = '') {
  const from = clean(fromUnit);
  const to = clean(toUnit);
  return Boolean(EGG_UNIT_CONVERSIONS[from] && EGG_UNIT_CONVERSIONS[to]);
}
