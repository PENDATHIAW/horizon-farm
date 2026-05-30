import {
  BarChart3, Beef, Bell, Bot, BrainCircuit, Calculator, ClipboardList, DollarSign,
  FolderOpen, Goal, Handshake, LayoutDashboard, PiggyBank, Scale, Settings, ShoppingCart,
  Sprout, Sun, Tractor, UserCog, Warehouse, Wifi, Wrench,
} from 'lucide-react';

/** Registre central des modules ERP — routes, labels, regroupements. */
export const MODULE_REGISTRY = {
  dashboard: { label: 'Accueil', icon: LayoutDashboard, group: 'core' },
  assistant_erp: { label: 'Assistant ERP', icon: Bot, group: 'core' },
  centre_ia: { label: 'Centre décisionnel', icon: BrainCircuit, group: 'pilotage' },
  objectifs_croissance: { label: 'Objectifs & Croissance', icon: Goal, group: 'pilotage' },
  elevage: { label: 'Élevage', icon: Beef, group: 'metier' },
  commercial: { label: 'Commercial', icon: ShoppingCart, group: 'metier' },
  achats_stock: { label: 'Achats & Stock', icon: Warehouse, group: 'metier' },
  finance_pilotage: { label: 'Finance & Pilotage', icon: DollarSign, group: 'metier' },
  activite_suivi: { label: 'Activité & Suivi', icon: ClipboardList, group: 'metier' },
  documents_rapports: { label: 'Documents & Rapports', icon: FolderOpen, group: 'metier' },
  impact_business: { label: 'Impact & Valeur', icon: Scale, group: 'pilotage' },
  cultures: { label: 'Cultures', icon: Sprout, group: 'metier' },
  rh: { label: 'RH & Équipe', icon: UserCog, group: 'operations' },
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
  'elevage', 'commercial', 'achats_stock', 'finance_pilotage',
  'activite_suivi', 'documents_rapports', 'objectifs_croissance', 'centre_ia',
];

export const CRUD_KEYS = [
  'animaux', 'avicole', 'sante', 'veterinaires', 'finances', 'investissements',
  'business_plans', 'bp_investment_lines', 'bp_recurring_costs', 'bp_revenue_projections',
  'bp_funding_sources', 'bp_links', 'bp_risks', 'stock', 'clients', 'fournisseurs',
  'tracabilite', 'cultures', 'documents', 'taches', 'rapports', 'equipements',
  'audit_logs', 'alimentation_logs', 'production_oeufs_logs', 'sensor_devices',
  'camera_devices', 'business_events', 'alertes_center', 'whatsapp_templates',
  'whatsapp_logs', 'sales_orders', 'sales_order_items', 'deliveries', 'invoices',
  'payments', 'sales_opportunities',
];

export const SALES_WORKFLOW_KEYS = [
  'sales_orders', 'invoices', 'payments', 'finances', 'clients', 'stock',
  'animaux', 'avicole', 'cultures', 'documents', 'business_events', 'alertes_center',
];

export const NAV_MODULE_ORDER = [
  'dashboard', 'assistant_erp', 'centre_ia', 'objectifs_croissance',
  'elevage', 'commercial', 'achats_stock', 'finance_pilotage',
  'activite_suivi', 'documents_rapports', 'impact_business',
  'cultures', 'rh', 'equipements', 'smartfarm', 'sync_activity', 'gestion_systeme',
];

export const ROUTE_TO_MODULE = {
  ventes: 'commercial',
  stock: 'achats_stock',
  animaux: 'elevage',
  avicole: 'elevage',
  sante: 'elevage',
  finances: 'finance_pilotage',
  investissements: 'finance_pilotage',
  alertes: 'activite_suivi',
  taches: 'activite_suivi',
  tracabilite: 'activite_suivi',
  documents: 'documents_rapports',
  rapports: 'documents_rapports',
  clients: 'commercial',
  fournisseurs: 'achats_stock',
};

export function moduleLabel(id) {
  return MODULE_REGISTRY[id]?.label || id;
}

export function isAdvancedModule(id) {
  return ADVANCED_MODULE_IDS.includes(id);
}
