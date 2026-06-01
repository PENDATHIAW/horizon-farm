/** Sources officielles de vérité ERP — affichage autorisé ailleurs, saisie unique ici. */
export const DATA_SOURCES_OF_TRUTH = {
  sales_order: { table: 'sales_orders', modules: ['commercial', 'dashboard', 'centre_ia', 'objectifs_croissance', 'clients', 'finance_pilotage', 'documents_rapports', 'assistant_erp'] },
  sales_order_item: { table: 'sales_order_items', modules: ['commercial', 'achats_stock', 'documents_rapports'] },
  payment: { table: 'payments', modules: ['commercial', 'finance_pilotage', 'clients', 'dashboard', 'centre_ia'] },
  finance: { table: 'finances', modules: ['finance_pilotage', 'comptabilite', 'documents_rapports', 'objectifs_croissance'] },
  delivery: { table: 'deliveries', modules: ['commercial', 'clients', 'documents_rapports', 'centre_ia'] },
  invoice: { table: 'invoices', modules: ['commercial', 'documents_rapports', 'finance_pilotage'] },
  client: { table: 'clients', modules: ['commercial', 'clients', 'finance_pilotage'] },
  supplier: { table: 'fournisseurs', modules: ['achats_stock', 'finance_pilotage', 'documents_rapports'] },
  stock: { table: 'stock', modules: ['achats_stock', 'commercial', 'elevage', 'dashboard', 'centre_ia'] },
  feeding_log: { table: 'alimentation_logs', modules: ['elevage', 'avicole', 'achats_stock'] },
  egg_production: { table: 'production_oeufs_logs', modules: ['elevage', 'avicole', 'dashboard', 'centre_ia', 'documents_rapports'] },
  animal: { table: 'animaux', modules: ['elevage', 'sante', 'commercial', 'tracabilite'] },
  poultry_lot: { table: 'avicole', modules: ['elevage', 'commercial', 'centre_ia'] },
  health: { table: 'sante', modules: ['elevage', 'sante', 'alertes', 'finance_pilotage'] },
  document: { table: 'documents', modules: ['documents_rapports', 'finance_pilotage', 'commercial', 'sante'] },
  report: { table: 'rapports', modules: ['documents_rapports', 'objectifs_croissance'] },
  task: { table: 'taches', modules: ['activite_suivi', 'dashboard', 'centre_ia', 'assistant_erp'] },
  alert: { table: 'alertes_center', modules: ['activite_suivi', 'dashboard', 'centre_ia', 'assistant_erp'] },
  business_event: { table: 'business_events', modules: ['tracabilite', 'centre_ia', 'documents_rapports'] },
  equipment: { table: 'equipements', modules: ['equipements', 'finance_pilotage', 'smartfarm'] },
  sensor: { table: 'sensor_devices', modules: ['smartfarm', 'equipements'] },
  camera: { table: 'camera_devices', modules: ['smartfarm', 'equipements'] },
  opportunity: { table: 'sales_opportunities', modules: ['commercial', 'objectifs_croissance', 'centre_ia'] },
  business_plan: { table: 'business_plans', modules: ['objectifs_croissance', 'investissements', 'documents_rapports'] },
  investment: { table: 'investissements', modules: ['finance_pilotage', 'objectifs_croissance', 'documents_rapports'] },
  ai_recommendation: { table: 'ai_recommendations', modules: ['assistant_erp', 'centre_ia'] },
};

/** Règles anti-double-comptage pour les KPI enrichis. */
export const ANTI_DOUBLE_COUNTING_RULES = [
  { metric: 'ca', source: 'sales_orders', exclude: ['payments', 'finances'] },
  { metric: 'encaissements', source: 'payments', exclude: ['sales_orders.total', 'finances.recettes_dupliquees'] },
  { metric: 'resultat_comptable', source: 'finances', exclude: ['payments', 'sales_orders'] },
  { metric: 'ponte', source: 'production_oeufs_logs', exclude: ['avicole.estimated_eggs'] },
  { metric: 'stock_actuel', source: 'stock', periodFilter: false },
  { metric: 'creance_client', source: 'sales_orders + payments', exclude: ['clients.reste_a_payer_cache'] },
];

export function officialSourceFor(metric = '') {
  const key = String(metric || '').trim().toLowerCase();
  const map = {
    ca: 'sales_orders',
    encaissements: 'payments',
    cash: 'finances',
    stock: 'stock',
    ponte: 'production_oeufs_logs',
    lot: 'avicole',
    animal: 'animaux',
    document: 'documents',
    alerte: 'alertes_center',
    tache: 'taches',
  };
  return map[key] || null;
}

export function modulesConsuming(sourceKey = '') {
  return DATA_SOURCES_OF_TRUTH[sourceKey]?.modules || [];
}
