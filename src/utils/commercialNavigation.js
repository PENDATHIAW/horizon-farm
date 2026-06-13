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

export const ELEVAGE_TABS = ['Lots & bandes', 'Cycles & Reproduction', 'Santé', 'Transformation'];

const ELEVAGE_TAB_ALIASES = {
  Résumé: 'Lots & bandes',
  resume: 'Lots & bandes',
  Cycles: 'Cycles & Reproduction',
  cycles: 'Cycles & Reproduction',
  cycle: 'Cycles & Reproduction',
  'Cycles & Reproduction': 'Cycles & Reproduction',
  Animaux: 'Lots & bandes',
  animaux: 'Lots & bandes',
  Avicole: 'Lots & bandes',
  avicole: 'Lots & bandes',
  Alimentation: 'Lots & bandes',
  alimentation: 'Lots & bandes',
  Production: 'Lots & bandes',
  production: 'Lots & bandes',
  Reproduction: 'Cycles & Reproduction',
  reproduction: 'Cycles & Reproduction',
  Santé: 'Santé',
  Sante: 'Santé',
  sante: 'Santé',
  Transformation: 'Transformation',
  transformation: 'Transformation',
  Annexe: 'Lots & bandes',
  annexe: 'Lots & bandes',
  Graphiques: 'Lots & bandes',
  graphiques: 'Lots & bandes',
  bandes: 'Lots & bandes',
  'Lots & bandes': 'Lots & bandes',
};

const ELEVAGE_LOTS_SUBVIEW_KEYS = new Set(['Avicole', 'avicole', 'Animaux', 'animaux']);
export const ACHATS_STOCK_TABS = ['Inventaire', 'Réceptions & achats', 'Fournisseurs & dettes'];
export const COMMERCIAL_TABS = ['Ventes', 'Opportunités', 'Clients & créances', 'Livraisons', 'Abonnements', 'Pilotage'];

const ACHATS_STOCK_TAB_ALIASES = {
  Résumé: 'Inventaire',
  resume: 'Inventaire',
  Stock: 'Inventaire',
  stock: 'Inventaire',
  Inventaire: 'Inventaire',
  inventaire: 'Inventaire',
  Achats: 'Réceptions & achats',
  achats: 'Réceptions & achats',
  'Réceptions & achats': 'Réceptions & achats',
  'Receptions & achats': 'Réceptions & achats',
  receptions: 'Réceptions & achats',
  Fournisseurs: 'Fournisseurs & dettes',
  fournisseurs: 'Fournisseurs & dettes',
  'Fournisseurs & dettes': 'Fournisseurs & dettes',
  Mouvements: 'Inventaire',
  mouvements: 'Inventaire',
  Annexe: 'Inventaire',
  annexe: 'Inventaire',
  Graphiques: 'Inventaire',
  graphiques: 'Inventaire',
};

const COMMERCIAL_TAB_ALIASES = {
  Résumé: 'Pilotage',
  resume: 'Pilotage',
  Ventes: 'Ventes',
  ventes: 'Ventes',
  Clients: 'Clients & créances',
  clients: 'Clients & créances',
  'Clients & créances': 'Clients & créances',
  'Clients & creances': 'Clients & créances',
  creances: 'Clients & créances',
  Livraisons: 'Livraisons',
  livraisons: 'Livraisons',
  livraison: 'Livraisons',
  Abonnements: 'Abonnements',
  abonnements: 'Abonnements',
  abonnement: 'Abonnements',
  Relances: 'Clients & créances',
  relances: 'Clients & créances',
  relance: 'Clients & créances',
  Opportunités: 'Opportunités',
  opportunites: 'Opportunités',
  opportunities: 'Opportunités',
  Abonnements: 'Abonnements',
  abonnements: 'Abonnements',
  abonnement: 'Abonnements',
  Pilotage: 'Pilotage',
  pilotage: 'Pilotage',
  Annexe: 'Ventes',
  annexe: 'Ventes',
  Graphiques: 'Ventes',
  graphiques: 'Ventes',
  devis: 'Ventes',
  prospects: 'Clients & créances',
};
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
  opportunites: 'Opportunités',
  opportunities: 'Opportunités',
  graphiques: 'Graphiques',
  bandes: 'Lots & bandes',
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

export function resolveElevageLotsSubview(value = '') {
  const tab = String(value || '').trim();
  if (tab === 'Avicole' || lower(tab) === 'avicole') return 'avicole';
  if (tab === 'Animaux' || lower(tab) === 'animaux') return 'animaux';
  if (ELEVAGE_LOTS_SUBVIEW_KEYS.has(tab)) return lower(tab);
  return null;
}

export function resolveElevageTab(value = '') {
  const tab = String(value || '').trim();
  if (ELEVAGE_TABS.includes(tab)) return tab;
  const fromElevage = ELEVAGE_TAB_ALIASES[tab] || ELEVAGE_TAB_ALIASES[lower(tab)];
  if (fromElevage) return fromElevage;
  const fromGeneric = tabAliases[lower(tab)];
  if (fromGeneric && ELEVAGE_TABS.includes(fromGeneric)) return fromGeneric;
  return 'Lots & bandes';
}

export function resolveAchatsStockTab(value = '') {
  const tab = String(value || '').trim();
  if (ACHATS_STOCK_TABS.includes(tab)) return tab;
  const fromAlias = ACHATS_STOCK_TAB_ALIASES[tab] || ACHATS_STOCK_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return tabAliases[lower(tab)] || 'Inventaire';
}

/** Alias commercial → redirection module Finance (réconciliation canonique). */
export function isCommercialReconciliationAlias(value = '') {
  return lower(value) === 'reconciliation';
}

export function resolveCommercialTab(value = '') {
  const tab = String(value || '').trim();
  if (COMMERCIAL_TABS.includes(tab)) return tab;
  if (isCommercialReconciliationAlias(tab)) return 'Ventes';
  const fromAlias = COMMERCIAL_TAB_ALIASES[tab] || COMMERCIAL_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return tabAliases[lower(tab)] || 'Ventes';
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

export const DOCUMENTS_RAPPORTS_TABS = ['Résumé', 'Bibliothèque', 'Preuves', 'Rapports', 'Exports', 'Modèles', 'Graphiques'];
export const RH_TABS = ['Résumé', 'Équipements', 'Maintenance', 'Affectations', 'Coûts', 'Documents', 'Graphiques'];
export const SMARTFARM_TABS = ['Résumé', 'Capteurs', 'Caméras', 'Annexe', 'Graphiques'];
export const CULTURES_TABS = ['Parcelles & campagnes', 'Récoltes', 'Économie circulaire'];

const CULTURES_TAB_ALIASES = {
  Pilotage: 'Parcelles & campagnes',
  pilotage: 'Parcelles & campagnes',
  Cycles: 'Parcelles & campagnes',
  cycles: 'Parcelles & campagnes',
  'Parcelles & Cultures': 'Parcelles & campagnes',
  'Parcelles & campagnes': 'Parcelles & campagnes',
  parcelles: 'Parcelles & campagnes',
  'Intrants & Météo': 'Parcelles & campagnes',
  intrants: 'Parcelles & campagnes',
  'Santé & Protection': 'Parcelles & campagnes',
  sante: 'Parcelles & campagnes',
  Récoltes: 'Récoltes',
  recoltes: 'Récoltes',
  Transformation: 'Récoltes',
  transformation: 'Récoltes',
  'Économie circulaire': 'Économie circulaire',
  economie: 'Économie circulaire',
  Annexe: 'Parcelles & campagnes',
  annexe: 'Parcelles & campagnes',
  Graphiques: 'Économie circulaire',
  graphiques: 'Économie circulaire',
  'Vue d’ensemble': 'Parcelles & campagnes',
  'Vue d\'ensemble': 'Parcelles & campagnes',
  Résumé: 'Parcelles & campagnes',
  resume: 'Parcelles & campagnes',
  Cultures: 'Parcelles & campagnes',
  Campagnes: 'Parcelles & campagnes',
  Performance: 'Économie circulaire',
};
export const DASHBOARD_TABS = ['Résumé', 'Graphiques'];
export const INVESTISSEURS_TABS = ['room', 'preparation', 'dossier', 'library', 'crm', 'preview', 'export', 'history', 'demo'];

export function resolveDocumentsTab(value = '') {
  const tab = String(value || '').trim();
  if (DOCUMENTS_RAPPORTS_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveRhTab(value = '') {
  const tab = String(value || '').trim();
  if (RH_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveSmartFarmTab(value = '') {
  const tab = String(value || '').trim();
  if (SMARTFARM_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveCulturesTab(value = '') {
  const tab = String(value || '').trim();
  if (CULTURES_TABS.includes(tab)) return tab;
  const fromAlias = CULTURES_TAB_ALIASES[tab] || CULTURES_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  if (lower(tab) === 'resume') return 'Parcelles & campagnes';
  return tabAliases[lower(tab)] || 'Parcelles & campagnes';
}

export function resolveDashboardTab(value = '') {
  const tab = String(value || '').trim();
  if (DASHBOARD_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'Résumé';
}

export function resolveInvestisseursTab(value = '') {
  const tab = String(value || '').trim();
  if (INVESTISSEURS_TABS.includes(tab)) return tab;
  return tabAliases[lower(tab)] || 'room';
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
  animaux: { module: 'elevage', tab: 'Lots & bandes' },
  avicole: { module: 'elevage', tab: 'Lots & bandes' },
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
    return { module, tab: resolveElevageTab(explicitTab || defaultTabForLegacyModule(rawModule) || 'Lots & bandes') };
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
    onNavigate('elevage', { tab: resolveElevageTab(finding.tab || 'Lots & bandes') });
    return;
  }
  onNavigate(module || 'elevage');
}
