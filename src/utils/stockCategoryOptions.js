import { CIRCULAR_STOCK_CATEGORY_OPTIONS } from '../config/derfjGreenpreneurs.config.js';

/** Catégories stock de base (hors circulaire). */
export const BASE_STOCK_CATEGORY_OPTIONS = [
  { value: 'aliment_betail', label: 'Aliment bétail' },
  { value: 'aliment_avicole', label: 'Aliment avicole' },
  { value: 'semences', label: 'Semences' },
  { value: 'engrais', label: 'Engrais / fertilisants' },
  { value: 'phytosanitaire', label: 'Produits phytosanitaires' },
  { value: 'vaccin', label: 'Vaccins' },
  { value: 'medicament', label: 'Médicaments / soins' },
  { value: 'materiel', label: 'Matériel / consommables' },
  { value: 'emballage', label: 'Emballages' },
  { value: 'recolte', label: 'Produits récoltés' },
  { value: 'carburant', label: 'Carburant / énergie' },
  { value: 'autre', label: 'Autre' },
];

/** Liste complète pour formulaires stock (base + économie circulaire). */
export function getStockCategoryOptions() {
  const seen = new Set();
  return [...BASE_STOCK_CATEGORY_OPTIONS, ...CIRCULAR_STOCK_CATEGORY_OPTIONS].filter((row) => {
    if (seen.has(row.value)) return false;
    seen.add(row.value);
    return true;
  });
}

export const STOCK_CATEGORY_OPTIONS = getStockCategoryOptions();
