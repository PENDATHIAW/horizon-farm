import { classifyStockRow } from './productionStockCatalog.js';

export const EGG_STOCK_CONTEXT_MESSAGE =
  'Stock généré par la production d\'œufs : vérifiez les œufs disponibles, tablettes et mouvements associés.';

export const EGG_STOCK_SEARCH_TERMS = ['œufs', 'oeufs', 'tablettes', 'plateau', 'alvéole', 'alveole'];

/** Ouvre Élevage → Cycles avec une question présélectionnée (source opérationnelle unique). */
export function launchProductionQuestion({
  questionId,
  onNavigate,
} = {}) {
  onNavigate?.('elevage', { tab: 'Cycles & Reproduction', productionQuestion: questionId });
  window.setTimeout(() => {
    window.dispatchEvent(new CustomEvent('horizon-production-question', {
      detail: { questionId, moduleId: 'elevage' },
    }));
  }, 280);
}

/** Ouvre le pilotage stratégique (objectifs, performance, risques). */
export function launchPilotageModule({
  moduleId = 'centre_ia',
  tab = 'Rentabilité lots',
  onNavigate,
} = {}) {
  onNavigate?.(moduleId, { tab });
}

/** Navigation contextualisée Élevage > Production → Achats & Stock > Stock (œufs/tablettes). */
export function navigateToEggStock(onNavigate) {
  onNavigate?.('achats_stock', {
    tab: 'Stock',
    stockContext: 'oeufs',
    searchContext: EGG_STOCK_SEARCH_TERMS.join(' '),
    contextMessage: EGG_STOCK_CONTEXT_MESSAGE,
  });
}

export function navigateToFeedStock(onNavigate) {
  onNavigate?.('achats_stock', {
    tab: 'Stock',
    stockContext: 'aliment',
    searchContext: 'aliment feed provende',
    contextMessage: 'Intrants alimentaires consommés par l\'élevage — gérés dans Achats & Stock.',
  });
}

export function stockRowMatchesContext(row = {}, stockContext = '') {
  const ctx = String(stockContext || '').toLowerCase();
  if (!ctx) return true;
  const kind = classifyStockRow(row);
  if (ctx === 'oeufs' || ctx === 'oeuf' || ctx === 'tablettes') return kind === 'oeufs';
  if (ctx === 'aliment' || ctx === 'feed') return kind === 'aliment';
  if (ctx === 'viande_avicole') return kind === 'viande_avicole';
  if (ctx === 'viande_animale' || ctx === 'viande') return kind === 'viande_animale';
  if (ctx === 'sante' || ctx === 'medicament' || ctx === 'vaccin' || ctx === 'veterinaire') {
    const hay = `${row.produit || ''} ${row.nom || ''} ${row.categorie || ''} ${row.category || ''}`.toLowerCase();
    return /vaccin|medic|médic|antibio|vitamin|vermifuge|soin|veterinaire|vétérinaire|traitement|desinfectant|désinfectant/.test(hay);
  }
  return false;
}

export function filterStocksByContext(rows = [], stockContext = '', searchContext = '') {
  const ctx = String(stockContext || '').toLowerCase();
  let filtered = Array.isArray(rows) ? rows : [];
  if (ctx) {
    filtered = filtered.filter((row) => stockRowMatchesContext(row, ctx));
  }
  const terms = String(searchContext || '')
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length) {
    filtered = filtered.filter((row) => {
      const hay = `${row.produit || ''} ${row.nom || ''} ${row.categorie || ''} ${row.category || ''}`.toLowerCase();
      return terms.some((term) => hay.includes(term));
    });
  }
  return filtered;
}
