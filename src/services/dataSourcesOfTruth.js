/** Sources officielles de vérité ERP — affichage autorisé ailleurs, saisie unique ici. */
export const DATA_SOURCES_OF_TRUTH = {
  sales_order: { table: 'sales_orders', modules: ['commercial', 'dashboard', 'centre_ia', 'objectifs_croissance', 'clients', 'finance_pilotage', 'documents_rapports', 'assistant_erp'] },
  sales_order_item: { table: 'sales_order_items', modules: ['commercial', 'achats_stock', 'documents_rapports', 'elevage', 'cultures'] },
  payment: { table: 'payments', modules: ['commercial', 'finance_pilotage', 'clients', 'dashboard', 'centre_ia'] },
  finance: { table: 'finances', modules: ['finance_pilotage', 'comptabilite', 'documents_rapports', 'objectifs_croissance'] },
  delivery: { table: 'deliveries', modules: ['commercial', 'clients', 'documents_rapports', 'centre_ia'] },
  invoice: { table: 'invoices', modules: ['commercial', 'documents_rapports', 'finance_pilotage'] },
  client: { table: 'clients', modules: ['commercial', 'clients', 'finance_pilotage'] },
  supplier: { table: 'fournisseurs', modules: ['achats_stock', 'finance_pilotage', 'documents_rapports'] },
  stock: { table: 'stock', modules: ['achats_stock', 'commercial', 'elevage', 'cultures', 'dashboard', 'centre_ia'] },
  stock_movement: { table: 'stock_movements', modules: ['achats_stock', 'commercial', 'elevage', 'cultures', 'finance_pilotage'] },
  feeding_log: { table: 'alimentation_logs', modules: ['elevage', 'avicole', 'achats_stock', 'finance_pilotage'] },
  egg_production: { table: 'production_oeufs_logs', modules: ['elevage', 'avicole', 'dashboard', 'centre_ia', 'documents_rapports', 'commercial'] },
  animal: { table: 'animaux', modules: ['elevage', 'sante', 'commercial', 'tracabilite', 'finance_pilotage'] },
  poultry_lot: { table: 'avicole', modules: ['elevage', 'commercial', 'centre_ia', 'finance_pilotage'] },
  health: { table: 'sante', modules: ['elevage', 'sante', 'alertes', 'finance_pilotage'] },
  crop: { table: 'cultures', modules: ['cultures', 'commercial', 'finance_pilotage', 'achats_stock', 'documents_rapports', 'centre_ia'] },
  organic_material: { table: 'stock + business_events', modules: ['elevage', 'cultures', 'achats_stock', 'finance_pilotage', 'documents_rapports'] },
  biosecurity_cleaning: { table: 'business_events', modules: ['elevage', 'achats_stock', 'cultures', 'activite_suivi', 'finance_pilotage', 'documents_rapports'] },
  irrigation: { table: 'business_events + sensor_devices', modules: ['cultures', 'smartfarm', 'finance_pilotage', 'centre_ia', 'equipements'] },
  document: { table: 'documents', modules: ['documents_rapports', 'finance_pilotage', 'commercial', 'sante', 'achats_stock', 'financements'] },
  report: { table: 'rapports', modules: ['documents_rapports', 'objectifs_croissance', 'financements', 'finance_pilotage'] },
  task: { table: 'taches', modules: ['activite_suivi', 'dashboard', 'centre_ia', 'assistant_erp'] },
  alert: { table: 'alertes_center', modules: ['activite_suivi', 'dashboard', 'centre_ia', 'assistant_erp'] },
  business_event: { table: 'business_events', modules: ['tracabilite', 'centre_ia', 'documents_rapports', 'dashboard'] },
  equipment: { table: 'equipements', modules: ['equipements', 'finance_pilotage', 'smartfarm', 'activite_suivi'] },
  sensor: { table: 'sensor_devices', modules: ['smartfarm', 'equipements', 'cultures', 'elevage', 'centre_ia'] },
  camera: { table: 'camera_devices', modules: ['smartfarm', 'equipements', 'centre_ia'] },
  opportunity: { table: 'sales_opportunities', modules: ['commercial', 'objectifs_croissance', 'centre_ia'] },
  business_plan: { table: 'business_plans', modules: ['objectifs_croissance', 'investissements', 'documents_rapports', 'financements'] },
  investment: { table: 'investissements', modules: ['finance_pilotage', 'objectifs_croissance', 'documents_rapports', 'equipements', 'financements'] },
  funding_usage: { table: 'finances + investissements + documents', modules: ['finance_pilotage', 'objectifs_croissance', 'documents_rapports', 'financements'] },
  ai_recommendation: { table: 'ai_recommendations', modules: ['assistant_erp', 'centre_ia'] },
};

/** Règles anti-double-comptage pour les KPI enrichis. */
export const ANTI_DOUBLE_COUNTING_RULES = [
  { metric: 'ca', source: 'sales_orders', exclude: ['payments', 'finances'] },
  { metric: 'encaissements', source: 'payments', exclude: ['sales_orders.total', 'finances.recettes_dupliquees'] },
  { metric: 'resultat_comptable', source: 'finances', exclude: ['payments', 'sales_orders'] },
  { metric: 'ponte', source: 'production_oeufs_logs', exclude: ['avicole.estimated_eggs'] },
  { metric: 'stock_actuel', source: 'stock + stock_movements', periodFilter: false },
  { metric: 'creance_client', source: 'sales_orders + payments', exclude: ['clients.reste_a_payer_cache'] },
  { metric: 'marge_lot', source: 'sales_order_items + alimentation_logs + sante + avicole', exclude: ['finances.recette_lot_dupliquee'] },
  { metric: 'marge_bovin', source: 'sales_order_items + animaux + alimentation_logs + sante', exclude: ['finances.recette_bovine_dupliquee'] },
  { metric: 'marge_parcelle', source: 'sales_order_items + cultures + stock + business_events', exclude: ['finances.recette_culture_dupliquee'] },
  { metric: 'cout_aliment', source: 'alimentation_logs + stock', exclude: ['finances.aliment_si_deja_inclus_dans_logs'] },
  { metric: 'cout_biosecurite', source: 'business_events + stock + finances', exclude: ['taches.cout_estime_non_valide'] },
  { metric: 'matiere_organique_collectee', source: 'business_events', exclude: ['stock.organique_si_deja_genere_depuis_evenement'] },
  { metric: 'economie_circulaire', source: 'business_events + cultures + stock', exclude: ['claim_marketing_non_chiffre'] },
  { metric: 'fonds_utilises', source: 'finances + investissements', exclude: ['business_plan.previsionnel'] },
];

export const METRIC_SOURCES_OF_TRUTH = {
  ca: { source: 'sales_orders', formula: 'Somme des ventes validées sur la période' },
  cash: { source: 'payments', formula: 'Somme des paiements réellement encaissés' },
  creances: { source: 'sales_orders + payments', formula: 'Total ventes - total paiements liés' },
  tresorerie: { source: 'finances + payments', formula: 'Solde initial + encaissements - décaissements' },
  stock_actuel: { source: 'stock + stock_movements', formula: 'Quantité initiale + entrées - sorties' },
  ponte: { source: 'production_oeufs_logs', formula: 'Plateaux ou œufs produits par bâtiment et période' },
  cout_aliment_lot: { source: 'alimentation_logs + stock', formula: 'Quantité distribuée au lot × coût unitaire aliment' },
  marge_lot_chair: { source: 'sales_order_items + avicole + alimentation_logs + sante', formula: 'Vente liée au lot - coûts rattachés au lot' },
  marge_plateau_oeufs: { source: 'production_oeufs_logs + sales_order_items + alimentation_logs', formula: 'Recettes œufs - coûts pondeuses / plateaux vendus' },
  cout_bovin: { source: 'animaux + alimentation_logs + sante + finances', formula: 'Achat animal + aliment + santé + charges liées' },
  marge_bovin: { source: 'sales_order_items + animaux + alimentation_logs', formula: 'Prix de vente animal - coût cumulé animal' },
  cout_parcelle: { source: 'cultures + stock + business_events + finances', formula: 'Intrants + irrigation + main-d’œuvre + fertilisation' },
  marge_parcelle: { source: 'sales_order_items + cultures + stock', formula: 'Ventes de récolte - coût parcelle' },
  kg_matiere_organique: { source: 'business_events', formula: 'Nombre sacs collectés × poids estimé par sac' },
  economie_intrants: { source: 'business_events + cultures', formula: 'Quantité valorisée × coût intrant remplacé estimé' },
  fonds_utilises: { source: 'finances + investissements + documents', formula: 'Dépenses rattachées au financement et justifiées' },
  disponibilite_equipement: { source: 'equipements + taches + business_events', formula: 'Équipements actifs - équipements en panne / maintenance' },
};

export function officialSourceFor(metric = '') {
  const key = String(metric || '').trim().toLowerCase();
  const map = {
    ca: 'sales_orders',
    encaissements: 'payments',
    cash: 'payments',
    tresorerie: 'finances',
    stock: 'stock',
    ponte: 'production_oeufs_logs',
    lot: 'avicole',
    animal: 'animaux',
    bovin: 'animaux',
    culture: 'cultures',
    parcelle: 'cultures',
    document: 'documents',
    alerte: 'alertes_center',
    tache: 'taches',
    biosécurité: 'business_events',
    biosecurite: 'business_events',
    effluents: 'business_events',
    fumier: 'business_events',
    fientes: 'business_events',
    financement: 'finances',
    equipement: 'equipements',
    capteur: 'sensor_devices',
  };
  return map[key] || METRIC_SOURCES_OF_TRUTH[key]?.source || null;
}

export function modulesConsuming(sourceKey = '') {
  return DATA_SOURCES_OF_TRUTH[sourceKey]?.modules || [];
}
