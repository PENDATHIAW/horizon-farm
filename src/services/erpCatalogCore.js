export const ERP_CORE_CATALOG = [
  { module: 'animaux', tables: ['animaux'], purpose: 'Suivi des animaux, statut, sante, identification.' },
  { module: 'avicole', tables: ['avicole', 'production_oeufs_logs', 'alimentation_logs'], purpose: 'Lots avicoles, ponte, mortalite, alimentation.' },
  { module: 'sante', tables: ['sante', 'veterinaires'], purpose: 'Vaccins, traitements, incidents sanitaires.' },
  { module: 'stock', tables: ['stock'], purpose: 'Stocks, intrants, seuils, ruptures, mouvements.' },
  { module: 'cultures', tables: ['cultures'], purpose: 'Cultures, parcelles, rendements, operations.' },
  { module: 'equipements', tables: ['equipements'], purpose: 'Materiel, pannes, maintenance, etat.' },
  { module: 'taches', tables: ['taches'], purpose: 'Taches, echeances, priorites, retards.' },
  { module: 'alertes', tables: ['alertes_center'], purpose: 'Alertes, rappels, notifications.' },
];

export const ERP_BUSINESS_CATALOG = [
  { module: 'clients', tables: ['clients'], purpose: 'Clients, historique, suivi commercial.' },
  { module: 'ventes', tables: ['sales_orders', 'sales_order_items', 'deliveries', 'invoices', 'payments'], purpose: 'Commandes, ventes, livraisons, factures, paiements.' },
  { module: 'finances', tables: ['finances', 'payments'], purpose: 'Revenus, depenses, transactions, paiements.' },
  { module: 'comptabilite', tables: ['finances', 'invoices', 'payments'], purpose: 'Comptabilite, factures, rapprochements.' },
  { module: 'fournisseurs', tables: ['fournisseurs'], purpose: 'Fournisseurs, dettes, achats, suivi.' },
  { module: 'investissements', tables: ['investissements', 'business_plans'], purpose: 'Investissements, business plans, risques.' },
  { module: 'documents', tables: ['documents'], purpose: 'Documents, preuves, fichiers, procedures.' },
  { module: 'rapports', tables: ['rapports'], purpose: 'Rapports, syntheses, exports.' },
];

export const ERP_SYSTEM_CATALOG = [
  { module: 'smartfarm', tables: ['sensor_devices', 'camera_devices', 'smartfarm_events'], purpose: 'Capteurs, cameras, donnees terrain.' },
  { module: 'tracabilite', tables: ['tracabilite', 'business_events'], purpose: 'Tracabilite, operations, evenements metier.' },
  { module: 'rh', tables: ['profiles'], purpose: 'Equipe, utilisateurs, roles.' },
  { module: 'audit_logs', tables: ['audit_logs'], purpose: 'Historique des actions, audit.' },
  { module: 'sync_activity', tables: ['audit_logs'], purpose: 'Synchronisation, erreurs, activite.' },
  { module: 'gestion_systeme', tables: ['profiles'], purpose: 'Administration systeme et configuration.' },
];

export const ERP_FULL_CATALOG = [...ERP_CORE_CATALOG, ...ERP_BUSINESS_CATALOG, ...ERP_SYSTEM_CATALOG];

export function listErpModulesForPrompt() {
  return ERP_FULL_CATALOG.map((item) => `${item.module}: ${item.purpose} Tables: ${item.tables.join(', ')}`).join('\n');
}

export function findErpModulesByText(text = '') {
  const value = String(text).toLowerCase();
  return ERP_FULL_CATALOG.filter((item) => {
    const haystack = `${item.module} ${item.purpose} ${item.tables.join(' ')}`.toLowerCase();
    return haystack.split(/[^a-z0-9_]+/).some((token) => token.length > 3 && value.includes(token));
  });
}
