/**
 * Commercial V3 - unités agricoles normalisées.
 */

const clean = (value) => String(value || '').trim().toLowerCase();

export const COMMERCIAL_UNIT_GROUPS = {
  oeufs: ['unité', 'unite', 'tablette', 'plateau', 'alvéole', 'alveole', 'caisse', 'œuf', 'oeuf'],
  poulets: ['tête', 'tete', 'kg', 'poulet entier', 'poulet abattu', 'unité', 'unite'],
  bovins: ['tête', 'tete', 'kg vif', 'carcasse', 'kg viande', 'kg'],
  cultures: ['kg', 'botte', 'sac', 'caisse', 'panier', 'unité', 'unite'],
  generic: ['unité', 'unite', 'kg', 'forfait', 'lot'],
};

export function unitsForProductType(sourceType = '') {
  const type = clean(sourceType);
  if (type.includes('lot') || type.includes('avicole') || type.includes('oeuf')) return COMMERCIAL_UNIT_GROUPS.oeufs;
  if (type.includes('animal') || type.includes('bovin') || type.includes('ovin')) return COMMERCIAL_UNIT_GROUPS.bovins;
  if (type === 'stock') return [...COMMERCIAL_UNIT_GROUPS.poulets, ...COMMERCIAL_UNIT_GROUPS.cultures];
  if (type.includes('culture') || type.includes('recolte')) return COMMERCIAL_UNIT_GROUPS.cultures;
  if (type.includes('service')) return ['forfait', 'prestation', 'heure'];
  return COMMERCIAL_UNIT_GROUPS.generic;
}

export function formatCommercialUnit(quantity = 0, unit = '') {
  const qty = Number(quantity || 0);
  const u = clean(unit) || 'unité';
  return `${qty} ${u}`;
}

export function normalizeCommercialUnit(unit = '', sourceType = '') {
  const u = clean(unit);
  if (!u) return unitsForProductType(sourceType)[0] || 'unité';
  const all = Object.values(COMMERCIAL_UNIT_GROUPS).flat();
  const match = all.find((item) => clean(item) === u || u.includes(clean(item)));
  return match || unit;
}

export function unitLabel(unit = '') {
  const map = {
    tablette: 'Tablette (30 œufs)',
    plateau: 'Plateau',
    alveole: 'Alvéole',
    'kg vif': 'Kg vif',
    carcasse: 'Carcasse',
    'kg viande': 'Kg viande',
    botte: 'Botte',
    sac: 'Sac',
    caisse: 'Caisse',
    panier: 'Panier',
    forfait: 'Forfait',
  };
  return map[clean(unit)] || unit || 'unité';
}
