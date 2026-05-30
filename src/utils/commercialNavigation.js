const lower = (value = '') => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Module Horizon à ouvrir selon la source d'une vente / coût. */
export function moduleForSaleSource(order = {}) {
  const source = lower(`${order.source_module || ''} ${order.source_type || ''} ${order.module_lie || ''}`);
  const product = lower(`${order.product_name || ''} ${order.produit || ''}`);
  if (source.includes('avicole') || source.includes('lot') || product.includes('poulet') || product.includes('oeuf') || product.includes('œuf') || product.includes('chair')) {
    return { module: 'elevage', label: 'Élevage / Avicole', tab: 'Avicole' };
  }
  if (source.includes('animal') || product.includes('bovin') || product.includes('ovin') || product.includes('mouton')) {
    return { module: 'elevage', label: 'Élevage / Animaux', tab: 'Animaux' };
  }
  if (source.includes('culture') || source.includes('recolte') || product.includes('legume') || product.includes('tomate')) {
    return { module: 'cultures', label: 'Cultures', tab: null };
  }
  if (source.includes('stock') || order.stock_id || order.source_id?.startsWith('STK')) {
    return { module: 'achats_stock', label: 'Stock', tab: 'Stock' };
  }
  return { module: 'commercial', label: 'Commercial', tab: 'Ventes' };
}

export const ELEVAGE_TABS = ['Résumé', 'Animaux', 'Avicole', 'Alimentation', 'Santé', 'Reproduction', 'Production', 'Transformation', 'Graphiques'];
export const ACHATS_STOCK_TABS = ['Résumé', 'Stock', 'Achats', 'Fournisseurs', 'Mouvements', 'Graphiques'];

const tabAliases = {
  avicole: 'Avicole',
  animaux: 'Animaux',
  stock: 'Stock',
  achats: 'Achats',
  fournisseurs: 'Fournisseurs',
  mouvements: 'Mouvements',
};

export function resolveElevageTab(value = '') {
  const tab = String(value || '').trim();
  if (ELEVAGE_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveAchatsStockTab(value = '') {
  const tab = String(value || '').trim();
  if (ACHATS_STOCK_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export const COMMERCIAL_TABS = ['Résumé', 'Ventes', 'Clients', 'Opportunités', 'Graphiques'];

export function resolveCommercialTab(value = '') {
  const tab = String(value || '').trim();
  return COMMERCIAL_TABS.includes(tab) ? tab : 'Résumé';
}
