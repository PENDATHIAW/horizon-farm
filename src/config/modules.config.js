import {
  Beef, Bot, BrainCircuit, ClipboardList, DollarSign, FolderOpen, Goal,
  Handshake, LayoutDashboard, Settings, ShoppingCart, Sprout, Tractor,
  UserCog, Warehouse, Wifi, Wrench,
} from 'lucide-react';

import navigation from '../i18n/fr/navigation.js';

const noIcon = () => null;
const libelle = (id) => navigation.modules[id] || id;

/** Registre central des modules ERP — routes, labels, regroupements. Libellés : src/i18n. */
export const MODULE_REGISTRY = {
  dashboard: { label: libelle('dashboard'), icon: LayoutDashboard, group: 'core' },
  assistant_erp: { label: libelle('assistant_erp'), icon: Bot, group: 'core' },
  centre_decisionnel: { label: libelle('centre_decisionnel'), icon: BrainCircuit, group: 'pilotage' },
  centre_ia: { label: libelle('centre_decisionnel'), icon: BrainCircuit, group: 'pilotage', deprecated: true },
  agri_feeds: { label: libelle('agri_feeds'), icon: noIcon, group: 'pilotage' },
  objectifs_croissance: { label: libelle('objectifs_croissance'), icon: Goal, group: 'pilotage' },
  elevage: { label: libelle('elevage'), icon: Beef, group: 'metier' },
  commercial: { label: libelle('commercial'), icon: ShoppingCart, group: 'metier' },
  achats_stock: { label: libelle('achats_stock'), icon: Warehouse, group: 'metier' },
  finance_pilotage: { label: libelle('finance_pilotage'), icon: DollarSign, group: 'metier' },
  activite_suivi: { label: libelle('activite_suivi'), icon: ClipboardList, group: 'metier' },
  documents_rapports: { label: libelle('documents_rapports'), icon: FolderOpen, group: 'metier' },
  financements: { label: libelle('financements'), icon: Handshake, group: 'pilotage' },
  impact_business: { label: libelle('financements'), icon: Handshake, group: 'pilotage', deprecated: true },
  investisseurs_forums: { label: libelle('financements'), icon: Handshake, group: 'pilotage', deprecated: true },
  cultures: { label: libelle('cultures'), icon: Sprout, group: 'metier' },
  equipe: { label: libelle('equipe'), icon: UserCog, group: 'operations' },
  rh: { label: libelle('equipe'), icon: UserCog, group: 'operations', deprecated: true },
  equipements: { label: libelle('equipements'), icon: Wrench, group: 'operations' },
  smartfarm: { label: libelle('smartfarm'), icon: Tractor, group: 'operations' },
  sync_activity: { label: libelle('gestion_systeme'), icon: Wifi, group: 'system', deprecated: true },
  gestion_systeme: { label: libelle('gestion_systeme'), icon: Settings, group: 'system' },
};

/** Modules historiques — accessibles par route directe, regroupés en « avancés ». */
export const ADVANCED_MODULE_IDS = [
  'animaux', 'avicole', 'sante', 'finances', 'comptabilite', 'investissements',
  'stock', 'clients', 'fournisseurs', 'tracabilite', 'alertes', 'ventes',
  'documents', 'taches', 'rapports', 'sync', 'audit_logs',
];

export const GRAND_MODULE_IDS = [
  'centre_decisionnel', 'agri_feeds', 'objectifs_croissance', 'elevage', 'commercial',
  'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports',
];

export const CRUD_KEYS = [
  'animaux', 'avicole', 'sante', 'veterinaires', 'finances', 'investissements',
  'business_plans', 'bp_investment_lines', 'bp_recurring_costs', 'bp_revenue_projections',
  'bp_funding_sources', 'bp_links', 'bp_risks', 'stock', 'clients', 'fournisseurs',
  'tracabilite', 'cultures', 'documents', 'taches', 'rapports', 'equipements',
  'audit_logs', 'alimentation_logs', 'production_oeufs_logs', 'sensor_devices',
  'business_events', 'alertes_center', 'whatsapp_templates',
  'whatsapp_logs', 'sales_orders', 'sales_order_items', 'deliveries', 'invoices',
  'payments', 'sales_opportunities', 'stock_movements',
  'feed_raw_materials', 'feed_raw_batches', 'feed_formulas', 'feed_formula_versions',
  'feed_formula_ingredients', 'feed_facility_zones',
  'feed_production_orders', 'feed_finished_batches', 'feed_quality_checks',
  'feed_trials', 'feed_phase1_comparisons',
  'funding_opportunities', 'funding_contacts', 'funding_applications',
  'funding_document_library', 'funding_agreements', 'funding_expense_allocations',
  'funding_reports', 'funding_project_journal', 'funder_accounts', 'funder_access_logs',
  'planning_simulations',
];

export const SALES_WORKFLOW_KEYS = [
  'sales_orders', 'invoices', 'payments', 'finances', 'clients', 'stock',
  'animaux', 'avicole', 'cultures', 'documents', 'business_events', 'alertes_center',
];

export const NAV_MODULE_ORDER = [
  'dashboard', 'assistant_erp', 'centre_decisionnel', 'agri_feeds', 'objectifs_croissance', 'financements',
  'elevage', 'cultures',
  'commercial', 'achats_stock',
  'finance_pilotage',
  'activite_suivi', 'documents_rapports',
  'equipe', 'equipements', 'smartfarm',
  'gestion_systeme',
];

export const ROUTE_TO_MODULE = {
  ventes: 'commercial',
  stock: 'achats_stock',
  animaux: 'elevage',
  avicole: 'elevage',
  sante: 'elevage',
  finances: 'finance_pilotage',
  investissements: 'finance_pilotage',
  financements: 'financements',
  financeurs: 'financements',
  investisseurs_forums: 'financements',
  impact_business: 'financements',
  alertes: 'activite_suivi',
  taches: 'activite_suivi',
  tracabilite: 'activite_suivi',
  documents: 'documents_rapports',
  rapports: 'documents_rapports',
  clients: 'commercial',
  fournisseurs: 'achats_stock',
  sales_orders: 'commercial',
  sales_opportunities: 'commercial',
};

export function moduleLabel(id) {
  return MODULE_REGISTRY[id]?.label || id;
}

export function isAdvancedModule(id) {
  return ADVANCED_MODULE_IDS.includes(id);
}
