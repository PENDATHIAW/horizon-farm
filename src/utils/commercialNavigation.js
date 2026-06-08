import { ROUTE_TO_MODULE } from '../config/modules.config.js';

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

export const ELEVAGE_TABS = ['Résumé', 'Cycles', 'Animaux', 'Avicole', 'Alimentation', 'Santé', 'Reproduction', 'Production', 'Transformation', 'Annexe', 'Graphiques'];
export const ACHATS_STOCK_TABS = ['Résumé', 'Stock', 'Achats', 'Fournisseurs', 'Mouvements', 'Annexe', 'Graphiques'];
export const COMMERCIAL_TABS = ['Résumé', 'Ventes', 'Clients', 'Livraisons', 'Abonnements', 'Relances', 'Opportunités', 'Pilotage', 'Annexe', 'Graphiques'];
export const ACTIVITE_SUIVI_TABS = ['Résumé', 'Alertes', 'Tâches', 'Traçabilité', 'Graphiques'];
export const FINANCE_TABS = ['Résumé', 'Trésorerie', 'Créances', 'Dettes', 'Échéancier', 'Financement', 'Réconciliation', 'Investissements', 'Rentabilité', 'Annexe', 'Graphiques'];

const tabAliases = {
  avicole: 'Avicole',
  animaux: 'Animaux',
  stock: 'Stock',
  achats: 'Achats',
  fournisseurs: 'Fournisseurs',
  mouvements: 'Mouvements',
  ventes: 'Ventes',
  devis: 'Ventes',
  clients: 'Clients',
  prospects: 'Clients',
  livraisons: 'Livraisons',
  livraison: 'Livraisons',
  abonnements: 'Abonnements',
  abonnement: 'Abonnements',
  relances: 'Relances',
  relance: 'Relances',
  pilotage: 'Pilotage',
  reconciliation: 'Pilotage',
  opportunites: 'Opportunités',
  opportunities: 'Opportunités',
  graphiques: 'Graphiques',
  cycles: 'Cycles',
  cycle: 'Cycles',
  bandes: 'Cycles',
  resume: 'Résumé',
  creances: 'Créances',
  dettes: 'Dettes',
  tresorerie: 'Trésorerie',
  investissements: 'Investissements',
  rentabilite: 'Rentabilité',
  annexe: 'Annexe',
  couts: 'Annexe',
  cout: 'Annexe',
  alertes: 'Alertes',
  taches: 'Tâches',
  tracabilite: 'Traçabilité',
  activite: 'Résumé',
  suivi: 'Résumé',
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

export function resolveCommercialTab(value = '') {
  const tab = String(value || '').trim();
  if (COMMERCIAL_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveFinanceTab(value = '') {
  const tab = String(value || '').trim();
  if (FINANCE_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveActiviteSuiviTab(value = '') {
  const tab = String(value || '').trim();
  if (ACTIVITE_SUIVI_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

/** Résout un identifiant legacy (ventes, finances, stock…) vers le grand module ERP. */
export function resolveRouteModule(moduleId = '') {
  return ROUTE_TO_MODULE[moduleId] || moduleId;
}

/** Onglet par défaut quand on entre via un alias legacy. */
export function defaultTabForLegacyModule(moduleId = '') {
  if (moduleId === 'clients') return 'Clients';
  if (moduleId === 'ventes' || moduleId === 'sales_orders') return 'Ventes';
  if (moduleId === 'sales_opportunities') return 'Opportunités';
  if (moduleId === 'animaux') return 'Animaux';
  if (moduleId === 'avicole') return 'Avicole';
  if (moduleId === 'sante') return 'Santé';
  if (moduleId === 'stock') return 'Stock';
  if (moduleId === 'fournisseurs') return 'Fournisseurs';
  if (moduleId === 'finances') return 'Trésorerie';
  if (moduleId === 'investissements') return 'Investissements';
  if (moduleId === 'payments') return 'Créances';
  if (moduleId === 'invoices') return 'Ventes';
  if (moduleId === 'deliveries') return 'Livraisons';
  return null;
}

const SEARCH_KEY_TO_MODULE = {
  sales_orders: { module: 'commercial', tab: 'Ventes' },
  sales_order_items: { module: 'commercial', tab: 'Ventes' },
  sales_opportunities: { module: 'commercial', tab: 'Opportunités' },
  invoices: { module: 'commercial', tab: 'Ventes' },
  deliveries: { module: 'commercial', tab: 'Livraisons' },
  clients: { module: 'commercial', tab: 'Clients' },
  payments: { module: 'finance_pilotage', tab: 'Créances' },
  finances: { module: 'finance_pilotage', tab: 'Trésorerie' },
  stock: { module: 'achats_stock', tab: 'Stock' },
  fournisseurs: { module: 'achats_stock', tab: 'Fournisseurs' },
  animaux: { module: 'elevage', tab: 'Animaux' },
  avicole: { module: 'elevage', tab: 'Avicole' },
  sante: { module: 'elevage', tab: 'Santé' },
  alimentation_logs: { module: 'achats_stock', tab: 'Mouvements' },
  taches: { module: 'activite_suivi', tab: null },
  alertes_center: { module: 'activite_suivi', tab: null },
  documents: { module: 'documents_rapports', tab: null },
  rapports: { module: 'documents_rapports', tab: null },
  investissements: { module: 'finance_pilotage', tab: 'Investissements' },
  business_plans: { module: 'objectifs_croissance', tab: null },
};

/** Cible de navigation pour un résultat de recherche ERP (clé dataMap). */
export function resolveSearchNavigation(moduleKey = '') {
  const mapped = SEARCH_KEY_TO_MODULE[moduleKey];
  if (mapped) return mapped;
  const module = resolveRouteModule(moduleKey);
  const tab = defaultTabForLegacyModule(moduleKey);
  return { module, tab };
}

/** Module + onglet pour une recommandation IA / finding ERP. */
export function navigationOptionsForFinding(finding = {}) {
  const rawModule = finding.module || finding.module_target || 'objectifs_croissance';
  const module = resolveRouteModule(rawModule);
  const explicitTab = finding.tab || finding.commercial_tab || finding.finance_tab;

  if (module === 'commercial') {
    const tab = explicitTab
      || (String(finding.title || '').toLowerCase().includes('relancer') ? 'Clients' : 'Ventes');
    return { module, tab: resolveCommercialTab(tab) };
  }
  if (module === 'finance_pilotage') {
    return { module, tab: resolveFinanceTab(explicitTab || defaultTabForLegacyModule(rawModule) || 'Créances') };
  }
  if (module === 'elevage') {
    return { module, tab: resolveElevageTab(explicitTab || defaultTabForLegacyModule(rawModule) || 'Résumé') };
  }
  if (module === 'achats_stock') {
    return { module, tab: resolveAchatsStockTab(explicitTab || defaultTabForLegacyModule(rawModule) || 'Résumé') };
  }
  return { module, tab: explicitTab || null };
}

/** Bouton « Voir » dans un panneau IA multi-modules. */
export function navigateForIaFinding(finding = {}, onNavigate) {
  if (!onNavigate) return;
  const module = resolveRouteModule(finding.module || '');
  if (module === 'commercial') {
    onNavigate('commercial', { tab: resolveCommercialTab(finding.tab || 'Ventes') });
    return;
  }
  if (module === 'finance_pilotage') {
    onNavigate('finance_pilotage', { tab: resolveFinanceTab(finding.tab || 'Créances') });
    return;
  }
  if (module === 'achats_stock') {
    onNavigate('achats_stock', { tab: resolveAchatsStockTab(finding.tab || 'Stock') });
    return;
  }
  if (module === 'elevage') {
    onNavigate('elevage', { tab: resolveElevageTab(finding.tab || 'Résumé') });
    return;
  }
  onNavigate(module || 'elevage');
}
