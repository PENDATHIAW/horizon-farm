import {
  Beef, Bot, BrainCircuit, ClipboardList, DollarSign, FolderOpen, Goal,
  Handshake, LayoutDashboard, Settings, ShoppingCart, Sprout, Tractor,
  UserCog, Warehouse, Wifi, Wrench,
} from 'lucide-react';

const noIcon = () => null;

/** Registre central des modules ERP — routes, labels, regroupements. */
export const MODULE_REGISTRY = {
  dashboard: { label: 'Accueil', icon: LayoutDashboard, group: 'core' },
  assistant_erp: { label: 'Assistant ERP', icon: Bot, group: 'core' },
  centre_ia: { label: 'Centre décisionnel', icon: BrainCircuit, group: 'pilotage' },
  agri_feeds: { label: 'AGRI FEEDS', icon: noIcon, group: 'pilotage' },
  agri_feeds_bovinia: { label: 'BOVINIA', icon: noIcon, group: 'pilotage' },
  objectifs_croissance: { label: 'Objectifs & Croissance', icon: Goal, group: 'pilotage' },
  elevage: { label: 'Élevage', icon: Beef, group: 'metier' },
  commercial: { label: 'Commercial', icon: ShoppingCart, group: 'metier' },
  achats_stock: { label: 'Achats & Stock', icon: Warehouse, group: 'metier' },
  finance_pilotage: { label: 'Finance & Pilotage', icon: DollarSign, group: 'metier' },
  activite_suivi: { label: 'Activité & Suivi', icon: ClipboardList, group: 'metier' },
  documents_rapports: { label: 'Documents & Rapports', icon: FolderOpen, group: 'metier' },
  impact_business: { label: 'Investisseurs & Forums', icon: Handshake, group: 'pilotage', deprecated: true },
  investisseurs_forums: { label: 'Investisseurs & Forums', icon: Handshake, group: 'pilotage' },
  cultures: { label: 'Cultures', icon: Sprout, group: 'metier' },
  rh: { label: 'Opérations & Ressources', icon: UserCog, group: 'operations' },
  equipements: { label: 'Équipements', icon: Wrench, group: 'operations' },
  smartfarm: { label: 'Smart Farm', icon: Tractor, group: 'operations' },
  sync_activity: { label: 'Activité & Sync ERP', icon: Wifi, group: 'system' },
  gestion_systeme: { label: 'Gestion du système', icon: Settings, group: 'system' },
};

/** Modules historiques — accessibles par route directe, regroupés en « avancés ». */
export const ADVANCED_MODULE_IDS = [
  'animaux', 'avicole', 'sante', 'finances', 'comptabilite', 'investissements',
  'stock', 'clients', 'fournisseurs', 'tracabilite', 'alertes', 'ventes',
  'documents', 'taches', 'rapports', 'sync', 'audit_logs',
];

export const GRAND_MODULE_IDS = [
  'centre_ia', 'agri_feeds', 'agri_feeds_bovinia', 'objectifs_croissance', 'elevage', 'commercial',
  'achats_stock', 'finance_pilotage', 'activite_suivi', 'documents_rapports',
];

export const CRUD_KEYS = [
  'animaux', 'avicole', 'sante', 'veterinaires', 'finances', 'investissements',
  'business_plans', 'bp_investment_lines', 'bp_recurring_costs', 'bp_revenue_projections',
  'bp_funding_sources', 'bp_links', 'bp_risks', 'stock', 'clients', 'fournisseurs',
  'tracabilite', 'cultures', 'documents', 'taches', 'rapports', 'equipements',
  'audit_logs', 'alimentation_logs', 'production_oeufs_logs', 'sensor_devices',
  'camera_devices', 'business_events', 'alertes_center', 'whatsapp_templates',
  'whatsapp_logs', 'sales_orders', 'sales_order_items', 'deliveries', 'invoices',
  'payments', 'sales_opportunities', 'stock_movements',
  'feed_raw_materials', 'feed_raw_batches', 'feed_formulas', 'feed_formula_versions',
  'feed_formula_ingredients', 'feed_facility_zones',
  'feed_production_orders', 'feed_finished_batches', 'feed_quality_checks',
  'feed_trials', 'feed_phase1_comparisons',
];

export const SALES_WORKFLOW_KEYS = [
  'sales_orders', 'invoices', 'payments', 'finances', 'clients', 'stock',
  'animaux', 'avicole', 'cultures', 'documents', 'business_events', 'alertes_center',
];

export const NAV_MODULE_ORDER = [
  'dashboard', 'assistant_erp', 'centre_ia', 'agri_feeds', 'agri_feeds_bovinia', 'objectifs_croissance', 'investisseurs_forums',
  'elevage', 'cultures',
  'commercial', 'achats_stock',
  'finance_pilotage',
  'activite_suivi', 'documents_rapports',
  'rh', 'equipements', 'smartfarm',
  'sync_activity', 'gestion_systeme',
];

export const ROUTE_TO_MODULE = {
  bovinia: 'agri_feeds_bovinia',
  ventes: 'commercial',
  stock: 'achats_stock',
  animaux: 'elevage',
  avicole: 'elevage',
  sante: 'elevage',
  finances: 'finance_pilotage',
  investissements: 'finance_pilotage',
  investisseurs_forums: 'investisseurs_forums',
  impact_business: 'investisseurs_forums',
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
