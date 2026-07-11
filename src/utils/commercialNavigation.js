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

export { AGRI_FEEDS_TABS } from './agriFeedsNavigation.js';
export { resolveAgriFeedsTab } from './agriFeedsNavigation.js';

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
export const ACTIVITE_SUIVI_TABS = ['Cockpit & décisions', 'À traiter maintenant', 'Registre & traçabilité', 'Performance & analytique'];

const ACTIVITE_SUIVI_TAB_ALIASES = {
  'Cockpit & décisions': 'Cockpit & décisions',
  cockpit: 'Cockpit & décisions',
  Résumé: 'Cockpit & décisions',
  resume: 'Cockpit & décisions',
  'À traiter maintenant': 'À traiter maintenant',
  'A traiter maintenant': 'À traiter maintenant',
  'a traiter maintenant': 'À traiter maintenant',
  'À traiter': 'À traiter maintenant',
  'A traiter': 'À traiter maintenant',
  actions: 'À traiter maintenant',
  Alertes: 'À traiter maintenant',
  alertes: 'À traiter maintenant',
  Tâches: 'À traiter maintenant',
  taches: 'À traiter maintenant',
  'Registre & traçabilité': 'Registre & traçabilité',
  registre: 'Registre & traçabilité',
  Traçabilité: 'Registre & traçabilité',
  tracabilite: 'Registre & traçabilité',
  'Performance & analytique': 'Performance & analytique',
  stats: 'Performance & analytique',
  Graphiques: 'Performance & analytique',
  graphiques: 'Performance & analytique',
  Annexe: 'Performance & analytique',
  annexe: 'Performance & analytique',
  Pilotage: 'Performance & analytique',
  pilotage: 'Performance & analytique',
};
export const FINANCE_TABS = ['Résumé', 'Trésorerie', 'Créances & dettes', 'Pilotage', 'Graphiques'];
export const FINANCE_TREASURY_SUBVIEWS = ['saisie', 'reconciliation'];
export const FINANCE_PILOTAGE_SUBVIEWS = ['echeancier', 'financement', 'investissements', 'rentabilite', 'annexe'];

const FINANCE_TAB_ALIASES = {
  Résumé: 'Résumé',
  resume: 'Résumé',
  Cockpit: 'Résumé',
  cockpit: 'Résumé',
  Trésorerie: 'Trésorerie',
  tresorerie: 'Trésorerie',
  finances: 'Trésorerie',
  Dépenses: 'Trésorerie',
  depenses: 'Trésorerie',
  Dépense: 'Trésorerie',
  depense: 'Trésorerie',
  Créances: 'Créances & dettes',
  creances: 'Créances & dettes',
  Dettes: 'Créances & dettes',
  dettes: 'Créances & dettes',
  'Créances & dettes': 'Créances & dettes',
  Échéancier: 'Pilotage',
  echeancier: 'Pilotage',
  Financement: 'Pilotage',
  financement: 'Pilotage',
  Investissements: 'Pilotage',
  investissements: 'Pilotage',
  Rentabilité: 'Pilotage',
  rentabilite: 'Pilotage',
  Réconciliation: 'Trésorerie',
  reconciliation: 'Trésorerie',
  Annexe: 'Pilotage',
  annexe: 'Pilotage',
  Graphiques: 'Graphiques',
  graphiques: 'Graphiques',
  Pilotage: 'Pilotage',
  pilotage: 'Pilotage',
};

const FINANCE_SUBVIEW_ALIASES = {
  réconciliation: 'reconciliation',
  reconciliation: 'reconciliation',
  saisie: 'saisie',
  flux: 'saisie',
  depenses: 'saisie',
  depense: 'saisie',
  dépenses: 'saisie',
  dépense: 'saisie',
  échéancier: 'echeancier',
  echeancier: 'echeancier',
  financement: 'financement',
  investissements: 'investissements',
  investissement: 'investissements',
  rentabilité: 'rentabilite',
  rentabilite: 'rentabilite',
  annexe: 'annexe',
};

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

/** Navigation externe — conserve Avicole/Animaux pour la sous-vue Lots & bandes. */
export function navigateElevageTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Lots & bandes';
  if (typeof onNavigate === 'function') {
    onNavigate('elevage', { tab: raw, ...options });
  }
  return resolveElevageTab(raw);
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
  const legacy = tabAliases[lower(tab)];
  if (legacy) {
    const fromLegacy = COMMERCIAL_TAB_ALIASES[legacy] || COMMERCIAL_TAB_ALIASES[lower(legacy)];
    if (fromLegacy) return fromLegacy;
    if (COMMERCIAL_TABS.includes(legacy)) return legacy;
  }
  return 'Ventes';
}

export function navigateCommercialTab(onNavigate, tab = '', options = {}) {
  const resolved = resolveCommercialTab(tab || 'Pilotage');
  if (typeof onNavigate === 'function') onNavigate('commercial', { tab: resolved, ...options });
  return resolved;
}

export function resolveFinanceTab(value = '') {
  const tab = String(value || '').trim();
  if (FINANCE_TABS.includes(tab)) return tab;
  const fromAlias = FINANCE_TAB_ALIASES[tab] || FINANCE_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return 'Résumé';
}

/** Résout onglet principal + sous-vue Trésorerie / Pilotage pour deep-links (anciens onglets inclus). */
export function resolveFinanceNavigation(value = '') {
  const raw = String(value || '').trim();
  const tab = resolveFinanceTab(raw);
  const key = lower(raw);
  const subKey = FINANCE_SUBVIEW_ALIASES[key] || key;
  let treasurySubview = null;
  let pilotageSubview = null;

  if (subKey === 'reconciliation') treasurySubview = 'reconciliation';
  if (subKey === 'saisie') treasurySubview = 'saisie';
  if (FINANCE_PILOTAGE_SUBVIEWS.includes(subKey)) pilotageSubview = subKey;

  return { tab, treasurySubview, pilotageSubview };
}

/** Navigation externe — conserve alias sous-vues (Réconciliation, Investissements…). */
export function navigateFinanceTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Résumé';
  if (typeof onNavigate === 'function') {
    onNavigate('finance_pilotage', { tab: raw, ...options });
  }
  return resolveFinanceTab(raw);
}

export function resolveActiviteSuiviTab(value = '') {
  const tab = String(value || '').trim();
  if (ACTIVITE_SUIVI_TABS.includes(tab)) return tab;
  const fromAlias = ACTIVITE_SUIVI_TAB_ALIASES[tab] || ACTIVITE_SUIVI_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return 'Cockpit & décisions';
}

export function resolveActiviteSuiviNavigation(value = '') {
  return { tab: resolveActiviteSuiviTab(value) };
}

/** Navigation externe — conserve alias legacy (Alertes, Traçabilité…). */
export function navigateActiviteSuiviTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Cockpit & décisions';
  if (typeof onNavigate === 'function') {
    onNavigate('activite_suivi', { tab: raw, ...options });
  }
  return resolveActiviteSuiviTab(raw);
}

export const DOCUMENTS_RAPPORTS_TABS = ['Centre de contrôle', 'Gestionnaire & OCR', 'Rapprochement & preuves', 'Rapports & exports'];

const DOCUMENTS_TAB_ALIASES = {
  'Centre de contrôle': 'Centre de contrôle',
  controle: 'Centre de contrôle',
  Résumé: 'Centre de contrôle',
  resume: 'Centre de contrôle',
  'Gestionnaire & OCR': 'Gestionnaire & OCR',
  gestionnaire: 'Gestionnaire & OCR',
  ocr: 'Gestionnaire & OCR',
  Bibliothèque: 'Gestionnaire & OCR',
  bibliotheque: 'Gestionnaire & OCR',
  Modèles: 'Gestionnaire & OCR',
  modeles: 'Gestionnaire & OCR',
  'Rapprochement & preuves': 'Rapprochement & preuves',
  rapprochement: 'Rapprochement & preuves',
  Preuves: 'Rapprochement & preuves',
  preuves: 'Rapprochement & preuves',
  'Rapports & exports': 'Rapports & exports',
  rapports: 'Rapports & exports',
  Exports: 'Rapports & exports',
  exports: 'Rapports & exports',
  Graphiques: 'Rapports & exports',
  graphiques: 'Rapports & exports',
};
export const RH_TABS = ['Cockpit RH & Maintenance', 'Personnel & Paie', 'Parc Matériel & Maintenance', 'Registres & Analyses'];

export const OBJECTIFS_TABS = ['Suivi du Business Plan', 'Efficacité Technique & Zootechnique', 'Simulateur Sandbox', 'Sécurisation des Flux'];

const OBJECTIFS_TAB_ALIASES = {
  Performance: 'Suivi du Business Plan',
  Prévisions: 'Efficacité Technique & Zootechnique',
  Plans: 'Sécurisation des Flux',
  Financeurs: 'Sécurisation des Flux',
  Investisseurs: 'Sécurisation des Flux',
  'Objectifs & Écarts': 'Suivi du Business Plan',
  'Objectifs & Écarts Zootechniques': 'Efficacité Technique & Zootechnique',
  'Croissance économique & Capacités': 'Efficacité Technique & Zootechnique',
  'Tableau de bord graphique': 'Suivi du Business Plan',
  Graphiques: 'Suivi du Business Plan',
  Annexe: 'Suivi du Business Plan',
  'Rentabilité Lot & Cycle': 'Suivi du Business Plan',
  'Efficacité Technique': 'Efficacité Technique & Zootechnique',
  'Flux & Équilibres': 'Sécurisation des Flux',
  'Maraîchage & Diversification': 'Simulateur Sandbox',
  'Suivi du Business Plan': 'Suivi du Business Plan',
  'Efficacité Technique & Zootechnique': 'Efficacité Technique & Zootechnique',
  'Simulateur Sandbox': 'Simulateur Sandbox',
  'Sécurisation des Flux': 'Sécurisation des Flux',
};

export const CENTRE_IA_TABS = ['Urgences & risques', 'Croissance & opportunités', 'Saisons & marchés'];

const CENTRE_IA_TAB_ALIASES = {
  'Urgences & risques': 'Urgences & risques',
  'Croissance & opportunités': 'Croissance & opportunités',
  'Saisons & marchés': 'Saisons & marchés',
  Graphiques: 'Croissance & opportunités',
  Annexe: 'Saisons & marchés',
  Opportunités: 'Croissance & opportunités',
  'Opportunités & cycles': 'Croissance & opportunités',
  Recommandations: 'Croissance & opportunités',
  Historique: 'Saisons & marchés',
  'À traiter': 'Urgences & risques',
  Risques: 'Urgences & risques',
  Cycles: 'Saisons & marchés',
  Efficacité: 'Urgences & risques',
  'Efficacité Technique': 'Croissance & opportunités',
  Priorités: 'Urgences & risques',
  'Priorités & risques': 'Urgences & risques',
  Performance: 'Croissance & opportunités',
  'Rentabilité lots': 'Croissance & opportunités',
  'Flux & stocks': 'Urgences & risques',
  Résumé: 'Urgences & risques',
  resume: 'Urgences & risques',
};

const RH_TAB_ALIASES = {
  'Cockpit RH & Maintenance': 'Cockpit RH & Maintenance',
  cockpit: 'Cockpit RH & Maintenance',
  Résumé: 'Cockpit RH & Maintenance',
  resume: 'Cockpit RH & Maintenance',
  'Personnel & Paie': 'Personnel & Paie',
  personnel: 'Personnel & Paie',
  paie: 'Personnel & Paie',
  Affectations: 'Personnel & Paie',
  affectations: 'Personnel & Paie',
  Coûts: 'Personnel & Paie',
  couts: 'Personnel & Paie',
  cout: 'Personnel & Paie',
  'Parc Matériel & Maintenance': 'Parc Matériel & Maintenance',
  parc: 'Parc Matériel & Maintenance',
  Équipements: 'Parc Matériel & Maintenance',
  equipements: 'Parc Matériel & Maintenance',
  Maintenance: 'Parc Matériel & Maintenance',
  maintenance: 'Parc Matériel & Maintenance',
  'Registres & Analyses': 'Registres & Analyses',
  registres: 'Registres & Analyses',
  Documents: 'Registres & Analyses',
  documents: 'Registres & Analyses',
  Graphiques: 'Registres & Analyses',
  graphiques: 'Registres & Analyses',
  analyses: 'Registres & Analyses',
};
export const SMARTFARM_TABS = ['Objets connectés', 'Flux temps réel', 'Automatisation'];

const SMARTFARM_TAB_ALIASES = {
  'Objets connectés': 'Objets connectés',
  objets: 'Objets connectés',
  devices: 'Objets connectés',
  device: 'Objets connectés',
  Résumé: 'Objets connectés',
  resume: 'Objets connectés',
  Capteurs: 'Objets connectés',
  capteurs: 'Objets connectés',
  Caméras: 'Objets connectés',
  cameras: 'Objets connectés',
  caméras: 'Objets connectés',
  'Flux temps réel': 'Flux temps réel',
  flux: 'Flux temps réel',
  telemetry: 'Flux temps réel',
  telemetrie: 'Flux temps réel',
  Graphiques: 'Flux temps réel',
  graphiques: 'Flux temps réel',
  Automatisation: 'Automatisation',
  automation: 'Automatisation',
  automatisation: 'Automatisation',
  rules: 'Automatisation',
  Annexe: 'Objets connectés',
  annexe: 'Objets connectés',
};
export const SYNC_ACTIVITY_TABS = ['Vérifications', 'Connexion & envoi', 'Journal d\'activité'];

const SYNC_ACTIVITY_TAB_ALIASES = {
  Vérifications: 'Vérifications',
  verifications: 'Vérifications',
  audit: 'Vérifications',
  Résumé: 'Vérifications',
  resume: 'Vérifications',
  'Connexion & envoi': 'Connexion & envoi',
  connexion: 'Connexion & envoi',
  sync: 'Connexion & envoi',
  offline: 'Connexion & envoi',
  'Journal d\'activité': 'Journal d\'activité',
  journal: 'Journal d\'activité',
  historique: 'Journal d\'activité',
  activite: 'Journal d\'activité',
  audit_logs: 'Journal d\'activité',
};
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
  'Récoltes & stock': 'Récoltes',
  'Récoltes et stock': 'Récoltes',
  'Vue d’ensemble': 'Parcelles & campagnes',
  'Vue d\'ensemble': 'Parcelles & campagnes',
  Résumé: 'Parcelles & campagnes',
  resume: 'Parcelles & campagnes',
  Cultures: 'Parcelles & campagnes',
  Campagnes: 'Parcelles & campagnes',
  Performance: 'Économie circulaire',
};
export const DASHBOARD_TABS = ['Carnet Horizon'];
export const DASHBOARD_TAB_ALIASES = {
  Résumé: 'Carnet Horizon',
  resume: 'Carnet Horizon',
  Graphiques: 'Carnet Horizon',
  graphiques: 'Carnet Horizon',
  Carnet: 'Carnet Horizon',
};
export const INVESTISSEURS_TABS = ['room', 'preparation', 'dossier', 'library', 'crm', 'preview', 'export', 'history', 'demo'];

const INVESTISSEURS_TAB_ALIASES = {
  room: 'room',
  'Investor Room': 'room',
  preparation: 'preparation',
  Préparation: 'preparation',
  Preparation: 'preparation',
  dossier: 'dossier',
  Dossier: 'dossier',
  library: 'library',
  'Data Room': 'library',
  crm: 'crm',
  CRM: 'crm',
  preview: 'preview',
  'Aperçu dossier': 'preview',
  export: 'export',
  'Exports PDF': 'export',
  history: 'history',
  Historique: 'history',
  demo: 'demo',
  'Démo investisseur': 'demo',
  Résumé: 'room',
  resume: 'room',
  financeurs: 'preparation',
  Financeurs: 'preparation',
};

export const GESTION_SYSTEME_TABS = ['Vue admin', 'Utilisateurs', 'Fermes', 'Paramètres', 'Sécurité', 'Sauvegardes', 'Réinitialisation', 'Audit'];

const GESTION_SYSTEME_TAB_ALIASES = {
  'Vue admin': 'Vue admin',
  admin: 'Vue admin',
  Résumé: 'Vue admin',
  resume: 'Vue admin',
  Utilisateurs: 'Utilisateurs',
  utilisateurs: 'Utilisateurs',
  users: 'Utilisateurs',
  Fermes: 'Fermes',
  fermes: 'Fermes',
  farms: 'Fermes',
  Paramètres: 'Paramètres',
  parametres: 'Paramètres',
  settings: 'Paramètres',
  Sécurité: 'Sécurité',
  securite: 'Sécurité',
  security: 'Sécurité',
  Sauvegardes: 'Sauvegardes',
  sauvegardes: 'Sauvegardes',
  backup: 'Sauvegardes',
  Réinitialisation: 'Réinitialisation',
  reinitialisation: 'Réinitialisation',
  reset: 'Réinitialisation',
  Audit: 'Audit',
  audit: 'Audit',
};

export function resolveDocumentsTab(value = '') {
  const tab = String(value || '').trim();
  if (DOCUMENTS_RAPPORTS_TABS.includes(tab)) return tab;
  const fromAlias = DOCUMENTS_TAB_ALIASES[tab] || DOCUMENTS_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return 'Centre de contrôle';
}

export function resolveDocumentsNavigation(value = '') {
  const raw = String(value || '').trim();
  return { tab: resolveDocumentsTab(raw) };
}

/** Navigation externe — conserve alias legacy (Preuves, Rapports…). */
export function navigateDocumentsTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Centre de contrôle';
  if (typeof onNavigate === 'function') {
    onNavigate('documents_rapports', { tab: raw, ...options });
  }
  return resolveDocumentsTab(raw);
}

export function resolveRhTab(value = '') {
  const tab = String(value || '').trim();
  if (RH_TABS.includes(tab)) return tab;
  const fromAlias = RH_TAB_ALIASES[tab] || RH_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  if (lower(tab) === 'resume') return 'Cockpit RH & Maintenance';
  return 'Cockpit RH & Maintenance';
}

export function resolveRhNavigation(value = '') {
  const raw = String(value || '').trim();
  return { tab: resolveRhTab(raw) };
}

/** Navigation externe — conserve alias legacy (Affectations, Équipements…). */
export function navigateRhTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Cockpit RH & Maintenance';
  if (typeof onNavigate === 'function') {
    onNavigate('rh', { tab: raw, ...options });
  }
  return resolveRhTab(raw);
}

export function resolveObjectifsTab(value = '') {
  const tab = String(value || '').trim();
  if (OBJECTIFS_TABS.includes(tab)) return tab;
  const fromAlias = OBJECTIFS_TAB_ALIASES[tab] || OBJECTIFS_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return OBJECTIFS_TABS[0];
}

export function navigateObjectifsTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Suivi du Business Plan';
  if (typeof onNavigate === 'function') {
    onNavigate('objectifs_croissance', { tab: raw, ...options });
  }
  return resolveObjectifsTab(raw);
}

export function resolveCentreTab(value = '') {
  const tab = String(value || '').trim();
  if (CENTRE_IA_TABS.includes(tab)) return tab;
  const fromAlias = CENTRE_IA_TAB_ALIASES[tab] || CENTRE_IA_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return CENTRE_IA_TABS[0];
}

/** Navigation externe vers le Centre avec résolution d'onglet legacy. */
export function navigateCentreTab(onNavigate, tab = '') {
  const resolved = resolveCentreTab(tab);
  if (typeof onNavigate === 'function') onNavigate('centre_ia', { tab: resolved });
  return resolved;
}

export function resolveSyncActivityTab(value = '') {
  const tab = String(value || '').trim();
  if (SYNC_ACTIVITY_TABS.includes(tab)) return tab;
  const fromAlias = SYNC_ACTIVITY_TAB_ALIASES[tab] || SYNC_ACTIVITY_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return 'Vérifications';
}

export function resolveSyncActivityNavigation(value = '') {
  return { tab: resolveSyncActivityTab(value) };
}

/** Navigation externe — conserve alias legacy (audit, sync…). */
export function navigateSyncActivityTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Vérifications';
  if (typeof onNavigate === 'function') {
    onNavigate('sync_activity', { tab: raw, ...options });
  }
  return resolveSyncActivityTab(raw);
}

export function resolveSmartFarmTab(value = '') {
  const tab = String(value || '').trim();
  if (SMARTFARM_TABS.includes(tab)) return tab;
  const fromAlias = SMARTFARM_TAB_ALIASES[tab] || SMARTFARM_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  if (lower(tab) === 'resume') return 'Objets connectés';
  return 'Objets connectés';
}

export function resolveSmartFarmNavigation(value = '') {
  const raw = String(value || '').trim();
  return { tab: resolveSmartFarmTab(raw) };
}

/** Navigation externe — conserve alias legacy (Capteurs, flux…). */
export function navigateSmartFarmTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Objets connectés';
  if (typeof onNavigate === 'function') {
    onNavigate('smartfarm', { tab: raw, ...options });
  }
  return resolveSmartFarmTab(raw);
}

export function resolveGestionSystemeTab(value = '') {
  const tab = String(value || '').trim();
  if (GESTION_SYSTEME_TABS.includes(tab)) return tab;
  const fromAlias = GESTION_SYSTEME_TAB_ALIASES[tab] || GESTION_SYSTEME_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return 'Vue admin';
}

export function resolveGestionSystemeNavigation(value = '') {
  return { tab: resolveGestionSystemeTab(value) };
}

/** Navigation externe — conserve alias legacy (Paramètres, Audit…). */
export function navigateGestionSystemeTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Vue admin';
  if (typeof onNavigate === 'function') {
    onNavigate('gestion_systeme', { tab: raw, ...options });
  }
  return resolveGestionSystemeTab(raw);
}

export function resolveCulturesTab(value = '') {
  const tab = String(value || '').trim();
  if (CULTURES_TABS.includes(tab)) return tab;
  const fromAlias = CULTURES_TAB_ALIASES[tab] || CULTURES_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  if (lower(tab) === 'resume') return 'Parcelles & campagnes';
  const legacy = tabAliases[lower(tab)];
  if (legacy && CULTURES_TABS.includes(legacy)) return legacy;
  return 'Parcelles & campagnes';
}

/** Navigation externe — conserve alias section (Intrants, Transformation…) pour replis auto. */
export function navigateCulturesTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'Parcelles & campagnes';
  if (typeof onNavigate === 'function') {
    onNavigate('cultures', { tab: raw, ...options });
  }
  return resolveCulturesTab(raw);
}

export function resolveDashboardTab(value = '') {
  const tab = String(value || '').trim();
  if (DASHBOARD_TABS.includes(tab)) return tab;
  const fromAlias = DASHBOARD_TAB_ALIASES[tab] || DASHBOARD_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  return 'Carnet Horizon';
}

export function resolveInvestisseursTab(value = '') {
  const tab = String(value || '').trim();
  if (INVESTISSEURS_TABS.includes(tab)) return tab;
  const fromAlias = INVESTISSEURS_TAB_ALIASES[tab] || INVESTISSEURS_TAB_ALIASES[lower(tab)];
  if (fromAlias) return fromAlias;
  const legacy = tabAliases[lower(tab)];
  if (legacy && INVESTISSEURS_TABS.includes(legacy)) return legacy;
  return 'room';
}

/** Navigation externe — conserve alias legacy (Préparation, Data Room…). */
export function navigateInvestisseursTab(onNavigate, tab = '', options = {}) {
  const raw = String(tab || '').trim() || 'room';
  if (typeof onNavigate === 'function') {
    onNavigate('investisseurs_forums', { tab: raw, ...options });
  }
  return resolveInvestisseursTab(raw);
}

/** Résout un identifiant legacy (ventes, finances, stock…) vers le grand module ERP. */
export function resolveRouteModule(moduleId = '') {
  return ROUTE_TO_MODULE[moduleId] || moduleId;
}

/** Onglet par défaut quand on entre via un alias legacy. */
export function defaultTabForLegacyModule(moduleId = '') {
  if (moduleId === 'clients') return 'Clients & créances';
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
  if (moduleId === 'audit_logs' || moduleId === 'sync') return 'Vérifications';
  if (moduleId === 'investisseurs_forums' || moduleId === 'financeurs') return 'Préparation';
  return null;
}

const SEARCH_KEY_TO_MODULE = {
  sales_orders: { module: 'commercial', tab: 'Ventes' },
  sales_order_items: { module: 'commercial', tab: 'Ventes' },
  sales_opportunities: { module: 'commercial', tab: 'Opportunités' },
  invoices: { module: 'commercial', tab: 'Ventes' },
  deliveries: { module: 'commercial', tab: 'Livraisons' },
  clients: { module: 'commercial', tab: 'Clients & créances' },
  payments: { module: 'finance_pilotage', tab: 'Créances' },
  finances: { module: 'finance_pilotage', tab: 'Trésorerie' },
  stock: { module: 'achats_stock', tab: 'Stock' },
  fournisseurs: { module: 'achats_stock', tab: 'Fournisseurs' },
  animaux: { module: 'elevage', tab: 'Lots & bandes' },
  avicole: { module: 'elevage', tab: 'Lots & bandes' },
  cultures: { module: 'cultures', tab: 'Parcelles & campagnes' },
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
      || (String(finding.title || '').toLowerCase().includes('relancer') ? 'Clients & créances' : 'Ventes');
    return { module, tab: resolveCommercialTab(tab) };
  }
  if (module === 'finance_pilotage') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Créances',
    };
  }
  if (module === 'elevage') {
    return { module, tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Lots & bandes' };
  }
  if (module === 'achats_stock') {
    return { module, tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Stock' };
  }
  if (module === 'cultures') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Parcelles & campagnes',
    };
  }
  if (module === 'agri_feeds') {
    return {
      module,
      tab: explicitTab || 'Tableau de bord',
    };
  }
  if (module === 'documents_rapports') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Centre de contrôle',
    };
  }
  if (module === 'activite_suivi') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Cockpit & décisions',
    };
  }
  if (module === 'rh') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Cockpit RH & Maintenance',
    };
  }
  if (module === 'objectifs_croissance') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Suivi du Business Plan',
    };
  }
  if (module === 'investisseurs_forums') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'room',
    };
  }
  if (module === 'smartfarm') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Objets connectés',
    };
  }
  if (module === 'sync_activity' || module === 'audit_logs' || module === 'sync') {
    return {
      module: 'sync_activity',
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Vérifications',
    };
  }
  if (module === 'gestion_systeme') {
    return {
      module,
      tab: explicitTab || defaultTabForLegacyModule(rawModule) || 'Vue admin',
    };
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
    onNavigate('finance_pilotage', { tab: finding.tab || 'Créances' });
    return;
  }
  if (module === 'achats_stock') {
    onNavigate('achats_stock', { tab: finding.tab || 'Stock' });
    return;
  }
  if (module === 'elevage') {
    onNavigate('elevage', { tab: finding.tab || 'Lots & bandes' });
    return;
  }
  if (module === 'cultures') {
    onNavigate('cultures', { tab: finding.tab || 'Parcelles & campagnes' });
    return;
  }
  if (module === 'documents_rapports') {
    onNavigate('documents_rapports', { tab: finding.tab || 'Rapprochement & preuves' });
    return;
  }
  if (module === 'activite_suivi') {
    onNavigate('activite_suivi', { tab: finding.tab || 'À traiter maintenant' });
    return;
  }
  if (module === 'rh') {
    onNavigate('rh', { tab: finding.tab || 'Cockpit RH & Maintenance' });
    return;
  }
  if (module === 'objectifs_croissance') {
    onNavigate('objectifs_croissance', { tab: finding.tab || 'Suivi du Business Plan' });
    return;
  }
  if (module === 'investisseurs_forums') {
    onNavigate('investisseurs_forums', { tab: finding.tab || 'room' });
    return;
  }
  if (module === 'smartfarm') {
    onNavigate('smartfarm', { tab: finding.tab || 'Objets connectés' });
    return;
  }
  if (module === 'sync_activity' || module === 'audit_logs' || module === 'sync') {
    onNavigate('sync_activity', { tab: finding.tab || 'Vérifications' });
    return;
  }
  if (module === 'gestion_systeme') {
    onNavigate('gestion_systeme', { tab: finding.tab || 'Vue admin' });
    return;
  }
  onNavigate(module || 'elevage');
}
